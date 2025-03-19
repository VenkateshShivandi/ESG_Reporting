"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, ChevronDown, ChevronUp, Search } from "lucide-react"

interface DataTableProps {
  data: Array<{
    id: string
    metric: string
    current: number
    previous: number
    change: number
    status: "improved" | "declined" | "unchanged"
  }>
  config?: {
    title?: string
    pageSize?: number
    sortBy?: string
    searchable?: boolean
  }
}

export function DataTable({ data, config }: DataTableProps) {
  // Default configuration
  const defaultConfig = {
    pageSize: 5,
    sortBy: "metric",
    searchable: true
  }

  // Merge provided config with defaults
  const mergedConfig = { ...defaultConfig, ...config }
  const { pageSize, sortBy: initialSortBy, searchable } = mergedConfig

  const [sortBy, setSortBy] = useState(initialSortBy)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // Filter data based on search query
  const filteredData = searchQuery
    ? data.filter((item) =>
      item.metric.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : data

  // Sort data based on sort column and order
  const sortedData = [...filteredData].sort((a, b) => {
    const aValue = a[sortBy as keyof typeof a]
    const bValue = b[sortBy as keyof typeof b]

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortOrder === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue
    }

    return 0
  })

  // Paginate data
  const pageCount = Math.ceil(sortedData.length / pageSize)
  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
  }

  return (
    <div className="w-full">
      {searchable && (
        <div className="mb-4 flex items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search metrics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("metric")}>
                Metric
                {sortBy === "metric" && (
                  <span className="ml-2">
                    {sortOrder === "asc" ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />}
                  </span>
                )}
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 text-right" onClick={() => handleSort("current")}>
                Current
                {sortBy === "current" && (
                  <span className="ml-2">
                    {sortOrder === "asc" ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />}
                  </span>
                )}
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 text-right" onClick={() => handleSort("previous")}>
                Previous
                {sortBy === "previous" && (
                  <span className="ml-2">
                    {sortOrder === "asc" ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />}
                  </span>
                )}
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 text-right" onClick={() => handleSort("change")}>
                Change
                {sortBy === "change" && (
                  <span className="ml-2">
                    {sortOrder === "asc" ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />}
                  </span>
                )}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.metric}</TableCell>
                <TableCell className="text-right">{item.current.toFixed(2)}</TableCell>
                <TableCell className="text-right">{item.previous.toFixed(2)}</TableCell>
                <TableCell
                  className={`text-right ${item.status === "improved"
                      ? "text-green-500"
                      : item.status === "declined"
                        ? "text-red-500"
                        : ""
                    }`}
                >
                  {item.change > 0 ? `+${item.change.toFixed(2)}%` : `${item.change.toFixed(2)}%`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filteredData.length)} of{" "}
            {filteredData.length} entries
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
              disabled={currentPage === pageCount}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

