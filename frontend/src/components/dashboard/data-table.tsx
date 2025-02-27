"use client"

import { useState } from "react"
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DataTableProps {
  data: Array<{
    id: string
    metric: string
    current: number
    previous: number
    change: number
    status: "improved" | "declined" | "unchanged"
  }>
}

export function DataTable({ data }: DataTableProps) {
  const [sortField, setSortField] = useState<string>("metric")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortField as keyof typeof a]
    const bValue = b[sortField as keyof typeof b]

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue
    }

    return 0
  })

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3" />
    return sortDirection === "asc" ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />
  }

  return (
    <div className="w-full">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="py-2 px-2.5 text-left sticky top-0 bg-gray-50 z-10">
              <Button variant="ghost" onClick={() => handleSort("metric")} className="font-medium text-[13px] h-6 px-1">
                Metric
                <SortIcon field="metric" />
              </Button>
            </th>
            <th className="py-2 px-2.5 text-right sticky top-0 bg-gray-50 z-10">
              <Button variant="ghost" onClick={() => handleSort("current")} className="font-medium text-[13px] h-6 px-1">
                Current
                <SortIcon field="current" />
              </Button>
            </th>
            <th className="py-2 px-2.5 text-right sticky top-0 bg-gray-50 z-10">
              <Button variant="ghost" onClick={() => handleSort("previous")} className="font-medium text-[13px] h-6 px-1">
                Previous
                <SortIcon field="previous" />
              </Button>
            </th>
            <th className="py-2 px-2.5 text-right sticky top-0 bg-gray-50 z-10">
              <Button variant="ghost" onClick={() => handleSort("change")} className="font-medium text-[13px] h-6 px-1">
                Change
                <SortIcon field="change" />
              </Button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => (
            <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-1.5 px-2.5">{row.metric}</td>
              <td className="py-1.5 px-2.5 text-right">{row.current.toFixed(1)}</td>
              <td className="py-1.5 px-2.5 text-right">{row.previous.toFixed(1)}</td>
              <td
                className={`py-1.5 px-2.5 text-right font-medium ${row.status === "improved"
                    ? "text-green-600"
                    : row.status === "declined"
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}
              >
                {row.change > 0 ? "+" : ""}
                {row.change.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

