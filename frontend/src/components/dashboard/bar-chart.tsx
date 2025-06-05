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
import { StackOffsetType } from "recharts/types/util/types"

type BarChartProps = {
  data:
    | { name: string; value1: number; value2: number; value3: number }[]
    | { name: string; value: number }[]
    | { year: string; emissions: number; energy: number; water: number; waste: number }[]
    | { subject: string; current: number; target: number; industry: number }[]
  config: {
    title?: string
    keys: string[]               // Array of data keys to render bars
    labels?: string[]            // Labels for legend/tooltips
    colors?: string[]            // Bar fill colors
    stacked?: boolean
    showLegend?: boolean
  }
}

export function BarChart({ data, config }: BarChartProps) {
  const { drillDownData, setSelectedYear } = useDashboardStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedYearData, setSelectedYearData] = useState<{ year: string; data: { [month: string]: number } } | null>(
    null,
  )

  const { keys, labels = [], colors = [], stacked = false, showLegend = true } = config

  const handleBarClick = (data: any) => {
    const year = data.name || data.year
    if (year) {
      setSelectedYear(year)
      setSelectedYearData({ year, data: drillDownData[year] })
      setIsModalOpen(true)
    }
  }

  // Auto-detect x-axis key (either name, year, or subject)
  const xKey = data.length > 0 ? Object.keys(data[0])[0] : "name"

  return (
    <>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={data as any}
            stackOffset={stacked ? "sign" as StackOffsetType : undefined}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
              }}
            />
            {showLegend && <Legend />}
            {keys.map((key, index) => (
              <Bar
                key={key}
                name={labels?.[index] || key}
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
