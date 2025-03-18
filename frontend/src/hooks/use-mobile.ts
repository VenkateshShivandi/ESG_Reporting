"use client"

import { useState, useEffect } from 'react'

// Original hook used in page.tsx
export const useMobile = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768) // Adjust breakpoint as needed
    }

    // Set initial value
    handleResize()

    // Add event listener
    window.addEventListener("resize", handleResize)

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return isMobile
}

// Alternative hook used in sidebar.tsx
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${768 - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < 768)
    }
    mql.addEventListener('change', onChange)
    setIsMobile(window.innerWidth < 768)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return !!isMobile
} 