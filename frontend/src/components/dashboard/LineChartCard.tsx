import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { LineChartIcon } from "lucide-react";
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
const formatNumber = (num: number | string, seriesName?: string | null): string => {
  const numericValue = typeof num === 'string' ? parseFloat(num.replace(/[^\d.-]/g, '')) : num;
  if (isNaN(numericValue)) return 'N/A';

  if (seriesName && (seriesName.includes('%') || seriesName.toLowerCase().includes('percent'))) {
    return (numericValue * 100).toFixed(1) + "%";
  }

  if (Math.abs(numericValue) >= 1000000) return (numericValue / 1000000).toFixed(1) + "M";
  if (Math.abs(numericValue) >= 1000) return (numericValue / 1000).toFixed(1) + "k";
  
  if (Number.isInteger(numericValue)) {
    return numericValue.toString();
  } else {
    if (numericValue !== 0 && Math.abs(numericValue) < 1) {
      return numericValue.toFixed(Math.abs(numericValue) < 0.01 ? 3 : 2);
    } else {
      return numericValue.toFixed(1);
    }
  }
};

// Utility to get a safe numeric value or null for missing/unparseable
function getNumericOrNull(value: any) {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && (value.trim() === "" || value.trim() === "-"))
  ) {
    return null;
  }
  const cleaned = String(value).replace(/[^\d.-]/g, "");
  if (cleaned === "") return null;
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

interface LineChartCardProps {
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
    const value = getNumericOrNull(valueRaw); // Use new utility
    const name = row[categoryField]?.toString() || 'N/A';
    return { name, value };
  });
}

export function LineChartCard({ title, tableData, categoryField, valueField, available, yAxisScale }: LineChartCardProps) {
  const chartData = buildChartData(tableData, categoryField, valueField);
  
  const isEmpty = chartData.length === 0;
  const allValuesAreNull = !isEmpty && chartData.every(d => d.value === null);
  const allValuesAreZero = !isEmpty && !allValuesAreNull && chartData.filter(d => d.value !== null).every(d => d.value === 0);
  const hasOnlyNullsOrZeros = !isEmpty && chartData.every(d => d.value === null || d.value === 0);

  let yDomain: any[] = ['auto', (dataMax: number) => dataMax * 1.05];
  if (!isEmpty && (allValuesAreZero || (hasOnlyNullsOrZeros && chartData.some(d=> d.value === 0)))) {
    // If series is all zeros (or nulls and zeros), and valueField suggests percentage, domain might need adjustment
    // For now, [0,1] is okay, but if it's a percentage, maybe [0, 100] if data was already 0-100.
    // But our data is 0-1 for percentages, so yDomain for formatNumber to make it 0-100% is fine.
    // The yDomain change for [0,1] is for raw values. formatNumber handles the % display.
    if (valueField && (valueField.includes('%') || valueField.toLowerCase().includes('percent'))) {
      // If it's a percentage field and all values are 0 (decimal 0.00), the axis should represent 0%
      // The existing [0,1] domain is fine as 0 maps to 0% and 1 maps to 100% in formatNumber
    } else {
       yDomain = [0, 1]; 
    }
  }

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
              Time series or sequential data visualization
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] w-full relative"> {/* Added relative positioning */}
            {isEmpty ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-lg">
                No data to display. Select valid category and value fields.
              </div>
            ) : allValuesAreNull ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-lg">
                All values for this series are missing.
              </div>
            ) : allValuesAreZero ? (
                <div className="absolute top-10 left-1/2 transform -translate-x-1/2 text-gray-500 text-sm p-2 bg-gray-100 rounded">
                    All values are zero.
                </div>
            ) : null}

            {!(isEmpty || allValuesAreNull) && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
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
                    domain={yDomain}
                    allowDataOverflow={true}
                    tickFormatter={(tickValue) => formatNumber(tickValue, valueField)}
                    scale={yAxisScale}
                  />
                  <Tooltip 
                    formatter={(value: number | string | Array<number | string>, name: string | number, props) => {
                      const displayName = typeof name === 'string' ? name : (valueField || 'Value');
                      if (value === null || value === undefined) return ["N/A", displayName];
                      
                      const seriesNameHint = typeof name === 'string' ? name : null;
                      return [formatNumber(value as number, seriesNameHint), displayName];
                    }}
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
                    connectNulls={false} // Explicitly set for clarity, though it's default
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
} 