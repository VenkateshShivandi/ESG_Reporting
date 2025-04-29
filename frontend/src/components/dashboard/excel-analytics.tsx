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
// @ts-ignore - XLSX might not be type-safe but it's used conditionally
import * as XLSX from 'xlsx'; 
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

// Try to ensure XLSX is available
let XLSXModule: any = XLSX;
try {
  if (!XLSXModule) {
    // @ts-ignore
    XLSXModule = require('xlsx');
    console.log('XLSX loaded via require');
  }
} catch (e) {
  console.warn('XLSX library not available via require. Will use alternative approach.');
}

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

// Helper function to detect if a value is numeric
const isNumeric = (value: any): boolean => {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'number') return true;
  if (typeof value === 'string') {
    // Try to remove currency symbols, commas, and other formatting
    const cleanValue = value.replace(/[$£€,\s%]/g, '');
    return !isNaN(parseFloat(cleanValue)) && isFinite(Number(cleanValue));
  }
  return false;
};

// Helper function to detect if a column is likely categorical
const isCategorical = (values: any[]): boolean => {
  if (values.length < 1) return false;
  
  // Remove empty values
  const nonEmptyValues = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonEmptyValues.length < 1) return false;
  
  // Get unique values
  const uniqueValues = new Set(nonEmptyValues);
  
  // If many values are dates, not categorical
  const dateCount = nonEmptyValues.filter(v => {
    if (typeof v === 'string') {
      // Try to parse as date
      const parsed = parseDate(v, 'yyyy-MM-dd', new Date());
      return isDateValid(parsed);
    }
    return false;
  }).length;
  
  if (dateCount > nonEmptyValues.length * 0.5) {
    return false;
  }
  
  // Consider a column categorical if it has:
  // 1. Few unique values relative to total rows (less than 30% unique)
  // 2. Or has less than 20 unique values total
  return (
    uniqueValues.size > 1 && 
    (uniqueValues.size < nonEmptyValues.length * 0.3 || uniqueValues.size < 20)
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
  const [identifiedColumns, setIdentifiedColumns] = useState<{
    categorical: string[];
    numerical: string[];
  }>({
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

  // Function to fetch and parse Excel file directly from Supabase
  const fetchExcelFileDirectly = async (fileName: string, fileIndex: number) => {
    // fileIndex is no longer strictly needed for download but kept for logging/context
    try {
      setProcessingFile(true);
      setShowCharts(false);
    setError(null);
    
      console.log(`Attempting to download ${selectedFileType} file from Supabase:`, fileName, 'with index:', fileIndex);
      setProcessingMessage(`Requesting download URL for ${selectedFileType} file...`);
      
      let fileData: Blob;
      try {
          // === Get Auth Token ===
          const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
          if (sessionError || !sessionData?.session) {
              console.error('Error getting user session:', sessionError);
              throw new Error('Authentication error: Could not retrieve user session.');
          }
          const accessToken = sessionData.session.access_token;
          // === End Get Auth Token ===

          // 1. Get the signed download URL from our backend
          // Ensure backendUrl is defined in the component scope or imported
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5050'; // Assuming it might be needed if not defined above
          const encodedFileName = encodeURIComponent(fileName);
          const signedUrlEndpoint = `${backendUrl}/api/files/${encodedFileName}/download`;
          console.log('Fetching signed URL from:', signedUrlEndpoint);

          // === Add Auth Header ===
          const signedUrlResponse = await fetch(signedUrlEndpoint, {
              headers: {
                  'Authorization': `Bearer ${accessToken}`,
              },
          });
          // === End Add Auth Header ===

          if (!signedUrlResponse.ok) {
              let errorMsg = `Failed to get download URL (status: ${signedUrlResponse.status})`;
              try {
                  const errorJson = await signedUrlResponse.json();
                  errorMsg = errorJson.error || errorMsg;
              } catch (e) { /* Ignore if response is not JSON */ }
              console.error('Error fetching signed URL:', errorMsg);
              throw new Error(errorMsg);
          }

          const { url: signedUrl } = await signedUrlResponse.json();
          if (!signedUrl) {
              throw new Error('Backend did not return a valid download URL.');
          }
          console.log('Received signed URL:', signedUrl);

          // 2. Download the file directly from the signed Supabase URL
          setProcessingMessage(`Downloading ${selectedFileType} file...`);
          console.log('Fetching file directly from Supabase signed URL...');
          const fileResponse = await fetch(signedUrl);

          if (!fileResponse.ok) {
              throw new Error(`Failed to download file from Supabase (status: ${fileResponse.status})`);
          }

          fileData = await fileResponse.blob();
          console.log('File downloaded successfully from signed URL.');
        
        // Update processing message after successful download
          setProcessingMessage(`Processing ${selectedFileType} data...`);

      } catch (downloadError) {
          console.error('Download process failed. File:', fileName, 'Error details:', downloadError);
          // Use a more user-friendly error message
          throw new Error(`Could not download file "${fileName}". Please verify the file exists and check console for details.`); 
      }
      
      // Log successful download and data info
      console.log('File downloaded successfully:', {
        type: fileData.type,
        size: fileData.size,
        fileName: fileName,
        fileIndex: fileIndex,
        fileType: selectedFileType
      });
      
      try {
        // Parse Excel or CSV data
        const data = await parseExcelData(fileData);
        
        // Process the raw data and generate charts
        processExcelData(data);
        
        // Success!
        setProcessingFile(false);
        setProcessingMessage(null);
        setSuccessMessage(`${selectedFileType.toUpperCase()} data analyzed successfully!`);
        
        // Show chart after a short delay for better UX
        setTimeout(() => {
      setShowCharts(true);
      
          // Clear success message after 3 seconds
          setTimeout(() => {
            setSuccessMessage(null);
          }, 3000);
        }, 500);
        
      } catch (error) {
        console.error('Error parsing Excel/CSV data:', error);
        setError(`Error analyzing ${selectedFileType} data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setProcessingFile(false);
        setProcessingMessage(null);
      }
    } catch (error) {
      console.error('Error in fetchExcelFileDirectly:', error);
      setError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setProcessingFile(false);
      setProcessingMessage(null);
    }
  };

  // Function to parse Excel data from a Blob
  const parseExcelData = async (fileData: Blob): Promise<any[]> => { // Return the full data array
    try {
      setProcessingMessage(`Parsing ${selectedFileType} file...`);
      
      // Create array buffer from blob
      const buffer = await fileData.arrayBuffer();
      
      // Check if XLSX is available
      if (!XLSXModule) {
        throw new Error("Excel processing library is not available");
      }
      
      let data: any[] = [];
      
      if (selectedFileType === 'excel') {
        // Parse Excel file
        const workbook = XLSXModule.read(buffer, { type: 'array' });
          
          // Get first sheet name
          const firstSheetName = workbook.SheetNames[0];
          
        // Get worksheet
          const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON - explicitly setting header: 1 ensures first row is treated as headers
        data = XLSXModule.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log('Excel data parsed:', {
          sheetCount: workbook.SheetNames.length,
          firstSheetName,
          rowCount: data.length
        });
      } else {
        // Parse CSV file
        // Convert array buffer to text
        const decoder = new TextDecoder('utf-8');
        const csvText = decoder.decode(buffer);
        
        // Use XLSX's CSV parser or Papa Parse if available
        if (XLSXModule.read) {
          const workbook = XLSXModule.read(csvText, { type: 'string' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          data = XLSXModule.utils.sheet_to_json(worksheet, { header: 1 });
        } else {
          // Simple CSV parser if XLSX's CSV parsing is not available
          data = csvText.split('\n').map(line => line.split(','));
        }
        
        console.log('CSV data parsed:', {
          rowCount: data.length,
          columnCount: data[0]?.length || 0
        });
      }
      
      // Process the data (identify columns, summarize, etc.)
      setProcessingMessage('Analyzing data patterns...');
      
      if (!data || data.length < 2) {
        throw new Error(`The ${selectedFileType} file does not contain enough data to analyze`);
      }
      
      // Get headers (first row) and ensure they are trimmed strings
      const headers = data[0].map((h: any) => String(h || '').trim());
      
      // Get data rows (skip header)
      const rows = data.slice(1);
      
      console.log('Data analysis in parseExcelData:', {
        headers,
        rowCount: rows.length,
        sampleRow: rows[0]
      });
      
      // Identify data types in each column HERE
      const columnTypes = {
        categorical: [] as string[],
        numerical: [] as string[]
      };
      
      headers.forEach((header: string, colIndex: number) => {
        // Get all values for this column
        const values = rows.map(row => row[colIndex]);
        
        // Check if column is numeric or categorical
        const hasNumericValues = values.some(v => isNumeric(v));
        // Use stricter check: majority non-empty values should be numeric OR very few unique values if not numeric
        const isLikelyNumeric = hasNumericValues && !isCategorical(values); 
        
        if (isLikelyNumeric) {
            columnTypes.numerical.push(header);
        } else if (isCategorical(values)) { // Use isCategorical for the else if
            columnTypes.categorical.push(header);
        }
        // Note: Columns that are neither strongly numeric nor categorical might be ignored for Y-axis
      });
      
      console.log('Column types identified in parseExcelData:', columnTypes);
      setIdentifiedColumns(columnTypes); // Set state here
      
      return data; // Return the FULL data array (headers + rows)
    } catch (error) {
      console.error(`Error parsing ${selectedFileType} file:`, error);
      setError(`Error parsing ${selectedFileType} file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIdentifiedColumns({ categorical: [], numerical: [] }); // Reset on error
      throw error;
    }
  };

  // Function to process the Excel data and identify column types
  const processExcelData = (data: any[]) => { // Receives full data (headers + rows)
    try {
      if (!data || data.length < 2) {
        throw new Error(`The ${selectedFileType} file does not contain enough data to analyze.`);
      }
      
      // Get headers (first row) - Now correctly extracted as data[0]
      const allHeaders: string[] = data[0].map((h: any) => String(h || '').trim());
      console.log('Extracted Headers in processExcelData:', allHeaders);
      
      // Get data rows (skip header)
      const rows = data.slice(1);
      
      // --- Column Identification is now done in parseExcelData ---
      // We'll rely on the `identifiedColumns` state set previously.
      // We still need the list of numeric headers for analytics calculation.
      const numericHeaders = identifiedColumns.numerical; 
      console.log('Using Numerical Headers from state:', numericHeaders);

      // --- Calculate Analytics ONLY for Potentially Numeric Columns ---
      const analyticsData: Record<string, { total: number; average: number; min: number; max: number }> = {};

      numericHeaders.forEach(header => { // Iterate over numeric headers from state
        const colIndex = allHeaders.indexOf(header);
        if (colIndex === -1) {
            console.warn(`Numeric header "${header}" not found in extracted headers. Skipping analytics.`);
            return; 
        }

        console.log(`Calculating stats for numeric column: ${header} (idx ${colIndex}).`);
        
        const numericValues = rows
          .map(row => row[colIndex]) 
          .map(val => { // Robust conversion to number
              if (typeof val === 'number') return val;
              if (typeof val === 'string') {
                const cleanVal = val.replace(/[^\d.-]/g, ''); 
                const num = parseFloat(cleanVal);
                return isNaN(num) ? null : num; // Return null if parsing fails
              } 
              return null; // Not number or string
          })
          .filter((val): val is number => val !== null && isFinite(val)); // Filter out nulls, NaN, Infinity
        
        if (numericValues.length > 0) {
          const total = numericValues.reduce((sum, val) => sum + val, 0);
          const average = total / numericValues.length;
          const min = Math.min(...numericValues);
          const max = Math.max(...numericValues);
          
          analyticsData[header] = { total, average, min, max };
        } else {
            console.log(`No valid numeric values found for column ${header} after filtering to calculate stats.`);
        }
      });
      console.log('Calculated Analytics Data (for numeric columns):', analyticsData);
      
      // --- Basic Table Data (used for dynamic chart generation later) ---
      const tableData = rows.map((row, rowIndex) => {
        const obj: Record<string, any> = { id: rowIndex + 1 }; // Add an ID for potential key prop use
        allHeaders.forEach((header: string, i: number) => {
          obj[header] = row[i]; // Use actual header string as key
        });
        return obj;
      });

      // --- Update State --- 
      
      // `identifiedColumns` is already set by parseExcelData
      
      // Set parsedData with the essentials needed for user selection + stats table
    setParsedData({
        headers: allHeaders, // Keep original headers array
        // rows: rows, // We mostly use tableData now, rows might be redundant here
        tableData, // Pass the structured table data
        analytics: analyticsData, // Pass the stats for numeric columns
      });
      
      // IMPORTANT: Clear old chart-specific data that relied on auto-detection
    setChartData({
        bar: [],
        pie: []
    });
    setData({
        barChart: [],
        lineChart: [],
        donutChart: [],
        tableData: [] // This might be redundant if tableData in parsedData is used everywhere
      });
      // Also reset user selections when new data is processed
      setSelectedXAxisCol('');
      setSelectedYAxisCol('');
      setSelectedChartType('Line'); // Reset to default

      console.log('processExcelData completed. Updated parsedData state.');

      // Return the core processed data (though it mainly sets state now)
      return { 
          headers: allHeaders,
          tableData, 
          analytics: analyticsData,
          // No need to return potentiallyNumericHeaders as it's derived from state now
      };
      
    } catch (error) {
      console.error('Error processing data:', error);
      setError(`Error processing data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Clear potentially partially processed data on error
      setParsedData(null);
      // identifiedColumns should have been reset by parseExcelData's error handler
      setSelectedXAxisCol('');
      setSelectedYAxisCol('');
      throw error;
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
                  className="w-full md:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium shadow-lg shadow-emerald-200 dark:shadow-none hover:shadow-xl transition-all duration-200"
                  variant="default"
                >
                  {processingFile ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <div className="relative">
                        <div className="w-5 h-5 flex items-center justify-center mr-2">
                          <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center bg-opacity-30">
                            <div className="w-0 h-0 border-t-transparent border-t-8 border-b-transparent border-b-8 border-l-white border-l-[12px] ml-0.5"></div>
                          </div>
                        </div>
                      </div>
                      Analyze {selectedFileType === 'excel' ? 'Excel' : 'CSV'} Data
                    </>
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
          {/* Dynamic Chart Rendering - Modified to be more flexible with data types */}
          {selectedXAxisCol && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{selectedChartType} Chart</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[320px] w-full">
                  {(() => {
                    // Pre-compute chart data with more flexibility for different data types
                    let chartData;
                    
                    if (selectedChartType === 'Donut') {
                      // For Donut charts, we group by X-axis and count occurrences
                      // or sum Y-axis values if available
                      chartData = parsedData.tableData.reduce((acc: any[], row: Record<string, any>) => {
                        const key = String(row[selectedXAxisCol] || 'Undefined');
                        
                        // If Y-axis is selected and it's a number, use it as the value
                        const yValue = selectedYAxisCol && selectedYAxisCol !== 'none' ? 
                          (parseFloat(String(row[selectedYAxisCol])) || 0) : 
                          1; // Default to 1 for counting
                        
                        const existing = acc.find(i => i.name === key);
                        if (existing) {
                          existing.value += yValue;
                        } else {
                          acc.push({ name: key, value: yValue });
                        }
                        return acc;
                      }, []);
                    } else {
                      // For Line and Bar charts
                      chartData = parsedData.tableData.map((row: Record<string, any>) => {
                        const item: { name: string; value: number } = {
                          name: String(row[selectedXAxisCol] || 'Undefined'),
                          value: 0
                        };
                        
                        // If Y-axis is selected and it's a number, use it
                        if (selectedYAxisCol && selectedYAxisCol !== 'none') {
                          const rawValue = row[selectedYAxisCol];
                          item.value = parseFloat(String(rawValue)) || 0;
                        } else {
                          // If no Y-axis, for numeric X-axis use that value, otherwise default to 1
                          const xValue = parseFloat(String(row[selectedXAxisCol]));
                          item.value = !isNaN(xValue) ? xValue : 1;
                        }
                        
                        return item;
                      });
                    }
                    
                    console.log('Generated chart data:', chartData);
                    
                    // Pre-compute the chart component to render
                    let chartComponent;
                    if (selectedChartType === 'Line') {
                      chartComponent = (
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            name={selectedYAxisCol || 'Value'} 
                            stroke="#10b981" 
                            activeDot={{ r: 8 }} 
                          />
                        </LineChart>
                      );
                    } else if (selectedChartType === 'Bar') {
                      chartComponent = (
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar 
                            dataKey="value" 
                            name={selectedYAxisCol || 'Value'}
                            fill="#2563eb" 
                          />
                        </BarChart>
                      );
                    } else {
                      chartComponent = (
                        <PieChart>
                          <Pie
                            data={chartData}
                            dataKey="value" 
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#10b981"
                            label={({ name, percent }) => 
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {chartData.map((entry: any, index: number) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={`hsl(${index * 25 % 360}, 70%, 50%)`} 
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value}`, selectedYAxisCol || 'Count']} />
                          <Legend />
                        </PieChart>
                      );
                    }
                    
                    // Return appropriate chart wrapped in ResponsiveContainer
                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        {chartComponent}
                      </ResponsiveContainer>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
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

      {/* Chart Configuration Section - Fix dropdowns */}
      {parsedData && showCharts && !error && !processingFile && (
        <div className="mt-5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                  Chart Configuration
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Select the chart type and data columns to create your visualization
                </p>
            </div>
              <Badge className="mt-2 md:mt-0 bg-blue-100 text-blue-700 hover:bg-blue-200 py-1.5 px-3">
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                Data Ready for Visualization
              </Badge>
              </div>
            </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Chart Type */}
              <div>
                <Label htmlFor="chart-type-select" className="block mb-1">Chart Type</Label>
                <Select value={selectedChartType} onValueChange={setSelectedChartType}>
                  {/* @ts-ignore */}
                  <Fragment>
                  <SelectTrigger id="chart-type-select" className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm">
                    <SelectValue placeholder="Select chart type">{selectedChartType}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md rounded-md overflow-hidden z-50">
                    {['Line','Bar','Donut'].map((type, index) => (
                      <SelectItem 
                        key={`chart-type-${index}-${type}`} 
                        value={type}
                        className="hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors cursor-pointer py-1.5"
                      >
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                  </Fragment>
                </Select>
              </div>
              {/* X Axis - Only show actual column headers */}
              <div>
                <Label htmlFor="x-axis-select" className="block mb-1">X Axis</Label>
                <Select value={selectedXAxisCol} onValueChange={setSelectedXAxisCol}>
                  {/* @ts-ignore */}
                  <Fragment>
                  <SelectTrigger id="x-axis-select" className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm">
                    <SelectValue placeholder="Select X axis">{selectedXAxisCol}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md rounded-md overflow-hidden z-50">
                    {parsedData?.headers?.filter(header => header && header.trim() !== '')
                      .map((header: string, index: number) => (
                      <SelectItem 
                        key={`x-axis-${index}-${header}`} 
                        value={header}
                        className="hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors cursor-pointer py-1.5"
                      >
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                  </Fragment>
                </Select>
            </div>
              {/* Y Axis (optional for all chart types now) - Only show numerical column headers */}
              <div>
                <Label htmlFor="y-axis-select" className="block mb-1">Y Axis (Optional)</Label>
                <Select value={selectedYAxisCol} onValueChange={setSelectedYAxisCol}>
                  {/* @ts-ignore */}
                  <Fragment>
                  <SelectTrigger id="y-axis-select" className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm">
                    <SelectValue placeholder="Select Y axis (optional)">{selectedYAxisCol}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md rounded-md overflow-hidden z-50">
                    <SelectItem 
                      key="y-axis-none" 
                      value="none"
                      className="hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors cursor-pointer py-1.5"
                    >
                      None (Auto-calculate)
                    </SelectItem>
                    {identifiedColumns.numerical?.filter(Boolean).map((header: string, index: number) => (
                      <SelectItem 
                        key={`y-axis-${index}-${header}`} 
                        value={header}
                        className="hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors cursor-pointer py-1.5"
                      >
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                  </Fragment>
                </Select>
              </div>
            </div>
            
            {/* Help text */}
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-start">
                <div className="mr-2 mt-0.5 bg-blue-100 p-1 rounded-full">
                  <Lightbulb className="h-3.5 w-3.5 text-blue-700" />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Tip:</span> Select chart type first, then select X-axis. 
                  For Line and Bar charts, you can optionally select a numeric Y-axis column.
                  If no Y-axis is selected, the system will count occurrences or use X-axis values if numeric.
                  For Donut charts, select a category column for X-axis and optionally a numeric column for Y-axis.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 