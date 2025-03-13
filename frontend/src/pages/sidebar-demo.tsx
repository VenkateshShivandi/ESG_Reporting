"use client"

import { useState } from "react"
import ExpandableSidebar from "@/components/ui/expandable-sidebar"
import { BarChart3, FileText, MessageSquare, User } from "lucide-react"

export default function SidebarDemo() {
  const [activeTab, setActiveTab] = useState("analytics")

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
  }

  // Content to display based on active tab
  const getTabContent = () => {
    switch (activeTab) {
      case "analytics":
        return (
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <BarChart3 className="h-8 w-8" /> Analytics Dashboard
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="bg-white rounded-lg shadow p-6 border">
                  <div className="h-40 bg-gray-100 rounded-md mb-4 flex items-center justify-center">
                    <span className="text-gray-400">Chart {item}</span>
                  </div>
                  <h3 className="font-medium">Metric {item}</h3>
                  <p className="text-gray-500 text-sm">Sample analytics data</p>
                </div>
              ))}
            </div>
          </div>
        )
      case "documents":
        return (
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <FileText className="h-8 w-8" /> Documents
            </h1>
            <div className="bg-white rounded-lg shadow border">
              <div className="p-4 border-b">
                <h2 className="font-medium">Your Files</h2>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {["Annual Report.pdf", "ESG Data.xlsx", "Sustainability Goals.docx", "Carbon Metrics.csv"].map((file) => (
                    <div key={file} className="p-3 rounded hover:bg-gray-50 flex items-center gap-3 cursor-pointer">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <span>{file}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      case "chat":
        return (
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <MessageSquare className="h-8 w-8" /> Chat Interface
            </h1>
            <div className="bg-white rounded-lg shadow border h-[60vh] flex flex-col">
              <div className="p-4 border-b">
                <h2 className="font-medium">Conversation</h2>
              </div>
              <div className="flex-1 p-4 overflow-auto bg-gray-50">
                <div className="space-y-4">
                  <div className="bg-blue-100 p-3 rounded-lg max-w-[80%]">
                    <p>Hello! How can I help you with your ESG reporting today?</p>
                  </div>
                  <div className="bg-gray-100 p-3 rounded-lg max-w-[80%] ml-auto">
                    <p>I need to analyze our carbon emissions data.</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg max-w-[80%]">
                    <p>I can help with that. Please upload your emissions data file.</p>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Type your message..." 
                    className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button className="bg-blue-500 text-white px-4 py-2 rounded-md">
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      case "profile":
        return (
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <User className="h-8 w-8" /> Profile Settings
            </h1>
            <div className="bg-white rounded-lg shadow border p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-gray-500" />
                </div>
                <div>
                  <h2 className="text-xl font-medium">John Doe</h2>
                  <p className="text-gray-500">Sustainability Manager</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value="john.doe@example.com"
                    disabled
                    className="w-full p-2 bg-gray-50 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    value="Eco Solutions Inc."
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select className="w-full p-2 border rounded-md">
                    <option>Sustainability Manager</option>
                    <option>ESG Specialist</option>
                    <option>Environmental Analyst</option>
                    <option>Data Scientist</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )
      default:
        return <div>Select a tab</div>
    }
  }

  return (
    <ExpandableSidebar onTabChange={handleTabChange} activeTabId={activeTab}>
      <div className="min-h-screen bg-gray-100">{getTabContent()}</div>
    </ExpandableSidebar>
  )
} 