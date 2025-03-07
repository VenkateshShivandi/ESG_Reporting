import { createClient } from '@supabase/supabase-js'
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
    const { data, error } = await supabase.auth.signUp({
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

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    localStorage.removeItem('jwt_token')
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
    
    if (session) {
      await storeAuthToken(session)
    }
    
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
    const { data, error } = await supabase.auth.updateUser({ password })
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

export async function storeAuthToken(session: any) {
  try {
    if (session?.access_token) {
      localStorage.setItem('jwt_token', session.access_token)
      console.log("🔑 JWT Token stored:", {
        token: session.access_token.slice(0, 20) + "...",
        stored: !!localStorage.getItem('jwt_token'),
        type: session.token_type  // Usually 'Bearer'
      })
    }
  } catch (error) {
    console.error("Error storing JWT token:", error)
    Sentry.captureException(error)
  }
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem('jwt_token')
  } catch (error) {
    console.error("Error getting JWT token:", error)
    Sentry.captureException(error)
    return null
  }
}
