import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import SignupForm from '@/components/auth/SignupForm'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// 1) Mock `@/hooks/use-auth`
jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(() => ({
    signUp: jest.fn(),
    signInWithGoogle: jest.fn(),
  })),
}))

// 2) Mock `next/navigation`
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
  })),
  // Add other hooks like usePathname or useSearchParams here if needed
  usePathname: jest.fn(() => '/'),
}))

// 3) Mock sonner (toast)
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('SignupForm', () => {
  let mockSignUp: jest.Mock
  let mockSignInWithGoogle: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    // Before each test, reset mockSignUp and mockSignInWithGoogle
    mockSignUp = jest.fn()
    mockSignInWithGoogle = jest.fn()

      // Reset useAuth return value
      ; (useAuth as jest.Mock).mockReturnValue({
        signUp: mockSignUp,
        signInWithGoogle: mockSignInWithGoogle,
      })

      // Similarly reset useRouter's push
      ; (useRouter as jest.Mock).mockReturnValue({
        push: mockPush,
      })

    // Render component
    render(<SignupForm />)
  })

  it('renders the signup form with all inputs', () => {
    // Title - using 'div' selector to avoid conflict with button text
    const headingElement = screen.getByText('Sign Up', { selector: 'div' })
    expect(headingElement).toBeInTheDocument()

    // Description
    expect(screen.getByText('Join our green reporting community')).toBeInTheDocument()

    // Input fields
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()

    // Button (using role=button for "Sign Up")
    expect(screen.getByRole('button', { name: /Sign Up/i })).toBeInTheDocument()
  })

  it('calls signUp on form submission and navigates to "/dashboard"', async () => {
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    // Simulate user input
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'Password123!')
    await userEvent.type(confirmPasswordInput, 'Password123!')

    // Mock successful signUp response
    mockSignUp.mockResolvedValueOnce({ error: null })

    // Submit form
    await userEvent.click(submitButton)

    // Check if signUp is called
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'Password123!')
    })

    // Check navigation to /dashboard
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    // Check success toast
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Welcome!', {
        description: 'Your account has been created successfully.',
      })
    })
  })

  it('shows password strength meter when password is entered', async () => {
    const passwordInput = screen.getByLabelText('Password')
    await userEvent.type(passwordInput, 'Password123!')
    // Assert that 'Password strength' text appears
    expect(screen.getByText(/password strength/i)).toBeInTheDocument()
  })

  it('links navigate to correct paths', () => {
    const loginLink = screen.getByText('Log in')
    const homeLink = screen.getByText('Back to Home')
    expect(loginLink.closest('a')).toHaveAttribute('href', '/auth/login')
    expect(homeLink.closest('a')).toHaveAttribute('href', '/')
  })
})
