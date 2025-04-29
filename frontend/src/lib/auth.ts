import * as Sentry from '@sentry/nextjs'
import supabase from '@/lib/supabase/client'

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    Sentry.captureException(error)
    return { data: null, error }
  }
}

export async function signUp(email: string, password: string) {
  try {
    // Configure signup with optimized settings for faster email delivery
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        // Add minimal data to speed up processing
        data: {
          signup_timestamp: Date.now()
        }
      }
    })

    if (data.user) {
      // Call the API to add user to the graph database from the RAG API Set
      
    }

    if (error) throw error

    // Show success message with clear instructions
    return { 
      data, 
      error: null,
      message: 'Verification email sent! Please check your inbox for the confirmation link.'
    }
  } catch (error) {
    console.error('Error signing up:', error)
    return { data: null, error }
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { error: null }
  } catch (error) {
    Sentry.captureException(error)
    return { error }
  }
}

export async function getSession() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()
    if (error) throw error
    return { session, error: null }
  } catch (error) {
    Sentry.captureException(error)
    return { session: null, error }
  }
}

export async function resetPassword(email: string) {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    Sentry.captureException(error)
    return { data: null, error }
  }
}

export async function updatePassword(password: string) {
  try {
    const { data, error } = await supabase.auth.updateUser({ 
      password
    })
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    Sentry.captureException(error)
    return { data: null, error }
  }
}

export async function getCurrentSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  } catch (error) {
    console.error("Error getting current session:", error)
    return null
  }
}

// Get the current access token from the session
export async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  } catch (error) {
    console.error("Error getting access token:", error)
    Sentry.captureException(error)
    return null
  }
}
