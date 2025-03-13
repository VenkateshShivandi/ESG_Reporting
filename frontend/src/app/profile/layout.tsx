'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import AppNavigation from '@/components/navigation/AppNavigation'

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  // Pass through to children - authentication handled by higher level layout
  return children
} 