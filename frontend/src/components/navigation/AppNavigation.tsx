'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  BarChart3Icon,
  FileUpIcon,
  HomeIcon,
  LogOutIcon,
  MenuIcon,
  MessageCircleIcon,
  UserIcon,
  XIcon,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export default function AppNavigation() {
  const { isAuthenticated, user, signOut } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)
  const closeMenu = () => setIsMenuOpen(false)

  // Define navigation items based on authentication status
  const navItems = isAuthenticated
    ? [
        { href: '/dashboard', label: 'Dashboard', icon: <BarChart3Icon className="h-5 w-5" /> },
        { href: '/dashboard?tab=documents', label: 'Documents', icon: <FileUpIcon className="h-5 w-5" /> },
        { href: '/dashboard?tab=chat', label: 'AI Assistant', icon: <MessageCircleIcon className="h-5 w-5" /> },
        { href: '/dashboard?tab=profile', label: 'Profile', icon: <UserIcon className="h-5 w-5" /> },
      ]
    : [
        { href: '/', label: 'Home', icon: <HomeIcon className="h-5 w-5" /> },
        { href: '/auth/login', label: 'Sign In', icon: <UserIcon className="h-5 w-5" /> },
      ]

  const isActive = (path: string) => {
    if (path === '/dashboard' && pathname === '/dashboard') {
      return true
    }
    if (path.includes('?tab=') && pathname?.startsWith('/dashboard')) {
      const tabParam = path.split('?tab=')[1]
      const currentTab = new URLSearchParams(window.location.search).get('tab')
      return currentTab === tabParam
    }
    if (path !== '/dashboard' && pathname?.startsWith(path)) {
      return true
    }
    return false
  }

  // Function to handle navigation clicks
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href === '/dashboard') {
      e.preventDefault()
      // For the dashboard tab specifically
      const newUrl = new URL(window.location.href)
      
      // Remove any existing tab parameter
      newUrl.searchParams.delete('tab')
      
      // Update URL without page reload
      window.history.pushState({}, '', newUrl.toString())
      
      // Dispatch an event to change to the home tab
      window.dispatchEvent(new CustomEvent('tabChange', { 
        detail: { tab: 'home' }
      }))
      
      closeMenu()
    } else if (href.includes('?tab=')) {
      e.preventDefault()
      const tabId = href.split('?tab=')[1]
      
      // Update URL without page reload
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.set('tab', tabId)
      window.history.pushState({}, '', newUrl.toString())
      
      // Dispatch an event to change tabs
      window.dispatchEvent(new CustomEvent('tabChange', { 
        detail: { tab: tabId }
      }))
      
      closeMenu()
    }
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed top-4 right-4 z-50 md:hidden">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-white shadow-md"
          onClick={toggleMenu}
        >
          {isMenuOpen ? (
            <XIcon className="h-5 w-5 text-[#2E7D32]" />
          ) : (
            <MenuIcon className="h-5 w-5 text-[#2E7D32]" />
          )}
          <span className="sr-only">{isMenuOpen ? 'Close menu' : 'Open menu'}</span>
        </Button>
      </div>

      {/* Desktop navigation */}
      <div className="hidden border-r border-gray-200 bg-white md:fixed md:inset-y-0 md:left-0 md:z-50 md:block md:w-64">
        <div className="flex h-full flex-col">
          <div className="border-b border-gray-200 px-6 py-6">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-[#2E7D32]">
              <span className="flex h-8 w-8 items-center justify-center rounded-md text-[#2E7D32]">
                ESG
              </span>
              <span>Reporting</span>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                  isActive(item.href)
                    ? 'bg-[#E8F5E9] text-[#2E7D32]'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={(e) => handleNavClick(e, item.href)}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>

          {isAuthenticated && (
            <div className="border-t border-gray-200 p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8F5E9] text-[#2E7D32]">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="overflow-hidden">
                  <p className="truncate text-sm font-medium">{user?.email}</p>
                  <p className="text-xs text-gray-500">
                    {user?.app_metadata?.provider
                      ? `Signed in with ${user.app_metadata.provider}`
                      : 'Signed in with email'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-gray-700"
                onClick={() => signOut()}
              >
                <LogOutIcon className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/20" onClick={closeMenu} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xs overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-between mb-6">
              <Link href="/" className="-m-1.5 p-1.5" onClick={closeMenu}>
                <span className="flex items-center gap-2 text-lg font-semibold text-[#2E7D32]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md text-[#2E7D32]">
                    ESG
                  </span>
                  <span>Reporting</span>
                </span>
              </Link>
              <Button variant="ghost" size="icon" onClick={closeMenu}>
                <XIcon className="h-5 w-5" />
                <span className="sr-only">Close menu</span>
              </Button>
            </div>
            <nav className="space-y-1 pb-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium ${
                    isActive(item.href)
                      ? 'bg-[#E8F5E9] text-[#2E7D32]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={(e) => handleNavClick(e, item.href)}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
              {isAuthenticated && (
                <Button
                  variant="outline"
                  className="mt-4 w-full justify-start gap-2 text-gray-700"
                  onClick={() => {
                    signOut()
                    closeMenu()
                  }}
                >
                  <LogOutIcon className="h-4 w-4" />
                  Sign Out
                </Button>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  )
} 