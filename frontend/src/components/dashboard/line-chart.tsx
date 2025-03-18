"use client"

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"

interface LineChartProps {
  data: Array<{
    name: string
    value1: number
    value2: number
    value3: number
  }>
  config?: {
    title?: string
    showLegend?: boolean
    showDots?: boolean
    dataKeys?: string[]
    dataLabels?: string[]
    colors?: string[]
  }
}

export function LineChart({ data, config }: LineChartProps) {
  // Default configuration
  const defaultConfig = {
    showLegend: true,
    showDots: true,
    dataKeys: ["value1", "value2", "value3"],
    dataLabels: ["Environmental Score", "Energy Efficiency", "Waste Management"],
    colors: ["#4CAF50", "#2196F3", "#FFC107"]
  }

  // Merge provided config with defaults
  const mergedConfig = { ...defaultConfig, ...config }
  const { showLegend, showDots, dataKeys, dataLabels, colors } = mergedConfig

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data}>
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
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={dataLabels?.[index] || key}
              stroke={colors?.[index] || `#${Math.floor(Math.random() * 16777215).toString(16)}`}
              strokeWidth={2}
              dot={showDots ? { r: 4 } : false}
              activeDot={{ r: 6 }}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}

