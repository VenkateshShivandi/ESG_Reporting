'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { User, Session } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
import { toast } from 'sonner'
import supabase, { refreshSupabaseClient } from '@/lib/supabase/client'

// Types for our authentication context
interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{
    error: Error | null
  }>
  signUp: (email: string, password: string) => Promise<{
    error: Error | null
  }>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

// Create authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provider component that wraps your app and makes auth object available to any child component that calls useAuth().
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const router = useRouter()
  const pathname = usePathname()

  // Check for active session on mount and listen for auth state changes
  useEffect(() => {
    // Refresh the Supabase client with the current storage preference
    refreshSupabaseClient()
    
    // Get session on initial load
    const getSession = async () => {
      try {
        setIsLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          localStorage.setItem('jwt_token', session.access_token)
          setSession(session)
          setUser(session.user)
        }
      } catch (error) {
        Sentry.captureException(error)
        console.error('Error getting session:', error)
      } finally {
        setIsLoading(false)
      }
    }

    getSession()

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setSession(session)
          setUser(session.user)
          
          // Check if on auth page and redirect if needed
          if (pathname?.includes('/auth/') && pathname !== '/auth/update-password') {
            router.push('/dashboard')
          }
        } else {
          setSession(null)
          setUser(null)
          
          // Handle "Signed Out" event and redirect to login
          if (event === 'SIGNED_OUT') {
            // Prevent redirect loop by checking current path
            if (!pathname?.includes('/auth/') && pathname !== '/') {
              router.push('/auth/login')
            }
          }
        }
      }
    )

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [router, pathname])

  // Sign in with email and password
  const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      // Store the rememberMe preference in localStorage
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true')
      } else {
        localStorage.removeItem('rememberMe')
      }
      
      // Refresh the Supabase client with the new storage preference
      refreshSupabaseClient()
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      // Redirect will happen in auth state change listener
      toast.success('Welcome back!', {
        description: 'You have successfully logged in.',
      })
      
      return { error: null }
    } catch (error) {
      Sentry.captureException(error)
      console.error('Error signing in:', error)
      toast.error('Login failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      })
      return { error: error as Error }
    }
  }

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (error) throw error
      
      toast.success('Account created!', {
        description: 'Please check your email to confirm your account.',
      })
      
      return { error: null }
    } catch (error) {
      Sentry.captureException(error)
      console.error('Error signing up:', error)
      toast.error('Signup failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      })
      return { error: error as Error }
    }
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          // Include these scopes for GDPR compliance
          scopes: 'email profile',
        }
      })
      
      if (error) throw error      
      // No need for a toast here as we're redirecting to Google
    } catch (error) {
      Sentry.captureException(error)
      console.error('Error signing in with Google:', error)
      toast.error('Google login failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      })
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      // Set a flag in sessionStorage to indicate an intentional signout
      // This will be used to prevent the dashboard layout from redirecting to login
      sessionStorage.setItem('intentionalSignOut', 'true')
      
      // Clear rememberMe preference
      localStorage.removeItem('rememberMe')
      
      // Refresh the Supabase client with the new storage preference
      refreshSupabaseClient()
      
      await supabase.auth.signOut()
      toast.success('Signed out successfully')
      
      // Immediate redirect to landing page instead of waiting for auth state change
      router.push('/')
      
      // Auth state change listener will still clean up the state
    } catch (error) {
      Sentry.captureException(error)
      console.error('Error signing out:', error)
      toast.error('Sign out failed', {
        description: 'An unexpected error occurred',
      })
    }
  }

  // The value object that will be shared with consumers of this context
  const value = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signInWithGoogle,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

// Higher-order component to protect routes
export function withAuth(Component: React.ComponentType) {
  return function WithAuth(props: any) {
    const { isAuthenticated, isLoading } = useAuth()
    const router = useRouter()
    
    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push('/auth/login')
      }
    }, [isAuthenticated, isLoading, router])
    
    if (isLoading) {
      return <div>Loading...</div>
    }
    
    if (!isAuthenticated) {
      return null
    }
    
    return <Component {...props} />
  }
} 