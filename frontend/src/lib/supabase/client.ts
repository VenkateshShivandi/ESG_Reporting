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

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Export the client as the default export for easier imports
export default supabase 