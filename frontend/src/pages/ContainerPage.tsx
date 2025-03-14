"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import {
  BarChart3,
  FileText,
  MessageSquare,
  UserIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Settings,
  Bell,
  Search,
} from "lucide-react"

// UI Components
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Import page components
import ChatPage from "@/pages/ChatPage"
import DocumentsPage from "@/pages/DocumentsPage"
import AnalyticsPage from "@/pages/AnalyticsPage"
import ProfilePage from "@/pages/ProfilePage"

// Define tab interface
interface DashboardTab {
  id: string
  label: string
  icon: React.ElementType
  component: React.ReactNode
  badgeCount?: number
}

// Define dashboard tabs
const dashboardTabs: DashboardTab[] = [
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    component: <AnalyticsPage />,
  },
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
    component: <DocumentsPage />,
  },
  {
    id: "chat",
    label: "Chat",
    icon: MessageSquare,
    component: <ChatPage />,
  },
  {
    id: "profile",
    label: "Profile",
    icon: UserIcon,
    component: <ProfilePage />,
  },
]

export function Container() {
  const searchParams = useSearchParams()
  const tabParam = searchParams?.get("tab")
  const router = useRouter()
  const { signOut, user } = useAuth()
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMobileView, setIsMobileView] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  // State to track document count
  const [documentCount, setDocumentCount] = useState(0)

  // Create a state to directly control which tab is active
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    return tabParam || "analytics"
  })

  // Check for mobile view on mount and window resize
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setIsExpanded(false)
      }
    }

    // Initial check
    checkMobileView()

    // Add event listener
    window.addEventListener("resize", checkMobileView)

    // Cleanup
    return () => window.removeEventListener("resize", checkMobileView)
  }, [])

  // Keep state in sync with URL
  useEffect(() => {
    if (tabParam && tabParam !== activeTabId) {
      setActiveTabId(tabParam)
    } else if (!tabParam && activeTabId !== "analytics") {
      setActiveTabId("analytics")
    }
  }, [tabParam, activeTabId])

  // Add an event listener for document count updates
  useEffect(() => {
    // Listen for document count updates from DocumentsPage
    const handleDocumentCountUpdate = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.count === 'number') {
        setDocumentCount(event.detail.count);
      }
    };

    window.addEventListener('documentCountUpdate', handleDocumentCountUpdate as EventListener);

    return () => {
      window.removeEventListener('documentCountUpdate', handleDocumentCountUpdate as EventListener);
    };
  }, []);

  // Handle sidebar button clicks
  const handleTabClick = (tabId: string) => {
    // Update state immediately for instant UI feedback
    setActiveTabId(tabId)

    // Then update URL
    router.replace(`/dashboard?tab=${tabId}`, { scroll: false })

    // Close mobile menu if open
    if (isMobileView && isMobileMenuOpen) {
      setIsMobileMenuOpen(false)
    }
  }

  // Toggle sidebar expansion
  const toggleSidebar = () => {
    setIsExpanded(!isExpanded)
  }

  // Get active tab component
  const activeTabComponent = dashboardTabs.find((tab) => tab.id === activeTabId)?.component

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile Header - Only visible on small screens */}
      <div className="fixed top-0 left-0 right-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 md:hidden">
        <div className="flex items-center">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="mr-3 rounded-md p-2 text-slate-500 hover:bg-slate-100"
          >
            {isMobileMenuOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>
          <div className="flex items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
              <Leaf className="h-5 w-5" />
            </div>
            <span className="ml-2 font-semibold text-emerald-700">ESG METRICS</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-emerald-100 text-emerald-700">
                {user?.email ? user.email.charAt(0).toUpperCase() : "U"}
              </AvatarFallback>
            </Avatar>
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileView && isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 z-20 h-full flex-shrink-0 overflow-hidden border-r bg-white transition-all duration-300 ${isExpanded ? "w-64" : "w-16"
          } ${isMobileView ? (isMobileMenuOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"
          } md:relative md:translate-x-0`}
      >
        {/* Sidebar Header with Logo */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className={`flex items-center ${isExpanded ? "" : "justify-center w-full"}`}>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
              <Leaf className="h-5 w-5" />
            </div>
            {isExpanded && <span className="ml-3 font-semibold text-emerald-700">ESG METRICS</span>}
          </div>
          {isExpanded && !isMobileView && (
            <button
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              onClick={toggleSidebar}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Expand button when sidebar is collapsed */}
        {!isExpanded && !isMobileView && (
          <div className="flex justify-center py-2 border-b">
            <button
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              onClick={toggleSidebar}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Main Navigation Menu */}
        <div className="flex-1 overflow-y-auto">
          <div className={`py-4 ${isExpanded ? "px-3" : "px-2"}`}>
            {isExpanded && (
              <h3 className="mb-2 px-3 text-xs font-medium uppercase text-slate-500">Main Navigation</h3>
            )}
            <nav className={`flex flex-col ${isExpanded ? "items-start" : "items-center"} gap-1`}>
              {dashboardTabs.map((tab) => {
                const TabIcon = tab.icon
                const isActive = activeTabId === tab.id

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`relative flex ${isExpanded ? "w-full items-center justify-between px-3" : "justify-center"} ${isExpanded ? "py-2.5" : "p-2.5"
                      } rounded-md transition-all duration-200 ${isActive
                        ? "bg-emerald-50 text-emerald-700 font-medium"
                        : "text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    <div className="flex items-center">
                      <TabIcon className={`h-5 w-5 ${isExpanded ? "mr-3" : ""} ${isActive ? "text-emerald-600" : "text-slate-500"}`} />
                      {isExpanded && <span>{tab.label}</span>}
                    </div>
                    {isExpanded && tab.id === 'documents' && documentCount > 0 && (
                      <Badge
                        variant="outline"
                        className={isActive ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100"}
                      >
                        {documentCount}
                      </Badge>
                    )}
                    {!isExpanded && tab.id === 'documents' && documentCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                        {documentCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Settings Section */}
          {isExpanded && (
            <div className="mt-4 px-3 py-2">
              <h3 className="mb-2 px-3 text-xs font-medium uppercase text-slate-500">Settings</h3>
              <button
                className="group flex w-full items-center rounded-md px-3 py-2.5 text-slate-600 hover:bg-slate-50"
              >
                <Settings className="mr-3 h-5 w-5 text-slate-500 group-hover:text-slate-600" />
                <span>Preferences</span>
              </button>
            </div>
          )}
        </div>

        {/* User Profile & Logout */}
        <div className="mt-auto border-t">
          {isExpanded ? (
            // Expanded view with user details
            <div className="p-4">
              <div className="mb-3 flex items-center">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarFallback className="bg-emerald-100 text-emerald-700">
                    {user?.email ? user.email.charAt(0).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="overflow-hidden">
                  <p className="font-medium text-slate-800 truncate">{user?.email || "User"}</p>
                  <p className="text-xs text-slate-500">
                    {user?.app_metadata?.provider
                      ? `Signed in with ${user.app_metadata.provider}`
                      : "Signed in with email"}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full justify-start text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                onClick={() => signOut()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          ) : (
            // Collapsed view with just avatar and logout
            <div className="p-2 flex flex-col items-center">
              <Avatar className="h-10 w-10 mb-2">
                <AvatarFallback className="bg-emerald-100 text-emerald-700">
                  {user?.email ? user.email.charAt(0).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-500 hover:bg-red-50 hover:text-red-600"
                onClick={() => signOut()}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 overflow-auto transition-all duration-300 ${isMobileView ? "mt-16 w-full" : ""}`}>
        {/* Page Header */}
        <div className="hidden h-16 items-center justify-between border-b bg-white px-6 md:flex">
          <h1 className="text-xl font-semibold text-slate-800">
            {dashboardTabs.find((tab) => tab.id === activeTabId)?.label || "Dashboard"}
          </h1>

          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Search..." className="w-64 pl-9 h-9 bg-slate-50 border-slate-200" />
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700">
                      {user?.email ? user.email.charAt(0).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-slate-700">{user?.email?.split("@")[0] || "User"}</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleTabClick("profile")}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-6">{activeTabComponent}</div>
      </div>
    </div>
  )
}

