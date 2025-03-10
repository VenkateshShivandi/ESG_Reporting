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
    if (typeof window === 'undefined') return null
    try {
      const item = window.localStorage.getItem(key)
      if (!item) return null
      // If it's a JWT token, return as is without parsing
      if (item.startsWith('eyJ')) return item
      // Otherwise try to parse as JSON
      return JSON.parse(item)
    } catch (error) {
      console.error('Storage getItem error:', error)
      return null
    }
  },
  setItem: (key: string, value: any) => {
    if (typeof window === 'undefined') return
    try {
      // If it's a string (like a JWT), store directly
      if (typeof value === 'string') {
        window.localStorage.setItem(key, value)
      } else {
        // Otherwise stringify the object
        window.localStorage.setItem(key, JSON.stringify(value))
      }
    } catch (error) {
      console.error('Storage setItem error:', error)
    }
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(key)
    } catch (error) {
      console.error('Storage removeItem error:', error)
    }
  }
}

// Clear any potentially corrupted tokens from storage
if (typeof window !== 'undefined') {
  customStorage.removeItem('supabase.auth.token')
  customStorage.removeItem('supabase.auth.expires_at')
  customStorage.removeItem('supabase.auth.refresh_token')
  customStorage.removeItem('jwt_token')
}

// Create a single instance
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Add verification log
if (typeof window !== 'undefined') {
  console.log("🔑 Supabase client initialized with browser-safe storage")
}

export default supabase 