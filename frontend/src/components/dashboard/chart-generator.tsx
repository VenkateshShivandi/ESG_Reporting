import React, { useState } from "react"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart } from "./bar-chart"
import { DonutChart } from "./donut-chart"
import { LineChart } from "./line-chart"
import { Heatmap } from "./heatmap"
import { RadarChart } from "./radar-chart"
import { useDashboardStore } from "@/lib/store"
import { Switch } from "@/components/ui/switch"
import { Trash2, Plus, Check } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

// 图表类型选项
const CHART_TYPES = [
    { id: "bar", name: "Bar Chart" },
    { id: "donut", name: "Donut Chart" },
    { id: "line", name: "Line Chart" },
    { id: "radar", name: "Radar Chart" },
    { id: "heatmap", name: "Heatmap" }
]

// 数据源类型选项
const DATA_SOURCES = [
    { id: "reports", name: "Reports" },
    { id: "manual", name: "Manual Input" },
    { id: "chunks", name: "Data Chunks (Coming Soon)" }
]

export function ChartGenerator() {
    const { chartData } = useDashboardStore()
    const [generatedChart, setGeneratedChart] = useState<any>(null)
    const [chartConfig, setChartConfig] = useState({
        chartType: "bar",
        dataSource: "reports",
        title: "Custom Chart",
        showLegend: true,
        stacked: false,
        colors: ["#4CAF50", "#2196F3", "#FFC107", "#F44336", "#9C27B0"],
        dataKeys: ["value1", "value2", "value3"],
        dataLabels: ["Series 1", "Series 2", "Series 3"],
    })

    // 用于手动输入数据的状态
    const [manualData, setManualData] = useState([
        { name: "Item 1", value1: 100, value2: 200, value3: 150 },
        { name: "Item 2", value1: 150, value2: 120, value3: 180 },
        { name: "Item 3", value1: 180, value2: 160, value3: 120 },
    ])

    // 处理配置更改
    const handleConfigChange = (field: string, value: any) => {
        setChartConfig({
            ...chartConfig,
            [field]: value
        })
    }

    // 处理手动数据更改
    const handleDataChange = (index: number, field: string, value: any) => {
        const newData = [...manualData]
        newData[index] = {
            ...newData[index],
            [field]: field === 'name' ? value : Number(value)
        }
        setManualData(newData)
    }

    // 添加新的数据行
    const addDataRow = () => {
        setManualData([
            ...manualData,
            { name: `Item ${manualData.length + 1}`, value1: 0, value2: 0, value3: 0 }
        ])
    }

    // 删除数据行
    const removeDataRow = (index: number) => {
        setManualData(manualData.filter((_, i) => i !== index))
    }

    // 生成图表
    const generateChart = () => {
        // 准备配置对象
        const config = {
            title: chartConfig.title,
            showLegend: chartConfig.showLegend,
            stacked: chartConfig.stacked,
            dataKeys: chartConfig.dataKeys.slice(0, 3), // 最多使用3个数据键
            dataLabels: chartConfig.dataLabels.slice(0, 3),
            colors: chartConfig.colors.slice(0, 5) // 最多使用5种颜色
        }

        // 根据数据源选择数据
        const data = chartConfig.dataSource === 'manual'
            ? manualData
            : chartConfig.dataSource === 'reports'
                ? (chartConfig.chartType === 'bar'
                    ? chartData.barChart
                    : chartConfig.chartType === 'donut'
                        ? chartData.donutChart
                        : chartConfig.chartType === 'line'
                            ? chartData.lineChart
                            : chartConfig.chartType === 'radar'
                                ? chartData.radarChart
                                : chartData.heatmap)
                : [] // 'chunks' 数据源的接口预留

        // 创建图表组件
        const chartProps = { data, config }

        let chartComponent = null
        switch (chartConfig.chartType) {
            case 'bar':
                chartComponent = <BarChart
                data={[
                  { name: "2021", value1: 20, value2: 30, value3: 40 },
                  { name: "2022", value1: 35, value2: 25, value3: 15 }
                ]}
                config={{
                  keys: ["value1", "value2", "value3"],
                  labels: ["Environmental", "Energy", "Waste"],
                  colors: ["#4CAF50", "#81C784", "#C8E6C9"],
                  stacked: true,
                  showLegend: true
                }}
              />
                break
                case 'donut':
                    const donutData = data.map((item: any) => ({
                      name: item.name,
                      value: item.value1, // or pick whichever value you want
                    }))
                    chartComponent = <DonutChart data={donutData} config={config} />
                    break
                    case 'line': {
                        // You may want to preprocess or filter keys as needed
                        const lineData = data.map((item: any) => ({
                          ...item,
                        }))
                        
                        chartComponent = <LineChart data={lineData} config={config} />
                        break
                      }
                      
                //chartComponent = <LineChart {...chartProps} />
                //break
                case 'radar': {
                    const radarData = data.map((item: any) => ({
                      ...item
                    }))
                  
                    chartComponent = <RadarChart data={radarData} config={config} />
                    break
                  }
                  
                  case 'heatmap': {
                    const heatmapData = data.map((item: any) => ({
                      ...item
                    }))
                  
                    chartComponent = <Heatmap data={heatmapData} config={config} />
                    break
                  }
                  
        }

        setGeneratedChart(chartComponent)
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Custom Chart Generator</CardTitle>
                    <CardDescription>
                        Generate interactive charts with your data
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="config">
                        <TabsList className="mb-4">
                            <TabsTrigger value="config">Chart Configuration</TabsTrigger>
                            <TabsTrigger value="data">Data Input</TabsTrigger>
                        </TabsList>

                        {/* 图表配置选项卡 */}
                        <TabsContent value="config" className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="chartType">Chart Type</Label>
                                    <Select
                                        value={chartConfig.chartType}
                                        onValueChange={(value) => handleConfigChange('chartType', value)}
                                    >
                                        <SelectTrigger id="chartType" className="w-full bg-white border border-gray-200 rounded-md">
                                            <SelectValue placeholder="Select chart type" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border border-gray-200 rounded-md shadow-md">
                                            {CHART_TYPES.map((type) => (
                                                <SelectItem key={type.id} value={type.id} className="py-2 px-3 cursor-pointer">
                                                    {type.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="dataSource">Data Source</Label>
                                    <Select
                                        value={chartConfig.dataSource}
                                        onValueChange={(value) => handleConfigChange('dataSource', value)}
                                    >
                                        <SelectTrigger id="dataSource" className="w-full bg-white border border-gray-200 rounded-md">
                                            <SelectValue placeholder="Select data source" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border border-gray-200 rounded-md shadow-md">
                                            {DATA_SOURCES.map((source) => (
                                                <SelectItem
                                                    key={source.id}
                                                    value={source.id}
                                                    disabled={source.id === 'chunks'} // chunks 功能暂未实现
                                                    className="py-2 px-3 cursor-pointer"
                                                >
                                                    {source.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="chartTitle">Chart Title</Label>
                                <Input
                                    id="chartTitle"
                                    value={chartConfig.title}
                                    onChange={(e) => handleConfigChange('title', e.target.value)}
                                    placeholder="Enter chart title"
                                    className="w-full bg-white border border-gray-200 rounded-md"
                                />
                            </div>

                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="appearance">
                                    <AccordionTrigger className="py-2 rounded-md pl-2 hover:bg-gray-50">Appearance Options</AccordionTrigger>
                                    <AccordionContent className="space-y-4 pt-2">
                                        <div className="flex items-center space-x-2 py-2">
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    id="showLegend"
                                                    checked={chartConfig.showLegend}
                                                    onCheckedChange={(checked) => handleConfigChange('showLegend', !!checked)}
                                                    className="h-5 w-5 rounded cursor-pointer"
                                                />
                                                <Label htmlFor="showLegend" className="cursor-pointer text-sm font-medium">Show Legend</Label>
                                            </div>
                                        </div>

                                        {(chartConfig.chartType === 'bar' || chartConfig.chartType === 'line') && (
                                            <div className="flex items-center space-x-2 py-2">
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        id="stacked"
                                                        checked={chartConfig.stacked}
                                                        onCheckedChange={(checked) => handleConfigChange('stacked', !!checked)}
                                                        className="h-5 w-5 rounded cursor-pointer"
                                                    />
                                                    <Label htmlFor="stacked" className="cursor-pointer text-sm font-medium">Stacked</Label>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label>Series Labels</Label>
                                            <div className="space-y-2">
                                                {chartConfig.dataLabels.map((label, index) => (
                                                    <div key={index} className="flex items-center space-x-2">
                                                        <Input
                                                            value={label}
                                                            onChange={(e) => {
                                                                const newLabels = [...chartConfig.dataLabels]
                                                                newLabels[index] = e.target.value
                                                                handleConfigChange('dataLabels', newLabels)
                                                            }}
                                                            placeholder={`Series ${index + 1} label`}
                                                            className="flex-grow bg-white border border-gray-200 rounded-md"
                                                        />
                                                        <div
                                                            className="w-6 h-6 rounded-md"
                                                            style={{ backgroundColor: chartConfig.colors[index] || '#cccccc' }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </TabsContent>

                        {/* 数据输入选项卡 */}
                        <TabsContent value="data" className="space-y-4">
                            {chartConfig.dataSource === 'manual' ? (
                                <div className="space-y-4">
                                    <div className="border rounded-md overflow-x-auto">
                                        <table className="min-w-full divide-y divide-slate-200">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                        Label
                                                    </th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                        {chartConfig.dataLabels[0]}
                                                    </th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                        {chartConfig.dataLabels[1]}
                                                    </th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                        {chartConfig.dataLabels[2]}
                                                    </th>
                                                    <th className="px-3 py-2 text-right w-16"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-200">
                                                {manualData.map((row, index) => (
                                                    <tr key={index}>
                                                        <td className="px-3 py-2 whitespace-nowrap">
                                                            <Input
                                                                value={row.name}
                                                                onChange={(e) => handleDataChange(index, 'name', e.target.value)}
                                                                className="border-0 p-0 h-8 focus:ring-0"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap">
                                                            <Input
                                                                type="number"
                                                                value={row.value1}
                                                                onChange={(e) => handleDataChange(index, 'value1', e.target.value)}
                                                                className="border-0 p-0 h-8 focus:ring-0"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap">
                                                            <Input
                                                                type="number"
                                                                value={row.value2}
                                                                onChange={(e) => handleDataChange(index, 'value2', e.target.value)}
                                                                className="border-0 p-0 h-8 focus:ring-0"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap">
                                                            <Input
                                                                type="number"
                                                                value={row.value3}
                                                                onChange={(e) => handleDataChange(index, 'value3', e.target.value)}
                                                                className="border-0 p-0 h-8 focus:ring-0"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => removeDataRow(index)}
                                                                className="h-8 w-8 p-0 text-slate-500 hover:text-red-500"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <Button onClick={addDataRow} variant="outline" size="sm" className="mt-2">
                                        <Plus className="h-4 w-4 mr-1" /> Add Row
                                    </Button>
                                </div>
                            ) : chartConfig.dataSource === 'chunks' ? (
                                <div className="p-6 text-center bg-slate-50 rounded-md border border-dashed border-slate-300">
                                    <p className="text-slate-500">
                                        Data Chunks integration is coming soon. This feature will allow you to
                                        visualize data directly from processed document chunks.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-slate-50 p-4 rounded-md">
                                    <p className="text-sm text-slate-600">
                                        Using data from reports. The chart will display data from the
                                        existing analytics dashboard.
                                    </p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>

                    <Button onClick={generateChart} className="mt-6 w-full">
                        Generate Chart
                    </Button>
                </CardContent>
            </Card>

            {/* 生成的图表展示区域 */}
            {generatedChart && (
                <Card>
                    <CardHeader>
                        <CardTitle>{chartConfig.title}</CardTitle>
                        <CardDescription>
                            Generated using {
                                chartConfig.dataSource === 'manual'
                                    ? 'manual data input'
                                    : chartConfig.dataSource === 'reports'
                                        ? 'report data'
                                        : 'data chunks'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        {generatedChart}
                    </CardContent>
                </Card>
            )}
        </div>
    )
} 