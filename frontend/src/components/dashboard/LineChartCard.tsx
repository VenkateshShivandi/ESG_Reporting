import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { LineChartIcon } from "lucide-react";

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

interface LineChartCardProps {
  title: string;
  tableData: any[];
  categoryField: string | null;
  valueField: string | null;
  available?: boolean;
}

function buildChartData(tableData: any[], categoryField: string | null, valueField: string | null) {
  if (!tableData || !categoryField || !valueField) return [];
  return tableData.slice(0, 20).map(row => {
    const valueRaw = row[valueField];
    const value = typeof valueRaw === 'number'
      ? valueRaw
      : parseFloat(String(valueRaw || '0').replace(/[^\d.-]/g, '')) || 0;
    const name = row[categoryField]?.toString() || 'N/A';
    return { name, value };
  });
}

export function LineChartCard({ title, tableData, categoryField, valueField, available }: LineChartCardProps) {
  const chartData = buildChartData(tableData, categoryField, valueField);
  return (
    <Card className="mb-6 bg-white rounded-3xl shadow-2xl px-8 py-8 relative transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_16px_48px_0_rgba(60,72,100,0.20),0_4px_16px_0_rgba(60,72,100,0.14)] overflow-hidden border-none">
      {/* Glass streak for shine */}
      <div className="absolute top-4 left-1/4 w-2/3 h-8 bg-white/30 rounded-full rotate-[18deg] pointer-events-none z-20" />
      <div className="relative z-20">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center text-lg">
              <LineChartIcon className="h-5 w-5 mr-2 text-green-600" />
              {title || "Line Chart"}
            </CardTitle>
            <CardDescription>
              {available
                ? 'Time series or sequential data visualization'
                : 'No suitable data found'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end"
                    height={70}
                    tick={{ fontSize: 11 }}
                    label={{ value: categoryField || 'Category', position: 'insideBottom', dy: 10, fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    label={{ value: valueField || 'Value', angle: -90, position: 'insideLeft', dx: -5, fontSize: 12 }}
                    domain={['auto', 'auto']}
                    allowDataOverflow={true}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <Tooltip 
                    formatter={(value, name, props) => [
                        `${formatNumber(value as number)}`,
                        valueField || 'Value'
                    ]}
                    labelFormatter={(label) => label}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '8px',
                      padding: '10px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      border: '1px solid #f0f0f0'
                    }}
                  />
                  <Legend 
                    verticalAlign="top"
                    wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    name={valueField || "Value"}
                    stroke={CHART_COLORS[0]} 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Select a Text/Date column for Category (🔠) and a Number column for Value (🔢).
              </div>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
} 