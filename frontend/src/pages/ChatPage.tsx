"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useAssistant } from '@ai-sdk/react'
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, FileText, File, Folder, Send, Bot, Eye, X, Calendar, GripVertical, Maximize2, Minimize2, ChevronsUp, ChevronsDown, Loader2, CheckCircle, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFilesStore } from "@/lib/store/files-store"
import { toast } from "sonner"
import { InteractiveWorkspace } from "@/components/dashboard/interactive-workspace"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import ReactMarkdown from 'react-markdown'
import { useAuth, withAuth } from '@/hooks/use-auth'
import { useChatStore } from '@/lib/store/chat-store'

// Define a type for reports
interface Report {
  id: string;
  type: string;
  timestamp: Date;
  files: string[];
}

function ChatPage() {
  const { session, isLoading: authLoading } = useAuth()
  const initRef = useRef(false)
  const { messages: storedMessages, setMessages: setStoredMessages } = useChatStore()

  // Initialize chat with proper auth token
  const chatConfig = useMemo(() => ({
    api: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat`,
    headers: session?.access_token ? {
      'Authorization': `Bearer ${session.access_token}`
    } : undefined
  }), [session?.access_token])

  const { messages, handleInputChange, input, setInput, setMessages } = useAssistant(chatConfig)

  // Handle initial messages setup
  useEffect(() => {
    if (initRef.current) return;

    const initializeChat = async () => {
      if (!authLoading && session) {
        if (storedMessages.length > 0) {
          // Restore stored messages
          setMessages(storedMessages);
        } else if (messages.length === 0) {
          // Set welcome message if no stored messages
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: 'Hello! I am your ESG Analytics Assistant. How can I help you today?'
          }]);
        }
        initRef.current = true;
      }
    };

    initializeChat();
  }, [authLoading, session, storedMessages, messages.length, setMessages]);

  // Update store when messages change, but only after initialization
  useEffect(() => {
    if (initRef.current && messages.length > 0) {
      setStoredMessages(messages);
    }
  }, [messages, setStoredMessages]);

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
          <p className="mt-2 text-sm text-slate-600">Loading chat...</p>
        </div>
      </div>
    )
  }

  // Show error state if no session
  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-600">Please log in to access the chat.</p>
        </div>
      </div>
    )
  }

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isReportListOpen, setIsReportListOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<string>("")
  const { files } = useFilesStore()
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [showReportView, setShowReportView] = useState(false)
  const [reports, setReports] = useState<Report[]>([])
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)

  // State for resizable panels
  const [splitPosition, setSplitPosition] = useState(50) // Default to 50% split
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dividerRef = useRef<HTMLDivElement>(null)

  // State for main UI size
  const [uiSize, setUiSize] = useState(100) // 100% by default
  const [uiHeight, setUiHeight] = useState(100) // 100% by default
  const [showSizeControls, setShowSizeControls] = useState(false)

  const [reportPrompt, setReportPrompt] = useState(
    "Generate a detailed ESG report based on the selected files, focusing on environmental, social, and governance performance."
  )

  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false)

  // Define status messages only once at the component level
  const statusMessages = [
    "Generating your report...",
    "Extracting ESG metrics...",
    "Analyzing documents...",
    "Compiling sustainability data...",
    "Formatting report sections...",
    "Finalizing report..."
  ]

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

  // Function to always open the sidebar
  const openSidebar = () => setIsSidebarOpen(true)

  // Function to close sidebar if open
  const closeSidebarIfOpen = () => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false)
    }
  }

  // Function to toggle the sidebar with special behavior for Search Files button
  const handleSearchFilesClick = () => {
    // Toggle the file search sidebar
    setIsSidebarOpen(!isSidebarOpen)

    // Close the reports sidebar if it's open
    if (isReportListOpen) {
      setIsReportListOpen(false)
    }

    // Dispatch a custom event to collapse the main navigation sidebar if it's expanded
    window.dispatchEvent(new CustomEvent('collapseMainSidebar'))
  }

  // Function to toggle the reports list sidebar
  const toggleReportList = () => {
    // Toggle the reports list
    setIsReportListOpen(!isReportListOpen)

    // Close the files sidebar if it's open
    if (isSidebarOpen) {
      setIsSidebarOpen(false)
    }

    // Dispatch a custom event to collapse the main navigation sidebar if it's expanded
    window.dispatchEvent(new CustomEvent('collapseMainSidebar'))
  }

  const handleFileSelect = (fileId: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(fileId)) {
        newSet.delete(fileId)
      } else {
        newSet.add(fileId)
      }
      return newSet
    })
  }

  const handleGenerateReport = () => {
    const selectedFilesList = files.filter((file) => selectedFiles.has(file.id))
    if (selectedType && selectedFilesList.length > 0) {
      // Store report data for later creation
      const reportData = {
        type: selectedType,
        files: selectedFilesList.map(file => file.id)
      }

      // Set generating state to true
      setIsGeneratingReport(true)

      // Clear any existing toasts
      toast.dismiss();

      // Use a consistent toast ID to ensure proper replacement
      const toastId = "report-generation-toast";

      // Show first toast - Report generation started
      toast(`${selectedType} report generation started`, {
        id: toastId,
        icon: <CheckCircle className="h-4 w-4" />,
        duration: 3000
      });

      // Create a sequence of toasts with proper timing
      const sequence = [
        {
          message: "Generating your report...",
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          delay: 3000
        },
        {
          message: "Analyzing documents...",
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          delay: 3000
        },
        {
          message: "Finalizing report...",
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          delay: 3000
        }
      ];

      // Execute the sequence with proper timing
      let cumulativeDelay = 0;
      sequence.forEach((item) => {
        cumulativeDelay += item.delay;
        setTimeout(() => {
          toast(item.message, {
            id: toastId,
            icon: item.icon,
            duration: item.delay
          });
        }, cumulativeDelay);
      });

      // After all processing toasts, show success and create report
      setTimeout(() => {
        // Create and add the new report
        const newReport: Report = {
          id: `report-${Date.now()}`,
          type: reportData.type,
          timestamp: new Date(),
          files: reportData.files
        };

        // Add to reports list - add new report at the beginning of the array
        setReports(prev => [newReport, ...prev]);

        // Set generating state to false
        setIsGeneratingReport(false);

        // Show success toast
        toast("Report generated successfully", {
          id: toastId,
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          duration: 5000
        });
      }, cumulativeDelay + 3000);

      setIsModalOpen(false);
      setSelectedType("");
      setSelectedFiles(new Set());
      setReportPrompt("Generate a detailed ESG report based on the selected files, focusing on environmental, social, and governance performance.");
    } else {
      toast.error("Please select a report type and at least one file");
    }
  };

  const handleSelectReport = (report: Report) => {
    setSelectedReport(report)
    setShowReportView(true)
    setIsReportListOpen(false)
    setIsSidebarOpen(false)
    setIsSidebarOpen(false)
  }

  const closeReportView = () => {
    setShowReportView(false)
    setSelectedReport(null)
  }

  // Handle divider drag start
  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  // Handle dragging to resize panels
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const containerWidth = containerRect.width
      const mouseX = e.clientX - containerRect.left

      // Calculate percentage position (constrained between 20% and 80%)
      const newPosition = Math.max(20, Math.min(80, (mouseX / containerWidth) * 100))
      setSplitPosition(newPosition)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const filteredFiles = files.filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()))

  // Custom submit handler
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || !session?.access_token || isGeneratingResponse) return;

    const userMessage = {
      id: String(Date.now()),
      role: "user" as const,
      content: input
    };

    // Immediately show user message and clear input
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsGeneratingResponse(true);

    // Add temporary loading message with typing animation
    const loadingMessage = {
      id: 'loading',
      role: 'assistant' as const,
      content: '●●●'
    };
    setMessages(prev => [...prev, loadingMessage]);

    // Animate the loading dots
    let dots = 0;
    const loadingInterval = setInterval(() => {
      dots = (dots + 1) % 4;
      setMessages(prev =>
        prev.map(msg =>
          msg.id === 'loading'
            ? { ...msg, content: '●'.repeat(dots + 1) }
            : msg
        )
      );
    }, 500);

    try {
      // Make API call
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ data: { role: "user", content: input } })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Replace loading message with actual response
      setMessages(prev => {
        const messages = prev.filter(msg => msg.id !== 'loading');
        if (data) {
          messages.push({
            id: data.id || String(Date.now()),
            role: "assistant",
            content: data.content
          });
        }
        return messages;
      });
    } catch (error) {
      // Remove loading message and show error
      setMessages(prev => {
        const messages = prev.filter(msg => msg.id !== 'loading');
        return messages;
      });
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      clearInterval(loadingInterval);
      setIsGeneratingResponse(false);
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <div
        ref={containerRef}
        className="flex-1 flex relative"
        style={{
          maxWidth: `${uiSize}%`,
          height: `${uiHeight}%`
        }}
      >
        {/* Size Controls */}
        <div className="absolute -left-12 top-1/2 transform -translate-y-1/2 space-y-2 z-30">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 bg-white"
            onClick={() => setShowSizeControls(!showSizeControls)}
          >
            {showSizeControls ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>

          {showSizeControls && (
            <div className="bg-white p-3 rounded-lg shadow-md border space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500">Width</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setUiSize(Math.max(50, uiSize - 5))}
                  >
                    <ChevronsDown className="h-3 w-3" />
                  </Button>
                  <Slider
                    min={50}
                    max={100}
                    step={5}
                    value={[uiSize]}
                    onValueChange={(value: number[]) => setUiSize(value[0])}
                    className="w-20"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setUiSize(Math.min(100, uiSize + 5))}
                  >
                    <ChevronsUp className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500">Height</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setUiHeight(Math.max(50, uiHeight - 5))}
                  >
                    <ChevronsDown className="h-3 w-3" />
                  </Button>
                  <Slider
                    min={50}
                    max={100}
                    step={5}
                    value={[uiHeight]}
                    onValueChange={(value: number[]) => setUiHeight(value[0])}
                    className="w-20"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setUiHeight(Math.min(100, uiHeight + 5))}
                  >
                    <ChevronsUp className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <Button
                variant="default"
                size="sm"
                className="w-full text-xs h-7"
                onClick={() => {
                  setUiSize(100);
                  setUiHeight(100);
                }}
              >
                Reset
              </Button>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 h-full">
          {/* Search Files Sidebar - with transition */}
          <div
            className={`h-full border-r bg-white transition-all duration-300 ease-in-out overflow-hidden ${isSidebarOpen ? "w-64 opacity-100" : "w-0 opacity-0"
              }`}
          >
            <div className="p-4 w-64">
              <div className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">Search Files</h2>
                    <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-slate-500">
                    {files.length > 0
                      ? "Search and select files to analyze"
                      : "Upload files in Documents to get started"}
                  </p>
                </div>
                <div className="relative">
                  <Input
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                </div>
              </div>

              {selectedFiles.size > 0 && (
                <div className="mt-4 px-2">
                  <p className="text-sm text-slate-600">
                    {selectedFiles.size} file{selectedFiles.size !== 1 ? "s" : ""} selected
                  </p>
                </div>
              )}

              <ScrollArea className="h-[calc(100vh-10rem)] pr-4 mt-4">
                {files.length > 0 ? (
                  <div className="space-y-1">
                    {filteredFiles.map((file) => (
                      <div
                        key={file.id}
                        className={`flex items-center space-x-2 p-2 rounded-lg transition-colors
                          ${selectedFiles.has(file.id) ? "bg-slate-100" : "hover:bg-slate-50"}`}
                      >
                        {file.type === "file" && (
                          <Checkbox
                            checked={selectedFiles.has(file.id)}
                            onCheckedChange={() => handleFileSelect(file.id)}
                          />
                        )}
                        {file.type === "file" ? (
                          <File className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Folder className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="text-sm text-slate-700 truncate">{file.name}</span>
                      </div>
                    ))}
                    {filteredFiles.length === 0 && searchQuery && (
                      <div className="text-center py-8">
                        <p className="text-sm text-slate-500">No files match your search</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <File className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-900">No files available for analysis</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Upload files in the Documents section to analyze them here
                    </p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Chat Area */}
          <div
            className={`${showReportView ? `w-[${splitPosition}%]` : 'flex-1'} h-full transition-all duration-300 ${!showReportView && 'pr-0'}`}
            style={showReportView ? { width: `${splitPosition}%` } : undefined}
          >
            {/* Main Chat Interface */}
            <div className="flex-1 flex flex-col h-full">
              <div className="flex flex-col h-full mx-2 my-6 border-0 rounded-lg overflow-hidden shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      onClick={handleSearchFilesClick}
                      className={`flex items-center gap-2 ${files.length > 0 ? "text-[#2E7D32] hover:text-[#1B5E20]" : "text-slate-600"
                        }`}
                    >
                      <Search className="h-5 w-5" />
                      <span className="text-sm font-medium">Search Files</span>
                      {files.length > 0 && (
                        <span className="flex items-center justify-center h-5 min-w-[20px] rounded-full bg-emerald-100 px-1 text-xs font-medium text-emerald-700">
                          {selectedFiles.size > 0 ? `${selectedFiles.size}/${files.length}` : files.length}
                        </span>
                      )}
                    </Button>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Bot className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">ESG Analytics Assistant</h2>
                        <p className="text-sm text-slate-500">Powered by AI</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={isReportListOpen ? "default" : "outline"}
                      onClick={() => {
                        toggleReportList();
                        closeSidebarIfOpen();
                      }}
                      className="gap-2 relative"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Reports</span>
                      {reports.length > 0 && (
                        <span className="absolute -top-2 -right-2 flex items-center justify-center h-5 min-w-[20px] rounded-full bg-emerald-100 px-1 text-xs font-medium text-emerald-700">
                          {reports.length}
                        </span>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsModalOpen(true);
                        closeSidebarIfOpen();
                      }}
                      disabled={files.length === 0}
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Generate Report
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-6 bg-slate-50">
                  <div className="space-y-4 min-h-[200px]">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`flex items-start gap-3 max-w-[80%] ${message.role === "assistant" ? "flex-row" : "flex-row-reverse"}`}
                        >
                          <Avatar className="h-8 w-8 mt-0.5">
                            <AvatarImage
                              src={message.role === "assistant" ? "/bot-avatar.png" : "/user-avatar.png"}
                              className="object-cover"
                            />
                            <AvatarFallback>
                              {message.role === "assistant" ? <Bot className="h-5 w-5 text-emerald-600" /> : <User className="h-5 w-5 text-emerald-600" />}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-sm prose prose-sm max-w-none
                              ${message.role === "assistant"
                                ? "bg-white shadow-sm text-slate-700"
                                : "bg-emerald-600 text-white prose-invert"
                              }`}
                          >
                            {message.role === "assistant" ? (
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            ) : (
                              message.content
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-4 bg-white border-t">
                  <form onSubmit={handleFormSubmit} className="max-w-[1000px] mx-auto">
                    <div className="relative">
                      <Input
                        placeholder={isGeneratingResponse ? "Please wait for response..." : "Type your message..."}
                        value={input}
                        onChange={handleInputChange}
                        className="w-full pr-12 py-6 text-base border-slate-200 shadow-sm focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl"
                        disabled={isGeneratingResponse}
                      />
                      <Button
                        type="submit"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-emerald-100 hover:bg-emerald-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isGeneratingResponse || !input.trim()}
                      >
                        {isGeneratingResponse ? (
                          <Loader2 className="h-5 w-5 text-emerald-600 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5 text-emerald-600" />
                        )}
                        <span className="sr-only">
                          {isGeneratingResponse ? "Generating response..." : "Send message"}
                        </span>
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Resizable Divider */}
          {showReportView && (
            <div
              ref={dividerRef}
              className="w-1 bg-gray-200 hover:bg-emerald-300 cursor-col-resize flex items-center justify-center active:bg-emerald-400 transition-colors"
              onMouseDown={handleDividerMouseDown}
            >
              <div className="py-3 flex items-center justify-center">
                <GripVertical className="h-6 w-6 text-slate-400" />
              </div>
            </div>
          )}

          {/* Report View */}
          {showReportView && (
            <div className="flex-1 h-full">
              {isGeneratingReport ? (
                <div className="flex-1 h-full bg-slate-50" />
              ) : selectedReport ? (
                <InteractiveWorkspace
                  report={selectedReport}
                  onClose={closeReportView}
                />
              ) : (
                <div className="flex-1 h-full bg-slate-50" />
              )}
            </div>
          )}

          {/* Reports List Sidebar - with transition */}
          <div
            className={`h-full border-l bg-white transition-all duration-300 ease-in-out overflow-hidden ${isReportListOpen ? "w-64 opacity-100" : "w-0 opacity-0"
              }`}
          >
            <div className="p-4 w-64">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Available Reports</h2>
                  <Button variant="ghost" size="icon" onClick={toggleReportList}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {reports.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-900">No reports generated</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Generate a report to view it here
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-10rem)] pr-4 mt-4">
                    <div className="space-y-2">
                      {reports.map((report) => (
                        <div
                          key={report.id}
                          className="p-3 rounded-md border hover:bg-slate-50 cursor-pointer"
                          onClick={() => handleSelectReport(report)}
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-emerald-600" />
                            <div>
                              <p className="font-medium text-sm">{report.type} Report</p>
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {report.timestamp.toLocaleDateString()} {report.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Report Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open: boolean) => setIsModalOpen(open)}
      >
        <DialogContent className="sm:max-w-[425px] p-6 z-50 bg-white shadow-lg border">
          <DialogHeader className="space-y-3 p-0">
            <DialogTitle className="text-xl font-semibold text-slate-900">Generate ESG Report</DialogTitle>
            <DialogDescription className="text-base text-slate-700">
              Select report type and review selected files
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full h-11 px-3 text-base">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-50 w-full text-slate-900 bg-white border">
                <SelectItem value="GRI" className="text-base">
                  GRI
                </SelectItem>
                <SelectItem value="SASB" className="text-base">
                  SASB
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="space-y-3">
              <h4 className="text-base font-medium text-slate-900">Report Prompt:</h4>
              <Textarea
                value={reportPrompt}
                onChange={(e) => setReportPrompt(e.target.value)}
                className="min-h-[100px] text-base"
                placeholder="Enter instructions for the AI to generate your report"
              />
            </div>

            <div className="space-y-3">
              <h4 className="text-base font-medium text-slate-900">Selected Files:</h4>
              <div className="rounded-lg border bg-white p-4">
                {files.filter((file) => selectedFiles.has(file.id)).length > 0 ? (
                  <ul className="space-y-2">
                    {files
                      .filter((file) => selectedFiles.has(file.id))
                      .map((file) => (
                        <li key={file.id} className="flex items-center gap-2 text-sm text-slate-700">
                          <File className="h-4 w-4 text-blue-500" />
                          {file.name}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="text-base text-slate-700">No files selected</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="h-10 px-4">
              Cancel
            </Button>
            <Button
              onClick={handleGenerateReport}
              disabled={!selectedType || selectedFiles.size === 0}
              className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700"
            >
              Generate Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Export with auth protection
export default withAuth(ChatPage)

