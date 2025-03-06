import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, FileText, ArrowDownToLine } from "lucide-react"

interface ReportViewProps {
  onClose: () => void
}

export function ReportView({ onClose }: ReportViewProps) {
  return (
    <div className="flex flex-col h-full border-l overflow-hidden">
      {/* Report Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold">Generated ESG Report</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <ArrowDownToLine className="h-4 w-4" />
            Download PDF
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <ScrollArea className="flex-1 p-6 bg-white">
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[#2E7D32]">Environmental, Social, and Governance Report</h1>
            <p className="text-sm text-slate-500">Generated on {new Date().toLocaleDateString()}</p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold border-b pb-2">Executive Summary</h2>
            <p className="text-slate-700">
              This report provides an analysis of the organization's ESG performance based on the documents 
              provided and industry benchmarks. Key insights and recommendations are outlined below.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold border-b pb-2">Environmental Performance</h2>
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Carbon Emissions</h3>
              <div className="bg-slate-50 rounded-lg p-4 border">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Total Emissions (CO2e)</span>
                  <span className="font-semibold">25,430 tons</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                  <div className="bg-emerald-600 h-2.5 rounded-full" style={{ width: "65%" }}></div>
                </div>
                <div className="flex justify-between text-sm text-slate-500 mt-1">
                  <span>Industry Average: 32,000 tons</span>
                  <span>Target: 20,000 tons</span>
                </div>
              </div>

              <h3 className="text-lg font-medium">Energy Consumption</h3>
              <div className="bg-slate-50 rounded-lg p-4 border">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Total Energy Use</span>
                  <span className="font-semibold">45,210 MWh</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                  <div className="bg-emerald-600 h-2.5 rounded-full" style={{ width: "78%" }}></div>
                </div>
                <div className="flex justify-between text-sm text-slate-500 mt-1">
                  <span>Industry Average: 50,000 MWh</span>
                  <span>Target: 40,000 MWh</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold border-b pb-2">Social Performance</h2>
            <p className="text-slate-700">
              The organization demonstrates strong commitment to diversity, inclusion, and employee 
              well-being. Key areas for improvement include expanding community engagement programs 
              and enhancing supply chain monitoring.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4 border text-center">
                <div className="text-3xl font-bold text-emerald-600 mb-1">78%</div>
                <div className="text-sm text-slate-700">Employee Satisfaction</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border text-center">
                <div className="text-3xl font-bold text-emerald-600 mb-1">42%</div>
                <div className="text-sm text-slate-700">Gender Diversity</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold border-b pb-2">Governance</h2>
            <p className="text-slate-700">
              The governance structure demonstrates compliance with regulatory requirements. 
              Recommendations include enhancing board diversity and implementing more robust 
              risk management frameworks.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold border-b pb-2">Recommendations</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-700">
              <li>Implement a more comprehensive carbon reduction strategy</li>
              <li>Enhance diversity at senior management levels</li>
              <li>Improve supply chain monitoring and reporting</li>
              <li>Develop more detailed climate risk scenarios</li>
              <li>Increase transparency in governance procedures</li>
            </ul>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
} 