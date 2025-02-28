'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProfileRedirectPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to dashboard with profile tab
    router.replace('/dashboard?tab=profile')
  }, [router])
  
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-[#2E7D32] mx-auto"></div>
        <p className="mt-4 text-lg text-gray-700">Redirecting to profile...</p>
      </div>
    </div>
  )
} 