"use client"

import React, { useState, useEffect } from 'react';
import { BarChart } from "@/components/dashboard/bar-chart";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { LineChart } from "@/components/dashboard/line-chart";
import { Heatmap } from "@/components/dashboard/heatmap";
import { DataTable } from "@/components/dashboard/data-table";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Calendar,
  ChartBar,
  ChartPie,
  Cloud,
  Download,
  Droplet,
  ExternalLink,
  FileText,
  Filter,
  Leaf,
  Lightbulb,
  Maximize,
  Minimize,
  Info,
  PlusCircle,
  Printer,
  RefreshCw,
  Share2,
  Trash2,
  TrendingUp,
  TrendingDown,
  User,
  TreeDeciduous,
  Recycle,
  XCircle,
  Wand2,
  EyeOff,
  Sliders,
  Check,
  Loader2,
  Plus,
  Settings,
  SlidersHorizontal,
  Trash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { useDashboardStore } from "@/lib/store";
import { cn } from "@/lib/utils";

// Types for date range
import type { DateRange } from "react-day-picker";

// Add imports
import { fetchDataChunks, fetchChunkData } from '@/lib/api/analytics';
import { ExcelAnalytics } from "@/components/dashboard/excel-analytics";

export interface KeyMetric {
  metric: string;
  current: string;
  previous: string;
  change: number;
  target: string;
}

export interface CategoryData {
  name: string;
  value: number;
}

export interface MonthlyTrend {
  month: string;
  value: number;
}

interface ChartData {
  name: string;
  value1: number;
  value2: number;
  value3: number;
  [key: string]: any;
}

interface DonutChartData {
  name: string;
  value: number;
}

interface ChartConfig {
  title: string;
  dataKeys: string[];
  dataLabels: string[];
  colors: string[];
  showLegend: boolean;
  [key: string]: any;
}

// Default values for the analytics dashboard
const defaultData = {
  environmentalScore: 82,
  environmentalScoreChange: 4.2,
  energyEfficiency: 78,
  energyEfficiencyChange: -2.1,
  wasteManagement: 91,
  wasteManagementChange: 6.8,
  waterUsage: 68,
  waterUsageChange: 3.5,
  environmentalTrends: [
    { month: 'Jan', value: 65 },
    { month: 'Feb', value: 68 },
    { month: 'Mar', value: 70 },
    { month: 'Apr', value: 73 },
    { month: 'May', value: 75 },
    { month: 'Jun', value: 78 },
    { month: 'Jul', value: 77 },
    { month: 'Aug', value: 80 },
    { month: 'Sep', value: 82 },
    { month: 'Oct', value: 82 },
    { month: 'Nov', value: 85 },
    { month: 'Dec', value: 88 },
  ] as MonthlyTrend[],
  categoryDistribution: [
    { name: 'Carbon Emissions', value: 35 },
    { name: 'Renewable Energy', value: 25 },
    { name: 'Waste Management', value: 20 },
    { name: 'Water Conservation', value: 15 },
    { name: 'Materials Usage', value: 5 },
  ] as CategoryData[],
  keyMetrics: [
    {
      metric: 'Carbon Footprint',
      current: '12.5 tons',
      previous: '13.8 tons',
      change: -9.4,
      target: '10.0 tons'
    },
    {
      metric: 'Renewable Energy',
      current: '42%',
      previous: '38%',
      change: 10.5,
      target: '50%'
    },
    {
      metric: 'Waste Recycling',
      current: '78%',
      previous: '72%',
      change: 8.3,
      target: '85%'
    },
    {
      metric: 'Water Consumption',
      current: '4,250 gal',
      previous: '4,520 gal',
      change: -6.0,
      target: '4,000 gal'
    },
    {
      metric: 'Energy Usage',
      current: '145 kWh',
      previous: '152 kWh',
      change: -4.6,
      target: '140 kWh'
    }
  ] as KeyMetric[]
};

