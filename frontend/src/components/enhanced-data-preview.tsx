"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, BarChart2, LineChart as LineChartIcon, PieChart as PieChartIcon, Table as TableIcon, ArrowUpDown, AreaChart as AreaChartIcon, Circle, HelpCircle } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip as ShadTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import * as htmlToImage from "html-to-image"

// <<< Add formatNumber helper function here >>>
const formatNumber = (num: number | string): string => {
  const numericValue = typeof num === 'string' ? parseFloat(num.replace(/[^\d.-]/g, '')) : num;
  if (isNaN(numericValue)) return 'N/A'; // Handle non-numeric inputs gracefully

  if (Math.abs(numericValue) >= 1000000) {
    return (numericValue / 1000000).toFixed(1) + "M";
  }
  if (Math.abs(numericValue) >= 1000) {
    return (numericValue / 1000).toFixed(1) + "k";
  }
  if (Math.abs(numericValue) < 1 && Math.abs(numericValue) > 0) {
    return numericValue.toFixed(2);
  }
  return numericValue.toFixed(0);
};

// Color palette for charts
const CHART_COLORS = [
  "#0ea5e9", // sky-500
  "#f97316", // orange-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#f59e0b", // amber-500
  "#06b6d4", // cyan-500
  "#ef4444", // red-500
]

interface EnhancedDataPreviewProps {
  parsedData: {
    headers: string[];
    tableData: Record<string, any>[];
    metadata: {
      columns?: string[];
      numericalColumns?: string[];
      categoricalColumns?: string[];
      dateColumns?: string[];
      yearColumns?: string[];
    } | null;
  } | null;
  handleDownload: () => void;
  categoryField: string | null;
  valueField: string | null;
  setCategoryField: (field: string) => void;
  setValueField: (field: string) => void;
}

