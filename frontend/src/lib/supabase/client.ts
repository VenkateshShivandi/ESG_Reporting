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

// Custom storage implementation that works in both client and server environments
const customStorage = {
  getItem: (key: string) => {
    // Early return if we're in a server context
    if (typeof window === 'undefined') return null
    
    try {
      const item = window.localStorage.getItem(key)
      if (!item) return null
      
      // Check if it's a JWT token (only if item exists)
      if (typeof item === 'string' && item.startsWith('eyJ')) {
        return item as string | null
      }
      
      // Try to parse as JSON
      try {
        return JSON.parse(item)
      } catch {
        // If parsing fails, return the raw value
        return item as string | null
      }
    } catch (error) {
      console.error('Storage getItem error:', error)
      return null
    }
  },
  setItem: (key: string, value: any) => {
    try {
      if (typeof window === 'undefined') return
      const valueToStore = typeof value === 'string' ? value : JSON.stringify(value)
      window.localStorage.setItem(key, valueToStore)
    } catch (error) {
      console.error('Storage setItem error:', error)
    }
  },
  removeItem: (key: string) => {
    try {
      if (typeof window === 'undefined') return
      window.localStorage.removeItem(key)
    } catch (error) {
      console.error('Storage removeItem error:', error)
    }
  }
}

// Create a single instance with the custom storage
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Only perform client-side initialization
if (typeof window !== 'undefined') {
  // Add verification log
  console.log("🔑 Supabase client initialized with browser-safe storage")
}

export default supabase 