// Interactive Chart Wrapper Component
function InteractiveChartWrapper({
  title,
  onRefresh,
  className,
  children
}: {
  title: string;
  onRefresh?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false)
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <div className={`rounded-lg bg-white p-6 shadow-md hover:shadow-lg transition-all duration-300 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">
                  <Info className="h-4 w-4 text-slate-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Chart showing {title} data</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {expanded ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] md:max-w-[900px] lg:max-w-[1000px]">
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
              </DialogHeader>
              <div className="min-h-[500px] py-4">{children}</div>
            </DialogContent>
          </Dialog>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisible(false)}
            className="h-8 w-8 p-0"
          >
            <EyeOff className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="chart-container min-h-[240px]">{children}</div>
    </div>
  )
}

// Chart Generator Component
function ChartGenerator({ setCustomCharts }: { setCustomCharts: React.Dispatch<React.SetStateAction<any[]>> }) {
  const [chartType, setChartType] = useState<string>("bar")
  const [chartTitle, setChartTitle] = useState<string>("Custom Chart")
  const [dataPoints, setDataPoints] = useState<number>(5)
  const [dataSource, setDataSource] = useState<string>("manual")
  const [reportSource, setReportSource] = useState<string>("")
  const [isAddingToBoard, setIsAddingToBoard] = useState(false)
  const [activeTab, setActiveTab] = useState("type")
  const [customData, setCustomData] = useState<ChartData[]>([
    { name: "Jan", value1: 40, value2: 24, value3: 65 },
    { name: "Feb", value1: 30, value2: 13, value3: 45 },
    { name: "Mar", value1: 20, value2: 98, value3: 35 },
    { name: "Apr", value1: 27, value2: 39, value3: 20 },
    { name: "May", value1: 18, value2: 48, value3: 75 }
  ])

  // Add these states for data chunks
  const [dataChunks, setDataChunks] = useState<Array<{ id: string, name: string, description: string, category: string }>>([])
  const [selectedChunk, setSelectedChunk] = useState<string>("")
  const [isLoadingChunks, setIsLoadingChunks] = useState<boolean>(false)

  // Add global style for SelectContent to ensure opaque background
  React.useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      [data-radix-popper-content-wrapper] {
        background-color: white !important;
        z-index: 50 !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Fetch data chunks when the data source is set to "chunk"
  React.useEffect(() => {
    if (dataSource === "chunk") {
      handleFetchDataChunks();
    }
  }, [dataSource]);

  const [config, setConfig] = useState<ChartConfig>({
    title: chartTitle,
    dataKeys: ["value1", "value2", "value3"],
    dataLabels: ["Series 1", "Series 2", "Series 3"],
    colors: ["#4CAF50", "#2196F3", "#FFC107"],
    showLegend: true,
    stacked: false,
    innerRadius: 60,
    outerRadius: 80
  })

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChartTitle(e.target.value)
    setConfig(prev => ({ ...prev, title: e.target.value }))
  }

  const handleUpdateConfig = (key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleGenerateData = () => {
    // Generate random data
    const newData: ChartData[] = []
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    for (let i = 0; i < dataPoints; i++) {
      newData.push({
        name: months[i % 12],
        value1: Math.floor(Math.random() * 100),
        value2: Math.floor(Math.random() * 100),
        value3: Math.floor(Math.random() * 100)
      })
    }

    setCustomData(newData)
  }

  const fetchReportData = () => {
    // In a real implementation, this would fetch data from the selected report
    setIsAddingToBoard(true)
    setTimeout(() => {
      // Simulating data fetch
      handleGenerateData()
      setIsAddingToBoard(false)
    }, 1000)
  }

  // new function to fetch available data chunks
  const handleFetchDataChunks = async () => {
    setIsLoadingChunks(true);
    try {
      const data = await fetchDataChunks();
      setDataChunks(data);
    } catch (error) {
      console.error('Failed to fetch data chunks:', error);
    } finally {
      setIsLoadingChunks(false);
    }
  };

  // new function to fetch data for a specific chunk
  const handleFetchChunkData = async (chunkId: string) => {
    if (!chunkId) return;

    setIsAddingToBoard(true);
    try {
      const data = await fetchChunkData(chunkId);

      // Update chart type if available from the API
      if (data.type) {
        setChartType(data.type);
      }

      // Update chart title
      if (data.title) {
        setChartTitle(data.title);
        setConfig(prev => ({ ...prev, title: data.title }));
      }

      // Process the data into the format expected by the chart
      if (data.labels && data.series) {
        const transformedData: ChartData[] = data.labels.map((label: string, index: number) => {
          // Initialize with required properties to satisfy TypeScript
          const item: ChartData = {
            name: label,
            value1: 0,
            value2: 0,
            value3: 0
          };

          // Add each series data point
          data.series.forEach((series: any, seriesIndex: number) => {
            const keyName = `value${seriesIndex + 1}`;
            item[keyName] = series.data[index];
          });

          return item;
        });

        setCustomData(transformedData);

        // Update data labels in config
        const seriesNames = data.series.map((s: any) => s.name);
        setConfig(prev => ({
          ...prev,
          dataLabels: seriesNames
        }));
      }
    } catch (error) {
      console.error('Failed to fetch chunk data:', error);
    } finally {
      setIsAddingToBoard(false);
    }
  };

  const handleAddToDashboard = () => {
    setIsAddingToBoard(true);

    // Simulate adding to dashboard with a delay
    setTimeout(() => {
      // Actually add the chart to the dashboard
      const newChart = {
        id: `custom-chart-${Date.now()}`,
        type: chartType,
        title: chartTitle,
        data: chartType === 'donut' ? getDonutChartData() : customData,
        config: config
      };

      setCustomCharts(prev => [...prev, newChart]);
      setIsAddingToBoard(false);

      // Show success notification
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-emerald-100 text-emerald-800 p-4 rounded-lg shadow-lg flex items-center z-50'
      notification.innerHTML = `
        <svg class="h-5 w-5 mr-2 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <div>
          <p class="font-medium">Chart Added</p>
          <p class="text-sm text-emerald-700">${chartTitle} added to dashboard</p>
        </div>
      `
      document.body.appendChild(notification)

      // Remove notification after 3 seconds
      setTimeout(() => {
        document.body.removeChild(notification)
      }, 3000)
    }, 1500)
  }

  const getDonutChartData = (): DonutChartData[] => {
    return customData.map(item => ({
      name: item.name,
      value: item.value1
    }))
  }

  const renderPreview = () => {
    switch (chartType) {
      case "bar":
        return <BarChart data={customData} />
      case "line":
        return <LineChart data={customData} />
      case "donut":
        return <DonutChart data={getDonutChartData()} />
      default:
        return <BarChart data={customData} />
    }
  }

  const getChartTypeIcon = () => {
    switch (chartType) {
      case "bar":
        return <BarChart3 className="h-5 w-5 text-emerald-600" />
      case "line":
        return <TrendingUp className="h-5 w-5 text-blue-600" />
      case "donut":
        return <ChartPie className="h-5 w-5 text-amber-600" />
      default:
        return <ChartBar className="h-5 w-5 text-emerald-600" />
    }
  }

  const renderDataSourceInput = () => {
    switch (dataSource) {
      case "report":
        return (
          <div className="space-y-3">
            <Label htmlFor="report-source" className="text-sm text-slate-600">Select Report</Label>
            <Select
              value={reportSource}
              onValueChange={setReportSource}
            >
              <SelectTrigger id="report-source" className="w-full">
                <SelectValue placeholder="Select a report" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-slate-200 shadow-md">
                <SelectItem value="annual-esg-2023">
                  <span>Annual ESG Report 2023</span>
                </SelectItem>
                <SelectItem value="quarterly-q1-2023">
                  <span>Q1 2023 Sustainability Report</span>
                </SelectItem>
                <SelectItem value="quarterly-q2-2023">
                  <span>Q2 2023 Sustainability Report</span>
                </SelectItem>
                <SelectItem value="quarterly-q3-2023">
                  <span>Q3 2023 Sustainability Report</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReportData}
              disabled={!reportSource}
              className="w-full"
            >
              {isAddingToBoard ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Load Report Data
            </Button>
          </div>
        )
      case "chunk":
        return (
          <div className="space-y-3">
            <Label htmlFor="chunk-source" className="text-sm text-slate-600">Select Data Chunk</Label>
            <Select
              value={selectedChunk}
              onValueChange={setSelectedChunk}
              disabled={isLoadingChunks}
            >
              <SelectTrigger id="chunk-source" className="w-full">
                <SelectValue placeholder={isLoadingChunks ? "Loading chunks..." : "Select a data chunk"} />
              </SelectTrigger>
              <SelectContent className="bg-white border border-slate-200 shadow-md">
                {dataChunks.length > 0 ? (
                  dataChunks.map(chunk => (
                    <SelectItem key={chunk.id} value={chunk.id}>
                      <div className="flex flex-col items-start w-full text-left">
                        <span className="text-left w-full">{chunk.name}</span>
                        <span className="text-xs text-slate-500 text-left w-full">{chunk.description}</span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="placeholder" disabled>
                    <span className="text-left w-full">{isLoadingChunks ? "Loading..." : "No data chunks available"}</span>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFetchChunkData(selectedChunk)}
              disabled={!selectedChunk || isLoadingChunks || isAddingToBoard}
              className="w-full"
            >
              {isAddingToBoard ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Cloud className="h-4 w-4 mr-2" />
              )}
              Load Chunk Data
            </Button>
          </div>
        )
      case "manual":
      default:
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="data-points" className="text-sm text-slate-600 flex items-center">
                <span>Number of Data Points</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 ml-1 text-slate-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs w-[200px]">Select how many time periods to include in your chart</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="data-points"
                  type="number"
                  min={1}
                  max={12}
                  value={dataPoints}
                  onChange={e => setDataPoints(Number(e.target.value))}
                  className="w-full"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateData}
                  className="whitespace-nowrap"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Random
                </Button>
              </div>
            </div>

            <div className="pt-2">
              <Label className="text-sm text-slate-600 mb-2 block flex items-center">
                <span>Edit Data Series</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 ml-1 text-slate-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs w-[200px]">Give your data series meaningful names and choose colors</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <div className="space-y-2">
                {config.dataLabels.map((label, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={label}
                      onChange={e => {
                        const newLabels = [...config.dataLabels]
                        newLabels[idx] = e.target.value
                        handleUpdateConfig('dataLabels', newLabels)
                      }}
                      className="flex-1"
                      placeholder={`Series ${idx + 1} name`}
                    />
                    <div
                      className="w-8 h-8 rounded-md cursor-pointer border shadow-sm relative group"
                      style={{ backgroundColor: config.colors[idx] }}
                      onClick={() => {
                        // In a real implementation, this would open a color picker
                        const colors = ["#4CAF50", "#2196F3", "#FFC107", "#F44336", "#9C27B0", "#795548"]
                        const newColors = [...config.colors]
                        newColors[idx] = colors[Math.floor(Math.random() * colors.length)]
                        handleUpdateConfig('colors', newColors)
                      }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/5 rounded-md text-xs font-medium text-white">
                        Click
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
    }
  }

  useEffect(() => {
    if (dataSource === 'api' && selectedChunk) {
      handleFetchChunkData(selectedChunk);
    }
  }, [dataSource, selectedChunk]);

  useEffect(() => {
    if (dataSource === 'api') {
      handleFetchDataChunks();
    }
  }, [dataSource]);

  useEffect(() => {
    if (dataSource === 'manual') {
      handleGenerateData();
    } else if (dataSource === 'report') {
      fetchReportData();
    } else if (dataSource === 'api') {
      handleFetchDataChunks();
    }
  }, [dataSource]);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-slate-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-slate-50 px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold mb-1 flex items-center">
          <ChartBar className="h-5 w-5 mr-2 text-emerald-600" />
          Custom Chart Generator
        </h3>
        <p className="text-sm text-slate-500">Create and add custom visualizations to your ESG dashboard</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 p-6">
        <div className="space-y-6">
          <Tabs defaultValue="type" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="w-full mb-4 bg-slate-100 rounded-md">
              <TabsTrigger value="type" className="data-[state=active]:bg-white data-[state=active]:text-emerald-700">
                <span className="flex items-center">
                  <ChartBar className="h-4 w-4 mr-2" />
                  Chart Type
                </span>
              </TabsTrigger>
              <TabsTrigger value="data" className="data-[state=active]:bg-white data-[state=active]:text-emerald-700">
                <span className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Data Source
                </span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="data-[state=active]:bg-white data-[state=active]:text-emerald-700">
                <span className="flex items-center">
                  <Sliders className="h-4 w-4 mr-2" />
                  Appearance
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="type" className="space-y-4 bg-white p-4 rounded-md border border-slate-100 shadow-sm">
              <div>
                <Label htmlFor="chart-title" className="text-sm text-slate-600">Chart Title</Label>
                <Input
                  id="chart-title"
                  value={chartTitle}
                  onChange={handleTitleChange}
                  className="mt-1 w-full"
                />
              </div>

              <div>
                <Label htmlFor="chart-type" className="text-sm text-slate-600">Chart Type</Label>
                <Select
                  value={chartType}
                  onValueChange={setChartType}
                >
                  <SelectTrigger id="chart-type" className="mt-1 w-full">
                    <SelectValue placeholder="Select chart type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-md">
                    <SelectItem value="bar">
                      <div className="flex items-center">
                        <BarChart3 className="h-4 w-4 mr-2 text-emerald-600" />
                        <span>Bar Chart</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="line">
                      <div className="flex items-center">
                        <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                        <span>Line Chart</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="donut">
                      <div className="flex items-center">
                        <ChartPie className="h-4 w-4 mr-2 text-amber-600" />
                        <span>Donut Chart</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-4 flex gap-2 flex-wrap">
                <Badge variant="outline" className="bg-slate-50 hover:bg-slate-100 cursor-pointer" onClick={() => setChartTitle("Monthly ESG Trends")}>
                  Monthly ESG Trends
                </Badge>
                <Badge variant="outline" className="bg-slate-50 hover:bg-slate-100 cursor-pointer" onClick={() => setChartTitle("Carbon Emissions")}>
                  Carbon Emissions
                </Badge>
                <Badge variant="outline" className="bg-slate-50 hover:bg-slate-100 cursor-pointer" onClick={() => setChartTitle("Resource Usage")}>
                  Resource Usage
                </Badge>
              </div>
            </TabsContent>

            <TabsContent value="data" className="space-y-4 bg-white p-4 rounded-md border border-slate-100 shadow-sm">
              <div>
                <Label htmlFor="data-source" className="text-sm text-slate-600">Data Source</Label>
                <Select
                  value={dataSource}
                  onValueChange={setDataSource}
                >
                  <SelectTrigger id="data-source" className="mt-1 w-full">
                    <SelectValue placeholder="Select data source" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-md">
                    <SelectItem value="manual">
                      <div className="flex items-center">
                        <Wand2 className="h-4 w-4 mr-2 text-emerald-600" />
                        <span>Manual Entry / Random</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="report">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-blue-600" />
                        <span>From Reports</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="chunk">
                      <div className="flex items-center">
                        <Cloud className="h-4 w-4 mr-2 text-amber-600" />
                        <span>From Data Chunks</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {renderDataSourceInput()}
            </TabsContent>

            <TabsContent value="appearance" className="space-y-4 bg-white p-4 rounded-md border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showLegend"
                    checked={config.showLegend}
                    onChange={e => handleUpdateConfig('showLegend', e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <Label htmlFor="showLegend" className="text-sm text-slate-600">Show Legend</Label>
                </div>

                {chartType === 'bar' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="stacked"
                      checked={config.stacked}
                      onChange={e => handleUpdateConfig('stacked', e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <Label htmlFor="stacked" className="text-sm text-slate-600">Stacked</Label>
                  </div>
                )}
              </div>

              {chartType === 'donut' && (
                <div className="space-y-3">
                  <Label htmlFor="innerRadius" className="text-sm text-slate-600">Donut Thickness</Label>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-slate-500">Thin</span>
                    <input
                      type="range"
                      id="innerRadius"
                      min="30"
                      max="80"
                      value={config.innerRadius}
                      onChange={e => handleUpdateConfig('innerRadius', Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs text-slate-500">Thick</span>
                  </div>
                </div>
              )}

              <div className="mt-2">
                <Label className="text-sm text-slate-600 mb-2 block">Chart Theme</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex justify-start items-center h-auto py-2"
                    onClick={() => handleUpdateConfig('colors', ["#4CAF50", "#2196F3", "#FFC107"])}
                  >
                    <div className="flex gap-1 mr-2">
                      <div className="w-3 h-3 bg-[#4CAF50] rounded-full"></div>
                      <div className="w-3 h-3 bg-[#2196F3] rounded-full"></div>
                      <div className="w-3 h-3 bg-[#FFC107] rounded-full"></div>
                    </div>
                    <span className="text-xs">Default</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex justify-start items-center h-auto py-2"
                    onClick={() => handleUpdateConfig('colors', ["#3B82F6", "#60A5FA", "#93C5FD"])}
                  >
                    <div className="flex gap-1 mr-2">
                      <div className="w-3 h-3 bg-[#3B82F6] rounded-full"></div>
                      <div className="w-3 h-3 bg-[#60A5FA] rounded-full"></div>
                      <div className="w-3 h-3 bg-[#93C5FD] rounded-full"></div>
                    </div>
                    <span className="text-xs">Blue</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex justify-start items-center h-auto py-2"
                    onClick={() => handleUpdateConfig('colors', ["#10B981", "#34D399", "#6EE7B7"])}
                  >
                    <div className="flex gap-1 mr-2">
                      <div className="w-3 h-3 bg-[#10B981] rounded-full"></div>
                      <div className="w-3 h-3 bg-[#34D399] rounded-full"></div>
                      <div className="w-3 h-3 bg-[#6EE7B7] rounded-full"></div>
                    </div>
                    <span className="text-xs">Green</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex justify-start items-center h-auto py-2"
                    onClick={() => handleUpdateConfig('colors', ["#F59E0B", "#FBBF24", "#FCD34D"])}
                  >
                    <div className="flex gap-1 mr-2">
                      <div className="w-3 h-3 bg-[#F59E0B] rounded-full"></div>
                      <div className="w-3 h-3 bg-[#FBBF24] rounded-full"></div>
                      <div className="w-3 h-3 bg-[#FCD34D] rounded-full"></div>
                    </div>
                    <span className="text-xs">Amber</span>
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="pt-2">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white relative overflow-hidden group"
              onClick={handleAddToDashboard}
              disabled={isAddingToBoard}
            >
              {isAddingToBoard ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Adding to Dashboard...
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                  Add to Dashboard
                </>
              )}
              <span className="absolute inset-0 h-full w-full bg-white scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-20 rounded-md transition-all duration-300"></span>
            </Button>
          </div>
        )
      case "manual":
      default:
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="data-points" className="text-sm text-slate-600 flex items-center">
                <span>Number of Data Points</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 ml-1 text-slate-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs w-[200px]">Select how many time periods to include in your chart</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="data-points"
                  type="number"
                  min={1}
                  max={12}
                  value={dataPoints}
                  onChange={e => setDataPoints(Number(e.target.value))}
                  className="w-full"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateData}
                  className="whitespace-nowrap"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Random
                </Button>
              </div>
            </div>


        <div className="bg-slate-50 rounded-md flex flex-col items-center justify-center border border-slate-200 p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white to-transparent opacity-70 z-0"></div>

          <div className="z-10 flex flex-col items-center w-full">
            <div className="h-8 w-full mb-1 flex items-center justify-between">
              <div className="text-sm font-medium text-slate-700 flex items-center">
                {getChartTypeIcon()}
                <span className="ml-2">{chartTitle || "Chart Preview"}</span>
              </div>

              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
              </div>
            </div>

            <div className="w-full h-full border border-slate-200 rounded bg-white shadow-sm min-h-[300px] flex items-center justify-center p-2">
              {renderPreview()}
            </div>

            <div className="mt-3 px-4 py-2 bg-white/80 rounded-full shadow-sm border border-slate-200 flex items-center">
              <span className="text-xs text-slate-500 flex items-center">
                <ArrowRight className="h-3 w-3 mr-1" />
                Chart Preview - {activeTab === "type" ? "Define your chart type" : activeTab === "data" ? "Choose your data source" : "Customize appearance"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Create a simple component for visual display
function ProgressGoalsTable({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="w-full h-[300px] overflow-auto">
      <div className="min-w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Goal</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Carbon Neutrality</TableCell>
              <TableCell>2025</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={65} className="h-2" />
                  <span className="text-xs">65%</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Badge className="bg-amber-500">On Track</Badge>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">100% Renewable Energy</TableCell>
              <TableCell>2027</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={42} className="h-2" />
                  <span className="text-xs">42%</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Badge className="bg-emerald-500">On Track</Badge>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Zero Waste to Landfill</TableCell>
              <TableCell>2026</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={78} className="h-2" />
                  <span className="text-xs">78%</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Badge className="bg-emerald-500">Ahead</Badge>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Water Neutral Operations</TableCell>
              <TableCell>2028</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={35} className="h-2" />
                  <span className="text-xs">35%</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Badge className="bg-rose-500">At Risk</Badge>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Sustainable Supply Chain</TableCell>
              <TableCell>2030</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={25} className="h-2" />
                  <span className="text-xs">25%</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Badge className="bg-amber-500">On Track</Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Create a simple component for visual display of radar chart
function RadarChartDisplay() {
  return (
    <div className="w-full h-[300px] flex items-center justify-center flex-col">
      <div className="border-4 border-emerald-100 rounded-full w-52 h-52 relative">
        {/* Simulated radar chart with CSS */}
        <div className="absolute inset-0 border-2 border-dashed border-gray-200 rounded-full m-5"></div>
        <div className="absolute inset-0 border border-dashed border-gray-200 rounded-full m-10"></div>
        <div className="absolute inset-0 border border-dashed border-gray-200 rounded-full m-15"></div>

        {/* Data points */}
        <div className="absolute top-[25%] right-[15%] w-3 h-3 bg-emerald-500 rounded-full"></div>
        <div className="absolute top-[15%] left-[30%] w-3 h-3 bg-emerald-500 rounded-full"></div>
        <div className="absolute bottom-[20%] right-[25%] w-3 h-3 bg-emerald-500 rounded-full"></div>
        <div className="absolute bottom-[30%] left-[20%] w-3 h-3 bg-emerald-500 rounded-full"></div>
        <div className="absolute top-[50%] right-[10%] w-3 h-3 bg-emerald-500 rounded-full"></div>
        <div className="absolute bottom-[10%] left-[50%] w-3 h-3 bg-emerald-500 rounded-full"></div>
      </div>

      <div className="flex justify-center gap-4 mt-6">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-emerald-500 rounded-full mr-2"></div>
          <span className="text-sm">Current</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-700 rounded-full mr-2"></div>
          <span className="text-sm">Target</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-amber-400 rounded-full mr-2"></div>
          <span className="text-sm">Industry Avg</span>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const { dateRange, metrics, chartData, isLoading: storeLoading, setDateRange, refreshData, setSelectedYear } = useDashboardStore();

  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "compact">("cards");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRefreshNotification, setShowRefreshNotification] = useState(false);
  const [showChartGenerator, setShowChartGenerator] = useState(false);
  const [customCharts, setCustomCharts] = useState<Array<{
    id: string;
    type: string;
    title: string;
    data: any[];
    config: ChartConfig;
  }>>([]);

  // Get data from store or use defaults if not available
  const envScore = (chartData as any)?.environmentalScore || defaultData.environmentalScore;
  const envScoreChange = (chartData as any)?.environmentalScoreChange || defaultData.environmentalScoreChange;
  const energyEff = (chartData as any)?.energyEfficiency || defaultData.energyEfficiency;
  const energyEffChange = (chartData as any)?.energyEfficiencyChange || defaultData.energyEfficiencyChange;
  const wasteManagement = (chartData as any)?.wasteManagement || defaultData.wasteManagement;
  const wasteManagementChange = (chartData as any)?.wasteManagementChange || defaultData.wasteManagementChange;
  const waterUsage = (chartData as any)?.waterUsage || defaultData.waterUsage;
  const waterUsageChange = (chartData as any)?.waterUsageChange || defaultData.waterUsageChange;

  // Animate count-up numbers
  useEffect(() => {
    if (!isLoading) {
      const countUpElements = document.querySelectorAll('.animate-count-up');

      countUpElements.forEach((element) => {
        const targetValue = parseInt(element.getAttribute('data-value') || '0', 10);
        let startValue = 0;
        const duration = 1500; // 1.5 seconds
        const startTime = Date.now();

        const updateValue = () => {
          const currentTime = Date.now();
          const elapsedTime = currentTime - startTime;

          if (elapsedTime < duration) {
            const progress = elapsedTime / duration;
            const currentValue = Math.ceil(progress * targetValue);
            element.textContent = currentValue.toString();
            requestAnimationFrame(updateValue);
          } else {
            element.textContent = targetValue.toString();
          }
        };

        requestAnimationFrame(updateValue);
      });
    }
  }, [isLoading]);

  // Simulate loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Handle auto refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = window.setInterval(() => {
        refreshData();
      }, 30000); // 30 seconds

      setRefreshInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh, refreshData]);

  const handleRefresh = () => {
    setIsLoading(true);
    refreshData();
    setTimeout(() => {
      setIsLoading(false);
      setShowRefreshNotification(true);
      setTimeout(() => {
        setShowRefreshNotification(false);
      }, 3000);
    }, 1000);
  };

  const handleExport = () => {
    // Create a text representation of the dashboard data
    const dashboardData = {
      environmentalScore: envScore,
      energyEfficiency: energyEff,
      wasteManagement: wasteManagement,
      waterUsage: waterUsage,
      trends: trendsData,
      categories: categoryData,
      keyMetrics: defaultData.keyMetrics,
      timestamp: new Date().toISOString(),
      dateRange: dateRange ? {
        from: dateRange.from?.toISOString(),
        to: dateRange.to?.toISOString()
      } : null
    };

    // Convert to JSON string
    const jsonData = JSON.stringify(dashboardData, null, 2);

    // Create a blob and download link
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `esg-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Get environment trends data from store or use defaults
  const trendsData = (chartData as any)?.environmentalTrends || defaultData.environmentalTrends;

  // Get category distribution data from store or use defaults
  const categoryData = (chartData as any)?.categoryDistribution || defaultData.categoryDistribution;

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-8 overflow-x-hidden relative">
      {/* Floating Notification */}
      {showRefreshNotification && (
        <div className="fixed top-4 right-4 bg-emerald-100 text-emerald-800 p-4 rounded-lg shadow-lg animate-fade-in flex items-center z-50">
          <RefreshCw className="h-5 w-5 mr-2 text-emerald-600 animate-spin-slow" />
          <div>
            <p className="font-medium">Data Refreshed</p>
            <p className="text-sm text-emerald-700">Dashboard updated with latest metrics</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-4 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-200"
            onClick={() => setShowRefreshNotification(false)}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-lg shadow-md">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div className="relative">
              <h1 className="text-3xl font-bold tracking-tight text-emerald-600">
                ESG Analytics Dashboard
              </h1>
              <div className="h-1 w-full mt-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"></div>
            </div>
            <div className="relative flex items-center bg-emerald-50 px-2 py-1 rounded-full">
              <div className="relative mr-1">
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <span className="text-xs text-emerald-700">Live</span>
            </div>
          </div>
          <p className="text-gray-500 mt-2 pl-12">Track and analyze your environmental, social, and governance metrics</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mt-4 sm:mt-0">
          <div className="relative">
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={(range) => {
                setDateRange(range);
                if (range?.from && range?.to) {
                  setIsLoading(true);
                  setTimeout(() => {
                    refreshData();
                    setIsLoading(false);
                  }, 1000);
                }
              }}
              className="w-full sm:w-auto mb-4 sm:mb-0"
            />
            {!dateRange?.from && (
              <span className="absolute -top-2 -right-2 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <Label htmlFor="auto-refresh" className="text-sm text-gray-600">Auto-refresh</Label>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading} className="relative">
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  {autoRefresh && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh data</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleExport} className="relative overflow-hidden group">
                  <Download className="h-4 w-4 group-hover:translate-y-1 transition-transform duration-300" />
                  <span className="absolute inset-0 h-full w-full bg-emerald-100 scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-20 rounded-md transition-all duration-300"></span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export report</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showChartGenerator ? "default" : "outline"}
                  size="icon"
                  onClick={() => setShowChartGenerator(!showChartGenerator)}
                  className={cn(
                    "relative overflow-hidden group",
                    showChartGenerator && "bg-emerald-600 hover:bg-emerald-700"
                  )}
                >
                  <ChartBar className="h-4 w-4" />
                  <span className="absolute inset-0 h-full w-full bg-emerald-100 scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-20 rounded-md transition-all duration-300"></span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showChartGenerator ? "Hide chart generator" : "Create custom chart"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="excel" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="grid grid-cols-1 w-fit">
            {/* <TabsTrigger value="dashboard">Dashboard</TabsTrigger> */}
            <TabsTrigger value="excel">Excel Analytics</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-4 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-200"
            onClick={() => setShowRefreshNotification(false)}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      )}

        {/* Dashboard Tab Content */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Environmental Score */}
            <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-emerald-50 to-emerald-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-medium text-gray-900">Environmental Score</CardTitle>
                  <div className="relative">
                    <Leaf className="h-5 w-5 text-emerald-600 animate-pulse" />
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                </div>
                <CardDescription>Overall environmental rating</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div className="text-3xl font-bold text-emerald-700 animate-count-up" data-value={envScore}>{envScore}</div>
                  <div className="flex items-center">
                    {envScoreChange > 0 ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-emerald-600 mr-1 animate-bounce-short" />
                        <span className="text-sm font-medium text-emerald-600">+{envScoreChange}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-4 w-4 text-rose-600 mr-1 animate-bounce-short" />
                        <span className="text-sm font-medium text-rose-600">{envScoreChange}%</span>
                      </>
                    )}
                  </div>
                </div>
                <Progress
                  value={envScore}
                  className="h-2 mt-2 bg-emerald-200"
                />
                <p className="text-xs text-gray-500 mt-2">Target: 90 · Last updated: Today</p>
              </CardContent>
            </Card>

            {/* Energy Efficiency */}
            <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-medium text-gray-900">Energy Efficiency</CardTitle>
                  <div className="relative">
                    <TreeDeciduous className="h-5 w-5 text-amber-600 animate-sway" />
                  </div>
                </div>
                <CardDescription>Energy usage optimization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div className="text-3xl font-bold text-amber-700 animate-count-up" data-value={energyEff}>{energyEff}</div>
                  <div className="flex items-center">
                    {energyEffChange > 0 ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-emerald-600 mr-1 animate-bounce-short" />
                        <span className="text-sm font-medium text-emerald-600">+{energyEffChange}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-4 w-4 text-rose-600 mr-1 animate-bounce-short" />
                        <span className="text-sm font-medium text-rose-600">{energyEffChange}%</span>
                      </>
                    )}
                  </div>
                </div>
                <Progress
                  value={energyEff}
                  className="h-2 mt-2 bg-amber-200"
                />
                <p className="text-xs text-gray-500 mt-2">Target: 85 · Last updated: Today</p>
              </CardContent>
            </Card>

            {/* Waste Management */}
            <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-medium text-gray-900">Waste Management</CardTitle>
                  <div className="relative">
                    <Recycle className="h-5 w-5 text-blue-600 animate-spin-slow" />
                  </div>
                </div>
                <CardDescription>Recycling and waste reduction</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div className="text-3xl font-bold text-blue-700 animate-count-up" data-value={wasteManagement}>{wasteManagement}</div>
                  <div className="flex items-center">
                    {wasteManagementChange > 0 ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-emerald-600 mr-1 animate-bounce-short" />
                        <span className="text-sm font-medium text-emerald-600">+{wasteManagementChange}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-4 w-4 text-rose-600 mr-1 animate-bounce-short" />
                        <span className="text-sm font-medium text-rose-600">{wasteManagementChange}%</span>
                      </>
                    )}
                  </div>
                </div>
                <Progress
                  value={wasteManagement}
                  className="h-2 mt-2 bg-blue-200"
                />
                <p className="text-xs text-gray-500 mt-2">Target: 95 · Last updated: Yesterday</p>
              </CardContent>
            </Card>

            {/* Water Usage */}
            <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-cyan-50 to-cyan-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-medium text-gray-900">Water Usage</CardTitle>
                  <div className="relative">
                    <Droplet className="h-5 w-5 text-cyan-600 animate-bounce-slow" />
                  </div>
                </div>
                <CardDescription>Water conservation metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div className="text-3xl font-bold text-cyan-700 animate-count-up" data-value={waterUsage}>{waterUsage}</div>
                  <div className="flex items-center">
                    {waterUsageChange > 0 ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-emerald-600 mr-1 animate-bounce-short" />
                        <span className="text-sm font-medium text-emerald-600">+{waterUsageChange}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-4 w-4 text-rose-600 mr-1 animate-bounce-short" />
                        <span className="text-sm font-medium text-rose-600">{waterUsageChange}%</span>
                      </>
                    )}
                  </div>
                </div>
                <Progress
                  value={waterUsage}
                  className="h-2 mt-2 bg-cyan-200"
                />
                <p className="text-xs text-gray-500 mt-2">Target: 75 · Last updated: Yesterday</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart Generator */}
          {showChartGenerator && (
            <div className="mt-6">
              <ChartGenerator setCustomCharts={setCustomCharts} />
            </div>
          )}

          {/* Main Chart */}
          <div className="mt-8">
            <InteractiveChartWrapper
              title="Environmental Performance Trends"
              onRefresh={handleRefresh}
              className="border-0"
            >
              {isLoading ? (
                <div className="w-full h-[300px] flex items-center justify-center">
                  <div className="flex items-center justify-center flex-col">
                    <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin mb-2" />
                    <p className="text-sm text-gray-500">Loading chart data...</p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-[300px] animate-fade-in">
                  <LineChart
                    data={trendsData.map((d: MonthlyTrend) => ({
                      name: d.month,
                      value1: d.value,
                      value2: d.value * 0.8, // Example secondary line
                      value3: d.value * 0.6  // Example tertiary line
                    }))}
                  />
                </div>
              )}
            </InteractiveChartWrapper>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            {/* Key Metrics Table */}
            <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900">Key Metrics</CardTitle>
                    <CardDescription>Current performance against targets</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-1" />
                    <span>Filter</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <>
                    <Skeleton className="w-full h-10 mb-2" />
                    <Skeleton className="w-full h-10 mb-2" />
                    <Skeleton className="w-full h-10 mb-2" />
                    <Skeleton className="w-full h-10 mb-2" />
                  </>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead>Previous</TableHead>
                        <TableHead>Change</TableHead>
                        <TableHead className="text-right">Target</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(metrics as any)?.keyMetrics?.length > 0 ? (
                        (metrics as any).keyMetrics.map((item: KeyMetric, i: number) => (
                          <TableRow key={i} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{item.metric}</TableCell>
                            <TableCell>{item.current}</TableCell>
                            <TableCell className="text-gray-500">{item.previous}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                {item.change > 0 ? (
                                  <>
                                    <ArrowUp className="h-4 w-4 text-emerald-600 mr-1" />
                                    <span className="text-emerald-600">+{item.change}%</span>
                                  </>
                                ) : (
                                  <>
                                    <ArrowDown className="h-4 w-4 text-rose-600 mr-1" />
                                    <span className="text-rose-600">{item.change}%</span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium text-gray-600">{item.target}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        // Use default data if metrics data is not available
                        defaultData.keyMetrics.map((item, i) => (
                          <TableRow key={i} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{item.metric}</TableCell>
                            <TableCell>{item.current}</TableCell>
                            <TableCell className="text-gray-500">{item.previous}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                {item.change > 0 ? (
                                  <>
                                    <ArrowUp className="h-4 w-4 text-emerald-600 mr-1" />
                                    <span className="text-emerald-600">+{item.change}%</span>
                                  </>
                                ) : (
                                  <>
                                    <ArrowDown className="h-4 w-4 text-rose-600 mr-1" />
                                    <span className="text-rose-600">{item.change}%</span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium text-gray-600">{item.target}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <div className="lg:col-span-1">
              <InteractiveChartWrapper
                title="Category Distribution"
                onRefresh={handleRefresh}
                className="border-0"
              >
                {isLoading ? (
                  <div className="w-full h-[250px] flex items-center justify-center">
                    <Skeleton className="w-44 h-44 rounded-full" />
                  </div>
                ) : (
                  <div className="w-full h-[250px] flex items-center justify-center">
                    <DonutChart
                      data={categoryData.map((d: CategoryData) => ({
                        name: d.name,
                        value: d.value
                      }))}
                    />
                  </div>
                )}
              </InteractiveChartWrapper>
            </div>
          </div>

          {/* Custom Charts Section - Render user created charts */}
          {customCharts.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <ChartBar className="h-5 w-5 mr-2 text-emerald-600" />
                Custom Charts
                <Badge className="ml-2 bg-emerald-100 text-emerald-800">{customCharts.length}</Badge>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {customCharts.map((chart) => (
                  <InteractiveChartWrapper
                    key={chart.id}
                    title={chart.title}
                    onRefresh={handleRefresh}
                    className="border-0"
                  >
                    <div className="w-full h-[300px]">
                      {chart.type === 'bar' && <BarChart data={chart.data} />}
                      {chart.type === 'line' && <LineChart data={chart.data} />}
                      {chart.type === 'donut' && <DonutChart data={chart.data} />}
                    </div>
                  </InteractiveChartWrapper>
                ))}
              </div>
            </div>
          )}

          {/* Additional Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* Bar Chart - ESG Score Breakdown */}
            <InteractiveChartWrapper
              title="ESG Score Breakdown"
              onRefresh={handleRefresh}
              className="border-0"
            >
              {isLoading ? (
                <div className="w-full h-[300px] flex items-center justify-center">
                  <Skeleton className="w-full h-full rounded-md" />
                </div>
              ) : (
                <div className="w-full h-[300px]">
                  <BarChart
                    data={[
                      {
                        name: "Q1",
                        value1: 65,  // Environmental
                        value2: 48,  // Social
                        value3: 76   // Governance
                      },
                      {
                        name: "Q2",
                        value1: 72,  // Environmental
                        value2: 53,  // Social
                        value3: 80   // Governance
                      },
                      {
                        name: "Q3",
                        value1: 78,  // Environmental
                        value2: 60,  // Social
                        value3: 85   // Governance
                      },
                      {
                        name: "Q4",
                        value1: 85,  // Environmental
                        value2: 68,  // Social
                        value3: 88   // Governance
                      }
                    ]}
                  />
                </div>
              )}
            </InteractiveChartWrapper>

            {/* Heatmap - Sustainability Impact Areas */}
            <InteractiveChartWrapper
              title="Sustainability Impact Areas"
              onRefresh={handleRefresh}
              className="border-0"
            >
              {isLoading ? (
                <div className="w-full h-[300px] flex items-center justify-center">
                  <Skeleton className="w-full h-full rounded-md" />
                </div>
              ) : (
                <div className="w-full h-[300px]">
                  <Heatmap
                    data={[
                      { year: "Operations", emissions: 80, energy: 45, water: 72, waste: 92 },
                      { year: "Supply Chain", emissions: 60, energy: 25, water: 82, waste: 78 },
                      { year: "Logistics", emissions: 72, energy: 35, water: 45, waste: 90 },
                      { year: "Offices", emissions: 40, energy: 50, water: 32, waste: 45 },
                      { year: "Manufacturing", emissions: 95, energy: 75, water: 88, waste: 96 }
                    ]}
                  />
                </div>
              )}
            </InteractiveChartWrapper>
          </div>

          {/* New Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* Radar Chart - ESG Performance */}
            <InteractiveChartWrapper
              title="ESG Performance Radar"
              onRefresh={handleRefresh}
              className="border-0"
            >
              {isLoading ? (
                <div className="w-full h-[300px] flex items-center justify-center">
                  <Skeleton className="w-full h-full rounded-md" />
                </div>
              ) : (
                <div className="animate-fade-in">
                  <RadarChartDisplay />
                </div>
              )}
            </InteractiveChartWrapper>

            {/* ESG Goals Progress */}
            <InteractiveChartWrapper
              title="ESG Goals & Milestones"
              onRefresh={handleRefresh}
              className="border-0"
            >
              {isLoading ? (
                <div className="w-full h-[300px] flex items-center justify-center">
                  <Skeleton className="w-full h-full rounded-md" />
                </div>
              ) : (
                <div className="animate-fade-in">
                  <ProgressGoalsTable isLoading={isLoading} />
                </div>
              )}
            </InteractiveChartWrapper>
          </div>
        </TabsContent>

        {/* Excel Analytics Tab Content */}
        <TabsContent value="excel" className="space-y-4">
          <div className="grid gap-4">
            <ExcelAnalytics />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
