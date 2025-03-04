"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, BarChart3, FileText, MessageSquare, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface TabItem {
  name: string
  icon: React.ReactNode
  id: string
}

interface ExpandableSidebarProps {
  className?: string
  onTabChange?: (tabId: string) => void
  activeTabId?: string
  children?: React.ReactNode
}

export const ExpandableSidebar = ({
  className,
  onTabChange,
  activeTabId = "analytics",
  children
}: ExpandableSidebarProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const tabs: TabItem[] = [
    {
      name: "Analytics",
      icon: <BarChart3 className="h-5 w-5" />,
      id: "analytics"
    },
    {
      name: "Documents",
      icon: <FileText className="h-5 w-5" />,
      id: "documents"
    },
    {
      name: "Chat",
      icon: <MessageSquare className="h-5 w-5" />,
      id: "chat"
    },
    {
      name: "Profile",
      icon: <User className="h-5 w-5" />,
      id: "profile"
    }
  ]

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded)
  }

  const handleTabClick = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId)
    }
  }

  return (
    <div className="flex">
      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full bg-gray-800 text-white transition-all duration-300 ease-in-out z-10",
          isExpanded ? "w-52" : "w-16",
          className
        )}
      >
        {/* Collapse button (only shown when expanded) */}
        {isExpanded && (
          <button
            className="absolute top-4 right-4 p-1 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
            onClick={toggleSidebar}
            aria-label="Collapse Sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Logo/Header */}
        <div className="flex items-center justify-center h-16 border-b border-gray-700">
          <div className="text-xl font-bold">
            {isExpanded ? "Dashboard" : "D"}
          </div>
        </div>

        {/* Nav Items */}
        <ul className="p-3 space-y-3 mt-4">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <button
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  "w-full flex items-center p-2 rounded-md transition-colors",
                  activeTabId === tab.id 
                    ? "bg-gray-700 text-white" 
                    : "text-gray-300 hover:bg-gray-700 hover:text-white",
                  isExpanded ? "justify-start" : "justify-center"
                )}
                aria-label={tab.name}
              >
                <span className={cn(
                  "transition-transform",
                  activeTabId === tab.id && !isExpanded && "scale-110"
                )}>
                  {tab.icon}
                </span>
                {isExpanded && (
                  <span className="ml-3 whitespace-nowrap">{tab.name}</span>
                )}
              </button>
            </li>
          ))}
        </ul>

        {/* Expand button (only shown when collapsed) */}
        {!isExpanded && (
          <button
            className="absolute bottom-4 left-0 w-full p-2 flex justify-center hover:bg-gray-700 transition-colors"
            onClick={toggleSidebar}
            aria-label="Expand Sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Main Content */}
      <div
        className={cn(
          "flex-1 transition-all duration-300 ease-in-out",
          isExpanded ? "ml-52" : "ml-16"
        )}
      >
        {children}
      </div>
    </div>
  )
}

export default ExpandableSidebar 