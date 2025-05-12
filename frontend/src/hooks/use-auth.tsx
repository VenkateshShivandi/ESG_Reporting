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
      
      console.log('Using development bypass authentication');
      setUser(mockUser);
      setSession(mockSession);
      setIsLoading(false)
      return () => {}
    }
    
    const addUserToGraph = async (userId: string, email: string) => {
      try {
        const response = await fetch('http://localhost:6050/api/v1/add-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ user_id: userId, email })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn('Graph database integration unavailable:', errorText);
          return false;
        }

        const result = await response.json();
        console.log('User added to graph database:', result);
        return true;
      } catch (error) {
        console.warn('Graph database service unavailable:', error);
        return false;
      }
    };

    const getSession = async () => {
      try {
        setIsLoading(true)
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Failed to get session from Supabase:', error);
          return;
        }
        
        if (session) {
          console.log('Initial session loaded for user:', session.user.email);

          // Set session and user immediately
          setSession(session);
          setUser(session.user);

          // Attempt to add user to graph database in the background
          if (session.user?.id && session.user?.email) {
            addUserToGraph(session.user.id, session.user.email)
              .catch(error => {
                console.error('Unexpected error in graph database integration:', error);
              });
          }
        } else {
          console.log('No active session found');
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setIsLoading(false)
      }
    }
    
    getSession()

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, !!session);
        
        switch (event) {
          case 'SIGNED_IN':
            if (session) {
              setSession(session)
              setUser(session.user)
              
              if (pathname?.includes('/auth/') && pathname !== '/auth/update-password') {
                router.push('/dashboard')
              }
            }
            break
            
          case 'SIGNED_OUT':
            setSession(null)
            setUser(null)
            if (!pathname?.includes('/auth/') && pathname !== '/') {
              router.push('/auth/login')
            }
            break
            
          case 'TOKEN_REFRESHED':
            if (session) {
              setSession(session)
              setUser(session.user)
            }
            break
            
          case 'USER_UPDATED':
            if (session) {
              setSession(session)
              setUser(session.user)
              
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

    return () => {
      console.log('Cleaning up auth state listener');
      subscription.unsubscribe()
    }
  }, [router, pathname])

  // Calculate if user is authenticated
  const isAuthenticated = DEV_BYPASS_AUTH || !!user

  // Sign in with email and password
  const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
    if (DEV_BYPASS_AUTH) {
      console.log('Development bypass login');
      toast.success('Logged in as development user')
      router.push('/dashboard')
      return { error: null }
    }
    
    try {
      const { data, error } = await authSignIn(email, password)
      
      if (error) {
        console.error('Login failed:', error);
        toast.error('Login failed', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
        })
        return { error: error as Error }
      }
      
      toast.success('Logged in successfully', {
        description: 'Welcome back to your ESG dashboard!',
        duration: 3000,
      })
      
      return { error: null }
    } catch (error) {
      console.error('Unexpected error during sign in:', error);
      toast.error('Login failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      })
      return { error: error as Error }
    }
  }

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    if (DEV_BYPASS_AUTH) {
      console.log('Development bypass signup');
      toast.success('Account created in development mode')
      router.push('/dashboard')
      return { error: null }
    }
    
    try {
      const { data, error, message } = await authSignUp(email, password)
      
      if (error) throw error
      
      toast.success('Account created!', {
        description: message || 'Please check your email to confirm your account before logging in.',
        duration: 10000,
      })
      
      return { error: null }
    } catch (error) {
      console.error('Signup failed:', error);
      toast.error('Signup failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      })
      return { error: error as Error }
    }
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    if (DEV_BYPASS_AUTH) {
      console.log('Development bypass Google login');
      toast.success('Google login simulated in development mode')
      router.push('/dashboard')
      return
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          skipBrowserRedirect: false
        }
      })

      if(data.url) {
        const { data: { user } } = await supabase.auth.getUser()
        console.log('Google OAuth URL generated');
      } else {
        console.warn('No OAuth URL generated');
      }
      
      if (error) throw error
      
    } catch (error) {
      console.error('Google login failed:', error);
      toast.error('Google login failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      })
    }
  }

  // Sign out
  const signOut = async () => {
    if (DEV_BYPASS_AUTH) {
      console.log('Development bypass sign out');
      toast.success('Sign out simulated (but staying authenticated in dev mode)')
      router.push('/auth/login')
      return
    }
    
    try {
      sessionStorage.setItem('intentionalSignOut', 'true')
      
      await supabase.auth.signOut()
      toast.success('Signed out successfully')
      
      router.push('/')
      
    } catch (error) {
      console.error('Sign out failed:', error);
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