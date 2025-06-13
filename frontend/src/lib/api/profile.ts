import { type User } from '@supabase/supabase-js'
import supabase from '@/lib/supabase/client'

interface ProfileUpdateData {
  jobTitle?: string
  // Add other profile fields as needed
}

interface ProfileResponse {
  user: User
  message: string
}

/**
 * Updates the user's profile information
 * @param data - Profile data to update
 * @returns Promise with the updated user data and success message
 */
export async function updateProfile(data: ProfileUpdateData): Promise<ProfileResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('No active session')
    }
    
    const response = await fetch('http://localhost:5050/api/edit-profile', {
      method: 'PUT', 
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Failed to update profile')
    }

    const result = await response.json()
    return result
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to update profile')
  }
}
