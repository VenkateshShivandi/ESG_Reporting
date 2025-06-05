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
        return <BarChart
        data={customData}
        config={{
          keys: ["value1", "value2", "value3"],
          labels: ["Environmental", "Energy", "Waste"],
    colors: ["#4CAF50", "#81C784", "#C8E6C9"],
    stacked: true,
    showLegend: true
  }}
/>
      case "line":
        return <LineChart data={customData} config={config} />
      case "donut":
        return <DonutChart data={getDonutChartData()} />
      default:
        return <BarChart
      data={customData}
  config={{
    keys: ["value1", "value2", "value3"],
    labels: ["Environmental", "Energy", "Waste"],
    colors: ["#4CAF50", "#81C784", "#C8E6C9"],
    stacked: true,
    showLegend: true
  }}
/>
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
        );
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
        );
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
                        const newLabels = [...config.dataLabels];
                        newLabels[idx] = e.target.value;
                        handleUpdateConfig('dataLabels', newLabels);
                      }}
                      className="flex-1"
                      placeholder={`Series ${idx + 1} name`}
                    />
                    <div
                      className="w-8 h-8 rounded-md cursor-pointer border shadow-sm relative group"
                      style={{ backgroundColor: config.colors[idx] }}
                      onClick={() => {
                        const colors = ["#4CAF50", "#2196F3", "#FFC107", "#F44336", "#9C27B0", "#795548"];
                        const newColors = [...config.colors];
                        newColors[idx] = colors[Math.floor(Math.random() * colors.length)];
                        handleUpdateConfig('colors', newColors);
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
        );
    }
  };

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
  );
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

  // Get environment trends data from store or use defaults
  const trendsData = (chartData as any)?.environmentalTrends || defaultData.environmentalTrends;

  // Get category distribution data from store or use defaults
  const categoryData = (chartData as any)?.categoryDistribution || defaultData.categoryDistribution;

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

  return (
    <div className="relative min-h-[60vh] bg-gray-50">
      {/* Centered analytics card with reduced margin */}
      <div className="flex justify-center items-start w-full mt-0 px-8">
        <div className="w-full max-w-6xl mx-auto">
          <ExcelAnalytics />
        </div>
      </div>
    </div>
  );
}
export default AnalyticsPage;