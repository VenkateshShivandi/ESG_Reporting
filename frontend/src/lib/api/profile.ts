import { type User } from '@supabase/supabase-js'

interface ProfileUpdateData {
  name?: string
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
    const response = await fetch('/api/edit-profile', {
      method: 'PUT', // or 'PATCH' depending on your API design
      headers: {
        'Content-Type': 'application/json',
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
