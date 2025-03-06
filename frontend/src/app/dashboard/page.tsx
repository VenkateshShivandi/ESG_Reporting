'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Container } from '@/pages/ContainerPage'

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Ensure the tab parameter is set when visiting the dashboard directly
  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (!tab) {
      // No tab parameter, set analytics tab without a full page navigation
      // The replace method is used with scroll:false to prevent unnecessary scrolling
      router.replace('/dashboard?tab=analytics', { scroll: false })
    }
  }, [searchParams, router])

  return <Container />
}
