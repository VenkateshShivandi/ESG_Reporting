"use client"

import { useState } from "react"
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import { useDashboardStore } from "@/lib/store"
import { DrillDownModal } from "./drill-down-modal"

interface BarChartProps {
  data: Array<{
    name: string
    value1: number
    value2: number
    value3: number
  }>
  config?: {
    title?: string
    showLegend?: boolean
    stacked?: boolean
    dataKeys?: string[]
    dataLabels?: string[]
    colors?: string[]
  }
}

export function BarChart({ data, config }: BarChartProps) {
  const { drillDownData, setSelectedYear } = useDashboardStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedYearData, setSelectedYearData] = useState<{ year: string; data: { [month: string]: number } } | null>(
    null,
  )

  // Default configuration
  const defaultConfig = {
    showLegend: true,
    stacked: false,
    dataKeys: ["value1", "value2", "value3"],
    dataLabels: ["Environmental Score", "Energy Efficiency", "Waste Management"],
    colors: ["#4CAF50", "#81C784", "#C8E6C9"]
  }

  // Merge provided config with defaults
  const mergedConfig = { ...defaultConfig, ...config }
  const { showLegend, stacked, dataKeys, dataLabels, colors } = mergedConfig

  const handleBarClick = (data: any) => {
    const year = data.name
    setSelectedYear(year)
    setSelectedYearData({ year, data: drillDownData[year] })
    setIsModalOpen(true)
  }

  return (
    <>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={data} stackOffset={stacked ? "normal" : undefined}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
              }}
            />
            {showLegend && <Legend />}
            {dataKeys.map((key, index) => (
              <Bar
                key={key}
                name={dataLabels?.[index] || key}
                dataKey={key}
                fill={colors?.[index] || `#${Math.floor(Math.random() * 16777215).toString(16)}`}
                radius={[4, 4, 0, 0]}
                onClick={handleBarClick}
                cursor="pointer"
                stackId={stacked ? "stack" : undefined}
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
      {selectedYearData && (
        <DrillDownModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          year={selectedYearData.year}
          data={selectedYearData.data}
        />
      )}
    </>
  )
}

