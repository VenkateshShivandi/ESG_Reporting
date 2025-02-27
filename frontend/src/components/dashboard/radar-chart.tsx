"use client"

import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"

interface RadarChartProps {
  data: Array<{
    subject: string
    current: number
    target: number
    industry: number
  }>
}

export function RadarChart({ data }: RadarChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" />
          <PolarRadiusAxis angle={30} domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
            }}
          />
          <Legend />
          <Radar name="Current" dataKey="current" stroke="#4CAF50" fill="#4CAF50" fillOpacity={0.6} />
          <Radar name="Target" dataKey="target" stroke="#1a237e" fill="#1a237e" fillOpacity={0.3} />
          <Radar name="Industry Avg" dataKey="industry" stroke="#FFD700" fill="#FFD700" fillOpacity={0.3} />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  )
}

