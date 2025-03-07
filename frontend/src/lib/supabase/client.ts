/**
 * This file provides a centralized Supabase client instance that can be used
 * throughout the application, ensuring consistent authentication state.
 */
import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'

// Create a single supabase client for interacting with your database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Initialize the Supabase client with error handling
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  Sentry.captureMessage('Missing Supabase environment variables')
}

// Create a single instance
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: {
      getItem: (key) => {
        if (typeof window === 'undefined') return null
        const value = window.localStorage.getItem('jwt_token')
        return value ? JSON.parse(value) : null
      },
      setItem: (key, value) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('jwt_token', JSON.stringify(value))
        }
      },
      removeItem: (key) => {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('jwt_token')
        }
      }
    }
  }
})

// Add verification log
console.log("🔑 Supabase client initialized with browser-safe storage")

export default supabase 