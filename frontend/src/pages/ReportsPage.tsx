"use client"

import React, { useState, useEffect } from "react"
import { FileBarChart, Download, Calendar, Clock, ArrowUpDown, Search, Filter, AlertCircle, Loader2, Grid, List, ChevronDown, LineChart, Shield, Leaf } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { InteractiveWorkspace } from "@/components/dashboard/interactive-workspace"
import { toast } from "sonner"
import { motion } from "framer-motion"
import axios from 'axios'
import supabase from '@/lib/supabase/client'
import { parseISO, isValid } from 'date-fns'

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to every request
api.interceptors.request.use(async config => {
  try {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('🔑 Using token for API request:', token.slice(0, 20) + '...')
    } else {
      console.warn('⚠️ No token available for API request')
    }
  } catch (error) {
    console.error('Error setting auth header:', error)
  }
  return config
})

// Define a type for reports
interface Report {
  id: string;
  name: string;
  type: string;
  timestamp: Date;
  files: string[];
  status?: string;
  generated_at?: string;
  scheduled_for?: string;
  metrics?: {
    environmental_score?: number;
    social_score?: number;
    governance_score?: number;
  };
  created_at?: string;
  last_accessed_at?: string;
  metadata?: {
    cacheControl?: string;
    contentLength?: number;
    eTag?: string;
    httpStatusCode?: number;
    lastModified?: string;
    mimetype?: string;
    size?: number;
  };
  updated_at?: string;
  content?: string;
}

// Define report type styling
const reportTypeStyles = {
  GRI: {
    background: "bg-emerald-50",
    text: "text-emerald-700",
    hover: "hover:bg-emerald-100",
    border: "border-emerald-200",
    icon: <Leaf className="h-3.5 w-3.5 mr-1.5" />,
    title: "Global Reporting Initiative",
    color: "emerald"
  },
  SASB: {
    background: "bg-blue-50",
    text: "text-blue-700", 
    hover: "hover:bg-blue-100",
    border: "border-blue-200",
    icon: <LineChart className="h-3.5 w-3.5 mr-1.5" />,
    title: "Sustainability Accounting Standards Board",
    color: "blue"
  }
};

