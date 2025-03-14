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
  color: string
  description: string
  badgeCount?: number
}

// Define dashboard tabs
const dashboardTabs: DashboardTab[] = [
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    component: <AnalyticsPage />,
    color: "text-emerald-500",
    description: "View ESG metrics and reports",
  },
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
    component: <DocumentsPage />,
    color: "text-blue-500",
    description: "Manage and upload reports",
  },
  {
    id: "chat",
    label: "Chat",
    icon: MessageSquare,
    component: <ChatPage />,
    color: "text-teal-500",
    description: "AI-powered ESG assistant",
  },
  {
    id: "profile",
    label: "Profile",
    icon: UserIcon,
    component: <ProfilePage />,
    color: "text-orange-500",
    description: "Account settings",
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
  const [documentCount, setDocumentCount] = useState(0)

  // Create a state to directly control which tab is active
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    return tabParam || "analytics"
  })

  // Update document count from DocumentsPage
  useEffect(() => {
    // Listen for document count updates
    const handleDocumentCountUpdate = (event: CustomEvent) => {
      setDocumentCount(event.detail.count || 0)
    }

    window.addEventListener("documentCountUpdate", handleDocumentCountUpdate as EventListener)

    return () => {
      window.removeEventListener("documentCountUpdate", handleDocumentCountUpdate as EventListener)
    }
  }, [])

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

  // Listen for the collapseMainSidebar event from ChatPage
  useEffect(() => {
    const handleCollapseMainSidebar = () => {
      if (isExpanded) {
        setIsExpanded(false)
      }
    }

    window.addEventListener("collapseMainSidebar", handleCollapseMainSidebar)

    return () => {
      window.removeEventListener("collapseMainSidebar", handleCollapseMainSidebar)
    }
  }, [isExpanded])

  // Listen for tab change events
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const newTabId = event.detail.tab
      if (newTabId !== activeTabId) {
        setActiveTabId(newTabId)
      }
    }

    window.addEventListener("tabChange", handleTabChange as EventListener)

    return () => {
      window.removeEventListener("tabChange", handleTabChange as EventListener)
    }
  }, [activeTabId])

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

  // Function to show tooltip on hover (simpler alternative to TooltipProvider)
  const renderTooltip = (tab: DashboardTab) => {
    if (!isExpanded) {
      return (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 hidden group-hover:block bg-emerald-600 text-white rounded px-2 py-1 text-xs whitespace-nowrap shadow">
          <p className="font-medium">{tab.label}</p>
          <p className="text-xs text-emerald-100">{tab.description}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile Header - Only visible on small screens */}
      <div className="fixed top-0 left-0 right-0 z-30 flex h-16 items-center justify-between shadow-sm bg-white px-4 md:hidden">
        <div className="flex items-center">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="mr-3 rounded-md p-2 text-slate-500 hover:bg-slate-100"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>
          <div className="flex items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500 text-white">
              <Leaf className="h-5 w-5" />
            </div>
            <span className="ml-2 font-semibold text-slate-800">ESG METRICS</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Notification Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white">
                  3
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 shadow-lg">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-y-auto">
                {[1, 2, 3].map((i) => (
                  <DropdownMenuItem key={i} className="flex flex-col items-start p-3">
                    <div className="flex w-full items-center justify-between">
                      <span className="font-medium">New Report Available</span>
                      <Badge variant="success" className="ml-2 text-xs">
                        New
                      </Badge>
                    </div>
                    <span className="mt-1 text-sm text-slate-500">
                      Q2 2023 Carbon Emissions Report is ready for review
                    </span>
                    <span className="mt-2 text-xs text-slate-400">2 hours ago</span>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-emerald-500 text-white">
                    {user?.email ? user.email.charAt(0).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="shadow-lg">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleTabClick("profile")}>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileView && isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed left-0 top-0 z-20 h-full flex-shrink-0 overflow-hidden bg-white shadow-md transition-all duration-300 ${
          isExpanded ? "w-64" : "w-16"
        } ${
          isMobileView ? (isMobileMenuOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"
        } md:relative md:translate-x-0`}
      >
        {/* Sidebar Header with Logo */}
        <div className="flex h-16 items-center justify-between px-4">
          <div className={`flex items-center ${isExpanded ? "" : "justify-center w-full"}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-500 text-white">
              <Leaf className="h-5 w-5" />
            </div>
            {isExpanded && <span className="ml-2 font-semibold text-slate-800">ESG METRICS</span>}
          </div>
          {isExpanded && !isMobileView && (
            <button
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Expand button when sidebar is collapsed */}
        {!isExpanded && !isMobileView && (
          <div className="flex justify-center py-2">
            <button
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Main Navigation Menu */}
        <div className={`flex-1 px-3 ${isExpanded ? 'overflow-y-auto' : 'overflow-visible'}`}>
          {isExpanded && (
            <h3 className="mb-2 px-3 mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">MAIN NAVIGATION</h3>
          )}
          <nav className={`flex flex-col ${isExpanded ? "items-start" : "items-center"} ${isExpanded ? "gap-1" : "gap-6"} mt-2`}>
            {dashboardTabs.map((tab) => {
              const TabIcon = tab.icon
              const isActive = activeTabId === tab.id
              const tabColor = tab.color || "text-slate-500";
              // Show document count badge only for the documents tab
              const showBadge = tab.id === "documents" && documentCount > 0;

              return (
                <div key={tab.id} className="w-full group relative">
                  <button
                      onClick={() => handleTabClick(tab.id)}
                    className={`relative flex ${isExpanded ? "w-full items-center justify-between px-3" : "justify-center"} ${
                      isExpanded ? "py-2.5" : "p-3"
                    } rounded-md transition-all duration-200 ${
                      isActive 
                        ? `${isExpanded ? "bg-green-50" : "bg-green-50"} text-emerald-600 font-medium` 
                        : "text-slate-600 hover:bg-gray-50 hover:text-emerald-600"
                    }`}
                  >
                    <div className="flex items-center">
                      <TabIcon className={`h-5 w-5 ${isExpanded ? "mr-3" : ""} ${isActive ? "text-emerald-600" : tabColor}`} />
                      {isExpanded && <span>{tab.label}</span>}
                    </div>
                    {isExpanded && showBadge && (
                      <Badge
                        className="bg-green-100 hover:bg-green-200 text-green-700 border-0 ml-2 rounded-full px-2 py-0.5 text-xs font-medium"
                      >
                        {documentCount}
                      </Badge>
                    )}
                    {!isExpanded && showBadge && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-[10px] text-green-700 font-medium">
                        {documentCount}
                      </span>
                    )}
                  </button>
                  {renderTooltip(tab)}
                  </div>
              )
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className={`${isExpanded ? "" : "mt-8"} px-3 pb-3`}>
            {isExpanded && (
              <div className="border-t border-slate-100 mt-8">
                <div className="flex items-center px-3 py-3">
                  <Avatar className="h-10 w-10 mr-3 ring-1 ring-slate-200">
                    <AvatarFallback className="bg-blue-500 text-white font-medium">
                      {user?.email ? user.email.charAt(0).toUpperCase() : "R"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-slate-700 truncate">{user?.email || "roshan@gaman.ai"}</p>
                    <p className="text-xs text-slate-500 truncate">
                      Signed in with google
                    </p>
                  </div>
                </div>
                <div className="px-3 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-slate-600 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100"
                    onClick={() => signOut()}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            )}
            {!isExpanded && (
              <div className="flex flex-col items-center">
                <div className="group relative mb-6">
                  <Avatar className="h-10 w-10 ring-1 ring-slate-200">
                    <AvatarFallback className="bg-blue-500 text-white">
                      {user?.email ? user.email.charAt(0).toUpperCase() : "R"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 hidden group-hover:block bg-emerald-600 text-white rounded px-2 py-1 text-xs whitespace-nowrap shadow">
                    <p className="font-medium">{user?.email || "roshan@gaman.ai"}</p>
                    <p className="text-xs text-emerald-100">Signed in with google</p>
                  </div>
                </div>
                <div className="group relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full text-slate-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => signOut()}
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 hidden group-hover:block bg-emerald-600 text-white rounded px-2 py-1 text-xs whitespace-nowrap shadow">
                    Sign Out
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 overflow-auto transition-all duration-300 ${isMobileView ? "mt-16 w-full" : ""}`}>
        {/* Page Header */}
        <div className="hidden h-16 items-center justify-between shadow-sm bg-white px-6 md:flex">
          <h1 className="text-xl font-semibold text-slate-800">
            {dashboardTabs.find((tab) => tab.id === activeTabId)?.label || "Dashboard"}
          </h1>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-[10px] text-green-700 font-medium">
                    3
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 shadow-lg">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                  {[1, 2, 3].map((i) => (
                    <DropdownMenuItem key={i} className="flex flex-col items-start p-3 hover:bg-gray-50">
                      <div className="flex w-full items-center justify-between">
                        <span className="font-medium">New Report Available</span>
                        <Badge variant="success" className="ml-2 font-medium">
                          New
                        </Badge>
                      </div>
                      <span className="mt-1 text-sm text-slate-500">
                        Q2 2023 Carbon Emissions Report is ready for review
                      </span>
                      <span className="mt-2 text-xs text-slate-400">2 hours ago</span>
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-500 text-white">
                      {user?.email ? user.email.charAt(0).toUpperCase() : "R"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-slate-700">{user?.email?.split("@")[0] || "roshan"}</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="shadow-lg">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleTabClick("profile")} className="hover:bg-gray-50">
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-gray-50">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="hover:bg-red-50 hover:text-red-600">
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

