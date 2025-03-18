'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { User, Session } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
import { toast } from 'sonner'
import supabase from '@/lib/supabase/client'
import { signIn as authSignIn, signUp as authSignUp, signOut as authSignOut } from '@/lib/auth'

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
  // ===== DEV BYPASS - REMOVE BEFORE PRODUCTION =====
  // This bypasses authentication for development purposes
  const DEV_BYPASS_AUTH = false; // Changed to false to re-enable normal authentication
  
  // Avoid pre-creating these objects for performance
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const router = useRouter()
  const pathname = usePathname()

  // Check for active session on mount and listen for auth state changes
  useEffect(() => {
    if (DEV_BYPASS_AUTH) {
      // Only create mock objects if needed
      const mockUser = {
        id: 'dev-user-123',
        email: 'dev@example.com',
        role: 'user',
        app_metadata: {},
        user_metadata: { name: 'Dev User' },
        aud: 'authenticated',
        created_at: new Date().toISOString()
      } as User;
      
      const mockSession = {
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: mockUser
      } as Session;
      
      setUser(mockUser);
      setSession(mockSession);
      setIsLoading(false)
      return () => {}
    }
    
    const getSession = async () => {
      try {
        setIsLoading(true)
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          return
        }
        
        if (session) {
          console.log("🔑 Initial session loaded")
          setSession(session)
          setUser(session.user)
        }
      } catch (error) {
        console.error('Error getting session:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    getSession()

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔑 Auth State Change:", { 
          event, 
          hasSession: !!session,
          path: pathname,
          loading: isLoading
        })
        
        switch (event) {
          case 'SIGNED_IN':
            console.log("👤 User signed in", {
              user: session?.user?.email,
              currentPath: pathname
            })
            if (session) {
              // We should trust Supabase here - if we got a session, user is authenticated
              // The email_confirmed_at check is already handled by Supabase internally
              setSession(session)
              setUser(session.user)
              
              // If they're on an auth page, redirect to dashboard
              if (pathname?.includes('/auth/') && pathname !== '/auth/update-password') {
                router.push('/dashboard')
              }
            }
            break
            
          case 'SIGNED_OUT':
            console.log("👋 User signed out")
            setSession(null)
            setUser(null)
            if (!pathname?.includes('/auth/') && pathname !== '/') {
              router.push('/auth/login')
            }
            break
            
          case 'TOKEN_REFRESHED':
            console.log("🔄 Token refreshed")
            if (session) {
              setSession(session)
              setUser(session.user)
            }
            break
            
          case 'USER_UPDATED':
            console.log("📝 User updated")
            if (session) {
              setSession(session)
              setUser(session.user)
              
              // Show confirmation message if we detect this is a newly confirmed account
              if (session.user.email_confirmed_at || session.user.confirmed_at) {
                toast.success("Email verified successfully!", {
                  description: "Your account is now active. Please sign in to continue."
                })
              }
            }
            break
        }
      }
    )

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [router, pathname])

  // Calculate if user is authenticated
  const isAuthenticated = DEV_BYPASS_AUTH || !!user

  // Sign in with email and password
  const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
    if (DEV_BYPASS_AUTH) {
      toast.success('Logged in as development user')
      router.push('/dashboard')
      return { error: null }
    }
    
    try {
      const { data, error } = await authSignIn(email, password)
      
      if (error) {
        console.error('Login error:', error)
        toast.error('Login failed', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
        })
        return { error: error as Error }
      }
      
      // Show success toast when user signs in successfully
      toast.success('Logged in successfully', {
        description: 'Welcome back to your ESG dashboard!',
        duration: 3000,
      })
      
      // Don't manually set the session - Supabase will handle this automatically
      // and the onAuthStateChange listener will pick up the changes
      console.log("Login successful, session will be handled automatically")
      
      return { error: null }
    } catch (error) {
      console.error('Error signing in:', error)
      toast.error('Login failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      })
      return { error: error as Error }
    }
  }

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    if (DEV_BYPASS_AUTH) {
      // Just pretend it worked
      toast.success('Account created in development mode')
      router.push('/dashboard')
      return { error: null }
    }
    
    try {
      const { data, error, message } = await authSignUp(email, password)
      
      if (error) throw error
      
      // Show the email verification message with more details
      toast.success('Account created!', {
        description: message || 'Please check your email to confirm your account before logging in.',
        duration: 10000, // Show for longer to ensure user sees it
      })
      
      // Don't redirect to dashboard - user needs to verify email first
      return { error: null }
    } catch (error) {
      console.error('Error signing up:', error)
      toast.error('Signup failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      })
      return { error: error as Error }
    }
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    if (DEV_BYPASS_AUTH) {
      toast.success('Google login simulated in development mode')
      router.push('/dashboard')
      return
    }
    
    try {
      console.log("🔑 Attempting to login with Google")
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          skipBrowserRedirect: false // Ensure automatic redirect
        }
      })
      
      if (error) throw error
      
      // The redirect will happen automatically, no need to handle it manually
      console.log("🔑 Redirecting to Google OAuth...")
      
    } catch (error) {
      console.error('❌ Error signing in with Google:', error)
      toast.error('Google login failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      })
    }
  }

  // Sign out
  const signOut = async () => {
    if (DEV_BYPASS_AUTH) {
      toast.success('Sign out simulated (but staying authenticated in dev mode)')
      router.push('/auth/login')
      return
    }
    
    try {
      // Set a flag in sessionStorage to indicate an intentional signout
      sessionStorage.setItem('intentionalSignOut', 'true')
      
      await supabase.auth.signOut()
      toast.success('Signed out successfully')
      
      // Immediate redirect to landing page instead of waiting for auth state change
      router.push('/')
      
      // Auth state change listener will still clean up the state
    } catch (error) {
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
    isAuthenticated,
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
        console.log("🔒 Not authenticated, redirecting to login")
        router.push('/auth/login')
      }
    }, [isAuthenticated, isLoading, router])
    
    if (isLoading) {
      // Show a loading state while checking authentication
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-2 text-sm text-slate-600">Loading...</p>
          </div>
        </div>
      )
    }
    
    // Don't render anything if not authenticated (prevents flash of content)
    if (!isLoading && !isAuthenticated) {
      return null
    }
    
    return <Component {...props} />
  }
} 