const ReportsPage = () => {
  const [reports, setReports] = useState<Report[]>([])
  const [filteredReports, setFilteredReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null)

  // Use the axios instance for API calls
  const fetchReports = async () => {
    try {
      const response = await api.get('/api/list-reports')
      if (!response.data) {
        throw new Error('Failed to fetch reports')
      }
      const processedReports = response.data.map((report: any) => ({
        ...report,
        timestamp: report.updated_at ? parseISO(report.updated_at) : null,
        files: report.files || []
      }))
      setReports(processedReports)
      setFilteredReports(processedReports)
    } catch (error) {
      console.error('Error fetching reports:', error)
      toast.error('Failed to load reports')
    } finally {
      setIsLoading(false)
    }
  }

  // Apply filters and search
  useEffect(() => {
    let result = [...reports]
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(report => 
        report.name.toLowerCase().includes(query) || 
        report.type.toLowerCase().includes(query)
      )
    }
    
    // Apply type filter
    if (filterType !== "all") {
      result = result.filter(report => report.type === filterType)
    }
    
    // Apply sorting
    result.sort((a, b) => {
      const aTime = a.timestamp ? a.timestamp.getTime() : -Infinity; // Treat null as earliest
      const bTime = b.timestamp ? b.timestamp.getTime() : -Infinity; // Treat null as earliest

      if (sortOrder === "asc") {
        return aTime === bTime 
          ? (a.id || "").localeCompare(b.id || "")
          : aTime - bTime;
      } else {
        return aTime === bTime
          ? (b.id || "").localeCompare(a.id || "")
          : bTime - aTime;
      }
    })
    
    setFilteredReports(result)
  }, [reports, searchQuery, filterType, sortOrder])

  useEffect(() => {
    fetchReports();
  }, []);

  const handleOpenReport = async (report: Report) => {
    setLoadingReportId(report.id);
    try {
      console.log(`Fetching content for report: ${report.name}`); // Log report name
      const response = await api.get(`/api/view-report?report_name=${encodeURIComponent(report.name)}`);
      console.log("API response from /api/view-report:", response);
      console.log("Response data content:", response.data?.content?.substring(0, 100)); // Log first 100 chars of content
      
      if (response.data && typeof response.data.content === 'string') {
        const reportWithContent: Report = {
          ...report,
          content: response.data.content,
        };
        console.log("Report object with content to be set:", reportWithContent);
        setSelectedReport(reportWithContent);
      } else {
        console.error("Failed to load report content or content is not a string. Response data:", response.data);
        toast.error("Failed to load report content. Invalid format received.");
      }
    } catch (error: any) {
      console.error("Error loading report content:", error);
      toast.error("Failed to load report content. Please try again later.");
    }
  }

  const handleCloseReport = () => {
    setSelectedReport(null)
  }

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === "asc" ? "desc" : "asc")
  }

  // Render grid card view
  const renderGridCard = (report: Report) => {
    const typeStyle = reportTypeStyles[report.type as keyof typeof reportTypeStyles] || {
      background: "bg-slate-50",
      text: "text-slate-700",
      hover: "hover:bg-slate-100",
      border: "border-slate-200",
      icon: null,
      title: report.type
    };
    
    return (
      <motion.div
        key={report.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ y: -5 }}
        className="transition-all duration-200"
      >
        <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className={`pb-2 border-b ${typeStyle.border} p-3`}>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={`${typeStyle.background} ${typeStyle.text} ${typeStyle.hover} font-medium flex items-center py-1 px-2 text-xs`}>
                {typeStyle.icon}
                {report.type}
              </Badge>
              <div className="flex items-center text-xs text-slate-500">
                <Clock className="h-3 w-3 mr-1" />
                {report.timestamp && isValid(report.timestamp) ? report.timestamp.toLocaleDateString() : (report.timestamp ? 'Invalid Date Format' : 'No Date Provided')}
              </div>
            </div>
            <CardTitle className="text-base mt-2 text-slate-900 whitespace-normal break-words">{report.name}</CardTitle>
            {/* <CardDescription className="text-slate-500 text-xs">
              Based on {report.files.length} document{report.files.length !== 1 ? 's' : ''}
            </CardDescription> */}
          </CardHeader>
          <CardContent className="pt-3 pb-2 bg-gradient-to-b from-white to-slate-50 p-3">
            {report.metrics && (
              <div className="flex justify-between text-sm">
                <div className="text-center">
                  <div className="text-emerald-600 font-medium text-xl mb-1">
                    {report.metrics.environmental_score || '-'}
                  </div>
                  <div className="text-xs text-slate-600 font-medium flex flex-col items-center">
                    <Leaf className="h-3 w-3 mb-0.5 text-emerald-500" />
                    <span>Env</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-blue-600 font-medium text-xl mb-1">
                    {report.metrics.social_score || '-'}
                  </div>
                  <div className="text-xs text-slate-600 font-medium flex flex-col items-center">
                    <LineChart className="h-3 w-3 mb-0.5 text-blue-500" />
                    <span>Soc</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-purple-600 font-medium text-xl mb-1">
                    {report.metrics.governance_score || '-'}
                  </div>
                  <div className="text-xs text-slate-600 font-medium flex flex-col items-center">
                    <Shield className="h-3 w-3 mb-0.5 text-purple-500" />
                    <span>Gov</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-2 p-3">
            <Button 
              variant="default" 
              onClick={() => handleOpenReport(report)} 
              className={`w-full transition-all shadow-sm hover:shadow ${report.type === 'GRI' ? 'bg-emerald-600 hover:bg-emerald-700' : report.type === 'SASB' ? 'bg-blue-600 hover:bg-blue-700' : ''} text-sm py-1`}
            >
              View Report
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    );
  };

  // Render list item view
  const renderListItem = (report: Report) => {
    const typeStyle = reportTypeStyles[report.type as keyof typeof reportTypeStyles] || {
      background: "bg-slate-50",
      text: "text-slate-700",
      hover: "hover:bg-slate-100",
      border: "border-slate-200",
      icon: null,
      title: report.type,
      color: "slate"
    };
    
    return (
      <motion.div
        key={report.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="transition-all duration-200"
      >
        <div className="flex items-center justify-between py-4 px-6 hover:bg-slate-50 transition-colors rounded-xl shadow-sm hover:shadow my-2 mx-1 bg-white">
          {/* Left section with type and report info */}
          <div className="flex items-start gap-5">
            {/* Type badge section */}
            <div className="flex flex-col w-48">
              <div className={`inline-flex items-center px-3 py-2 rounded-md ${typeStyle.background} ${typeStyle.text} w-fit`}>
                {report.type === 'GRI' ? 
                  <Leaf className="h-4 w-4 mr-2" /> : 
                  <LineChart className="h-4 w-4 mr-2" />
                }
                <span className="font-medium">{report.type}</span>
              </div>
              <div className="text-xs text-slate-500 mt-2">
                {typeStyle.title}
              </div>
            </div>
            
            {/* Report details */}
            <div className="flex flex-col">
              <div className="flex items-center">
                <h3 className="font-medium text-slate-900 text-lg whitespace-normal">{report.name}</h3>
                <div className="flex items-center text-xs text-slate-500 ml-3">
                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                  {report.timestamp && isValid(report.timestamp) ? report.timestamp.toLocaleDateString() : (report.timestamp ? 'Invalid Date Format' : 'No Date Provided')}
                </div>
              </div>
              {/* <div className="text-sm text-slate-500 mt-1">
                Based on {report.files.length} document{report.files.length !== 1 ? 's' : ''}
              </div> */}
            </div>
          </div>

          {/* Right section with metrics and view button */}
          <div className="flex items-center gap-6">
            {report.metrics && (
              <div className="grid grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="text-emerald-600 font-semibold text-2xl">
                    {report.metrics.environmental_score || '-'}
                  </div>
                  <div className="text-xs text-slate-600 font-medium flex items-center justify-center mt-1">
                    <Leaf className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                    <span>Env</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-blue-600 font-semibold text-2xl">
                    {report.metrics.social_score || '-'}
                  </div>
                  <div className="text-xs text-slate-600 font-medium flex items-center justify-center mt-1">
                    <LineChart className="h-3.5 w-3.5 mr-1 text-blue-500" />
                    <span>Soc</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-purple-600 font-semibold text-2xl">
                    {report.metrics.governance_score || '-'}
                  </div>
                  <div className="text-xs text-slate-600 font-medium flex items-center justify-center mt-1">
                    <Shield className="h-3.5 w-3.5 mr-1 text-purple-500" />
                    <span>Gov</span>
                  </div>
                </div>
              </div>
            )}
            <div className="flex-shrink-0 ml-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleOpenReport(report)}
                className={`${report.type === 'GRI' ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' : 
                             report.type === 'SASB' ? 'border-blue-300 text-blue-700 hover:bg-blue-50' : ''} 
                             shadow-sm hover:shadow transition-all px-5 py-2 h-auto`}
              >
                View
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  if (selectedReport) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between bg-slate-50 p-3 border-b shadow-sm">
          <Button variant="outline" size="sm" onClick={handleCloseReport} className="gap-2">
            <FileBarChart className="h-4 w-4" />
            Back to Reports
          </Button>
          <h2 className="text-lg font-medium">{selectedReport.name}</h2>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          <InteractiveWorkspace report={selectedReport} onClose={handleCloseReport} />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between py-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">ESG Reports</h1>
          <p className="text-slate-500 mt-1">View and manage your generated ESG reports</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="border rounded-md flex overflow-hidden shadow-sm">
            <Button 
              variant={viewMode === "list" ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setViewMode("list")} 
              className={`gap-2 rounded-none ${viewMode === "list" ? "bg-slate-100 text-slate-900" : "hover:bg-transparent"}`}
            >
              <List className="h-4 w-4" />
              List
            </Button>
            <Button 
              variant={viewMode === "grid" ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setViewMode("grid")} 
              className={`gap-2 rounded-none ${viewMode === "grid" ? "bg-slate-100 text-slate-900" : "hover:bg-transparent"}`}
            >
              <Grid className="h-4 w-4" />
              Grid
            </Button>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleSortOrder} 
            className="gap-2 shadow-sm"
          >
            <ArrowUpDown className="h-4 w-4" />
            {sortOrder === "desc" ? "Newest First" : "Oldest First"}
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            className="gap-2 bg-slate-900 hover:bg-slate-800 shadow-md text-white px-4"
          >
            <Download className="h-4 w-4" />
            Export All
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <Input
            placeholder="Search reports..."
            className="pl-10 py-2 shadow-md rounded-xl border-slate-200 focus:border-slate-300 focus:ring-2 focus:ring-slate-200 transition-all bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 p-0 rounded-full hover:bg-slate-100"
              onClick={() => setSearchQuery("")}
            >
              <span className="sr-only">Clear search</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24">
                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 6L6 18M6 6l12 12" />
              </svg>
            </Button>
          )}
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px] shadow-md rounded-xl py-2 border-slate-200 bg-white">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-600" />
              <SelectValue placeholder="All Types" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-white border shadow-xl rounded-md">
            <SelectGroup>
              <SelectLabel className="text-xs font-semibold text-slate-500 pb-1">REPORT TYPES</SelectLabel>
              <SelectItem value="all" className="flex items-center">
                <div className="flex items-center">All Types</div>
              </SelectItem>
              <SelectItem value="GRI" className="flex items-center text-emerald-700">
                <div className="flex items-center">
                  <Leaf className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                  GRI Reports
                </div>
              </SelectItem>
              <SelectItem value="SASB" className="flex items-center text-blue-700">
                <div className="flex items-center">
                  <LineChart className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                  SASB Reports
                </div>
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="text-slate-500">Loading reports...</p>
            </div>
          </div>
        ) : filteredReports.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center h-96 gap-4"
          >
            <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center shadow-inner">
              <FileBarChart className="h-10 w-10 text-slate-400" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-slate-900">No reports found</h3>
              <p className="text-slate-500 mt-1">
                {searchQuery || filterType !== "all" 
                  ? "Try adjusting your filters or search criteria" 
                  : "Generate your first report from the Chat page"}
              </p>
            </div>
            {searchQuery || filterType !== "all" ? (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery("")
                  setFilterType("all")
                }}
                className="shadow-sm"
              >
                Clear Filters
              </Button>
            ) : (
              <Button
                variant="default"
                onClick={() => {
                  // Dispatch event to change tab to chat
                  const event = new CustomEvent('tabChange', { detail: { tab: 'chat' } })
                  window.dispatchEvent(event)
                }}
                className="shadow-sm bg-slate-800 hover:bg-slate-900"
              >
                Go to Chat
              </Button>
            )}
          </motion.div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredReports.map(renderGridCard)}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map(renderListItem)}
          </div>
        )}
      </div>
    </div>
  )
}

export default ReportsPage 