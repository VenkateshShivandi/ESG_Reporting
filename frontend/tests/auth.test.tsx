import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import LoginForm from '@/components/auth/LoginForm'
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '',
  }),
  usePathname: () => '',
}))

// Mock Supabase authentication methods
jest.mock('@/lib/supabase/client', () => {
  return {
    __esModule: true,
    default: {
      auth: {
        signInWithPassword: jest.fn(),
        signInWithOAuth: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: jest.fn().mockReturnValue({ 
          data: { subscription: { unsubscribe: jest.fn() } }
        }),
      }
    }
  }
})

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  }
}))

// Simple wrapper component to test useAuth hook
const AuthConsumer = () => {
  const auth = useAuth()
  return (
    <div>
      {auth.isAuthenticated ? 'Authenticated' : 'Not authenticated'}
      <button onClick={() => auth.signInWithGoogle()}>Sign in with Google</button>
      <button onClick={() => auth.signOut()}>Sign out</button>
    </div>
  )
}

describe('Authentication', () => {
  describe('Auth Provider', () => {
    it('provides authentication context to children', async () => {
      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      )
      
      // Initially not authenticated
      expect(screen.getByText('Not authenticated')).toBeInTheDocument()
      
      // Sign in and sign out buttons are present
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
      expect(screen.getByText('Sign out')).toBeInTheDocument()
    })
  })
  
  describe('Login Form', () => {
    it('renders login form with all elements', () => {
      render(
        <AuthProvider>
          <LoginForm />
        </AuthProvider>
      )
      
      // Check for form elements
      expect(screen.getByText('Login')).toBeInTheDocument()
      expect(screen.getByText('Track your sustainability metrics securely')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByLabelText('Remember me')).toBeInTheDocument()
      expect(screen.getByText('Forgot password?')).toBeInTheDocument()
      expect(screen.getByText('Google')).toBeInTheDocument()
      expect(screen.getByText('Don\'t have an account?')).toBeInTheDocument()
      expect(screen.getByText('Sign up')).toBeInTheDocument()
    })
    
    it('handles form submission', async () => {
      render(
        <AuthProvider>
          <LoginForm />
        </AuthProvider>
      )
      
      // Fill out form
      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' }
      })
      
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'Password123!' }
      })
      
      // Submit form
      fireEvent.click(screen.getByText('Log in'))
      
      // Wait for form submission to complete
      await waitFor(() => {
        expect(screen.getByText('Log in')).not.toBeDisabled()
      })
    })
  })
}) 