import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { PieChart as PieChartIcon } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

// Color palette for charts (should match EnhancedDataPreview)
const CHART_COLORS = [
  "#0ea5e9", // sky-500
  "#f97316", // orange-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#f59e0b", // amber-500
  "#06b6d4", // cyan-500
  "#ef4444", // red-500
];

// Helper for axis/tooltip formatting
const formatNumber = (num: number | string): string => {
  const numericValue = typeof num === 'string' ? parseFloat(num.replace(/[^\d.-]/g, '')) : num;
  if (isNaN(numericValue)) return 'N/A';
  if (Math.abs(numericValue) >= 1000000) return (numericValue / 1000000).toFixed(1) + "M";
  if (Math.abs(numericValue) >= 1000) return (numericValue / 1000).toFixed(1) + "k";
  if (Math.abs(numericValue) < 1 && Math.abs(numericValue) > 0) return numericValue.toFixed(2);
  return numericValue.toFixed(0);
};

function buildPieChartData(tableData: any[], categoryField: string | null, valueField: string | null) {
  if (!tableData || !categoryField || !valueField) return [];
  const groupedData: Record<string, number> = {};
  tableData.forEach(row => {
    const key = row[categoryField]?.toString() || 'N/A';
    const valueRaw = row[valueField];
    const value = typeof valueRaw === 'number' ? valueRaw : parseFloat(String(valueRaw || '0').replace(/[^\d.-]/g, '')) || 0;
    if (!isNaN(value)) {
      groupedData[key] = (groupedData[key] || 0) + value;
    }
  });
  const totalValue = Object.values(groupedData).reduce((sum, val) => sum + val, 0);
  if (totalValue === 0) return [];
  return Object.entries(groupedData)
    .map(([name, value]) => ({
      name,
      value: parseFloat(((value / totalValue) * 100).toFixed(2)),
      absoluteValue: value
    }))
    .sort((a, b) => b.absoluteValue - a.absoluteValue)
    .slice(0, 8);
}

interface PieChartCardProps {
  title: string;
  tableData: any[];
  categoryField: string | null;
  valueField: string | null;
  available?: boolean;
}

export function PieChartCard({ title, tableData, categoryField, valueField, available }: PieChartCardProps) {
  const pieChartData = buildPieChartData(tableData, categoryField, valueField);
  return (
    <Card className="mb-6 bg-white rounded-3xl shadow-2xl px-8 py-8 relative transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_16px_48px_0_rgba(60,72,100,0.20),0_4px_16px_0_rgba(60,72,100,0.14)] overflow-hidden border-none">
      {/* Glass streak for shine */}
      <div className="absolute top-4 left-1/4 w-2/3 h-8 bg-white/30 rounded-full rotate-[18deg] pointer-events-none z-20" />
      <div className="relative z-20">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center text-lg">
              <PieChartIcon className="h-5 w-5 mr-2 text-pink-600" />
              {title || "Pie Chart"}
            </CardTitle>
            <CardDescription>
              Pie/Donut chart for categorical distribution
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full relative">
            {pieChartData.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-lg">
                No data to display. All values are zero or missing for the selected field(s).
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 20, bottom: 70, left: 20 }}>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="45%"
                    labelLine={false}
                    outerRadius={85}
                    innerRadius={45}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ value }) => {
                      if (value < 3) return null;
                      return `${(value as number).toFixed(1)}%`;
                    }}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${formatNumber(props.payload?.absoluteValue)} (${(value as number).toFixed(1)}%)`,
                      valueField || 'Value'
                    ]}
                    labelFormatter={(label) => label}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ 
                      fontSize: '10px', 
                      paddingTop: '20px',
                      width: '100%',
                      overflowWrap: 'break-word',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'center'
                    }}
                    formatter={(value, entry, index) => {
                      // Truncate long names to prevent overflow
                      if (typeof value === 'string' && value.length > 20) {
                        return `${value.substring(0, 18)}...`;
                      }
                      return value;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
} 