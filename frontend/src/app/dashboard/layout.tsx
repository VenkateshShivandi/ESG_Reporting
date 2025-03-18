'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  
  // Set mounted state after component mounts to access sessionStorage
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Single authentication check for all protected routes
  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      // Check if this is an intentional signout
      const isIntentionalSignOut = sessionStorage.getItem('intentionalSignOut') === 'true'
      
      if (isIntentionalSignOut) {
        // Clear the flag and don't redirect (the signOut function will handle the redirect)
        sessionStorage.removeItem('intentionalSignOut')
      } else {
        // Not an intentional signout, redirect to login
        router.push('/auth/login')
      }
    }
  }, [isAuthenticated, isLoading, router, mounted])
  
  // Show loading state while checking authentication
  if (isLoading || !mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-[#2E7D32] mx-auto"></div>
          <p className="mt-4 text-lg text-gray-700">Loading...</p>
        </div>
      </div>
    )
  }
  
  // Only render children if authenticated
  if (!isAuthenticated) {
    return null // Don't show anything while redirecting
  }
  
  return children
}
