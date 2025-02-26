"use client"

import * as React from "react"
import { BarChart3, FileText, MessageSquare, LogOut, UserIcon, Home } from "lucide-react"
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
import { useSearchParams } from 'next/navigation'

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

export function Container() {
  const searchParams = useSearchParams()
  const tabParam = searchParams?.get('tab')
  
  // Initialize active tab based on URL parameter or default to Analytics
  const [activeTab, setActiveTab] = React.useState(
    tabParam && tabs.some(tab => tab.id === tabParam) 
      ? tabs.find(tab => tab.id === tabParam)?.label || tabs[0].label
      : tabs[0].label
  )
  
  const { signOut } = useAuth()
  
  // Listen for tab change events from the navigation component
  React.useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const tabId = event.detail.tab
      const tab = tabs.find(t => t.id === tabId)
      if (tab) {
        setActiveTab(tab.label)
      }
    }
    
    window.addEventListener('tabChange', handleTabChange as EventListener)
    
    return () => {
      window.removeEventListener('tabChange', handleTabChange as EventListener)
    }
  }, [])
  
  // Respond to URL parameter changes directly
  React.useEffect(() => {
    if (tabParam) {
      const tab = tabs.find(t => t.id === tabParam)
      if (tab) {
        setActiveTab(tab.label)
      }
    }
  }, [tabParam])

  return (
    <div className="flex h-screen bg-white">
      <SidebarProvider>
        <Sidebar className="w-16 flex-shrink-0 border-r bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <SidebarHeader className="h-16 border-b flex items-center justify-center">
            <Avatar className="h-9 w-9">
              <AvatarImage src="/logo.png" alt="ESG Logo" />
              <AvatarFallback className="text-[#2E7D32] text-sm">ESG</AvatarFallback>
            </Avatar>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu className="flex flex-col items-center gap-3 px-2 pt-6">
              {tabs.map((tab) => (
                <SidebarMenuItem key={tab.label} className="w-full">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          onClick={() => {
                            setActiveTab(tab.label)
                            
                            // Update URL without page reload
                            const newUrl = new URL(window.location.href)
                            newUrl.searchParams.set('tab', tab.id)
                            window.history.pushState({}, '', newUrl)
                          }}
                          isActive={activeTab === tab.label}
                          className={`flex w-full justify-center rounded-md p-3 transition-all duration-150 ease-in-out
                            ${
                              activeTab === tab.label
                                ? `${tab.color} bg-slate-100`
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                          <tab.icon
                            className={`h-5 w-5 ${activeTab === tab.label ? "animate-fade-in scale-110" : "scale-100"}`}
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
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t p-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton
                    onClick={() => signOut()}
                    className="flex w-full justify-center rounded-md p-3 text-slate-600 hover:bg-slate-100 hover:text-red-500"
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
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 overflow-auto p-8">{tabs.find((tab) => tab.label === activeTab)?.component}</main>
      </SidebarProvider>
    </div>
  )
}

