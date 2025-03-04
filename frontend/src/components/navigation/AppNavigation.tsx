'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/app/dashboard/layout'
import {
  BarChart3Icon,
  FileUpIcon,
  HomeIcon,
  LogOutIcon,
  MenuIcon,
  MessageCircleIcon,
  UserIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export default function AppNavigation() {
  const { isAuthenticated, user, signOut } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Local state as fallback if context is not available
  const [localIsExpanded, setLocalIsExpanded] = useState(true)
  
  // Try to use the context, fall back to local state if not available
  let sidebarContext = null;
  try {
    sidebarContext = useSidebar();
  } catch (e) {
    // Context not available, will use local state
  }
  
  const isExpanded = sidebarContext?.isExpanded ?? localIsExpanded
  const setIsExpanded = sidebarContext?.setIsExpanded ?? setLocalIsExpanded

  // State to track the current active tab
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    // Initialize from URL if available
    return searchParams?.get('tab') || 'analytics'
  })

  // Update active tab when URL changes
  useEffect(() => {
    const currentTab = searchParams?.get('tab')
    if (currentTab) {
      setActiveTabId(currentTab)
    } else if (pathname === '/dashboard') {
      setActiveTabId('analytics')
    }
  }, [searchParams, pathname])

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)
  const closeMenu = () => setIsMenuOpen(false)
  const toggleSidebar = () => setIsExpanded(!isExpanded)

  // Define navigation items based on authentication status
  const navItems = isAuthenticated
    ? [
      { href: '/dashboard', label: 'Dashboard', icon: <BarChart3Icon className="h-5 w-5" />, id: 'analytics' },
      { href: '/dashboard?tab=documents', label: 'Documents', icon: <FileUpIcon className="h-5 w-5" />, id: 'documents' },
      { href: '/dashboard?tab=chat', label: 'AI Assistant', icon: <MessageCircleIcon className="h-5 w-5" />, id: 'chat' },
      { href: '/dashboard?tab=profile', label: 'Profile', icon: <UserIcon className="h-5 w-5" />, id: 'profile' },
    ]
    : [
      { href: '/', label: 'Home', icon: <HomeIcon className="h-5 w-5" />, id: 'home' },
      { href: '/auth/login', label: 'Sign In', icon: <UserIcon className="h-5 w-5" />, id: 'signin' },
    ]

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return activeTabId === 'analytics'
    }

    if (path.includes('?tab=')) {
      const tabParam = path.split('?tab=')[1]
      return activeTabId === tabParam
    }

    if (path !== '/dashboard' && pathname?.startsWith(path)) {
      return true
    }

    return false
  }

  // Function to handle navigation clicks
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault() // Prevent default for all navigation

    if (href === '/dashboard') {
      // For the dashboard tab specifically
      const targetTab = 'analytics'

      // Update our local state immediately
      setActiveTabId(targetTab)

      // Then update the URL
      router.replace(`/dashboard?tab=${targetTab}`, { scroll: false })

      // Dispatch an event to change to the analytics tab
      window.dispatchEvent(new CustomEvent('tabChange', {
        detail: { tab: targetTab }
      }))

      closeMenu()
    } else if (href.includes('?tab=')) {
      const tabId = href.split('?tab=')[1]

      // Update our local state immediately
      setActiveTabId(tabId)

      // Then update the URL
      router.replace(href, { scroll: false })

      // Dispatch an event to change tabs
      window.dispatchEvent(new CustomEvent('tabChange', {
        detail: { tab: tabId }
      }))

      closeMenu()
    } else {
      // For any other links
      router.push(href)
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

      {/* Desktop navigation - Expandable Sidebar */}
      <div 
        className={cn(
          "hidden border-r border-gray-200 bg-white md:fixed md:inset-y-0 md:left-0 md:z-50 md:block transition-all duration-300",
          isExpanded ? "md:w-64" : "md:w-16"
        )}
      >
        <div className="flex h-full flex-col">
          <div className={cn("border-b border-gray-200 py-6 relative", isExpanded ? "px-6" : "px-0")}>
            <div className={cn(
              "flex items-center gap-2 text-lg font-semibold text-[#2E7D32]",
              isExpanded ? "justify-start" : "justify-center"
            )}>
              <span className="flex h-8 w-8 items-center justify-center rounded-md text-[#2E7D32]">
                ESG
              </span>
              {isExpanded && <span>Reporting</span>}
            </div>
            
            {/* Collapse button - only shown when expanded */}
            {isExpanded && (
              <button
                className="absolute top-6 right-4 p-1 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                onClick={toggleSidebar}
                aria-label="Collapse Sidebar"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Expand button - Only shown when collapsed, in its own row with proper spacing */}
          {!isExpanded && (
            <div className="flex justify-center py-2 border-b border-gray-200">
              <button
                className="p-1 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                onClick={toggleSidebar}
                aria-label="Expand Sidebar"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          <nav className={cn("flex-1 space-y-1 py-4", isExpanded ? "px-3" : "px-1")}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-md py-2 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-[#E8F5E9] text-[#2E7D32]"
                    : "text-gray-700 hover:bg-gray-100",
                  isExpanded ? "gap-3 px-3 justify-start" : "justify-center px-2"
                )}
                onClick={(e) => handleNavClick(e, item.href)}
              >
                <span className={cn(
                  "transition-transform",
                  isActive(item.href) && !isExpanded && "scale-110"
                )}>
                  {item.icon}
                </span>
                {isExpanded && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>

          {isAuthenticated && (
            <div className={cn("border-t border-gray-200", isExpanded ? "p-4" : "p-2")}>
              {isExpanded ? (
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
              ) : (
                <div className="mb-3 flex justify-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8F5E9] text-[#2E7D32]">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "text-gray-700",
                  isExpanded ? "w-full justify-start gap-2" : "w-full p-2 flex justify-center"
                )}
                onClick={() => signOut()}
              >
                <LogOutIcon className="h-4 w-4" />
                {isExpanded && "Sign Out"}
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
              <div className="-m-1.5 p-1.5">
                <span className="flex items-center gap-2 text-lg font-semibold text-[#2E7D32]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md text-[#2E7D32]">
                    ESG
                  </span>
                  <span>Reporting</span>
                </span>
              </div>
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
                  className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium ${isActive(item.href)
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