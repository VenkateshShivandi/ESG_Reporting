import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface DrillDownModalProps {
  isOpen: boolean
  onClose: () => void
  year: string
  data: { [month: string]: number }
}

export function DrillDownModal({ isOpen, onClose, year, data }: DrillDownModalProps) {
  const chartData = Object.entries(data).map(([month, value]) => ({ month, value }))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px] backdrop-opacity-25 bg-white">
        <DialogHeader>
          <DialogTitle>Environmental Score - {year}</DialogTitle>
        </DialogHeader>
        <div className="h-[300px] w-full mt-4 bg-white">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#4CAF50" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </DialogContent>
    </Dialog>
  )
}

