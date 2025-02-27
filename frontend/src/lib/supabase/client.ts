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

// Check if in browser environment
const isBrowser = typeof window !== 'undefined'

// Create a custom storage handler
const customStorage = {
  getItem: (key: string) => {
    if (isBrowser) {
      return localStorage.getItem(key)
    }
    return null
  },
  setItem: (key: string, value: string) => {
    if (isBrowser) {
      localStorage.setItem(key, value)
    }
  },
  removeItem: (key: string) => {
    if (isBrowser) {
      localStorage.removeItem(key)
    }
  }
}

// Function to create a Supabase client with the current storage preference
export const createSupabaseClient = (shouldRemember = true) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      // Only use storage in browser environment
      storage: isBrowser
        ? shouldRemember
          ? localStorage 
          : sessionStorage
        : customStorage // Use custom storage on server side
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