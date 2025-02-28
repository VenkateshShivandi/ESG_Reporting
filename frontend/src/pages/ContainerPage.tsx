"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { BarChart3, FileText, MessageSquare, LogOut, UserIcon, Home, ChevronLeft, ChevronRight, Leaf } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import ChatPage from "@/pages/ChatPage"
import DocumentsPage from "@/pages/DocumentsPage"
import AnalyticsPage from "@/pages/AnalyticsPage"
import ProfilePage from "@/pages/ProfilePage"
import { useAuth } from '@/hooks/use-auth'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

// Temporary Analytics Page component
// const AnalyticsPage = () => (
//   <div className="flex items-center justify-center h-full">
//     <div className="text-center">
//       <BarChart3 className="h-10 w-10 text-emerald-500 mx-auto mb-4" />
//       <h2 className="text-2xl font-semibold mb-2">Analytics Dashboard</h2>
//       <p className="text-slate-500">Coming soon</p>
//     </div>
//   </div>
// )

const tabs = [
  // {
  //   icon: Home,
  //   label: "Home",
  //   id: "home",
  //   component: <HomePage />,
  //   color: "text-green-500 hover:text-green-600",
  //   description: "Dashboard overview",
  // },
  {
    icon: BarChart3,
    label: "Analytics",
    id: "analytics",
    component: <AnalyticsPage />,
    color: "text-emerald-500 hover:text-emerald-600",
    description: "View ESG metrics",
  },
  {
    icon: FileText,
    label: "Documents",
    id: "documents",
    component: <DocumentsPage />,
    color: "text-blue-500 hover:text-blue-600",
    description: "Manage reports",
  },
  {
    icon: MessageSquare,
    label: "Chat",
    id: "chat",
    component: <ChatPage />,
    color: "text-violet-500 hover:text-violet-600",
    description: "AI assistant",
  },
  {
    icon: UserIcon,
    label: "Profile",
    id: "profile",
    component: <ProfilePage />,
    color: "text-orange-500 hover:text-orange-600",
    description: "Account settings",
  },
]

// Sidebar tab interface
interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

