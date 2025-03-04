/**
 * This file provides a centralized Supabase client instance that can be used
 * throughout the application, ensuring consistent authentication state.
 */
import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'

// Create a single supabase client for interacting with your database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Initialize the Supabase client with error handling
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  Sentry.captureMessage('Missing Supabase environment variables')
}

// Safe checks for browser environment
const isBrowser = typeof window !== 'undefined'
const getLocalStorage = () => (isBrowser ? localStorage : undefined)
const getSessionStorage = () => (isBrowser ? sessionStorage : undefined)

// Function to create a Supabase client with the current storage preference
const createSupabaseClient = () => {
  // Check if user has selected "Remember Me" from localStorage (only in browser)
  const shouldRemember = isBrowser && localStorage.getItem('rememberMe') === 'true'
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true, // Always persist the session
      storage: shouldRemember ? getLocalStorage() : getSessionStorage() // Use appropriate storage based on "Remember Me"
    }
  })
}

// Create the initial Supabase client
export let supabase = createSupabaseClient()

// Function to refresh the client with current storage preferences
export const refreshSupabaseClient = () => {
  supabase = createSupabaseClient()
  return supabase
}

// Export the client as the default export for easier imports
export default supabase 