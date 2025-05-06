"use client"

import React, { useState, useEffect, ChangeEvent, Fragment, useMemo } from 'react';
import { parse as parseDate, isValid as isDateValid } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { createClient } from '@supabase/supabase-js';
import { FileText, Download, Loader2, RefreshCw, FileSpreadsheet, BarChart3, PieChart as PieChartIcon, Table as TableIcon, X, AlertCircle, CheckCircle, TreeDeciduous, Lightbulb, Recycle, Droplet, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Filter, Maximize, FileType, Database } from 'lucide-react';
import { 
  BarChart as BarChartComponent,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ReferenceLine,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  PolarRadiusAxis,
  LabelList,
  BarChart,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import EnhancedDataPreview from "../../components/enhanced-data-preview";
import GenericHeatmapPreview from "../../components/generic-heatmap-preview";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select as ShadSelect } from "@/components/ui/select";
import { BarChartCard } from "./BarChartCard";
import { LineChartCard } from "./LineChartCard";
import { AreaChartCard } from "./AreaChartCard";
import { PieChartCard } from "./PieChartCard";
import { ScatterChartCard } from "./ScatterChartCard";
import { HeatmapCard } from "./HeatmapCard";
import PaginatedTable from "../../components/enhanced-data-preview";
import DynamicTrendChartCard from "./DynamicTrendChartCard";

// Create alert UI components since @/components/ui/alert seems to be missing
const Alert = ({ children, className, variant }: { children: React.ReactNode, className?: string, variant?: string }) => (
  <div className={`p-4 rounded-md ${variant === 'destructive' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-blue-50 border border-blue-200 text-blue-700'} ${className || ''}`}>
    {children}
  </div>
);

const AlertTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="font-semibold mb-1">{children}</div>
);

const AlertDescription = ({ children }: { children: React.ReactNode }) => (
  <div className="text-sm">{children}</div>
);

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Log Supabase initialization status (without exposing the actual keys)
console.log('Supabase initialization:', { 
  urlConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKeyConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  urlLength: supabaseUrl.length,
});

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Log Supabase client version
console.log('Using Supabase JS version:', (supabaseClient as any).version || 'Version not available');

interface FileInfo {
  name: string;
  path: string;
  size?: number;
  modified?: number;
  index?: number;
  indexKey?: string;
}

interface ExcelAnalyticsProps {
  className?: string;
}

// Add this utility function near the top of the ExcelAnalytics component
const isValidChartData = (data: any[] | undefined) => {
  if (!data || !Array.isArray(data) || data.length === 0) return false;
  
  // Check that at least one item has both name and value properties
  return data.some(item => 
    item && 
    typeof item === 'object' && 
    'name' in item && 
    'value' in item &&
    item.name !== null && 
    item.name !== undefined &&
    item.value !== null && 
    item.value !== undefined
  );
};

// Enhanced Donut Chart with more interactive elements and animations
function DonutChart({ data }: { data: any[] }) {
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#4f46e5', '#be123c', '#0ea5e9', '#22c55e', '#eab308', '#dc2626'];
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  
  // Function to handle sector click
  const handlePieClick = (_: any, index: number) => {
    setActiveIndex(index === activeIndex ? null : index);
  };
  
  // Function to handle hover
  const handleMouseEnter = (_: any, index: number) => {
    setHoverIndex(index);
  };
  
  const handleMouseLeave = () => {
    setHoverIndex(null);
  };
  
  // Format month name from "2023-01" to "Jan 2023"
  const formatMonth = (name: string) => {
    if (!name || !name.includes('-')) return name;
    
    const monthMap: { [key: string]: string } = {
      '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', 
      '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
      '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
    };
    
    const parts = name.split('-');
    const year = parts[0];
    const monthCode = parts[1];
    return `${monthMap[monthCode] || monthCode} ${year}`;
  };
  
  return (
    <div className="relative w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* Define gradients for each slice */}
          <defs>
            {COLORS.map((color, index) => (
              <linearGradient key={`colorGradient-${index}`} id={`colorGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.9}/>
                <stop offset="100%" stopColor={color} stopOpacity={0.7}/>
              </linearGradient>
              
              /* Add animated gradient for hover effect */
            ))}
            <filter id="shadow-effect" height="130%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.3"/>
            </filter>
            <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="100%" stopColor="#f3f4f6" stopOpacity="0.8" />
            </radialGradient>
          </defs>
          
          {/* Background circle for aesthetic effect */}
          <circle cx="50%" cy="50%" r="80" fill="url(#centerGlow)" className="animate-pulse-slow" />
          
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={75}
            outerRadius={95}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            onClick={handlePieClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
            labelLine={false}
            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
              // Only show labels for larger segments or active segments
              if (percent < 0.06 && activeIndex !== index) return null;
              
              const RADIAN = Math.PI / 180;
              const radius = innerRadius + (outerRadius - innerRadius) * 1.15;
              const x = cx + radius * Math.cos(-midAngle * RADIAN);
              const y = cy + radius * Math.sin(-midAngle * RADIAN);
              
              // Format month for label (e.g., "2023-01" becomes "Ene 2023")
              const monthLabel = formatMonth(name);
              
              // Enhanced label with animations
              return (
                <text 
                  x={x}
                  y={y}
                  fill={COLORS[index % COLORS.length]}
                  textAnchor={x > cx ? 'start' : 'end'}
                  dominantBaseline="central"
                  fontSize={11}
                  fontWeight="600"
                  className={activeIndex === index ? "animate-pulse" : ""}
                  filter={activeIndex === index ? "url(#shadow-effect)" : ""}
                >
                  {`${monthLabel}: ${(percent * 100).toFixed(1)}%`}
                </text>
              );
            }}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`}
                fill={`url(#colorGradient-${index % COLORS.length})`}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={activeIndex === index ? 2.5 : hoverIndex === index ? 1.5 : 1}
                style={{ 
                  filter: (activeIndex === index || hoverIndex === index) ? 'drop-shadow(0px 0px 4px rgba(0,0,0,0.2))' : 'none',
                  opacity: activeIndex === null || activeIndex === index || hoverIndex === index ? 1 : 0.7,
                  transition: 'opacity 0.3s, filter 0.3s, stroke-width 0.3s',
                  cursor: 'pointer',
                  transform: activeIndex === index ? 'scale(1.03)' : 'scale(1)',
                  transformOrigin: 'center center',
                }}
              />
            ))}
          </Pie>
          
          {/* Add pulsing center circle */}
          <circle 
            cx="50%" 
            cy="50%" 
            r="68" 
            fill="url(#centerGlow)" 
            stroke="#e2e8f0" 
            strokeWidth="1"
            className="animate-pulse-slow"
          />
          
          {/* Display selected month details in center */}
          {activeIndex !== null && (
            <g>
              <text 
                x="50%" 
                y="45%" 
                textAnchor="middle" 
                fill={COLORS[activeIndex % COLORS.length]}
                fontSize={14}
                fontWeight="bold"
                className="animate-fade-in"
              >
                {formatMonth(data[activeIndex].name)}
              </text>
              <text 
                x="50%" 
                y="55%" 
                textAnchor="middle" 
                fill={COLORS[activeIndex % COLORS.length]}
                fontSize={20}
                fontWeight="bold"
                className="animate-count-up"
                data-value={data[activeIndex].value.toFixed(1)}
              >
                {`${data[activeIndex].value.toFixed(1)}%`}
              </text>
            </g>
          )}
          
          {/* Show hint when nothing is selected */}
          {activeIndex === null && (
            <text 
              x="50%" 
              y="50%" 
              textAnchor="middle" 
              fill="#64748b"
              fontSize={11}
              fontStyle="italic"
              className="animate-pulse-slow"
            >
              Click para ver detalles
            </text>
          )}
          
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Consumo']}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              border: 'none',
              padding: '8px 12px'
            }}
            itemStyle={{
              padding: '3px 0',
              fontSize: '12px'
            }}
            labelFormatter={(label) => `Mes: ${formatMonth(label)}`}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Enhanced Monthly Distribution Chart with animations and interactive elements
