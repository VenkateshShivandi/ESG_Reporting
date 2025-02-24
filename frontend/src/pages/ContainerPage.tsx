'use client'

import * as React from 'react'
import { BarChart3, FileText, MessageSquare } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import ChatPage from './ChatPage'
import DocumentsPage from './DocumentsPage'
import AnalyticsPage from './AnalyticsPage'

const tabs = [
  { icon: BarChart3, label: 'Analytics', component: <AnalyticsPage /> },
  { icon: FileText, label: 'Documents', component: <DocumentsPage /> },
  { icon: MessageSquare, label: 'Chat', component: <ChatPage /> },
]

export function Container() {
  const [activeTab, setActiveTab] = React.useState(tabs[0].label)

  return (
    
      <div className="flex flex-row justify-start h-screen" style={{ "--sidebar-width": "48px" } as React.CSSProperties}>
        <SidebarProvider className="">
            <Sidebar className="w-12 flex-shrink-0">
                <SidebarHeader className="h-4" />
                <SidebarContent>
                    <SidebarMenu className="flex flex-col items-center">
                    {tabs.map((tab) => (
                        <SidebarMenuItem key={tab.label}>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <SidebarMenuButton
                                        onClick={() => setActiveTab(tab.label)}
                                        isActive={activeTab === tab.label}
                                        className="flex justify-center p-3"
                                        >
                                        <tab.icon className="h-6 w-6" />
                                        <span className="sr-only">{tab.label}</span>
                                        </SidebarMenuButton>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        <p>{tab.label}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </SidebarMenuItem>
                    ))}
                    </SidebarMenu>
                </SidebarContent>
            </Sidebar>
            <main className="flex-grow h-full">
                {tabs.find((tab) => tab.label === activeTab)?.component}
            </main>
        </SidebarProvider>
        
      </div>
  )
}