// --- NEW Paginated Table Sub-component ---
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
      <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10"> {/* Make controls sticky */}
        <h3 className="font-medium text-sm whitespace-nowrap">Data Preview</h3> {/* Prevent wrapping */}
        <div className="flex items-center gap-4">
          {/* Column Pagination */}
          {totalColumnHeaders > columnsPerPage && (
            <div className="flex items-center gap-2">
              <button onClick={handlePrevColumns} disabled={columnPage === 0} className={`text-xs px-2 py-1 rounded border ${columnPage === 0 ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}>←</button>
              <span className="text-xs text-gray-500 whitespace-nowrap">Cols {columnPage * columnsPerPage + 1}-{Math.min((columnPage + 1) * columnsPerPage, totalColumnHeaders)}</span>
              <button onClick={handleNextColumns} disabled={columnPage >= totalColumnPages - 1} className={`text-xs px-2 py-1 rounded border ${columnPage >= totalColumnPages - 1 ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}>→</button>
            </div>
          )}
           {/* Row Pagination */}
          {totalRows > rowsPerPage && (
              <div className="flex items-center gap-2">
                <button onClick={handlePrevRows} disabled={rowPage === 0} className={`text-xs px-2 py-1 rounded border ${rowPage === 0 ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}>↑</button>
                <span className="text-xs text-gray-500 whitespace-nowrap">Rows {rowPage * rowsPerPage + 1}-{Math.min((rowPage + 1) * rowsPerPage, totalRows)}</span>
                <button onClick={handleNextRows} disabled={rowPage >= totalRowPages - 1} className={`text-xs px-2 py-1 rounded border ${rowPage >= totalRowPages - 1 ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}>↓</button>
              </div>
          )}
        </div>
      </div>

      {/* Ensure no whitespace directly inside table/thead */}
      <table className="w-full text-sm text-left text-gray-700 min-w-[600px]"><thead className="text-xs text-gray-800 uppercase bg-gray-100 sticky top-[49px] z-10"><tr>
            {currentColumns.map((header: string, index: number) => (
              <th key={index} scope="col" className="px-3 py-2 border-b border-r border-gray-200 whitespace-nowrap"> {/* Prevent header wrapping */}
                {header}
              </th>
            ))}
          </tr></thead><tbody>
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
                  <td key={colIndex} className="px-3 py-1.5 border-r border-gray-200 whitespace-normal break-words"> {/* Allow wrapping and break words */}
                    {row[header]?.toString() || '-'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody></table>

      <div className="py-2 px-4 text-center text-xs text-gray-500 border-t border-gray-200 bg-gray-50 rounded-b-md sticky bottom-0 z-10"> {/* Make footer sticky */}
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

export default function EnhancedDataPreview({ parsedData, handleDownload, categoryField, valueField, setCategoryField, setValueField }: EnhancedDataPreviewProps) {
  const [activeTab, setActiveTab] = useState("bar")
  const [scatterXField, setScatterXField] = useState<string | null>(null)
  const [scatterYField, setScatterYField] = useState<string | null>(null)
  const tabsContentContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const { potentialCategoryColumns, potentialValueColumns } = useMemo(() => {
    const headers = parsedData?.headers || [];
    return {
      potentialCategoryColumns: headers,
      potentialValueColumns: headers 
    };
  }, [parsedData]);

  useEffect(() => {
    if (parsedData?.tableData && parsedData.tableData.length > 0) {
      const headers = parsedData.headers;
      const defaultScatterX = headers.length > 0 ? headers[0] : null;
      const defaultScatterY = headers.length > 1 ? headers[1] : defaultScatterX;
      if (!scatterXField || !headers.includes(scatterXField)) {
        setScatterXField(defaultScatterX);
      }
      if (!scatterYField || !headers.includes(scatterYField)) {
        setScatterYField(defaultScatterY);
      }
    } else {
        setScatterXField(null);
        setScatterYField(null);
    }
  }, [parsedData?.headers, parsedData?.tableData]);

  // Sync scatter plot axes with main dropdowns
  useEffect(() => {
    setScatterXField(categoryField);
    setScatterYField(valueField);
  }, [categoryField, valueField]);

  const chartData = useMemo(() => {
    if (!parsedData?.tableData || !categoryField || !valueField) {
      return [];
    }
    
    return parsedData.tableData.slice(0, 20).map(row => {
      const valueRaw = row[valueField];
      const value = typeof valueRaw === 'number'
        ? valueRaw
        : parseFloat(String(valueRaw || '0').replace(/[^\d.-]/g, '')) || 0;
        
      const name = row[categoryField]?.toString() || 'N/A';

      return { name, value };
    });
  }, [parsedData, categoryField, valueField]);

  const scatterData = useMemo(() => {
    if (!parsedData?.tableData || !scatterXField || !scatterYField) return [];
    
    return parsedData.tableData
      .slice(0, 50)
      .map(row => {
        const xValueRaw = row[scatterXField];
        const yValueRaw = row[scatterYField];

        const xValue = typeof xValueRaw === 'number'
          ? xValueRaw
          : parseFloat(String(xValueRaw || '0').replace(/[^\d.-]/g, '')) || 0;
        const yValue = typeof yValueRaw === 'number'
          ? yValueRaw
          : parseFloat(String(yValueRaw || '0').replace(/[^\d.-]/g, '')) || 0;
        
        const nameField = categoryField || parsedData.headers[0];
        const name = nameField && row[nameField] ? row[nameField].toString() : 'Point';
          
        return { x: xValue, y: yValue, name, z: 10 };
      })
      .filter(point => !isNaN(point.x) && !isNaN(point.y));
  }, [parsedData, scatterXField, scatterYField, categoryField]);

  const pieChartData = useMemo(() => {
    if (!parsedData?.tableData || !categoryField || !valueField) return [];
    
    const groupedData: Record<string, number> = {};
    
    parsedData.tableData.forEach(row => {
      const key = row[categoryField]?.toString() || 'N/A';
      const valueRaw = row[valueField];
      const value = typeof valueRaw === 'number'
        ? valueRaw
        : parseFloat(String(valueRaw || '0').replace(/[^\d.-]/g, '')) || 0;
        
      if (!isNaN(value)) {
        groupedData[key] = (groupedData[key] || 0) + value;
      }
    });
    
    const totalValue = Object.values(groupedData).reduce((sum, val) => sum + val, 0);
    if (totalValue === 0) return [];

    return Object.entries(groupedData)
      .map(([name, value]) => ({
        name,
        value: parseFloat(((value / totalValue) * 100).toFixed(2)),
        absoluteValue: value
      }))
      .sort((a, b) => b.absoluteValue - a.absoluteValue)
      .slice(0, 8);
  }, [parsedData, categoryField, valueField]);

  const hasValidData = parsedData?.tableData && parsedData.tableData.length > 0;

  // Chart download handler
  const handleDownloadChart = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(chartRef.current, { backgroundColor: '#fff', pixelRatio: 2 });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `chart-${activeTab}.png`;
      link.click();
    } catch (err) {
      alert('Failed to export chart image.');
    }
  };

  return (
    <Card
      className="mb-6 bg-white rounded-3xl shadow-2xl px-8 py-8 relative transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_16px_48px_0_rgba(60,72,100,0.20),0_4px_16px_0_rgba(60,72,100,0.14)] overflow-hidden border-none"
    >
      
      {/* Shiny angled glass streak */}
      <div className="absolute top-4 left-1/4 w-2/3 h-8 bg-white/30 rounded-full rotate-[18deg] pointer-events-none z-20" />
     
     
      {/* Card content sits above overlays */}
      <div className="relative z-20">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="flex items-center text-lg">
            <BarChart2 className="h-5 w-5 mr-2 text-sky-500" />
            Data Visualization
          </CardTitle>
          <CardDescription>
            {hasValidData
              ? `Visualizing ${Math.min(20, parsedData.tableData.length)} of ${parsedData.tableData.length} records`
              : 'No data available for visualization'}
          </CardDescription>
        </div>
        <div className="flex space-x-2">
          {hasValidData && activeTab !== 'table' && (
            <Button
              onClick={handleDownloadChart}
              variant="outline"
              className="h-9 px-3 border-gray-200 hover:bg-gray-50"
              disabled={!hasValidData || activeTab === 'table'}
              title="Download the current chart as an image"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Chart
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hasValidData ? (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {activeTab !== 'scatter' && activeTab !== 'table' && (
                  <>
                     <TooltipProvider>
                       <ShadTooltip delayDuration={100}>
                         <TooltipTrigger asChild>
                   <Select value={categoryField || ""} onValueChange={setCategoryField}>
                             <SelectTrigger className="w-[260px] h-10 bg-white border border-gray-300 shadow rounded-2xl px-4 focus:ring-2 focus:ring-sky-400 text-base font-medium text-gray-800 flex items-center transition-all duration-200">
                               <div className="flex items-center overflow-hidden whitespace-nowrap w-full">
                                 <span className="mr-2 flex-shrink-0">🔠</span>
                                 <SelectValue placeholder="Category" className="text-ellipsis overflow-hidden w-full" />
                       </div>
                      </SelectTrigger>
                             <SelectContent className="z-[200] min-w-[260px] w-full bg-white border border-gray-200 shadow-2xl rounded-2xl py-2 px-1 mt-2" side="bottom" align="start">
                               {potentialCategoryColumns.map((header, index, arr) => (
                                 <SelectItem
                                   key={`cat-${header}`}
                                   value={header}
                                   className={classNames(
                                     "truncate px-4 py-3 text-base text-gray-800 hover:bg-sky-50 focus:bg-sky-100 data-[state=checked]:bg-sky-50 rounded-xl transition-all duration-150",
                                     index !== arr.length - 1 && "border-b border-slate-100"
                                   )}
                                 >
                                   {header}
                                 </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                         </TooltipTrigger>
                         <TooltipContent side="bottom" align="start" className="bg-gray-800 text-white p-2 rounded text-xs">
                           <p>{categoryField || "Select category column"}</p>
                         </TooltipContent>
                       </ShadTooltip>
                     </TooltipProvider>
                     
                     <TooltipProvider>
                       <ShadTooltip delayDuration={100}>
                         <TooltipTrigger asChild>
                   <Select value={valueField || ""} onValueChange={setValueField}>
                             <SelectTrigger className="w-[260px] h-10 bg-white border border-gray-300 shadow rounded-2xl px-4 focus:ring-2 focus:ring-sky-400 text-base font-medium text-gray-800 flex items-center transition-all duration-200">
                               <div className="flex items-center overflow-hidden whitespace-nowrap w-full">
                                 <span className="mr-2 flex-shrink-0">🔢</span>
                                 <SelectValue placeholder="Value" className="text-ellipsis overflow-hidden w-full" />
                       </div>
                      </SelectTrigger>
                             <SelectContent className="z-[200] min-w-[260px] w-full bg-white border border-gray-200 shadow-2xl rounded-2xl py-2 px-1 mt-2" side="bottom" align="start">
                               {potentialValueColumns.map((header, index, arr) => (
                                 <SelectItem
                                   key={`val-${header}`}
                                   value={header}
                                   className={classNames(
                                     "truncate px-4 py-3 text-base text-gray-800 hover:bg-sky-50 focus:bg-sky-100 data-[state=checked]:bg-sky-50 rounded-xl transition-all duration-150",
                                     index !== arr.length - 1 && "border-b border-slate-100"
                                   )}
                                 >
                                   {header}
                                 </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                         </TooltipTrigger>
                         <TooltipContent side="bottom" align="start" className="bg-gray-800 text-white p-2 rounded text-xs">
                           <p>{valueField || "Select value column"}</p>
                         </TooltipContent>
                       </ShadTooltip>
                     </TooltipProvider>

                    <TooltipProvider>
                      <ShadTooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-5 w-5 text-gray-400 cursor-help mt-2 ml-1" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs bg-gray-800 text-white p-2 rounded text-xs">
                          <p>Select a text/date column for categories and a number column for values.</p>
                        </TooltipContent>
                      </ShadTooltip>
                    </TooltipProvider>
                  </>
                )}
                
              {activeTab === 'scatter' && (
                  <>
                      <TooltipProvider>
                        <ShadTooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                    <Select value={scatterXField || ""} onValueChange={setScatterXField}>
                              <SelectTrigger className="w-[260px] h-10 bg-white border border-gray-300 shadow rounded-2xl px-4 focus:ring-2 focus:ring-sky-400 text-base font-medium text-gray-800 flex items-center transition-all duration-200">
                                <div className="flex items-center overflow-hidden whitespace-nowrap w-full">
                                  <span className="mr-2 flex-shrink-0">X: 🔢</span>
                                  <SelectValue placeholder="X-Axis Value" className="text-ellipsis overflow-hidden w-full" />
                       </div>
                      </SelectTrigger>
                              <SelectContent className="z-[200] min-w-[260px] w-full bg-white border border-gray-200 shadow-2xl rounded-2xl py-2 px-1 mt-2" side="bottom" align="start">
                                {potentialValueColumns.map((header, index, arr) => (
                                  <SelectItem
                                    key={`scatter-x-${header}`}
                                    value={header}
                                    className={classNames(
                                      "truncate px-4 py-3 text-base text-gray-800 hover:bg-sky-50 focus:bg-sky-100 data-[state=checked]:bg-sky-50 rounded-xl transition-all duration-150",
                                      index !== arr.length - 1 && "border-b border-slate-100"
                                    )}
                                  >
                                    {header}
                                  </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" align="start" className="bg-gray-800 text-white p-2 rounded text-xs">
                            <p>{scatterXField || "Select X-axis column"}</p>
                          </TooltipContent>
                        </ShadTooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <ShadTooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                    <Select value={scatterYField || ""} onValueChange={setScatterYField}>
                              <SelectTrigger className="w-[260px] h-10 bg-white border border-gray-300 shadow rounded-2xl px-4 focus:ring-2 focus:ring-sky-400 text-base font-medium text-gray-800 flex items-center transition-all duration-200">
                                <div className="flex items-center overflow-hidden whitespace-nowrap w-full">
                                  <span className="mr-2 flex-shrink-0">Y: 🔢</span>
                                  <SelectValue placeholder="Y-Axis Value" className="text-ellipsis overflow-hidden w-full" />
                       </div>
                      </SelectTrigger>
                              <SelectContent className="z-[200] min-w-[260px] w-full bg-white border border-gray-200 shadow-2xl rounded-2xl py-2 px-1 mt-2" side="bottom" align="start">
                                {potentialValueColumns.map((header, index, arr) => (
                                  <SelectItem
                                    key={`scatter-y-${header}`}
                                    value={header}
                                    className={classNames(
                                      "truncate px-4 py-3 text-base text-gray-800 hover:bg-sky-50 focus:bg-sky-100 data-[state=checked]:bg-sky-50 rounded-xl transition-all duration-150",
                                      index !== arr.length - 1 && "border-b border-slate-100"
                                    )}
                                  >
                                    {header}
                                  </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" align="start" className="bg-gray-800 text-white p-2 rounded text-xs">
                            <p>{scatterYField || "Select Y-axis column"}</p>
                          </TooltipContent>
                        </ShadTooltip>
                      </TooltipProvider>
                   <TooltipProvider>
                      <ShadTooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-5 w-5 text-gray-400 cursor-help mt-2 ml-1" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs bg-gray-800 text-white p-2 rounded text-xs">
                          <p>Select two number columns for the scatter plot axes.</p>
                        </TooltipContent>
                      </ShadTooltip>
                    </TooltipProvider>
                  </>
                )}
              </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList>
                  <TabsTrigger value="bar" className="flex items-center">
                    <BarChart2 className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Bar</span>
                  </TabsTrigger>
                  <TabsTrigger value="line" className="flex items-center">
                    <LineChartIcon className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Line</span>
                  </TabsTrigger>
                  <TabsTrigger value="area" className="flex items-center">
                    <AreaChartIcon className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Area</span>
                  </TabsTrigger>
                  <TabsTrigger value="pie" className="flex items-center">
                    <PieChartIcon className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Pie</span>
                  </TabsTrigger>
                  <TabsTrigger value="scatter" className="flex items-center">
                    <Circle className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Scatter</span>
                  </TabsTrigger>
                  <TabsTrigger value="table" className="flex items-center">
                    <TableIcon className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Table</span>
                  </TabsTrigger>
              </TabsList>
              
                <div ref={tabsContentContainerRef} className="p-1 mt-2">
                  {/* Wrap chart content in a div with ref for export */}
                  <div ref={chartRef} className="bg-white rounded-2xl">
                    <TabsContent value="bar" className="mt-0">
                      <div className="h-[400px] w-full">
                        {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={chartData}
                              margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="name" 
                              angle={-45} 
                              textAnchor="end"
                                height={70}
                                tick={{ fontSize: 11 }}
                                label={{ value: categoryField || 'Category', position: 'insideBottom', dy: 10, fontSize: 12 }}
                            />
                            <YAxis 
                              tick={{ fontSize: 11 }} 
                                label={{ value: valueField || 'Value', angle: -90, position: 'insideLeft', dx: -5, fontSize: 12 }}
                              domain={['auto', 'auto']}
                              allowDataOverflow={true}
                              tickFormatter={(value) => formatNumber(value)}
                            />
                            <Tooltip 
                              formatter={(value, name, props) => [
                                  `${formatNumber(value as number)}`,
                                  valueField || 'Value'
                              ]}
                                labelFormatter={(label) => label}
                              contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                borderRadius: '8px',
                                padding: '10px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                border: '1px solid #f0f0f0'
                              }}
                            />
                            <Legend 
                                verticalAlign="top"
                              wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} 
                            />
                            <Bar 
                              dataKey="value" 
                                name={valueField || "Value"}
                              fill={CHART_COLORS[0]} 
                              radius={[4, 4, 0, 0]} 
                              maxBarSize={60}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            Select a Text/Date column for Category (🔠) and a Number column for Value (🔢).
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="line" className="mt-0">
                       <div className="h-[400px] w-full">
                        {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="name" 
                              angle={-45} 
                              textAnchor="end"
                              height={70}
                              tick={{ fontSize: 11 }}
                                label={{ value: categoryField || 'Category', position: 'insideBottom', dy: 10, fontSize: 12 }}
                            />
                            <YAxis 
                              tick={{ fontSize: 11 }}
                                label={{ value: valueField || 'Value', angle: -90, position: 'insideLeft', dx: -5, fontSize: 12 }}
                              domain={['auto', 'auto']}
                              allowDataOverflow={true}
                              tickFormatter={(value) => formatNumber(value)}
                            />
                            <Tooltip 
                              formatter={(value, name, props) => [
                                  `${formatNumber(value as number)}`,
                                  valueField || 'Value'
                              ]}
                              labelFormatter={(label) => label}
                              contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                borderRadius: '8px',
                                padding: '10px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                border: '1px solid #f0f0f0'
                              }}
                            />
                            <Legend 
                                verticalAlign="top"
                              wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} 
                            />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                                name={valueField || "Value"}
                              stroke={CHART_COLORS[0]} 
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                        ) : (
                           <div className="flex items-center justify-center h-full text-gray-500">
                             Select a Text/Date column for Category (🔠) and a Number column for Value (🔢).
                           </div>
                        )}
                      </div>             
                    </TabsContent>
                    
                    <TabsContent value="area" className="mt-0">
                       <div className="h-[400px] w-full">
                         {chartData.length > 0 ? (
                         <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="name" 
                              angle={-45} 
                              textAnchor="end"
                              height={70}
                              tick={{ fontSize: 11 }}
                                label={{ value: categoryField || 'Category', position: 'insideBottom', dy: 10, fontSize: 12 }}
                            />
                            <YAxis 
                              tick={{ fontSize: 11 }}
                                label={{ value: valueField || 'Value', angle: -90, position: 'insideLeft', dx: -5, fontSize: 12 }}
                              domain={['auto', 'auto']}
                              allowDataOverflow={true}
                              tickFormatter={(value) => formatNumber(value)}
                            />
                            <Tooltip 
                              formatter={(value, name, props) => [
                                  `${formatNumber(value as number)}`,
                                  valueField || 'Value'
                              ]}
                              labelFormatter={(label) => label}
                              contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                borderRadius: '8px',
                                padding: '10px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                border: '1px solid #f0f0f0'
                              }}
                            />
                            <Legend 
                                verticalAlign="top"
                              wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} 
                            />
                            <Area 
                              type="monotone" 
                              dataKey="value" 
                                name={valueField || "Value"}
                              stroke={CHART_COLORS[0]} 
                              fill={CHART_COLORS[0]} 
                              fillOpacity={0.3}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                        ) : (
                           <div className="flex items-center justify-center h-full text-gray-500">
                             Select a Text/Date column for Category (🔠) and a Number column for Value (🔢).
                           </div>
                        )}
                       </div>             
                    </TabsContent>
                    
                    <TabsContent value="pie" className="mt-0">
                      <div className="h-[400px] w-full">
                        {pieChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 20, right: 40, bottom: 60, left: 40 }}>
                            <Pie
                              data={pieChartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false} 
                                outerRadius={100}
                              innerRadius={50}  
                              fill="#8884d8"
                              dataKey="value"
                              nameKey="name"  
                              label={({ value }) => `${(value as number).toFixed(1)}%`}
                            >
                              {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value, name, props) => [
                                  `${formatNumber(props.payload?.absoluteValue)} (${(value as number).toFixed(1)}%)`,
                                  valueField || 'Value'
                              ]}
                              labelFormatter={(label) => label}
                            />
                            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', marginTop: '15px' }} /> 
                          </PieChart>
                        </ResponsiveContainer>
                        ) : (
                           <div className="flex items-center justify-center h-full text-gray-500">
                             Select a Text/Date column for Category (🔠) and a Number column for Value (🔢).
                           </div>
                        )}
                      </div>
                    </TabsContent>
                    
                      <TabsContent value="scatter" className="mt-0">
                        <div className="h-[400px] w-full">
                          {scatterData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart
                                margin={{ top: 20, right: 30, bottom: 70, left: 20 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                type="number"
                                dataKey="x"
                                name={scatterXField || "X"}
                                  label={{ value: scatterXField || 'X-Axis', position: 'insideBottom', dy: 10, fontSize: 12 }}
                                tick={{ fontSize: 11 }}
                                  tickFormatter={(value) => formatNumber(value)}
                              />
                              <YAxis
                                type="number"
                                dataKey="y"
                                name={scatterYField || "Y"}
                                  label={{ value: scatterYField || 'Y-Axis', angle: -90, position: 'insideLeft', dx: -5, fontSize: 12 }}
                                tick={{ fontSize: 11 }}
                                tickFormatter={(value) => formatNumber(value)}
                              />
                              <Tooltip
                                formatter={(value, name, props) => {
                                     const pointName = props.payload?.name || 'Point';
                                     const xVal = formatNumber(props.payload?.x);
                                     const yVal = formatNumber(props.payload?.y);
                                     return [`X: ${xVal}, Y: ${yVal}`, pointName];
                                }}
                                   labelFormatter={(label) => ''}
                                   cursor={{ strokeDasharray: '3 3' }}
                                contentStyle={{ 
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                  borderRadius: '8px',
                                  padding: '10px',
                                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                  border: '1px solid #f0f0f0'
                                }}
                              />
                              <Legend 
                                verticalAlign="top" 
                                wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} 
                                  payload={[{ value: `${scatterXField || 'X'} vs ${scatterYField || 'Y'}`, color: CHART_COLORS[0] }]}
                              />
                              <Scatter
                                name={`${scatterXField || 'X'} vs ${scatterYField || 'Y'}`}
                                data={scatterData}
                                fill={CHART_COLORS[0]}
                              />
                            </ScatterChart>
                          </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                              Please select two Number columns for the X and Y axes.
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      
                  </div>
                  {/* Table tab remains outside chartRef */}
                  <TabsContent value="table" className="mt-0">
                    <div className="border border-gray-200 rounded-md overflow-x-auto">
                      <PaginatedTable headers={parsedData?.headers || []} tableData={parsedData?.tableData || []} />
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] bg-gray-50 rounded-md border border-dashed border-gray-200">
              <BarChart2 className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-center">No data available for visualization</p>
              <p className="text-gray-400 text-sm text-center mt-1">Upload a file or select processed data</p>
            </div>
          )}
        </CardContent>
        </div>
    </Card>
  )
} 