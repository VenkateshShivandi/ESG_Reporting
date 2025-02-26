"use client"

import { PieChart, Pie, ResponsiveContainer, Cell, Tooltip, Legend } from "recharts"

interface DonutChartProps {
  data: Array<{
    name: string
    value: number
  }>
}

const COLORS = ["#1a237e", "#4CAF50", "#81C784"]

export function DonutChart({ data }: DonutChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                className="transition-opacity hover:opacity-80"
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

