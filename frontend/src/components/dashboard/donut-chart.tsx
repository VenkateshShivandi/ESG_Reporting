"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

interface DonutChartProps {
  data: Array<{
    name: string
    value: number
  }>
  config?: {
    title?: string
    showLegend?: boolean
    innerRadius?: number
    outerRadius?: number
    colors?: string[]
  }
}

const COLORS = ["#4CAF50", "#81C784", "#C8E6C9", "#E8F5E9", "#AED581"]

export function DonutChart({ data, config }: DonutChartProps) {
  // Default configuration
  const defaultConfig = {
    showLegend: true,
    innerRadius: 60,
    outerRadius: 80,
    colors: COLORS
  }

  // Merge provided config with defaults
  const mergedConfig = { ...defaultConfig, ...config }
  const { showLegend, innerRadius, outerRadius, colors } = mergedConfig

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value}`, "Value"]} />
          {showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

