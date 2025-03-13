import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricProps {
  title: string
  value: number
  icon: LucideIcon
  trend: "up" | "down"
}

export function Metric({ title, value, icon: Icon, trend }: MetricProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="mt-1 flex items-baseline">
            <p className={cn("text-2xl font-semibold", trend === "up" ? "text-green-600" : "text-red-600")}>{value}%</p>
            {trend === "up" ? (
              <TrendingUp className="ml-2 h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="ml-2 h-4 w-4 text-red-600" />
            )}
          </div>
        </div>
        <div className="rounded-full bg-gray-100 p-3">
          <Icon className="h-6 w-6 text-gray-600" />
        </div>
      </div>
    </div>
  )
}

