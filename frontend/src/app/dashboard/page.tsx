'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Container } from '@/pages/ContainerPage'
import { usePathname } from 'next/navigation'
import { Metadata } from 'next'

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  const titles = {
    "/dashboard": "Dashboard - ESG Reporting Platform",
    "/dashboard?tab=analytics": "Analytics - ESG Reporting Platform",
    "/dashboard?tab=documents": "Documents - ESG Reporting Platform",
    "/dashboard?tab=chat": "Chat - ESG Reporting Platform",
    "/dashboard?tab=profile": "User Profile",
  } as const;

  type TitleKeys = keyof typeof titles;

  const getTitleKey = (): TitleKeys => {
    const tab = searchParams?.get('tab')
    const key = tab ? `/dashboard?tab=${tab}` : '/dashboard'
    return key as TitleKeys
  }

  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (!tab) {
      router.replace('/dashboard?tab=analytics', { scroll: false })
    }
    // Update document title dynamically
    document.title = titles[getTitleKey()] ?? titles["/dashboard"]
  }, [searchParams, router, getTitleKey])

  return <Container />
}
