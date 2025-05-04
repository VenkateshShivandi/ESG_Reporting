"use client"

import React, { useState, useEffect, ChangeEvent, Fragment } from 'react';
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
import { FileText, Download, Loader2, RefreshCw, FileSpreadsheet, BarChart3, PieChart as PieChartIcon, Table as TableIcon, X, AlertCircle, CheckCircle, TreeDeciduous, Lightbulb, Recycle, Droplet, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Filter, Maximize, FileType } from 'lucide-react';
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
const isValidChartData = (data: any[]) => {
  if (!Array.isArray(data) || data.length === 0) return false;
  
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

// Import the API functions
import { fetchExcelData, fetchExcelFiles } from '@/lib/api/analytics';

// Chart selection panel component
function ChartSelectionPanel({ 
  availableCharts, 
  selectedCharts, 
  onSelectionChange 
}: { 
  availableCharts: Record<string, boolean>,
  selectedCharts: Record<string, boolean>,
  onSelectionChange: (id: string, checked: boolean) => void
}) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <Filter className="h-5 w-5 mr-2 text-blue-500" />
          Chart Display Options
        </CardTitle>
        <CardDescription>
          Select which charts to display based on your data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`flex items-center space-x-3 rounded-lg border p-4 ${availableCharts.bar ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
            <Checkbox 
              id="show-bar-chart" 
              checked={selectedCharts.bar}
              disabled={!availableCharts.bar}
              onCheckedChange={(checked) => onSelectionChange('bar', checked === true)}
              className={availableCharts.bar ? 'border-blue-500 data-[state=checked]:bg-blue-500' : 'border-gray-300 data-[state=checked]:bg-gray-400'}
            />
            <div className="flex flex-1 items-center justify-between">
              <Label 
                htmlFor="show-bar-chart" 
                className={`font-medium ${availableCharts.bar ? 'text-blue-900' : 'text-gray-500'}`}
              >
                Bar Chart
              </Label>
              <BarChart3 className={`h-5 w-5 ${availableCharts.bar ? 'text-blue-500' : 'text-gray-400'}`} />
            </div>
          </div>
          
          <div className={`flex items-center space-x-3 rounded-lg border p-4 ${availableCharts.line ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
            <Checkbox 
              id="show-line-chart" 
              checked={selectedCharts.line}
              disabled={!availableCharts.line}
              onCheckedChange={(checked) => onSelectionChange('line', checked === true)}
              className={availableCharts.line ? 'border-emerald-500 data-[state=checked]:bg-emerald-500' : 'border-gray-300 data-[state=checked]:bg-gray-400'}
            />
            <div className="flex flex-1 items-center justify-between">
              <Label 
                htmlFor="show-line-chart" 
                className={`font-medium ${availableCharts.line ? 'text-emerald-900' : 'text-gray-500'}`}
              >
                Line Chart
              </Label>
              <TrendingUp className={`h-5 w-5 ${availableCharts.line ? 'text-emerald-500' : 'text-gray-400'}`} />
            </div>
          </div>
          
          <div className={`flex items-center space-x-3 rounded-lg border p-4 ${availableCharts.donut ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
            <Checkbox 
              id="show-donut-chart" 
              checked={selectedCharts.donut}
              disabled={!availableCharts.donut}
              onCheckedChange={(checked) => onSelectionChange('donut', checked === true)}
              className={availableCharts.donut ? 'border-amber-500 data-[state=checked]:bg-amber-500' : 'border-gray-300 data-[state=checked]:bg-gray-400'}
            />
            <div className="flex flex-1 items-center justify-between">
              <Label 
                htmlFor="show-donut-chart" 
                className={`font-medium ${availableCharts.donut ? 'text-amber-900' : 'text-gray-500'}`}
              >
                Donut Chart
              </Label>
              <PieChartIcon className={`h-5 w-5 ${availableCharts.donut ? 'text-amber-500' : 'text-gray-400'}`} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
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
  const [data, setData] = useState<any>({
    barChart: [],
    lineChart: [],
    donutChart: [],
    tableData: []
  });
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
  const [parsedData, setParsedData] = useState<any>(null);
  const [metadata, setMetadata] = useState<{
    filename: string;
    columns: string[];
    numericalColumns: string[];
    categoricalColumns: string[];
    dateColumns: string[];
    yearColumns: string[];
  }>({
    filename: '',
    columns: [],
    numericalColumns: [],
    categoricalColumns: [],
    dateColumns: [],
    yearColumns: []
  });
  const [identifiedColumns, setIdentifiedColumns] = useState<{ categorical: string[]; numerical: string[] }>({
    categorical: [],
    numerical: []
  });
  const [chartData, setChartData] = useState<{
    bar: any[];
    pie: any[];
  }>({
    bar: [],
    pie: []
  });
  const [showCharts, setShowCharts] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<'excel' | 'csv'>('excel');

  // === State for User Chart Configuration ===
  const [selectedChartType, setSelectedChartType] = useState<string>('Line'); // Default: Line
  const [selectedXAxisCol, setSelectedXAxisCol] = useState<string>('');
  const [selectedYAxisCol, setSelectedYAxisCol] = useState<string>('none'); // Changed from empty string to 'none'
  // ==========================================

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

  // Add chart visibility state
  const [availableCharts, setAvailableCharts] = useState({
    bar: false,
    line: false,
    donut: false
  });
  
  const [selectedCharts, setSelectedCharts] = useState({
    bar: true,
    line: true,
    donut: true
  });

  // Function to fetch and process Excel file using backend ETL
  const fetchExcelFileDirectly = async (fileName: string, fileIndex: number) => {
    // Reset states
    setProcessingFile(true);
    setError(null);
    setProcessingMessage('Analyzing via backend...');
    setShowCharts(false);
    setParsedData(null);
    
    try {
      // Log before fetching
      console.log(`Fetching data for file: ${fileName}`);
      
      const result = await fetchExcelData(fileName);
      
      // Log raw result data to debug chart issues
      console.log('[Component] Raw result received from fetchExcelData:', JSON.stringify(result)); // Log full result
      
      // Process successful result
      const chartData = {
        barChart: Array.isArray(result.barChart) ? result.barChart : [],
        lineChart: Array.isArray(result.lineChart) ? result.lineChart : [],
        donutChart: Array.isArray(result.donutChart) ? result.donutChart : [],
      };
      
      const metaData = {
          filename: result.metadata?.filename || fileName,
          columns: result.metadata?.columns || [],
          numericalColumns: result.metadata?.numericalColumns || [],
          categoricalColumns: result.metadata?.categoricalColumns || [],
          dateColumns: result.metadata?.dateColumns || [],
          yearColumns: result.metadata?.yearColumns || [],
      }

      const tableDisplayData = result.tableData || [];
      
      // Check which charts have valid data *before* setting state
      // Use simple length check for now to ensure charts show if data exists
      const chartAvailability = {
        bar: chartData.barChart && chartData.barChart.length > 0,
        line: chartData.lineChart && chartData.lineChart.length > 0, 
        donut: chartData.donutChart && chartData.donutChart.length > 0
      };
      console.log('[Component] Determined chart availability (using length check):', chartAvailability);
      
      // Group state updates that depend on the fetched data
      setAvailableCharts(chartAvailability);
      setSelectedCharts({
        bar: chartAvailability.bar,
        line: chartAvailability.line,
        donut: chartAvailability.donut
      });
      setData(chartData); // State for Recharts components
      setParsedData({ // State for Data Preview table
          headers: metaData.columns,
          tableData: tableDisplayData,
          analytics: {}, 
      });
      // Save metadata for dynamic chart labels
      setMetadata(metaData);
      setShowCharts(true); // Explicitly show charts section after data is processed
      
      // Log the state values *after* attempting to set them
      // Note: Due to async nature, these logs might show values *before* re-render
      console.log('[Component] Attempted state updates. availableCharts should be:', chartAvailability);
      console.log('[Component] Attempted state updates. parsedData should have headers:', metaData.columns, 'and tableData length:', tableDisplayData.length);

    } catch (err: any) {
      console.error('Error processing Excel file:', err);
      setError(`Failed to analyze ${fileName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setShowCharts(false);
    } finally {
      setProcessingFile(false);
      setProcessingMessage(null);
    }
  };

  // Handle file selection
  const handleFileChange = (value: string) => {
    console.log('File selected from dropdown:', value);
    
    // Find the selected file and its index
    const selectedFileObject = availableFiles.excel.find(file => file.name === value);
    const fileIndex = selectedFileObject?.index || 0;
    
    // Just set the selected file without automatically analyzing
    setSelectedFile(value);
    setSelectedFileIndex(fileIndex);
    
    // Clear any existing data/charts when a new file is selected
    setShowCharts(false);
    setParsedData(null);
    setChartData({
      bar: [],
      pie: []
    });
  };

  // Load files on component mount, but don't automatically analyze them
  useEffect(() => {
    loadAvailableFiles();
  }, []);

  // Handle refresh
  const handleRefresh = () => {
    fetchExcelFileDirectly(selectedFile, selectedFileIndex);
  };

  // Handle download
  const handleDownload = () => {
    if (!parsedData) return;
    
    // Create a JSON blob and trigger download
    const dataStr = JSON.stringify(parsedData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `excel-analytics-${selectedFile}.json`;
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

  // Transform data for the DataTable component
  const prepareTableData = () => {
    if (!parsedData?.tableData || !Array.isArray(parsedData.tableData)) return [];
    
    return parsedData.tableData.map((item: Record<string, any>, index: number) => ({
      id: String(index + 1),
      ...item
    }));
  };

  // Handle file type selection
  const handleFileTypeChange = (value: 'excel' | 'csv') => {
    console.log('File type changed to:', value);
    setSelectedFileType(value);
    
    // Reset selected file when switching file types
    setSelectedFile('');
    setSelectedFileIndex(0);
    setParsedData(null);
    setShowCharts(false);
    
    // If there are files of the new type, select the first one
    const filesOfSelectedType = value === 'excel' ? availableFiles.excel : availableFiles.csv;
    if (filesOfSelectedType.length > 0) {
      setSelectedFile(filesOfSelectedType[0].name);
      setSelectedFileIndex(filesOfSelectedType[0].index || 0);
    } else {
      setError(`No ${value.toUpperCase()} files found in the storage bucket. Upload ${value.toUpperCase()} files to the documents section first.`);
    }
  };

  // Get current files based on selected type
  const currentFileList = selectedFileType === 'excel' ? availableFiles.excel : availableFiles.csv;

  // Function to handle chart selection changes
  const handleChartSelectionChange = (chartId: string, checked: boolean) => {
    setSelectedCharts(prev => ({
      ...prev,
      [chartId]: checked
    }));
  };

  // Determine dynamic labels based on metadata
  const firstCatCol = metadata.categoricalColumns[0] || '';
  const firstNumCol = metadata.numericalColumns[0] || '';
  const firstDateCol = metadata.dateColumns[0] || metadata.categoricalColumns[0] || '';

  return (
    <div className={`space-y-8 ${className}`}>
      <Card className="overflow-hidden border-0 shadow-xl rounded-xl bg-white dark:bg-gray-900">
        <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-b border-gray-100 dark:border-gray-800">
          <CardTitle className="text-xl font-bold text-gray-800 dark:text-gray-100">Excel & CSV Data Analytics</CardTitle>
          <CardContent className="p-0 pt-3">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Analyze your ESG data from Excel and CSV files for enhanced insights and reporting.
            </p>
            
            {error && (
              <Alert variant="destructive" className="mb-4 bg-red-50 border-red-100 text-red-700">
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
              <div className="flex-1">
                {/* Add file type selector */}
                <div className="mb-4">
                  <Label htmlFor="file-type-select" className="mb-2 block text-gray-700 dark:text-gray-300 font-medium">File Type</Label>
                  <Tabs 
                    value={selectedFileType} 
                    onValueChange={(value) => handleFileTypeChange(value as 'excel' | 'csv')}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="excel" className="flex items-center justify-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>Excel</span>
                      </TabsTrigger>
                      <TabsTrigger value="csv" className="flex items-center justify-center gap-2">
                        <FileType className="h-4 w-4" />
                        <span>CSV</span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                
                <Label htmlFor="file-select" className="mb-2 block text-gray-700 dark:text-gray-300 font-medium">
                  Select {selectedFileType === 'excel' ? 'Excel' : 'CSV'} File
                </Label>
                <Select 
                  value={selectedFile} 
                  onValueChange={handleFileChange}
                  disabled={loading || currentFileList.length === 0}
                >
                  <SelectTrigger id="file-select" className="w-full border-gray-200 dark:border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue placeholder={loading ? "Loading files..." : `Select a ${selectedFileType} file to analyze`}>
                      {selectedFile && (
                        <div className="flex items-center">
                          {selectedFileType === 'excel' ? (
                          <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
                          ) : (
                            <FileType className="h-4 w-4 mr-2 text-green-600" />
                          )}
                          <span>{selectedFile}</span>
                </div>
                      )}
                    </SelectValue>
              </SelectTrigger>
                  <SelectContent className="border-0 shadow-xl rounded-lg bg-white dark:bg-gray-800 backdrop-blur-sm">
                    {currentFileList.map(file => (
                      <SelectItem key={file.path} value={file.name} className="rounded-md my-0.5 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors duration-150">
                        <div className="flex items-center">
                          {selectedFileType === 'excel' ? (
                          <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
                          ) : (
                            <FileType className="h-4 w-4 mr-2 text-green-600" />
                          )}
                          <span>{file.name}</span>
                          <span className="ml-2 text-xs text-gray-500">
                            {file.size ? `(${Math.round(file.size / 1024)} KB)` : ''}
                          </span>
                      </div>
                        </SelectItem>
                      ))}
                    {currentFileList.length === 0 && !loading && (
                      <SelectItem value="no-files" disabled className="opacity-60">
                        No {selectedFileType === 'excel' ? 'Excel' : 'CSV'} files available
                        </SelectItem>
                  )}
              </SelectContent>
            </Select>
                {error && (
                  <p className="mt-2 text-xs text-red-500">
                    Try refreshing the file list or check your network connection.
                  </p>
                )}
          </div>
          
              <div className="flex items-end">
            <Button 
                  onClick={() => fetchExcelFileDirectly(selectedFile, selectedFileIndex)}
                  disabled={!selectedFile || processingFile || loading}
                  className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-lg shadow-lg shadow-blue-200/50 dark:shadow-none hover:shadow-xl transition-all duration-200"
                  variant="default"
                >
                  {processingFile ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="relative w-5 h-5">
                        <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-blue-300 animate-spin"></div>
                        <div className="absolute inset-0 rounded-full border-b-2 border-l-2 border-blue-100 opacity-30"></div>
                          </div>
                      <span>Processing File...</span>
                        </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-blue-200" />
                      <span>Analyze Data</span>
                      <div className="relative flex items-center justify-center ml-1 group">
                        <div className="absolute -right-1 -top-1 w-2 h-2 bg-white rounded-full animate-ping opacity-75"></div>
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                    </div>
                  )}
            </Button>
                
            <Button 
                  onClick={loadAvailableFiles} 
              variant="outline" 
                  size="icon"
                  className="ml-2 h-10 w-10 border-gray-200 text-gray-700 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all duration-200 dark:border-gray-700 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:border-blue-800 dark:hover:bg-gray-800"
              disabled={loading}
            >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
          </CardContent>
        </CardHeader>
      </Card>
      
      {/* Only show the visualization once processing is complete and we have data */}
      {parsedData && showCharts && !error && !processingFile && (
        <div className="mt-8">
          {/* Chart Selection Panel */}
          <ChartSelectionPanel 
            availableCharts={availableCharts}
            selectedCharts={selectedCharts}
            onSelectionChange={handleChartSelectionChange}
          />

          {/* Generic Heatmap Preview */}
          <GenericHeatmapPreview parsedData={parsedData} />

          {/* EnhancedDataPreview */}
          <EnhancedDataPreview
            parsedData={parsedData}
            handleDownload={handleDownload}
          />
          
          {/* Bar Chart */}
          {selectedCharts.bar && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
                  Bar Chart
                </CardTitle>
                <CardDescription>
                  {availableCharts.bar 
                    ? 'Categorical breakdown of numerical values'
                    : 'No suitable categorical and numerical data found'}
                </CardDescription>
                </CardHeader>
                  <CardContent>
                <div className="h-72 w-full">
                  {isValidChartData(data.barChart) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.barChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12 }}
                          label={{ value: firstCatCol, position: 'insideBottom' }}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={(value) => [`${value}`, firstNumCol]}
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '8px',
                            padding: '10px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #f0f0f0'
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="value"
                          name={firstNumCol}
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                          animationDuration={800}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full w-full border border-dashed border-gray-300 rounded-lg">
                      <div className="text-center text-gray-500">
                        <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-600 font-medium">No bar chart data available</p>
                        <p className="text-sm mt-2 max-w-md mx-auto">
                          The data may not contain suitable categorical and numerical values for charting
                        </p>
                      </div>
                    </div>
                  )}
                  </div>
                </CardContent>
              </Card>
          )}
          
          {/* Line Chart */}
          {selectedCharts.line && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <TrendingUp className="h-5 w-5 mr-2 text-emerald-500" />
                  Line Chart
                </CardTitle>
                <CardDescription>
                  {availableCharts.line 
                    ? 'Time series or sequential data visualization'
                    : 'No suitable time series data found'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  {isValidChartData(data.lineChart) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.lineChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12 }}
                          label={{ value: firstDateCol, position: 'insideBottom' }}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          label={{ value: firstNumCol, angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip
                          formatter={(value) => [`${value}`, firstNumCol]}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '8px',
                            padding: '10px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #f0f0f0'
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          name={firstNumCol}
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ stroke: '#047857', strokeWidth: 2, r: 4, fill: 'white' }}
                          activeDot={{ r: 6, stroke: '#047857', strokeWidth: 2, fill: '#10b981' }}
                          animationDuration={1000}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full w-full border border-dashed border-gray-300 rounded-lg">
                      <div className="text-center text-gray-500">
                        <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-600 font-medium">No line chart data available</p>
                        <p className="text-sm mt-2 max-w-md mx-auto">
                          The data may not contain suitable time series or sequential data for charting
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Donut Chart */}
          {/* {selectedCharts.donut && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <PieChartIcon className="h-5 w-5 mr-2 text-amber-500" />
                  Donut Chart
                </CardTitle>
                <CardDescription>
                  {availableCharts.donut 
                    ? 'Distribution and proportion visualization'
                    : 'No suitable categorical data found'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  {isValidChartData(data.donutChart) ? (
                    <DonutChart data={data.donutChart} />
                  ) : (
                    <div className="flex items-center justify-center h-full w-full border border-dashed border-gray-300 rounded-lg">
                      <div className="text-center text-gray-500">
                        <PieChartIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-600 font-medium">No donut chart data available</p>
                        <p className="text-sm mt-2 max-w-md mx-auto">
                          The data may not contain suitable categorical values for distribution visualization
                        </p>
                  </div>
                </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )} */}
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
    </div>
  );
} 