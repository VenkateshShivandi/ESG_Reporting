import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Droplet } from "lucide-react";

interface HeatmapCardProps {
  title: string;
  available: boolean;
}

export function HeatmapCard({ title, available }: HeatmapCardProps) {
  return (
    <Card className="mb-6 bg-white rounded-3xl shadow-2xl px-8 py-8 relative transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_16px_48px_0_rgba(60,72,100,0.20),0_4px_16px_0_rgba(60,72,100,0.14)] overflow-hidden border-none">
      {/* Glass streak for shine */}
      <div className="absolute top-4 left-1/4 w-2/3 h-8 bg-white/30 rounded-full rotate-[18deg] pointer-events-none z-20" />
      <div className="relative z-20">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center text-lg">
              <Droplet className="h-5 w-5 mr-2 text-blue-400" />
              {title || "Heatmap"}
            </CardTitle>
            <CardDescription>
              {available
                ? 'Heatmap visualization of data'
                : 'No suitable data found'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center bg-gray-100 rounded-md">
            <p className="text-gray-500">Heatmap Area</p>
          </div>
        </CardContent>
      </div>
    </Card>
  );
} 