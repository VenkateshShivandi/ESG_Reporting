"use client"

import { useEffect } from "react"
import { Metric } from "@/components/dashboard/metric"
import { BarChart } from "@/components/dashboard/bar-chart"
import { DonutChart } from "@/components/dashboard/donut-chart"
import { LineChart } from "@/components/dashboard/line-chart"
import { Header } from "@/components/dashboard/header"
import { DateRangePicker } from "@/components/dashboard/date-range-picker"
import { Leaf, Lightbulb, Trash2, Droplet, RefreshCw, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDashboardStore } from "@/lib/store"
import { cn } from "@/lib/utils"

export default function AnalyticsPage() {
  const { dateRange, metrics, chartData, isLoading, setDateRange, refreshData, setSelectedYear } = useDashboardStore()

  // Auto refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData()
    }, 30000) 

    return () => clearInterval(interval)
  }, [refreshData])

  const handleExport = () => {
    const data = {
      metrics,
      chartData,
      dateRange,
      timestamp: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `esg-dashboard-export-${new Date().toISOString()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleRefresh = () => {
    refreshData()
    setSelectedYear(null) // Reset drill-down state when refreshing
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header title="ESG Analytics Dashboard" description="Monitor and analyze your ESG metrics" />
      <main className="p-4 md:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading} className="w-full sm:w-auto">
              <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Metric
            title="Environmental Score"
            value={metrics.environmental}
            icon={Leaf}
            trend={metrics.environmental > 0 ? "up" : "down"}
          />
          <Metric
            title="Energy Efficiency"
            value={metrics.energy}
            icon={Lightbulb}
            trend={metrics.energy > 0 ? "up" : "down"}
          />
          <Metric
            title="Waste Management"
            value={metrics.waste}
            icon={Trash2}
            trend={metrics.waste > 0 ? "up" : "down"}
          />
          <Metric title="Water Usage" value={metrics.water} icon={Droplet} trend={metrics.water > 0 ? "up" : "down"} />
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="col-span-1 rounded-lg bg-white p-6 shadow lg:col-span-1">
            <h3 className="mb-4 text-lg font-semibold">ESG Metrics Overview</h3>
            <BarChart data={chartData.barChart} />
          </div>
          <div className="col-span-1 rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold">Distribution</h3>
            <DonutChart data={chartData.donutChart} />
          </div>
          <div className="col-span-1 rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold">Trends</h3>
            <LineChart data={chartData.lineChart} />
          </div>
        </div>
      </main>
    </div>
  )
}

