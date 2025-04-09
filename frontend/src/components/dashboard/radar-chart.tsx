"use client"

import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface RadarChartProps {
  data: Array<{
    subject: string
    current: number
    target: number
    industry: number
  }>
  config?: {
    title?: string
    showLegend?: boolean
    dataKeys?: string[]
    colors?: string[]
  }
}

export function RadarChart({ data, config }: RadarChartProps) {
  // Default configuration
  const defaultConfig = {
    showLegend: true,
    dataKeys: ["current", "target", "industry"],
    colors: ["#4CAF50", "#2196F3", "#FFC107"]
  }

  // Merge provided config with defaults
  const mergedConfig = { ...defaultConfig, ...config }
  const { showLegend, dataKeys, colors } = mergedConfig

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" />
          <PolarRadiusAxis angle={30} domain={[0, 100]} />

          {dataKeys.map((key, index) => (
            <Radar
              key={key}
              name={key === "current" ? "Your Performance" : key === "target" ? "Target" : "Industry Average"}
              dataKey={key}
              stroke={colors[index]}
              fill={colors[index]}
              fillOpacity={0.2}
            />
          ))}

          {showLegend && <Legend />}
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  )
}

