import { create } from "zustand"
import type { DateRange } from "react-day-picker"

interface MetricData {
  environmental: number
  energy: number
  waste: number
  water: number
}

interface ChartData {
  barChart: Array<{
    name: string
    value1: number
    value2: number
    value3: number
  }>
  donutChart: Array<{
    name: string
    value: number
  }>
  lineChart: Array<{
    name: string
    value1: number
    value2: number
    value3: number
  }>
  heatmap: Array<{
    year: string
    emissions: number
    energy: number
    water: number
    waste: number
  }>
  radarChart: Array<{
    subject: string
    current: number
    target: number
    industry: number
  }>
  tableData: Array<{
    id: string
    metric: string
    current: number
    previous: number
    change: number
    status: "improved" | "declined" | "unchanged"
  }>
}

interface DrillDownData {
  [year: string]: {
    [month: string]: number
  }
}

interface DashboardStore {
  dateRange: DateRange
  metrics: MetricData
  chartData: ChartData
  isLoading: boolean
  drillDownData: DrillDownData
  selectedYear: string | null
  setDateRange: (range: DateRange) => void
  refreshData: () => Promise<void>
  setSelectedYear: (year: string | null) => void
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  dateRange: {
    from: new Date(new Date().getFullYear(), 0, 1), // Start of current year
    to: new Date(),
  },
  metrics: {
    environmental: -12.5,
    energy: -8.3,
    waste: 15.4,
    water: -5.2,
  },
  chartData: {
    barChart: [
      { name: "2021", value1: 20000, value2: 12000, value3: 5000 },
      { name: "2022", value1: 18000, value2: 8000, value3: 5500 },
      { name: "2023", value1: 15000, value2: 8500, value3: 0 },
    ],
    donutChart: [
      { name: "Category 1", value: 45 },
      { name: "Category 2", value: 35 },
      { name: "Category 3", value: 20 },
    ],
    lineChart: [
      { name: "Jan", value1: 100, value2: 120, value3: 90 },
      { name: "Feb", value1: 120, value2: 140, value3: 95 },
      { name: "Mar", value1: 150, value2: 160, value3: 100 },
      { name: "Apr", value1: 180, value2: 200, value3: 120 },
    ],
    heatmap: [
      { year: "2018", emissions: 240, energy: 180, water: 120, waste: 100 },
      { year: "2019", emissions: 300, energy: 200, water: 150, waste: 120 },
      { year: "2020", emissions: 280, energy: 250, water: 180, waste: 140 },
      { year: "2021", emissions: 250, energy: 220, water: 200, waste: 160 },
      { year: "2022", emissions: 210, energy: 190, water: 220, waste: 180 },
      { year: "2023", emissions: 190, energy: 170, water: 240, waste: 200 },
    ],
    radarChart: [
      { subject: "Carbon", current: 65, target: 90, industry: 60 },
      { subject: "Energy", current: 78, target: 85, industry: 65 },
      { subject: "Water", current: 45, target: 75, industry: 55 },
      { subject: "Waste", current: 80, target: 90, industry: 70 },
      { subject: "Social", current: 70, target: 85, industry: 75 },
      { subject: "Governance", current: 60, target: 80, industry: 65 },
    ],
    tableData: [
      { id: "1", metric: "Carbon Emissions", current: 65.4, previous: 72.1, change: -9.3, status: "improved" },
      { id: "2", metric: "Energy Efficiency", current: 78.2, previous: 75.5, change: 3.6, status: "improved" },
      { id: "3", metric: "Water Usage", current: 45.7, previous: 48.2, change: -5.2, status: "improved" },
      { id: "4", metric: "Waste Management", current: 80.3, previous: 76.8, change: 4.6, status: "improved" },
      { id: "5", metric: "Social Impact", current: 70.1, previous: 72.5, change: -3.3, status: "declined" },
      { id: "6", metric: "Governance Score", current: 60.8, previous: 58.4, change: 4.1, status: "improved" },
      { id: "7", metric: "Supply Chain", current: 55.2, previous: 52.1, change: 5.9, status: "improved" },
    ],
  },
  isLoading: false,
  drillDownData: {
    "2021": {
      Jan: 18.5,
      Feb: 19.2,
      Mar: 20.1,
      Apr: 20.5,
      May: 21.0,
      Jun: 21.5,
      Jul: 22.0,
      Aug: 22.5,
      Sep: 23.0,
      Oct: 23.5,
      Nov: 24.0,
      Dec: 24.5,
    },
    "2022": {
      Jan: 17.0,
      Feb: 17.5,
      Mar: 18.0,
      Apr: 18.5,
      May: 19.0,
      Jun: 19.5,
      Jul: 20.0,
      Aug: 20.5,
      Sep: 21.0,
      Oct: 21.5,
      Nov: 22.0,
      Dec: 22.5,
    },
    "2023": {
      Jan: 14.0,
      Feb: 14.5,
      Mar: 15.0,
      Apr: 15.5,
      May: 16.0,
      Jun: 16.5,
      Jul: 17.0,
      Aug: 17.5,
      Sep: 18.0,
      Oct: 18.5,
      Nov: 19.0,
      Dec: 19.5,
    },
  },
  selectedYear: null,
  setDateRange: (range) => set({ dateRange: range }),
  setSelectedYear: (year) => set({ selectedYear: year }),
  refreshData: async () => {
    set({ isLoading: true })
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Update metrics data
    set((state) => ({
      metrics: {
        environmental: +(Math.random() * 20 - 10).toFixed(1),
        energy: +(Math.random() * 20 - 10).toFixed(1),
        waste: +(Math.random() * 20 - 10).toFixed(1),
        water: +(Math.random() * 20 - 10).toFixed(1),
      },
      // Update chart data
      chartData: {
        ...state.chartData,
        lineChart: state.chartData.lineChart.map((item) => ({
          ...item,
          value1: Math.floor(Math.random() * 200 + 100),
          value2: Math.floor(Math.random() * 200 + 100),
          value3: Math.floor(Math.random() * 200 + 100),
        })),
        // Update table data with random changes
        tableData: state.chartData.tableData.map((item) => {
          const newCurrent = +(item.current * (1 + (Math.random() * 0.2 - 0.1))).toFixed(1)
          const change = +(((newCurrent - item.previous) / item.previous) * 100).toFixed(1)
          return {
            ...item,
            current: newCurrent,
            change,
            status: change > 0 ? "improved" : change < 0 ? "declined" : "unchanged",
          }
        }),
        // Update heatmap data with random changes
        heatmap: state.chartData.heatmap.map((item) => ({
          ...item,
          emissions: Math.max(0, item.emissions + Math.floor(Math.random() * 40 - 20)),
          energy: Math.max(0, item.energy + Math.floor(Math.random() * 40 - 20)),
          water: Math.max(0, item.water + Math.floor(Math.random() * 40 - 20)),
          waste: Math.max(0, item.waste + Math.floor(Math.random() * 40 - 20)),
        })),
      },
      drillDownData: {
        ...state.drillDownData,
        [new Date().getFullYear().toString()]: {
          Jan: +(Math.random() * 10 + 10).toFixed(1),
          Feb: +(Math.random() * 10 + 10).toFixed(1),
          Mar: +(Math.random() * 10 + 10).toFixed(1),
          Apr: +(Math.random() * 10 + 10).toFixed(1),
          May: +(Math.random() * 10 + 10).toFixed(1),
          Jun: +(Math.random() * 10 + 10).toFixed(1),
          Jul: +(Math.random() * 10 + 10).toFixed(1),
          Aug: +(Math.random() * 10 + 10).toFixed(1),
          Sep: +(Math.random() * 10 + 10).toFixed(1),
          Oct: +(Math.random() * 10 + 10).toFixed(1),
          Nov: +(Math.random() * 10 + 10).toFixed(1),
          Dec: +(Math.random() * 10 + 10).toFixed(1),
        },
      },
      isLoading: false,
    }))
  },
}))

