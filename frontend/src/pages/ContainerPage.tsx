"use client"

import * as React from "react"
import { BarChart3, FileText, MessageSquare, LogOut } from "lucide-react"
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
  {
    icon: BarChart3,
    label: "Analytics",
    component: <AnalyticsPage />,
    color: "text-emerald-500 hover:text-emerald-600",
    description: "View ESG metrics",
  },
  {
    icon: FileText,
    label: "Documents",
    component: <DocumentsPage />,
    color: "text-blue-500 hover:text-blue-600",
    description: "Manage reports",
  },
  {
    icon: MessageSquare,
    label: "Chat",
    component: <ChatPage />,
    color: "text-violet-500 hover:text-violet-600",
    description: "AI assistant",
  },
]

export function Container() {
  const [activeTab, setActiveTab] = React.useState(tabs[0].label)

  return (
    <div className="flex h-screen bg-white">
      <SidebarProvider>
        <Sidebar className="w-16 flex-shrink-0 border-r bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <SidebarHeader className="h-16 border-b flex items-center justify-center">
            <Avatar className="h-9 w-9">
              <AvatarImage src="/logo.png" alt="ESG Logo" />
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">ESG</AvatarFallback>
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
                          onClick={() => setActiveTab(tab.label)}
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
                    onClick={() => console.log("logout")}
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

