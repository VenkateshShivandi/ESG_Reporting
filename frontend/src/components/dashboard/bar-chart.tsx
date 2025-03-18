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
}

export function BarChart({ data }: BarChartProps) {
  const { drillDownData, setSelectedYear } = useDashboardStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedYearData, setSelectedYearData] = useState<{ year: string; data: { [month: string]: number } } | null>(
    null,
  )

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
          <RechartsBarChart data={data}>
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
            <Bar
              name="Environmental Score"
              dataKey="value1"
              fill="#4CAF50"
              radius={[4, 4, 0, 0]}
              onClick={handleBarClick}
              cursor="pointer"
            />
            <Bar name="Energy Efficiency" dataKey="value2" fill="#81C784" radius={[4, 4, 0, 0]} />
            <Bar name="Waste Management" dataKey="value3" fill="#C8E6C9" radius={[4, 4, 0, 0]} />
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

