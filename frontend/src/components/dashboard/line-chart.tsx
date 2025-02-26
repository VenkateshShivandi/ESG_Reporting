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
}

export function LineChart({ data }: LineChartProps) {
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
          <Legend />
          <Line
            name="Primary"
            type="monotone"
            dataKey="value1"
            stroke="#4CAF50"
            strokeWidth={2}
            dot={{ strokeWidth: 2 }}
            activeDot={{ r: 6, strokeWidth: 2 }}
          />
          <Line
            name="Secondary"
            type="monotone"
            dataKey="value2"
            stroke="#FFD700"
            strokeWidth={2}
            dot={{ strokeWidth: 2 }}
            activeDot={{ r: 6, strokeWidth: 2 }}
          />
          <Line
            name="Tertiary"
            type="monotone"
            dataKey="value3"
            stroke="#81C784"
            strokeWidth={2}
            dot={{ strokeWidth: 2 }}
            activeDot={{ r: 6, strokeWidth: 2 }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}

