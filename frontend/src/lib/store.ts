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
    // 模拟 API 调用
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 更新指标数据
    set((state) => ({
      metrics: {
        environmental: +(Math.random() * 20 - 10).toFixed(1),
        energy: +(Math.random() * 20 - 10).toFixed(1),
        waste: +(Math.random() * 20 - 10).toFixed(1),
        water: +(Math.random() * 20 - 10).toFixed(1),
      },
      // 更新图表数据
      chartData: {
        ...state.chartData,
        lineChart: state.chartData.lineChart.map((item) => ({
          ...item,
          value1: Math.floor(Math.random() * 200 + 100),
          value2: Math.floor(Math.random() * 200 + 100),
          value3: Math.floor(Math.random() * 200 + 100),
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

