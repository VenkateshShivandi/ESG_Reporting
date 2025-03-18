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
  ClipboardIcon, 
  Cloud, 
  Download,
  Droplet,
  ExternalLink, 
  FileText, 
  Filter, 
  Leaf, 
  Lightbulb,
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
import { useDashboardStore } from "@/lib/store";
import { cn } from "@/lib/utils";

// Types for date range
import type { DateRange } from "react-day-picker";

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

// Create a simple component for visual display
function ProgressGoalsTable({isLoading}: {isLoading: boolean}) {
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
        </div>
      </div>
      
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
            <p className="text-xs text-gray-500 mt-2">Target: 75 · Last updated: 2 days ago</p>
          </CardContent>
        </Card>
        </div>

      {/* Main Chart */}
      <div className="mt-8">
        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">Environmental Performance Trends</CardTitle>
                <CardDescription>Monthly performance metrics for the past year</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm" className="relative overflow-hidden group">
                  <Printer className="h-4 w-4 mr-1 group-hover:scale-110 transition-transform duration-300" />
                  <span className="hidden sm:inline">Print</span>
                  <span className="absolute inset-0 h-full w-full bg-blue-100 scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-20 rounded-md transition-all duration-300"></span>
                </Button>
                <Button variant="ghost" size="sm" className="relative overflow-hidden group">
                  <FileText className="h-4 w-4 mr-1 group-hover:scale-110 transition-transform duration-300" />
                  <span className="hidden sm:inline">Export</span>
                  <span className="absolute inset-0 h-full w-full bg-emerald-100 scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-20 rounded-md transition-all duration-300"></span>
                </Button>
                <Button variant="ghost" size="sm" className="relative overflow-hidden group">
                  <Share2 className="h-4 w-4 mr-1 group-hover:scale-110 transition-transform duration-300" />
                  <span className="hidden sm:inline">Share</span>
                  <span className="absolute inset-0 h-full w-full bg-purple-100 scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-20 rounded-md transition-all duration-300"></span>
                </Button>
          </div>
          </div>
          </CardHeader>
          <CardContent className="px-2 pb-2">
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
          </CardContent>
        </Card>
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
        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">Category Distribution</CardTitle>
            <CardDescription>Environmental impact by category</CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
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
          </CardContent>
        </Card>
      </div>
      
      {/* Additional Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Bar Chart - ESG Score Breakdown */}
        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">ESG Score Breakdown</CardTitle>
                <CardDescription>Quarterly comparison of ESG performance categories</CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Filter</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-2">
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
          </CardContent>
        </Card>
        
        {/* Heatmap - Sustainability Impact Areas */}
        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">Sustainability Impact Areas</CardTitle>
                <CardDescription>Intensity of environmental impact by department and category</CardDescription>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Export heatmap</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-2">
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
          </CardContent>
        </Card>
      </div>
      
      {/* New Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Radar Chart - ESG Performance */}
        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden hover:-translate-y-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">ESG Performance Radar</CardTitle>
                <CardDescription>Comparing current performance against targets and industry averages</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-2">
            {isLoading ? (
              <div className="w-full h-[300px] flex items-center justify-center">
                <Skeleton className="w-full h-full rounded-md" />
              </div>
            ) : (
              <div className="animate-fade-in">
                <RadarChartDisplay />
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Area/Bubble Chart - ESG Goals Progress */}
        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden hover:-translate-y-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">ESG Goals & Milestones</CardTitle>
                <CardDescription>Progress tracking towards key sustainability goals</CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Filter className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">View</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Chart Type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center">
                    <ChartBar className="h-4 w-4 mr-2" />
                    <span>Bar Chart</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center">
                    <ChartPie className="h-4 w-4 mr-2" />
                    <span>Pie Chart</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="w-full h-[300px] flex items-center justify-center">
                <Skeleton className="w-full h-full rounded-md" />
              </div>
            ) : (
              <div className="animate-fade-in">
                <ProgressGoalsTable isLoading={isLoading} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

