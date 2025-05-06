import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { AreaChart as AreaChartIcon } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { renderCustomAxisTick } from "./chart-utils";

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

interface AreaChartCardProps {
  title: string;
  tableData: any[];
  categoryField: string | null;
  valueField: string | null;
  available?: boolean;
  yAxisScale: 'linear' | 'log';
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

// Custom XAxis tick renderer
const renderCustomXAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const label = payload.value?.toString() || '';
  const maxLen = 10;
  const displayLabel = label.length > maxLen ? label.slice(0, maxLen) + '…' : label;
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{label}</title>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        fill="#64748b"
        fontSize={11}
        transform="rotate(-60)"
        style={{ cursor: label.length > maxLen ? 'pointer' : 'default' }}
      >
        {displayLabel}
      </text>
    </g>
  );
};

export function AreaChartCard({ title, tableData, categoryField, valueField, available, yAxisScale }: AreaChartCardProps) {
  const chartData = buildChartData(tableData, categoryField, valueField);
  const hasZeroOrNegative = chartData.some(d => d.value <= 0);
  const hasValidChartData = chartData.length > 0 && chartData.some(d => d.value !== undefined && d.name !== undefined);

  return (
    <Card className="mb-6 bg-white rounded-3xl shadow-2xl px-8 py-8 relative transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_16px_48px_0_rgba(60,72,100,0.20),0_4px_16px_0_rgba(60,72,100,0.14)] overflow-hidden border-none">
      {/* Glass streak for shine */}
      <div className="absolute top-4 left-1/4 w-2/3 h-8 bg-white/30 rounded-full rotate-[18deg] pointer-events-none z-20" />
      <div className="relative z-20">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center text-lg">
              <AreaChartIcon className="h-5 w-5 mr-2 text-purple-600" />
              {title || "Area Chart"}
            </CardTitle>
            <CardDescription>
              Area chart for cumulative or trend data
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 50, right: 30, left: 20, bottom: 90 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  height={80}
                  tick={renderCustomAxisTick}
                  label={{ value: categoryField || 'Category', position: 'insideBottom', dy: 20, fontSize: 12 }}
                  interval={0}
                />
                <YAxis 
                  tick={{ fontSize: 11 }} 
                  label={{ value: valueField || 'Value', angle: -90, position: 'insideLeft', dx: -5, fontSize: 12 }}
                  domain={['auto', (dataMax: number) => dataMax * 1.05]}
                  allowDataOverflow={true}
                  tickFormatter={(value) => formatNumber(value)}
                  scale={yAxisScale}
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
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  name={valueField || "Value"}
                  stroke={CHART_COLORS[0]} 
                  fill={CHART_COLORS[0]} 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </div>
    </Card>
  );
} 