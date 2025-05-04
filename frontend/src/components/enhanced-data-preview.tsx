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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, BarChart2, LineChart as LineChartIcon, PieChart as PieChartIcon, Table as TableIcon, ArrowUpDown, AreaChart as AreaChartIcon, Circle } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// <<< Add formatNumber helper function here >>>
const formatNumber = (num: number): string => {
  if (isNaN(num)) return 'N/A'; // Handle non-numeric inputs gracefully
  if (Math.abs(num) >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (Math.abs(num) >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  if (Math.abs(num) < 1 && Math.abs(num) > 0) {
    return num.toFixed(2);
  }
  return num.toFixed(0);
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
    headers: string[]
    tableData: Record<string, any>[]
  } | null
  handleDownload: () => void
}

export default function EnhancedDataPreview({ parsedData, handleDownload }: EnhancedDataPreviewProps) {
  const [activeTab, setActiveTab] = useState("bar")
  const [xAxisField, setXAxisField] = useState<string | null>(null)
  const [yAxisField, setYAxisField] = useState<string | null>(null)
  const [pieField, setPieField] = useState<string | null>(null)
  const [scatterXField, setScatterXField] = useState<string | null>(null)
  const [scatterYField, setScatterYField] = useState<string | null>(null)
  const tabsContentContainerRef = useRef<HTMLDivElement>(null); // Ref for the container wrapping all TabsContent

  // Initialize selected fields when data is loaded
  useMemo(() => {
    if (parsedData?.headers && parsedData.headers.length > 0) {
      // Set default X axis to the first column
      setXAxisField(parsedData.headers[0])
      
      // Try to find a numeric column for Y axis
      const numericColumns = parsedData.headers.filter(header => {
        if (parsedData.tableData.length === 0) return false
        const value = parsedData.tableData[0][header]
        return typeof value === 'number' || !isNaN(Number(value))
      })
      
      const firstNumeric = numericColumns.length > 0 ? numericColumns[0] : parsedData.headers[1] || parsedData.headers[0];
      const secondNumeric = numericColumns.length > 1 ? numericColumns[1] : firstNumeric;
      
      setYAxisField(firstNumeric)
      setPieField(firstNumeric)
      
      // Set scatter plot fields to the first two numeric columns if available
      setScatterXField(firstNumeric)
      setScatterYField(secondNumeric)
    }
  }, [parsedData])

  // Prepare chart data - Use raw values for name
  const chartData = useMemo(() => {
    if (!parsedData?.tableData || !xAxisField || !yAxisField) return []
    
    return parsedData.tableData.slice(0, 20).map(row => {
      const yValue = typeof row[yAxisField] === 'number' 
        ? row[yAxisField] 
        : Number.parseFloat(String(row[yAxisField]).replace(/[^\d.-]/g, '')) || 0;
        
      return {
        name: row[xAxisField]?.toString() || 'N/A', // <<< Use raw string value
        value: yValue
      }
    })
  }, [parsedData, xAxisField, yAxisField])

  // Prepare scatter plot data
  const scatterData = useMemo(() => {
    if (!parsedData?.tableData || !scatterXField || !scatterYField) return [];
    
    // Safely access the data
    const safeXField = scatterXField || '';
    const safeYField = scatterYField || '';
    const safeNameField = xAxisField || '';
    
    return parsedData.tableData
      .slice(0, 50) // Show more data points for scatter plot
      .map(row => {
        // Safe access to the data fields
        const xValue = typeof row[safeXField] === 'number' 
          ? row[safeXField] 
          : Number.parseFloat(String(row[safeXField] || '0').replace(/[^\d.-]/g, '')) || 0;
          
        const yValue = typeof row[safeYField] === 'number' 
          ? row[safeYField] 
          : Number.parseFloat(String(row[safeYField] || '0').replace(/[^\d.-]/g, '')) || 0;
        
        // Get a name for the data point (for tooltip)
        const name = row[safeNameField]?.toString() || 'N/A';
          
        return {
          x: xValue,
          y: yValue,
          name,
          z: 10 // Size of dot
        };
      })
      .filter(point => !isNaN(point.x) && !isNaN(point.y)); // Filter out invalid points
  }, [parsedData, scatterXField, scatterYField, xAxisField]);

  // Prepare pie chart data - Use raw values for name
  const pieChartData = useMemo(() => {
    if (!parsedData?.tableData || !pieField || !xAxisField) return []
    
    const groupedData: Record<string, number> = {}
    
    parsedData.tableData.forEach(row => {
      const key = row[xAxisField]?.toString() || 'N/A'; // <<< Use raw string value
      const value = typeof row[pieField] === 'number' 
        ? row[pieField] 
        : Number.parseFloat(String(row[pieField]).replace(/[^\d.-]/g, '')) || 0;
        
      if (groupedData[key]) {
        groupedData[key] += value
      } else {
        groupedData[key] = value
      }
    })
    
    const totalValue = Object.values(groupedData).reduce((sum, val) => sum + val, 0);
    if (totalValue === 0) return [];

    return Object.entries(groupedData)
      .map(([name, value]) => ({
        name, // <<< Raw name
        value: parseFloat(((value / totalValue) * 100).toFixed(2)),
        absoluteValue: value
      }))
      .sort((a, b) => b.absoluteValue - a.absoluteValue)
      .slice(0, 8)
  }, [parsedData, xAxisField, pieField])

  // Check if we have valid data to display
  const hasValidData = parsedData?.tableData && parsedData.tableData.length > 0

  // New useEffect for logging widths
  useEffect(() => {
    if (tabsContentContainerRef.current) {
      console.log('--- Tabs Overflow Debug ---');
      const container = tabsContentContainerRef.current;
      console.log('TabsContent Container clientWidth:', container.clientWidth);
      console.log('TabsContent Container scrollWidth:', container.scrollWidth);

      const children = container.children;
      console.log('Number of TabsContent children:', children.length);
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        console.log(
          `TabContent ${i} - Value: ${child.getAttribute('data-state')}, scrollWidth: ${child.scrollWidth}, offsetWidth: ${child.offsetWidth}, Class: ${child.className}`
        );
      }
      console.log('--- End Tabs Overflow Debug ---');
    }
    // Re-run when parsedData changes, as this dictates the content of the tabs
  }, [parsedData]);

  return (
    <Card className="mb-6">
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
          {hasValidData && (
            <Button
              onClick={handleDownload}
              variant="outline"
              className="h-9 px-3 border-gray-200 hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hasValidData ? (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
                {activeTab !== "table" && activeTab !== "pie" && activeTab !== "scatter" && (
                  <>
                    <Select value={xAxisField || ""} onValueChange={setXAxisField}>
                      <SelectTrigger className="w-[140px] h-9">
                        <SelectValue placeholder="X-Axis" />
                      </SelectTrigger>
                      <SelectContent 
                        className="z-[200] min-w-[140px]"
                        position="item-aligned"
                        sideOffset={5}
                        align="start"
                      >
                        {parsedData?.headers?.map(header => (
                          <SelectItem key={`x-${header}`} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={yAxisField || ""} onValueChange={setYAxisField}>
                      <SelectTrigger className="w-[140px] h-9">
                        <SelectValue placeholder="Y-Axis" />
                      </SelectTrigger>
                      <SelectContent 
                        className="z-[200] min-w-[140px]"
                        position="item-aligned"
                        sideOffset={5}
                        align="start"
                      >
                        {parsedData?.headers?.map(header => (
                          <SelectItem key={`y-${header}`} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
                
                {activeTab === "scatter" && (
                  <>
                    <Select value={scatterXField || ""} onValueChange={setScatterXField}>
                      <SelectTrigger className="w-[160px] h-9">
                        <SelectValue placeholder="X-Axis (Numeric)" />
                      </SelectTrigger>
                      <SelectContent 
                        className="z-[200] min-w-[160px]"
                        position="item-aligned"
                        sideOffset={5}
                        align="start"
                      >
                        {parsedData?.headers?.map(header => (
                          <SelectItem key={`scatter-x-${header}`} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={scatterYField || ""} onValueChange={setScatterYField}>
                      <SelectTrigger className="w-[160px] h-9">
                        <SelectValue placeholder="Y-Axis (Numeric)" />
                      </SelectTrigger>
                      <SelectContent 
                        className="z-[200] min-w-[160px]"
                        position="item-aligned"
                        sideOffset={5}
                        align="start"
                      >
                        {parsedData?.headers?.map(header => (
                          <SelectItem key={`scatter-y-${header}`} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
                
                {activeTab === "pie" && (
                  <>
                    <Select value={xAxisField || ""} onValueChange={setXAxisField}>
                      <SelectTrigger className="w-[140px] h-9">
                        <SelectValue placeholder="Categories" />
                      </SelectTrigger>
                      <SelectContent 
                        className="z-[200] min-w-[140px]"
                        position="item-aligned"
                        sideOffset={5}
                        align="start"
                      >
                        {parsedData?.headers?.map(header => (
                          <SelectItem key={`pie-cat-${header}`} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={pieField || ""} onValueChange={setPieField}>
                      <SelectTrigger className="w-[140px] h-9">
                        <SelectValue placeholder="Values" />
                      </SelectTrigger>
                      <SelectContent 
                        className="z-[200] min-w-[140px]"
                        position="item-aligned"
                        sideOffset={5}
                        align="start"
                      >
                        {parsedData?.headers?.map(header => (
                          <SelectItem key={`pie-val-${header}`} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList>
                  <TabsTrigger value="bar" className="flex items-center">
                    <BarChart2 className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Bar Chart</span>
                  </TabsTrigger>
                  <TabsTrigger value="line" className="flex items-center">
                    <LineChartIcon className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Line Chart</span>
                  </TabsTrigger>
                  <TabsTrigger value="area" className="flex items-center">
                    <AreaChartIcon className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Area Chart</span>
                  </TabsTrigger>
                  <TabsTrigger value="pie" className="flex items-center">
                    <PieChartIcon className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Pie Chart</span>
                  </TabsTrigger>
                  <TabsTrigger value="scatter" className="flex items-center">
                    <Circle className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Scatter Plot</span>
                  </TabsTrigger>
                  <TabsTrigger value="table" className="flex items-center">
                    <TableIcon className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Table</span>
                  </TabsTrigger>
              </TabsList>
              
              <div ref={tabsContentContainerRef} className="border rounded-md p-1">
              <TabsContent value="bar" className="mt-0">
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }} // Keep bottom margin for angled labels
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end"
                        height={70} // Ensure height accommodates angled labels
                        tick={{ fontSize: 11 }} // Slightly smaller font size
                        label={{ value: xAxisField, position: 'insideBottom', dy: 10, fontSize: 12 }} // <<< Keep dynamic X-axis label
                      />
                      <YAxis 
                        tick={{ fontSize: 11 }} 
                        label={{ value: yAxisField, angle: -90, position: 'insideLeft', dx: -5, fontSize: 12 }} // <<< Keep dynamic Y-axis label
                        scale="log"
                        domain={[1, 'auto']}
                        allowDataOverflow={true}
                        tickFormatter={(value) => formatNumber(value)}
                      />
                      <Tooltip 
                        formatter={(value, name, props) => [
                          `${Number(value).toLocaleString('es-ES')}`, 
                          yAxisField || 'Value' // Tooltip value label is correct
                        ]}
                        labelFormatter={(label) => label} // Tooltip category label is correct
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '8px',
                          padding: '10px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                          border: '1px solid #f0f0f0'
                        }}
                      />
                      <Legend 
                        verticalAlign="top" // Move legend to top
                        wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} 
                      />
                      <Bar 
                        dataKey="value" 
                        name={yAxisField || "Value"} // Legend name is correct
                        fill={CHART_COLORS[0]} 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={60}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
              
              <TabsContent value="line" className="mt-0">
                 <div className="h-[400px] w-full">
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
                        label={{ value: xAxisField, position: 'insideBottom', dy: 10, fontSize: 12 }} // <<< Keep dynamic X-axis label
                      />
                      <YAxis 
                        tick={{ fontSize: 11 }}
                        label={{ value: yAxisField, angle: -90, position: 'insideLeft', dx: -5, fontSize: 12 }} // <<< Keep dynamic Y-axis label
                        scale="log"
                        domain={[1, 'auto']}
                        allowDataOverflow={true}
                        tickFormatter={(value) => formatNumber(value)}
                      />
                      <Tooltip 
                        formatter={(value, name, props) => [
                          `${Number(value).toLocaleString('es-ES')}`,
                          yAxisField || 'Value'
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
                        verticalAlign="top" // Move legend to top
                        wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        name={yAxisField || "Value"} // Legend name is correct
                        stroke={CHART_COLORS[0]} 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>             
              </TabsContent>
              
              <TabsContent value="area" className="mt-0">
                 <div className="h-[400px] w-full">
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
                        label={{ value: xAxisField, position: 'insideBottom', dy: 10, fontSize: 12 }} // <<< Keep dynamic X-axis label
                      />
                      <YAxis 
                        tick={{ fontSize: 11 }}
                        label={{ value: yAxisField, angle: -90, position: 'insideLeft', dx: -5, fontSize: 12 }} // <<< Keep dynamic Y-axis label
                        scale="log"
                        domain={[1, 'auto']}
                        allowDataOverflow={true}
                        tickFormatter={(value) => formatNumber(value)}
                      />
                      <Tooltip 
                        formatter={(value, name, props) => [
                          `${Number(value).toLocaleString('es-ES')}`,
                          yAxisField || 'Value'
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
                        verticalAlign="top" // Move legend to top
                        wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        name={yAxisField || "Value"} // Legend name is correct
                        stroke={CHART_COLORS[0]} 
                        fill={CHART_COLORS[0]} 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>             
              </TabsContent>
              
              <TabsContent value="pie" className="mt-0">
                <div className="h-[400px] w-full">
                  {(() => { 
                      console.log("[Pie Tab] Rendering pie chart with data:", pieChartData);
                      return null; 
                  })()}
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 20, right: 40, bottom: 60, left: 40 }}> // Added margins
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false} 
                        outerRadius={100} // Reduced outer radius further
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
                          `${props.payload?.absoluteValue.toLocaleString('es-ES')} (${(value as number).toFixed(1)}%)`, 
                          pieField || 'Value'
                        ]}
                        labelFormatter={(label) => label}
                      />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', marginTop: '15px' }} /> 
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
              
                <TabsContent value="scatter" className="mt-0">
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart
                        margin={{
                          top: 20,
                          right: 30,
                          bottom: 70,
                          left: 20
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          dataKey="x"
                          name={scatterXField || "X"}
                          label={{ 
                            value: scatterXField, 
                            position: 'insideBottom', 
                            dy: 10,
                            fontSize: 12 
                          }}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          type="number"
                          dataKey="y"
                          name={scatterYField || "Y"}
                          label={{ 
                            value: scatterYField, 
                            angle: -90, 
                            position: 'insideLeft', 
                            dx: -5,
                            fontSize: 12 
                          }}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(value) => formatNumber(value)}
                        />
                        <Tooltip
                          formatter={(value, name, props) => {
                            if (name === 'x') return [`${Number(value).toLocaleString('es-ES')}`, scatterXField || 'X'];
                            if (name === 'y') return [`${Number(value).toLocaleString('es-ES')}`, scatterYField || 'Y'];
                            return [value, name];
                          }}
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
                        <Scatter
                          name={`${scatterXField || 'X'} vs ${scatterYField || 'Y'}`}
                          data={scatterData}
                          fill={CHART_COLORS[0]}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
                
                <TabsContent value="table" className="mt-0">
                <div className="border border-gray-200 rounded-md">
                    {/* State for column pagination */}
                  {(() => { 
                      console.log("[Table Tab][HTML] Rendering table with data:", parsedData?.tableData);
                      // Use the existing useState hook
                      const [columnPage, setColumnPage] = useState(0);
                      const columnsPerPage = 5;
                      const totalColumnPages = parsedData?.headers ? Math.ceil(parsedData.headers.length / columnsPerPage) : 0;
                      
                      // Get current columns to display
                      const currentColumns = parsedData?.headers ? 
                        parsedData.headers.slice(columnPage * columnsPerPage, (columnPage + 1) * columnsPerPage) : 
                        [];
                      
                      const handlePrevColumns = () => {
                        setColumnPage(prev => (prev > 0 ? prev - 1 : prev));
                      };
                      
                      const handleNextColumns = () => {
                        setColumnPage(prev => (prev < totalColumnPages - 1 ? prev + 1 : prev));
                      };
                      
                      return (
                        <>
                        <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                          <h3 className="font-medium text-sm">Data Preview</h3>
                          {parsedData?.headers && parsedData.headers.length > columnsPerPage && (
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={handlePrevColumns} 
                                disabled={columnPage === 0}
                                className={`text-xs px-2 py-1 rounded border ${columnPage === 0 ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                              >
                                ← Prev
                              </button>
                              <span className="text-xs text-gray-500">
                                Columns {columnPage * columnsPerPage + 1}-{Math.min((columnPage + 1) * columnsPerPage, parsedData.headers.length)} of {parsedData.headers.length}
                              </span>
                              <button 
                                onClick={handleNextColumns} 
                                disabled={columnPage >= totalColumnPages - 1}
                                className={`text-xs px-2 py-1 rounded border ${columnPage >= totalColumnPages - 1 ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                              >
                                Next →
                              </button>
                            </div>
                          )}
                        </div>

                        <table className="w-full text-sm text-left text-gray-700">
                    <thead className="text-xs text-gray-800 uppercase bg-gray-100">
                      <tr>
                              {currentColumns.map((header: string, index: number) => (
                          <th key={index} scope="col" className="px-3 py-2 border-b border-r border-gray-200">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(!parsedData?.tableData || parsedData.tableData.length === 0) ? (
                          <tr>
                                    <td colSpan={currentColumns.length || 1} className="text-center text-gray-500 py-4 border-b">
                                  No data rows available.
                              </td>
                          </tr>
                      ) : (
                                parsedData.tableData.slice(0, 20).map((row: Record<string, any>, rowIndex: number) => (
                            <tr key={rowIndex} className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-200`}>
                                    {currentColumns.map((header: string, colIndex: number) => (
                                      <td key={colIndex} className="px-3 py-1.5 border-r border-gray-200">
                                  {row[header]?.toString() || '-'}
                                </td>
                              ))}
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>

                    <div className="py-2 px-4 text-center text-xs text-gray-500 border-t border-gray-200 bg-gray-50 rounded-b-md">
                          {parsedData?.tableData?.length > 20 
                            ? `${parsedData.tableData.length - 20} more rows not shown (displaying first 20)` 
                            : `Showing all ${parsedData?.tableData?.length || 0} rows`
                          }
                    </div>
                        </>
                      );
                    })()}
                </div>
              </TabsContent>
            </div>
          </Tabs>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[300px] bg-gray-50 rounded-md border border-dashed border-gray-200">
            <BarChart2 className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 text-center">No data available for visualization</p>
            <p className="text-gray-400 text-sm text-center mt-1">Upload a file to see beautiful charts</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 