export function Container() {
  const searchParams = useSearchParams()
  const tabParam = searchParams?.get('tab')
  const router = useRouter()
  const { signOut, user } = useAuth()
  const [isExpanded, setIsExpanded] = useState(true)

  // Create a state to directly control which tab is active
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    return tabParam || 'analytics'
  })

  // Derive active tab label from active tab ID
  const activeTabLabel = React.useMemo(() => {
    const tab = tabs.find(t => t.id === activeTabId)
    return tab?.label || tabs[0].label
  }, [activeTabId])

  // Keep state in sync with URL
  useEffect(() => {
    if (tabParam && tabParam !== activeTabId) {
      setActiveTabId(tabParam)
    } else if (!tabParam && activeTabId !== 'analytics') {
      setActiveTabId('analytics')
    }
  }, [tabParam, activeTabId])

  // Listen for the collapseMainSidebar event from ChatPage
  useEffect(() => {
    const handleCollapseMainSidebar = () => {
      // Only collapse if the sidebar is currently expanded
      if (isExpanded) {
        setIsExpanded(false)
      }
    }

    window.addEventListener('collapseMainSidebar', handleCollapseMainSidebar)

    return () => {
      window.removeEventListener('collapseMainSidebar', handleCollapseMainSidebar)
    }
  }, [isExpanded])

  // Listen for tab change events from the navigation component
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const newTabId = event.detail.tab
      if (newTabId !== activeTabId) {
        setActiveTabId(newTabId)
      }
    }

    window.addEventListener('tabChange', handleTabChange as EventListener)

    return () => {
      window.removeEventListener('tabChange', handleTabChange as EventListener)
    }
  }, [activeTabId])

  // Handle sidebar button clicks
  const handleTabClick = (tabId: string) => {
    // Update state immediately for instant UI feedback
    setActiveTabId(tabId)

    // Then update URL
    router.replace(`/dashboard?tab=${tabId}`, { scroll: false })
  }

  // Toggle sidebar expansion
  const toggleSidebar = () => {
    setIsExpanded(!isExpanded)
  }

  // Define sidebar tabs
  const sidebarTabs: Tab[] = [
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="h-5 w-5" />,
      href: '/dashboard?tab=analytics',
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: <FileText className="h-5 w-5" />,
      href: '/dashboard?tab=documents',
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: <MessageSquare className="h-5 w-5" />,
      href: '/dashboard?tab=chat',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <UserIcon className="h-5 w-5" />,
      href: '/dashboard?tab=profile',
    },
  ];

  return (
    <div className="flex h-screen bg-white">
      <SidebarProvider>
        {/* Sidebar with enhanced styling */}
        <Sidebar className={`h-full bg-gradient-to-b from-slate-50 to-white transition-all duration-300 flex-shrink-0 border-r ${isExpanded ? 'w-64' : 'w-16'} fixed top-0 left-0 z-10`}>
          <SidebarHeader className="h-16 border-b flex items-center justify-between">
            <div className={`flex items-center ${isExpanded ? 'px-4' : 'justify-center w-full'}`}>
              <div className="flex items-center justify-center h-9 w-9 rounded-md bg-[#E8F5E9] shrink-0">
                <Leaf className="h-5 w-5 text-[#2E7D32]" />
              </div>
              {isExpanded && <span className="ml-3 font-semibold text-[#2E7D32]">ESG REPORTING</span>}
            </div>
          </SidebarHeader>
          
          {/* Toggle sidebar button - Shows either expand or collapse button in the same position */}
          <div className="flex justify-center py-2 border-b">
            <button
              className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
              onClick={toggleSidebar}
              aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
          
          <SidebarContent>
            <SidebarMenu className={`flex flex-col ${isExpanded ? 'items-start px-3' : 'items-center px-2'} gap-3 pt-6`}>
              {tabs.map((tab) => (
                <SidebarMenuItem key={tab.id} className="w-full">
                  {isExpanded ? (
                    // Expanded view with labels - with highly visible active state
                    <SidebarMenuButton
                      onClick={() => handleTabClick(tab.id)}
                      isActive={activeTabId === tab.id}
                      className={`flex w-full items-center rounded-md p-3 transition-all duration-200 ease-in-out relative
                        ${activeTabId === tab.id
                          ? "text-[#2E7D32] font-medium border-l-4 border-[#2E7D32]"
                          : "text-slate-600 hover:bg-slate-100"
                        }`}
                      style={activeTabId === tab.id ? { backgroundColor: '#DCFFE4' } : {}}
                    >
                      <tab.icon className={`h-5 w-5 ${activeTabId === tab.id ? "text-[#2E7D32]" : "text-slate-500"} ${activeTabId === tab.id ? "ml-[-2px]" : "ml-[2px]"} mr-3`} />
                      <span>{tab.label}</span>
                    </SidebarMenuButton>
                  ) : (
                    // Collapsed view with tooltips - with highly visible active state
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton
                            onClick={() => handleTabClick(tab.id)}
                            isActive={activeTabId === tab.id}
                            className={`flex w-full justify-center rounded-md p-3 transition-all duration-200 ease-in-out relative
                              ${activeTabId === tab.id
                                ? "text-[#2E7D32] border-l-4 border-[#2E7D32]"
                                : "text-slate-600 hover:bg-slate-100"
                              }`}
                            style={activeTabId === tab.id ? { backgroundColor: '#DCFFE4' } : {}}
                          >
                            <tab.icon
                              className={`h-5 w-5 ${activeTabId === tab.id ? "text-[#2E7D32] scale-110 ml-[-2px]" : "text-slate-500 scale-100"} transition-transform`}
                            />
                            <span className="sr-only">{tab.label}</span>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="flex flex-col items-start gap-1">
                          <p className="font-medium">{tab.label}</p>
                          <p className="text-xs text-muted-foreground">{tab.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t p-2">
            {/* User Profile Information */}
            {isExpanded ? (
              // Expanded view with user details
              <div className="px-3 py-2 mb-2">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-[#E8F5E9] flex items-center justify-center text-[#2E7D32] font-medium mr-3">
                    {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-slate-700 truncate">{user?.email}</p>
                    <p className="text-xs text-slate-500">
                      {user?.app_metadata?.provider 
                        ? `Signed in with ${user.app_metadata.provider}` 
                        : "Signed in with email"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Collapsed view with just avatar and tooltip
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex justify-center py-2">
                      <div className="h-8 w-8 rounded-full bg-[#E8F5E9] flex items-center justify-center text-[#2E7D32] font-medium">
                        {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div>
                      <p className="font-medium">{user?.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {user?.app_metadata?.provider 
                          ? `Signed in with ${user.app_metadata.provider}` 
                          : "Signed in with email"}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Sign Out Button */}
            {isExpanded ? (
              // Expanded logout button with text
              <SidebarMenuButton
                onClick={() => signOut()}
                className="flex w-full items-center rounded-md p-3 text-slate-600 hover:bg-slate-100 hover:text-red-500 transition-colors"
              >
                <LogOut className="h-5 w-5 mr-3" />
                <span>Sign Out</span>
              </SidebarMenuButton>
            ) : (
              // Collapsed logout button with tooltip
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      onClick={() => signOut()}
                      className="flex w-full justify-center rounded-md p-3 text-slate-600 hover:bg-slate-100 hover:text-red-500 transition-colors"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="sr-only">Logout</span>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    <p>Logout</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </SidebarFooter>
        </Sidebar>
        
        {/* Main content area with left margin matching sidebar width */}
        <div className={`h-full w-full overflow-auto transition-all duration-300 ${isExpanded ? 'ml-56' : 'ml-6'} pt-6 pr-6 pb-6 pl-0`}>
          {tabs.find((tab) => tab.id === activeTabId)?.component}
        </div>
      </SidebarProvider>
    </div>
  )
}