function MonthlyDistributionChart({ data, barData }: { data: any[], barData: any[] }) {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [showAll, setShowAll] = useState<boolean>(true);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  
  // Define color constants for visual consistency
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#4f46e5', '#be123c', '#0ea5e9', '#22c55e', '#eab308', '#dc2626'];
  
  // Format month name
  const formatMonth = (name: string) => {
    if (!name || !name.includes('-')) return name;
    
    const monthMap: { [key: string]: string } = {
      '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', 
      '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
      '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
    };
    
    const parts = name.split('-');
    const year = parts[0];
    const monthCode = parts[1];
    return `${monthMap[monthCode] || monthCode}`;
  };
  
  // Process the bar data with proper month formatting
  const monthlyData = barData.map(item => {
    // Extract month and year from name
    const name = item.name || '';
    
    // Extract year from the formatted string or original
    const getYear = () => {
      if (name.includes('-')) {
        return name.split('-')[0];
      }
      // Default to current year if not found
      return new Date().getFullYear().toString();
    };
    
    // Get month number for sorting
    const getMonthNum = (str: string) => {
      if (!str.includes('-')) return 0;
      const parts = str.split('-');
      return parts.length > 1 ? parseInt(parts[1], 10) || 0 : 0;
    };
    
    // Get month name only (no year)
    const monthName = formatMonth(name);
    const year = getYear();
    
    return {
      name: monthName,
      year: year,
      fullName: `${monthName} ${year}`, // For display
      originalName: name,
      value: item.value,
      monthNum: getMonthNum(name),
      formattedValue: Math.round(item.value).toLocaleString('es')
    };
  }).sort((a, b) => a.monthNum - b.monthNum);
  
  // Calculate max value for consistent scale
  const maxValue = Math.max(...monthlyData.map(item => item.value));
  
  // Ensure activeIndex is within bounds
  useEffect(() => {
    if (activeIndex >= monthlyData.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, monthlyData.length]);
  
  // Navigation handlers
  const handlePrev = () => {
    setActiveIndex(prev => (prev === 0 ? monthlyData.length - 1 : prev - 1));
  };
  
  const handleNext = () => {
    setActiveIndex(prev => (prev === monthlyData.length - 1 ? 0 : prev + 1));
  };
  
  const toggleView = () => {
    setShowAll(prev => !prev);
    setIsAnimating(false); // Stop animation when changing views
  };
  
  const toggleAnimation = () => {
    setIsAnimating(prev => !prev);
  };
  
  // Animation interval for carousel view
  useEffect(() => {
    let animationId: number;
    
    if (isAnimating) {
      animationId = window.setInterval(() => {
        setActiveIndex(prev => (prev === monthlyData.length - 1 ? 0 : prev + 1));
      }, 2000);
    }
    
    return () => {
      if (animationId) {
        window.clearInterval(animationId);
      }
    };
  }, [isAnimating, monthlyData.length]);
  
  // Return UI component based on view mode
  return (
    <div className="w-full h-full flex flex-col">
      <div className="text-center mb-2 flex justify-between items-center">
        <div className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <BarChart3 className="h-4 w-4 text-blue-500" />
          Distribución por Mes
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleView} 
            className="h-7 rounded-full px-2 text-xs hover:bg-blue-50 hover:text-blue-600 transition-colors"
          >
            {showAll ? (
              <>
                <Maximize className="h-3 w-3 mr-1 inline" />
                Ver Individual
              </>
            ) : (
              <>
                <TableIcon className="h-3 w-3 mr-1 inline" />
                Ver Todos
              </>
            )}
          </Button>
          {!showAll && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleAnimation} 
              className={`h-7 rounded-full px-2 text-xs transition-colors ${isAnimating ? 'bg-blue-100 text-blue-700' : 'hover:bg-blue-50 hover:text-blue-600'}`}
            >
              {isAnimating ? (
                <><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Pausar</>
              ) : (
                <><TrendingUp className="h-3 w-3 mr-1" /> Animar</>
              )}
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex-grow">
        {showAll ? (
          // Show all months as horizontal bars with more space
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={monthlyData}
              margin={{ top: 5, right: 100, left: 20, bottom: 5 }}
              onMouseMove={(e) => {
                if (e.activeTooltipIndex !== undefined) {
                  setHoveredBar(e.activeTooltipIndex);
                }
              }}
              onMouseLeave={() => setHoveredBar(null)}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
              <defs>
                {COLORS.map((color, index) => (
                  <linearGradient 
                    key={`barGradient-${index}`} 
                    id={`barGradient-${index}`} 
                    x1="0" 
                    y1="0" 
                    x2="1" 
                    y2="0"
                  >
                    <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.5} />
                  </linearGradient>
                ))}
                <filter id="barShadow" height="200%">
                  <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.2" />
                </filter>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <XAxis 
                type="number" 
                tick={{ fontSize: 11 }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={{ stroke: '#e2e8f0' }}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                  return value;
                }}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                tick={({ x, y, payload }) => {
                  // Find the matching data item to extract year
                  const item = monthlyData.find(d => d.name === payload.value);
                  
                  return (
                    <text x={x} y={y} dy={4} textAnchor="end" fill="#64748b" fontSize={12} fontWeight={500}>
                      <tspan>{payload.value}</tspan>
                      <tspan dx={2} fontSize={9} opacity={0.8}>{item?.year}</tspan>
                    </text>
                  );
                }}
                width={60}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number) => [`${Math.round(value).toLocaleString('es')} kWh`, 'Consumo']}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  border: 'none',
                  padding: '8px 12px'
                }}
                cursor={{ fill: 'rgba(236, 253, 245, 0.4)' }}
                labelFormatter={(label) => {
                  // Finding the actual item with full info
                  const item = monthlyData.find(d => d.name === label);
                  return item ? `${label} ${item.year}` : label;
                }}
              />
              <Bar 
                dataKey="value" 
                barSize={16} 
                animationDuration={800}
                animationEasing="ease-in-out"
              >
                {monthlyData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#barGradient-${index % COLORS.length})`}
                    fillOpacity={hoveredBar === index ? 1 : 0.85}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={hoveredBar === index ? 2 : 1}
                    style={{
                      filter: hoveredBar === index ? 'url(#barShadow)' : 'none',
                      transition: 'fill-opacity 0.3s, stroke-width 0.3s, filter 0.3s',
                      cursor: 'pointer'
                    }}
                  />
                ))}
                <LabelList 
                  dataKey="formattedValue" 
                  position="right" 
                  formatter={(value: string) => `${value} kWh`}
                  style={{ 
                    fontSize: 10, 
                    fill: '#64748b',
                    fontWeight: 500,
                    filter: 'drop-shadow(0px 0px 1px rgba(255,255,255,0.7))'
                  }}
                  offset={15}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          // Carousel view for single month with enhanced visuals
          <div className="h-full flex flex-col">
            <div className="flex-grow flex flex-col items-center justify-center">
              <div className="text-center mb-4">
                {/* Month title */}
                <div className="bg-blue-50 px-6 py-2 rounded-xl shadow-sm inline-flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2 text-blue-500" />
                  <span className="text-2xl font-bold text-gray-800">
                    {monthlyData[activeIndex]?.fullName}
                  </span>
                </div>
                
                {/* Value display */}
                <div className="mt-6 flex items-center justify-center">
                  <div className="text-4xl font-extrabold text-blue-600">
                    {monthlyData[activeIndex]?.formattedValue}
                    <span className="text-base ml-1 font-medium text-blue-500">kWh</span>
                  </div>
                  <Droplet className="h-5 w-5 ml-2 text-cyan-500" />
                </div>
                
                {/* Percentage */}
                <div className="text-sm mt-3 flex items-center justify-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                  <span className="font-medium text-blue-600">
                    {(monthlyData[activeIndex]?.value / maxValue * 100).toFixed(1)}%
                  </span>
                  <span className="text-gray-600">del máximo consumo</span>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="w-full mt-6 px-8">
                <div className="h-12 bg-gray-100 rounded-full relative overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full absolute"
                    style={{ 
                      width: `${(monthlyData[activeIndex]?.value / maxValue) * 100}%`,
                      transition: 'width 0.5s ease-out' 
                    }}
                  >
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="h-full w-full bg-[linear-gradient(110deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.3)_30%,rgba(255,255,255,0)_50%)] animate-[shimmer_1.5s_infinite]"></div>
                    </div>
                  </div>
                  
                  {/* Vertical bars animation - simplified */}
                  <div className="absolute h-full w-full flex items-center justify-center pointer-events-none">
                    <div className="flex gap-2">
                      {Array.from({length: 8}).map((_, i) => (
                        <div 
                          key={i} 
                          className="w-1 h-6 bg-white rounded-full opacity-30"
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Min/Max values */}
                <div className="flex justify-between mt-2 text-xs text-gray-600">
                  <div className="flex items-center font-medium">
                    <TrendingDown className="h-3 w-3 mr-1 text-gray-500" />
                    0 kWh
                  </div>
                  <div className="flex items-center font-medium">
                    <TrendingUp className="h-3 w-3 mr-1 text-blue-500" />
                    {Math.round(maxValue).toLocaleString('es')} kWh
                  </div>
                </div>
              </div>
              
              {/* Navigation controls */}
              <div className="flex justify-center gap-2 mt-8">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 rounded-full hover:bg-blue-50 hover:text-blue-500 transition-colors"
                  onClick={handlePrev}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </Button>
                
                <div className="flex gap-1">
                  {monthlyData.map((_, index) => (
                    <div 
                      key={index}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        index === activeIndex ? 'w-6 bg-blue-500' : 'w-2 bg-gray-300 hover:bg-gray-400'
                      }`}
                      onClick={() => setActiveIndex(index)}
                    ></div>
                  ))}
                </div>
                
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 rounded-full hover:bg-blue-50 hover:text-blue-500 transition-colors"
                  onClick={handleNext}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </Button>
              </div>
              
              {/* Consumption badge */}
              <div className="mt-6">
                {monthlyData[activeIndex]?.value > (maxValue * 0.9) ? (
                  <Badge className="bg-red-500 hover:bg-red-600 px-3 py-1 flex items-center gap-2">
                    <Lightbulb className="h-3.5 w-3.5 text-white" />
                    <span>Alto Consumo</span>
                  </Badge>
                ) : monthlyData[activeIndex]?.value < (maxValue * 0.5) ? (
                  <Badge className="bg-green-500 hover:bg-green-600 px-3 py-1 flex items-center gap-2">
                    <TreeDeciduous className="h-3.5 w-3.5 text-white" />
                    <span>Bajo Consumo</span>
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500 hover:bg-amber-600 px-3 py-1 flex items-center gap-2">
                    <Recycle className="h-3.5 w-3.5 text-white" />
                    <span>Consumo Promedio</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper component for Calendar icon
const CalendarIcon = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

// Import the API functions and the new response interface
import { fetchExcelData, fetchExcelFiles, ExcelAnalyticsResponse, ProcessedTable, SheetData } from '@/lib/api/analytics';

// Define the structure for the multi-sheet API response
interface MultiSheetResponse {
  sheets: Record<string, SheetData>;
  sheetOrder: string[];
  fileMetadata?: { filename: string; duration?: number };
  error?: boolean;
  errorType?: string | null;
  message?: string | null;
}

export function ExcelAnalytics({ className }: ExcelAnalyticsProps) {
  // Add styles for the progress animation
  useEffect(() => {
    // Add styles for the progress animation if it doesn't exist
    if (!document.getElementById('excel-progress-animation')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'excel-progress-animation';
      styleElement.innerHTML = `
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progress 3s ease-in-out forwards;
        }
      `;
      document.head.appendChild(styleElement);
      
      return () => {
        const element = document.getElementById('excel-progress-animation');
        if (element) {
          document.head.removeChild(element);
        }
      };
    }
  }, []);

  const [loading, setLoading] = useState(true);
  const [processingFile, setProcessingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // --- NEW State for API Response --- 
  const [apiResponse, setApiResponse] = useState<ExcelAnalyticsResponse | null>(null);
  const [selectedTableIndex, setSelectedTableIndex] = useState<number>(0); // Index for the selected SHEET
  const [selectedTableIndexWithinSheet, setSelectedTableIndexWithinSheet] = useState<number>(0); // Index for table WITHIN the sheet
  const [selectedSheetName, setSelectedSheetName] = useState<string | null>(null); // <<< ADDED state for sheet name
  // --- END NEW State --- 

  const [availableFiles, setAvailableFiles] = useState<{
    excel: FileInfo[];
    csv: FileInfo[];
  }>({
    excel: [],
    csv: []
  });
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [fileLoading, setFileLoading] = useState(false);

  const [showCharts, setShowCharts] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<'excel' | 'csv'>('excel');

  // Add index to each file for reference when mapping
  const indexedExcelFiles = (files: Array<{name: string; path: string; size?: number; modified?: number}>, prefix: string = ''): FileInfo[] => {
    return files.map((file, index: number) => ({
      name: file.name,
      path: file.path,
      size: file.size,
      modified: file.modified,
      index,
      indexKey: `${prefix}${index}`
    }));
  };

  // --- Derive data for the selected table (now represents the selected table WITHIN the selected sheet) --- 
  const displayedTableData: SheetData | null = useMemo(() => {
    if (!apiResponse || !apiResponse.sheets || !apiResponse.sheetOrder || apiResponse.sheetOrder.length === 0) {
      return null;
    }
    // Ensure sheet index is valid
    const sheetIndex = Math.min(Math.max(0, selectedTableIndex), apiResponse.sheetOrder.length - 1);
    const sheetName = apiResponse.sheetOrder[sheetIndex];
    const sheet = apiResponse.sheets[sheetName];

    if (!sheet || !sheet.tables || sheet.tables.length === 0) {
        // Return basic sheet info if no tables exist
        return {
            ...sheet,
            tables: [],
            tableCount: 0,
            headers: [],
            tableData: [],
            metadata: null,
            chartData: { barChart: [], lineChart: [], donutChart: []}, 
            stats: null,
        };
    }
    
    // Ensure table index within the sheet is valid
    const tableIndex = Math.min(Math.max(0, selectedTableIndexWithinSheet), sheet.tables.length - 1);
    const selectedTable = sheet.tables[tableIndex];
    
    // Return data structured like SheetData but specific to the selected table
    return {
        // Carry over sheet-level info if needed (like overall error/message)
        error: sheet.error,
        message: sheet.message,
        // Populate with data from the specific table
        tables: sheet.tables, // Keep reference to all tables for the dropdown
        tableCount: sheet.tableCount,
        headers: selectedTable.tableData?.headers || [], 
        tableData: selectedTable.tableData?.rows || [], 
        metadata: selectedTable.meta || null, 
        chartData: selectedTable.chartData || { barChart: [], lineChart: [], donutChart: []}, // Ensure chartData exists
        stats: selectedTable.stats || null,
    };

  }, [apiResponse, selectedTableIndex, selectedTableIndexWithinSheet]); // Depend on both indices
  
  // Keep `parsedDataForPreview` based on the derived `displayedTableData`
  const parsedDataForPreview = useMemo(() => {
    if (!displayedTableData) return null;
    return {
      headers: displayedTableData.headers || [],
      tableData: displayedTableData.tableData || [], // Pass rows array
      analytics: {}, // Placeholder, populate if needed
      metadata: displayedTableData.metadata, // Pass the specific table metadata
    };
  }, [displayedTableData]);

  const tableMetadata = useMemo(() => displayedTableData?.metadata, [displayedTableData]);
  const tableChartData = useMemo(() => displayedTableData?.chartData, [displayedTableData]);
  // --- END Derived Data ---

  // --- Add logging for tableChartData ---
  useEffect(() => {
    if (tableChartData) {
      console.log('[Component] Derived tableChartData:', JSON.stringify(tableChartData, null, 2));
    }
  }, [tableChartData]);
  // --- End logging ---

  // Function to load available files directly from Supabase
  const loadAvailableFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Directly listing files from Supabase documents bucket');
      
      // Initialize Supabase client using public variables
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase URL or key is missing');
        setError('Configuration error: Unable to connect to file storage');
        setLoading(false);
        return;
      }
      
      // List all files in the documents bucket (no path means root)
      const { data, error } = await supabaseClient.storage.from('documents').list();
      
      if (error) {
        console.error('Supabase storage list failed:', error);
        throw error;
      }
      
      console.log('Files listed from Supabase documents bucket:', data?.length || 0, 'total files found');
      
      // Log all files to check names
      if (data?.length > 0) {
        console.log('All files from storage:', data.map((item, index) => ({ 
          index,
          name: item.name,
          // Log URL encoded version for comparison
          encoded: encodeURIComponent(item.name)
        })));
      }
      
      // Filter Excel files
      const excelFiles = data
        .filter(item => {
          const name = item.name.toLowerCase();
          return name.endsWith('.xlsx') || name.endsWith('.xls');
        })
        .map((item, index) => ({
          name: item.name,
          path: item.name,
          size: item.metadata?.size,
          modified: item.created_at ? new Date(item.created_at).getTime() : undefined,
          index
        }));
        
      console.log('Filtered Excel files:', excelFiles.length, 'Excel files found', 
        excelFiles.map(f => f.name).join(', '));
      
      // CSV files
      const csvFiles = data
        .filter(item => item.name.toLowerCase().endsWith('.csv'))
        .map((item, index) => ({
          name: item.name,
          path: item.name,
          size: item.metadata?.size,
          modified: item.created_at ? new Date(item.created_at).getTime() : undefined,
          index
        }));
      
      // Update state with the processed files  
      setAvailableFiles({
        excel: excelFiles,
        csv: csvFiles
      });
      
      // Set initial selected file if available
      if (excelFiles.length > 0 && !selectedFile) {
        console.log('Setting initial selected file from Supabase:', excelFiles[0].name);
        setSelectedFile(excelFiles[0].name);
        setSelectedFileIndex(0);
      } else if (excelFiles.length === 0) {
        // If no Excel files are found, clear the selection and show a message
        setSelectedFile('');
        setError('No Excel files found in the storage bucket. Upload Excel files to the documents section first.');
      }
      
    } catch (err) {
      console.error('Error loading available files:', err);
      setError('Failed to load available Excel files. Please check your connection or try again later.');
    } finally {
      setLoading(false);
    }
  };

  // --- Update chart availability based on selected table --- 
  const [availableCharts, setAvailableCharts] = useState({
    bar: false,
    line: false,
    donut: false,
    scatter: false, // Added scatter
    area: false, // Added area
  });

  const [selectedCharts, setSelectedCharts] = useState({
    bar: true,
    line: true,
    donut: true,
    scatter: true, // Added scatter
    area: true, // Added area
  });
  
  // Update chart availability whenever the selected table data changes
  useEffect(() => {
    if (displayedTableData && displayedTableData.chartData) {
      const availability = {
        bar: (displayedTableData.chartData.barChart?.length ?? 0) > 0,
        line: (displayedTableData.chartData.lineChart?.length ?? 0) > 0,
        donut: (displayedTableData.chartData.donutChart?.length ?? 0) > 0,
        scatter: (displayedTableData.chartData.scatterPlot?.length ?? 0) > 0,
        area: (displayedTableData.chartData.lineChart?.length ?? 0) > 0,
      };
      setAvailableCharts(availability);
      // Optionally reset selected charts based on availability
      setSelectedCharts(prev => ({
        bar: availability.bar && prev.bar,
        line: availability.line && prev.line,
        donut: availability.donut && prev.donut,
        scatter: availability.scatter && prev.scatter,
        area: availability.area && prev.area,
      }));
      console.log('[Component] Updated chart availability based on selected table:', availability);
    } else {
      // Reset if no table selected
      const resetAvailability = { bar: false, line: false, donut: false, scatter: false, area: false };
      setAvailableCharts(resetAvailability);
      setSelectedCharts(resetAvailability);
    }
  }, [displayedTableData]); // Depend on the derived table data
  // --- END Chart Availability Update ---

  // --- Updated function to fetch and process Excel file --- 
  const fetchExcelFileDirectly = async (fileName: string, fileIndex: number) => {
    setProcessingFile(true);
    setError(null);
    setApiResponse(null); // Clear previous results
    setSelectedTableIndex(0); // Reset table selection
    setShowCharts(false);
    setProcessingMessage('Analyzing via backend...');

    try {
      console.log(`[Component] Fetching data for file: ${fileName}`);
      const result = await fetchExcelData(fileName); // Call the updated API lib function
      console.log('[Component] Received structured API response:', result);

      // Check for errors reported by the backend ETL process
      if (result.error) {
        console.error(`[Component] Backend processing error for ${fileName}:`, result.message, result.errorDetails);
        setError(`Backend error: ${result.message || 'Failed to process file.'}`);
        setApiResponse(result); // Store response even if it has errors for potential display
        setShowCharts(false);
      } else if (result.sheets && result.sheetOrder && result.sheetOrder.length > 0) {
        setApiResponse(result); // Store the successful structured response
        setSelectedTableIndex(0); // Default to the first sheet
        setShowCharts(true);
        setSuccessMessage(`Successfully processed ${fileName}. Found ${result.sheetCount} sheet(s).`);
        // Clear success message after a delay
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        // Handle case where API call was ok, but no sheets were found
        console.warn(`[Component] No sheets found in the response for ${fileName}.`);
        setError('No data sheets found in the selected file.');
        setApiResponse(result); // Store response even if no sheets
        setShowCharts(false);
      }

    } catch (err: any) {
      console.error('[Component] Error calling fetchExcelData:', err);
      setError(`Failed to analyze ${fileName}: ${err.message || 'Unknown API error'}`);
      setShowCharts(false);
      setApiResponse(null); // Clear response on frontend fetch error
    } finally {
      setProcessingFile(false);
      setProcessingMessage(null);
    }
  };
  // --- END Updated Fetch Function ---

  // Handle file selection (remains the same, but clears apiResponse)
  const handleFileChange = (value: string) => {
    console.log('File selected from dropdown:', value);
    const selectedFileObject = availableFiles.excel.find(file => file.name === value);
    const fileIndex = selectedFileObject?.index ?? 0;
    setSelectedFile(value);
    setSelectedFileIndex(fileIndex);
    setShowCharts(false);
    setApiResponse(null); // Clear previous results when file changes
    setSelectedTableIndex(0);
    setError(null); // Clear previous errors
  };

  // Load files on mount (remains the same)
  useEffect(() => {
    loadAvailableFiles();
  }, []);

  // Handle refresh (calls updated fetch function)
  const handleRefresh = () => {
    if (selectedFile) {
      fetchExcelFileDirectly(selectedFile, selectedFileIndex);
    }
  };

  // Handle download (needs adaptation if we want to download specific table data)
  const handleDownload = () => {
    if (!parsedDataForPreview) return; // Use derived preview data
    
    // Create a JSON blob and trigger download
    const dataStr = JSON.stringify(parsedDataForPreview, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    // Include table index in filename if multiple sheets exist
    const sheetSuffix = (apiResponse?.sheetCount ?? 0) > 1 ? `_sheet${selectedTableIndex + 1}` : '';
    a.download = `analytics-${selectedFile}${sheetSuffix}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Configure bar chart
  const barChartConfig = {
    dataKeys: ["value"],
    dataLabels: ["Value"],
    colors: ["#2563eb"],
    showLegend: true
  };

  // Configure donut chart
  const donutChartConfig = {
    colors: ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#4f46e5", "#be123c"]
  };

  // Handle file type selection (remains the same, but clears apiResponse)
  const handleFileTypeChange = (value: 'excel' | 'csv') => {
    console.log('File type changed to:', value);
    setSelectedFileType(value);
    setSelectedFile('');
    setSelectedFileIndex(0);
    setApiResponse(null); // Clear previous results
    setSelectedTableIndex(0);
    setShowCharts(false);
    setError(null);
    
    const filesOfSelectedType = value === 'excel' ? availableFiles.excel : availableFiles.csv;
    if (filesOfSelectedType.length > 0) {
      setSelectedFile(filesOfSelectedType[0].name);
      setSelectedFileIndex(filesOfSelectedType[0].index ?? 0);
    } else {
      setError(`No ${value.toUpperCase()} files found in the storage bucket.`);
    }
  };

  const currentFileList = selectedFileType === 'excel' ? availableFiles.excel : availableFiles.csv;

  // Handle chart selection changes (remains the same)
  const handleChartSelectionChange = (chartId: string, checked: boolean) => {
    setSelectedCharts(prev => ({
      ...prev,
      [chartId]: checked
    }));
  };

  // --- Update dynamic labels based on selected table's metadata --- 
  const firstCatCol = useMemo(() => tableMetadata?.categoricalColumns?.[0] || '', [tableMetadata]);
  const firstNumCol = useMemo(() => tableMetadata?.numericalColumns?.[0] || '', [tableMetadata]);
  const firstDateCol = useMemo(() => tableMetadata?.dateColumns?.[0] || tableMetadata?.categoricalColumns?.[0] || '', [tableMetadata]);
  // --- END Dynamic Labels --- 

  // --- Handle Sheet Selection Change --- 
  const handleSheetSelectionChange = (sheetName: string) => {
    if (!apiResponse || !apiResponse.sheets || !apiResponse.sheetOrder) return;

    const index = apiResponse.sheetOrder.indexOf(sheetName);

    if (index !== -1) {
      console.log(`[Component] Sheet selection changed to index: ${index}, name: ${sheetName}`);
      setSelectedTableIndex(index);
      setSelectedTableIndexWithinSheet(0); // <<< RESET table index when sheet changes
      setSelectedSheetName(sheetName); // <<< SET selected sheet name state
      // Clear errors when sheet changes
      setError(null);
      // Data derivation now happens in useMemo, no need to update apiResponse state here
      // Check if the selected sheet has errors or no tables
      const selectedSheet = apiResponse.sheets[sheetName];
      if (selectedSheet && (selectedSheet.error || selectedSheet.tableCount === 0)) {
        setError(selectedSheet.message || `No data tables found in sheet: ${sheetName}.`);
        // Ensure charts are hidden if the sheet has issues
        setShowCharts(false);
      } else if (selectedSheet) { // Check if selectedSheet exists before showing charts
        // Show charts if the sheet is valid
        setShowCharts(true);
      } else {
        // Handle case where sheet might be missing unexpectedly
        setError(`Could not find data for sheet: ${sheetName}.`);
        setShowCharts(false);
      }
    } else {
      console.warn(`[Component] Sheet name '${sheetName}' not found in sheetOrder.`);
    }
  };
  // --- END Sheet Selection ---

  // --- NEW: Handler for Table Selection WITHIN a Sheet --- 
  const handleTableWithinSheetChange = (indexStr: string) => {
    const index = parseInt(indexStr, 10);
    if (!isNaN(index)) {
       // We can add checks here later if needed to ensure index is valid for the current sheet
       console.log(`[Component] Table selection within sheet changed to index: ${index}`);
       setSelectedTableIndexWithinSheet(index);
       // Reset chart availability/selection if needed, or let useEffect handle it
    }
  };
  // --- END NEW Handler ---

  // --- Set initial sheet name when API response is ready ---
  useEffect(() => {
    if (apiResponse && apiResponse.sheetOrder && apiResponse.sheetOrder.length > 0) {
      // Default to the first sheet
      setSelectedSheetName(apiResponse.sheetOrder[0]); 
    } else {
      setSelectedSheetName(null); // Reset if no sheets
    }
  }, [apiResponse]); // Depend only on apiResponse
  // --- END Initial Sheet Name ---

  // Inside ExcelAnalytics component, after parsedDataForPreview is available:
  const [categoryField, setCategoryField] = useState<string | null>(null);
  const [valueField, setValueField] = useState<string | null>(null);

  // When parsedDataForPreview changes, set defaults for category/value fields
  useEffect(() => {
    if (parsedDataForPreview?.headers && parsedDataForPreview.headers.length > 0) {
      const headers = parsedDataForPreview.headers;
      if (!categoryField || !headers.includes(categoryField)) {
        setCategoryField(headers[0]);
      }
      if (!valueField || !headers.includes(valueField)) {
        setValueField(headers.length > 1 ? headers[1] : headers[0]);
      }
    } else {
      setCategoryField(null);
      setValueField(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedDataForPreview?.headers]);

  // --- Paginated Table Sub-component (copied from EnhancedDataPreview) ---
  interface PaginatedTableProps {
    headers: string[];
    tableData: Record<string, any>[];
  }

  function PaginatedTable({ headers, tableData }: PaginatedTableProps) {
    const [columnPage, setColumnPage] = useState(0);
    const [rowPage, setRowPage] = useState(0);
    const columnsPerPage = 5;
    const rowsPerPage = 10;

    const totalColumnHeaders = headers.length;
    const totalRows = tableData.length;
    
    const totalColumnPages = Math.ceil(totalColumnHeaders / columnsPerPage);
    const totalRowPages = Math.ceil(totalRows / rowsPerPage);

    const currentColumns = headers.slice(columnPage * columnsPerPage, (columnPage + 1) * columnsPerPage);
    const currentRows = tableData.slice(rowPage * rowsPerPage, (rowPage + 1) * rowsPerPage);

    const handlePrevColumns = () => setColumnPage(prev => Math.max(0, prev - 1));
    const handleNextColumns = () => setColumnPage(prev => Math.min(totalColumnPages - 1, prev + 1));
    const handlePrevRows = () => setRowPage(prev => Math.max(0, prev - 1));
    const handleNextRows = () => setRowPage(prev => Math.min(totalRowPages - 1, prev + 1));

  return (
      <>
        <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
          <h3 className="font-medium text-sm whitespace-nowrap">Data Preview</h3>
          <div className="flex items-center gap-4">
            {totalColumnHeaders > columnsPerPage && (
              <div className="flex items-center gap-2">
                <button onClick={handlePrevColumns} disabled={columnPage === 0} className={`text-xs px-2 py-1 rounded border ${columnPage === 0 ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}>←</button>
                <span className="text-xs text-gray-500 whitespace-nowrap">Cols {columnPage * columnsPerPage + 1}-{Math.min((columnPage + 1) * columnsPerPage, totalColumnHeaders)}</span>
                <button onClick={handleNextColumns} disabled={columnPage >= totalColumnPages - 1} className={`text-xs px-2 py-1 rounded border ${columnPage >= totalColumnPages - 1 ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}>→</button>
              </div>
            )}
            {totalRows > rowsPerPage && (
              <div className="flex items-center gap-2">
                <button onClick={handlePrevRows} disabled={rowPage === 0} className={`text-xs px-2 py-1 rounded border ${rowPage === 0 ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}>↑</button>
                <span className="text-xs text-gray-500 whitespace-nowrap">Rows {rowPage * rowsPerPage + 1}-{Math.min((rowPage + 1) * rowsPerPage, totalRows)}</span>
                <button onClick={handleNextRows} disabled={rowPage >= totalRowPages - 1} className={`text-xs px-2 py-1 rounded border ${rowPage >= totalRowPages - 1 ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}>↓</button>
              </div>
            )}
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-700 min-w-[600px]">
            <thead className="text-xs text-gray-800 uppercase bg-gray-100">
              <tr>
                {currentColumns.map((header: string, index: number) => (
                  <th key={index} scope="col" className="px-3 py-2 border-b border-r border-gray-200 whitespace-nowrap">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={currentColumns.length || 1} className="text-center text-gray-500 py-4 border-b">
                    No data rows available.
                  </td>
                </tr>
              ) : (
                currentRows.map((row: Record<string, any>, rowIndex: number) => (
                  <tr key={rowIndex} className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-200`}>
                    {currentColumns.map((header: string, colIndex: number) => (
                      <td key={colIndex} className="px-3 py-1.5 border-r border-gray-200 whitespace-normal break-words">
                        {row[header]?.toString() || '-'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="py-2 px-4 text-center text-xs text-gray-500 border-t border-gray-200 bg-gray-50 rounded-b-md sticky bottom-0 z-10">
          {totalRows > rowsPerPage
            ? `Showing rows ${rowPage * rowsPerPage + 1} to ${Math.min((rowPage + 1) * rowsPerPage, totalRows)} of ${totalRows}`
            : `Showing all ${totalRows} rows`
          }
           {' | '}
          {totalColumnHeaders > columnsPerPage
            ? `Showing columns ${columnPage * columnsPerPage + 1} to ${Math.min((columnPage + 1) * columnsPerPage, totalColumnHeaders)} of ${totalColumnHeaders}`
            : `Showing all ${totalColumnHeaders} columns`
          }
        </div>
      </>
    );
  }
  // --- END Paginated Table Sub-component ---

  // Utility function for conditional class names
  function classNames(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(' ');
  }

  // 1. Add a yAxisScale state at the top level of ExcelAnalytics
  const [yAxisScale, setYAxisScale] = useState<'linear' | 'log'>('linear');

  return (
    <div className={`w-full max-w-6xl mx-auto mt-12`}> 
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 px-8 py-7 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <BarChart3 className="h-7 w-7 text-teal-500" />
              <span className="text-2xl font-bold text-gray-800">ESG Data Analytics</span>
            </div>
            <div className="text-base text-gray-500 font-medium">Import and analyze your ESG data from spreadsheets for enhanced insights and reporting</div>
          </div>
          <span className="bg-teal-100 text-teal-700 px-4 py-1 rounded-full text-sm font-semibold shadow-sm">Enterprise</span>
        </div>
        {/* Main Form Section */}
        <div className="px-8 pt-8 pb-6">
          <div className="mb-7">
            <Label htmlFor="file-type-select" className="mb-2 block text-gray-700 font-semibold text-base">File Format</Label>
            <div className="flex w-full max-w-md rounded-full overflow-hidden border border-gray-200 bg-gray-50">
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-base font-semibold transition-all
                  ${selectedFileType === 'excel' ? 'bg-teal-500 text-white shadow-md scale-[1.02] z-10' : 'bg-gray-100 text-gray-500 hover:bg-emerald-50 z-0'}
                  rounded-none rounded-l-full focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1`}
                onClick={() => handleFileTypeChange('excel')}
                style={{ borderRight: '1px solid #e5e7eb' }}
              >
                <FileSpreadsheet className="h-5 w-5" /> Excel
              </button>
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-base font-semibold transition-all
                  ${selectedFileType === 'csv' ? 'bg-teal-500 text-white shadow-md scale-[1.02] z-10' : 'bg-gray-100 text-gray-500 hover:bg-emerald-50 z-0'}
                  rounded-none rounded-r-full focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1`}
                onClick={() => handleFileTypeChange('csv')}
              >
                <FileType className="h-5 w-5" /> CSV
              </button>
            </div>
          </div>
          <div className="mb-7">
            <Label htmlFor="file-select" className="mb-2 block text-gray-700 font-semibold text-base">
              Select {selectedFileType === 'excel' ? 'Excel' : 'CSV'} File
            </Label>
            <div className="flex items-center gap-2">
              <Select 
                value={selectedFile} 
                onValueChange={handleFileChange}
                disabled={loading || currentFileList.length === 0}
              >
                <SelectTrigger id="file-select" className="w-full h-12 border border-gray-200 rounded-2xl bg-white flex items-center text-base font-medium transition-all duration-200 px-4 shadow-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 scale-100 hover:bg-teal-50 focus:bg-teal-50" style={{boxShadow: 'none'}}>
                  <SelectValue placeholder={loading ? "Loading files..." : `Choose a ${selectedFileType === 'excel' ? 'Excel' : 'CSV'} file`}>
                    {selectedFile && (
                      <div className="flex items-center">
                        {selectedFileType === 'excel' ? (
                          <FileSpreadsheet className="h-5 w-5 mr-2 text-emerald-600" />
                        ) : (
                          <FileType className="h-5 w-5 mr-2 text-green-600" />
                        )}
                        <span>{selectedFile}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="border border-slate-200 shadow-2xl rounded-2xl bg-gradient-to-br from-white to-slate-50 py-2 px-1 mt-2 min-w-[260px] w-full" side="bottom" align="start">
                  {currentFileList.map((file, index, arr) => (
                    <SelectItem
                      key={file.path}
                      value={file.name}
                      className={classNames(
                        "rounded-xl my-1 py-3 px-4 text-base flex items-center transition-all duration-150 hover:bg-teal-50 hover:font-semibold focus:bg-teal-50 focus:font-bold data-[state=checked]:bg-teal-50 data-[state=checked]:font-bold",
                        index !== arr.length - 1 && "border-b border-slate-100"
                      )}
                    >
                      <span className="flex items-center">
                        {selectedFileType === 'excel' ? (
                          <FileSpreadsheet className="h-5 w-5 mr-2 text-emerald-600" />
                        ) : (
                          <FileType className="h-5 w-5 mr-2 text-green-600" />
                        )}
                        <span>{file.name}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          {file.size ? `(${Math.round(file.size / 1024)} KB)` : ''}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                  {currentFileList.length === 0 && !loading && (
                    <SelectItem value="no-files" disabled className="opacity-60">
                      No {selectedFileType === 'excel' ? 'Excel' : 'CSV'} files available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button 
                onClick={loadAvailableFiles} 
                variant="outline" 
                size="icon"
                className="h-11 w-11 border-gray-200 text-teal-600 hover:bg-teal-100 hover:text-teal-700 hover:border-teal-300 transition-all duration-200 shadow-sm rounded-lg"
                disabled={loading}
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            {error && (
              <p className="mt-2 text-xs text-red-500">
                Try refreshing the file list or check your network connection.
              </p>
            )}
          </div>
          <div className="pt-2">
            <Button
              onClick={() => fetchExcelFileDirectly(selectedFile, selectedFileIndex)}
              disabled={!selectedFile || processingFile || loading}
              className="w-full py-4 text-lg font-bold rounded-xl shadow-md bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-none focus:ring-2 focus:ring-emerald-400 focus:outline-none flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
              variant="default"
            >
              <BarChart3 className="h-6 w-6 mr-2" />
              Analyze Data
            </Button>
          </div>
        </div>
      </div>
      {/* --- Sheet and Table Selectors --- */}
      {apiResponse && apiResponse.sheetOrder && apiResponse.sheetOrder.length > 0 && !processingFile && (
        <div className="mt-6 px-0 pb-4 flex justify-center">
          <div className="w-full max-w-6xl bg-gradient-to-br from-white via-slate-50 to-slate-100 rounded-3xl shadow-2xl border border-slate-200 px-10 py-8 flex flex-col md:flex-row gap-8 items-stretch mx-auto transition-all duration-300" style={{boxShadow: '0 12px 36px 0 rgba(60,72,100,0.16), 0 2px 8px 0 rgba(60,72,100,0.12)'}}>
            {/* Sheet Selector */}
            <div className="flex-1 min-w-[180px] flex flex-col justify-end pl-3">
              <Label htmlFor="sheet-select" className="mb-2 block text-gray-700 font-bold text-base">Select Sheet</Label>
              <Select 
                value={selectedSheetName || ''} 
                onValueChange={handleSheetSelectionChange}
                disabled={!apiResponse || !apiResponse.sheetOrder || apiResponse.sheetOrder.length === 0}
              >
                <SelectTrigger 
                  id="sheet-select" 
                  className="w-full h-12 border border-gray-200 rounded-2xl bg-white flex items-center text-base font-medium transition-all duration-200 px-4 shadow-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 scale-100 hover:bg-blue-50 focus:bg-blue-50" 
                  aria-haspopup="listbox" aria-expanded="false"
                  style={{boxShadow: 'none'}}
                >
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  <SelectValue placeholder="Select a sheet" />
                </SelectTrigger>
                <SelectContent className="border border-slate-200 shadow-2xl rounded-2xl bg-gradient-to-br from-white to-slate-50 py-2 px-1 mt-2" side="bottom" align="start">
                  {apiResponse?.sheetOrder
                    ?.filter(sheetName => (apiResponse?.sheets?.[sheetName]?.tableCount || 0) > 0)
                    .map((sheetName, index, arr) => (
                    <SelectItem
                      key={sheetName}
                      value={sheetName}
                      className={classNames(
                        "rounded-xl my-1 py-3 px-4 text-base transition-all duration-150 hover:bg-blue-100 hover:font-semibold focus:bg-blue-50 focus:font-bold data-[state=checked]:bg-blue-50 data-[state=checked]:font-bold",
                        index !== arr.length - 1 && "border-b border-slate-100"
                      )}
                    >
                      <div className="flex items-center">
                        <span>{sheetName}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          ({apiResponse?.sheets?.[sheetName]?.tableCount || 0} tables)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Table Selector (within the selected sheet) */}
            {displayedTableData && displayedTableData.tables && displayedTableData.tableCount > 1 && (
              <div className="flex-1 min-w-[180px] flex flex-col justify-end pr-3">
                <Label htmlFor="table-within-sheet-select" className="mb-2 block text-gray-700 font-bold text-base">
                  Select Table within Sheet
                </Label>
                <Select
                  value={selectedTableIndexWithinSheet.toString()}
                  onValueChange={handleTableWithinSheetChange}
                  disabled={!displayedTableData || !displayedTableData.tables || displayedTableData.tables.length <= 1}
                >
                  <SelectTrigger 
                    id="table-within-sheet-select" 
                    className="w-full h-12 border border-gray-200 rounded-2xl bg-white flex items-center text-base font-medium transition-all duration-200 px-4 shadow-none focus:ring-2 focus:ring-green-300 focus:border-green-400 scale-100 hover:bg-green-50 focus:bg-green-50" 
                    aria-haspopup="listbox" aria-expanded="false"
                    style={{boxShadow: 'none'}}
                  >
                    <TableIcon className="h-5 w-5 mr-2 text-green-600" />
                    <SelectValue placeholder="Select a table" />
                  </SelectTrigger>
                  <SelectContent className="border border-slate-200 shadow-2xl rounded-2xl bg-gradient-to-br from-white to-slate-50 py-2 px-1 mt-2" side="bottom" align="start">
                    {displayedTableData?.tables?.map((table, index, arr) => {
                      const firstHeader = table?.tableData?.headers?.[0];
                      const isValidHeader = firstHeader && typeof firstHeader === 'string' && firstHeader.trim() !== '' && firstHeader.toLowerCase() !== 'nan';
                      const tableName = isValidHeader 
                        ? firstHeader 
                        : table?.meta?.name || `Table ${index + 1}`;
                      return (
                        <SelectItem
                          key={index}
                          value={index.toString()}
                          className={classNames(
                            "rounded-xl my-1 py-3 px-4 text-base transition-all duration-150 hover:bg-green-100 hover:font-semibold focus:bg-green-50 focus:font-bold data-[state=checked]:bg-green-50 data-[state=checked]:font-bold",
                            index !== arr.length - 1 && "border-b border-slate-100"
                          )}
                        >
                          <div className="flex items-center">
                            <span>{tableName}</span>
                            <span className="ml-2 text-xs text-gray-500">
                              ({table?.tableData?.rows?.length || 0} rows)
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      )}
      {/* The rest of the analytics UI (results, loading, etc.) remains unchanged and is rendered below as before */}
      {displayedTableData && showCharts && !error && !processingFile && (
        <div className="mt-8">
          {/* Generic Heatmap Preview */}
          {parsedDataForPreview && (
            <GenericHeatmapPreview 
              parsedData={{
                headers: parsedDataForPreview.headers,
                tableData: parsedDataForPreview.tableData,
                metadata: tableMetadata || null // Pass metadata here too
              }}
            />
          )}

          {/* EnhancedDataPreview */}
          {parsedDataForPreview && (
            <EnhancedDataPreview
              parsedData={{
                headers: parsedDataForPreview.headers,
                tableData: parsedDataForPreview.tableData,
                metadata: tableMetadata || null // Pass null if tableMetadata is undefined
              }}
              handleDownload={handleDownload}
              categoryField={categoryField}
              valueField={valueField}
              setCategoryField={setCategoryField}
              setValueField={setValueField}
              yAxisScale={yAxisScale}
              setYAxisScale={setYAxisScale}
            />
          )}
          {/* Dynamic Multi-Line Trend Chart */}
          {parsedDataForPreview && (
            <DynamicTrendChartCard
              headers={parsedDataForPreview.headers}
              tableData={parsedDataForPreview.tableData}
              yAxisScale={yAxisScale}
            />
          )}
        </div>
      )}
      
      {/* Loading state while processing */}
      {processingFile && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-0 shadow-xl rounded-xl p-12 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 rounded-full border-[3px] border-teal-200 border-dashed animate-[spin_5s_linear_infinite]"></div>
              <div className="absolute inset-2 rounded-full border-[3px] border-emerald-200 border-dashed animate-[spin_4s_linear_infinite_reverse]"></div>
              <Loader2 className="h-16 w-16 text-emerald-600 animate-spin relative z-10" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-gray-800">Processing Excel Data</h3>
            <p className="text-gray-600 mb-4 max-w-md">
              {processingMessage || 'Analyzing your data and generating visualizations. This may take a moment depending on the file size.'}
            </p>
            <div className="w-80 h-3 bg-gray-200 rounded-full overflow-hidden mt-4 relative">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full animate-progress relative">
                <div className="absolute inset-0 bg-white/20 bg-[size:16px_16px] bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success state with helpful message */}
      {successMessage && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-0 border-emerald-200 rounded-xl p-10 text-center shadow-xl">
          <div className="flex flex-col items-center justify-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-25"></div>
              <div className="relative bg-white p-4 rounded-full shadow-lg">
                <CheckCircle className="h-12 w-12 text-emerald-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-emerald-800">Excel Data Processed Successfully</h3>
            <p className="text-emerald-700 mb-8 max-w-md mx-auto">
              {successMessage}
            </p>
            <div className="flex gap-4">
              <Button 
                onClick={() => setSuccessMessage(null)} 
                variant="outline"
                className="px-6 py-2.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 rounded-lg transition-colors"
              >
                Dismiss
              </Button>
              <Button 
                onClick={loadAvailableFiles} 
                variant="default"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh File List
              </Button>
            </div>
          </div>
        </div>
      )}
      {displayedTableData && showCharts && !error && !processingFile && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <BarChartCard 
            title="Bar Chart Analysis"
            tableData={parsedDataForPreview?.tableData || []}
            categoryField={categoryField}
            valueField={valueField}
            available={availableCharts.bar}
            yAxisScale={yAxisScale}
          />
          <LineChartCard 
            title="Line Chart Trend"
            tableData={parsedDataForPreview?.tableData || []}
            categoryField={categoryField}
            valueField={valueField}
            available={availableCharts.line}
            yAxisScale={yAxisScale}
          />
          <AreaChartCard 
            title="Area Chart Overview"
            tableData={parsedDataForPreview?.tableData || []}
            categoryField={categoryField}
            valueField={valueField}
            available={availableCharts.area}
            yAxisScale={yAxisScale}
          />
          <PieChartCard 
            title="Pie Chart Distribution"
            tableData={parsedDataForPreview?.tableData || []}
            categoryField={categoryField}
            valueField={valueField}
            available={availableCharts.donut}
          />
          <ScatterChartCard 
            title="Scatter Plot Correlation"
            tableData={parsedDataForPreview?.tableData || []}
            scatterXField={categoryField}
            scatterYField={valueField}
            categoryField={categoryField}
            headers={parsedDataForPreview?.headers || []}
            available={availableCharts.scatter}
          />
        </div>
      )}
    </div>
  );
} 