import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ScatterChart as ScatterChartIcon, Circle } from "lucide-react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

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
  const numericValue = typeof num === 'string' ? parseFloat(num.replace(/[^0-9.-]/g, '')) : num;
  if (isNaN(numericValue)) return 'N/A';
  if (Math.abs(numericValue) >= 1000000) return (numericValue / 1000000).toFixed(1) + "M";
  if (Math.abs(numericValue) >= 1000) return (numericValue / 1000).toFixed(1) + "k";
  if (Math.abs(numericValue) < 1 && Math.abs(numericValue) > 0) return numericValue.toFixed(2);
  return numericValue.toFixed(0);
};

function buildScatterData(tableData: any[], scatterXField: string | null, scatterYField: string | null, categoryField: string | null, headers: string[]) {
  if (!tableData || !scatterXField || !scatterYField) return [];
  return tableData
    .slice(0, 50)
    .map(row => {
      const xValueRaw = row[scatterXField];
      const yValueRaw = row[scatterYField];
      const xValue = typeof xValueRaw === 'number' ? xValueRaw : parseFloat(String(xValueRaw || '0').replace(/[^\d.-]/g, '')) || 0;
      const yValue = typeof yValueRaw === 'number' ? yValueRaw : parseFloat(String(yValueRaw || '0').replace(/[^\d.-]/g, '')) || 0;
      const nameField = categoryField || headers[0];
      const name = nameField && row[nameField] ? row[nameField].toString() : 'Point';
      return { x: xValue, y: yValue, name, z: 10 };
    })
    .filter(point => !isNaN(point.x) && !isNaN(point.y));
}

interface ScatterChartCardProps {
  title: string;
  tableData: any[];
  scatterXField: string | null;
  scatterYField: string | null;
  categoryField: string | null;
  headers: string[];
  available?: boolean;
}

// Custom X/Y Axis tick renderer
const renderCustomAxisTick = (props: any) => {
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

export function ScatterChartCard({ title, tableData, scatterXField, scatterYField, categoryField, headers, available }: ScatterChartCardProps) {
  const scatterData = buildScatterData(tableData, scatterXField, scatterYField, categoryField, headers);
  return (
    <Card className="mb-6 bg-white rounded-3xl shadow-2xl px-8 py-8 relative transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_16px_48px_0_rgba(60,72,100,0.20),0_4px_16px_0_rgba(60,72,100,0.14)] overflow-hidden border-none">
      {/* Glass streak for shine */}
      <div className="absolute top-4 left-1/4 w-2/3 h-8 bg-white/30 rounded-full rotate-[18deg] pointer-events-none z-20" />
      <div className="relative z-20">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center text-lg">
              <ScatterChartIcon className="h-5 w-5 mr-2 text-cyan-600" />
              {title || "Scatter Chart"}
            </CardTitle>
            <CardDescription>
              Scatter plot for correlation analysis
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 90, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={scatterXField || "X"}
                  label={{ value: scatterXField || 'X-Axis', position: 'insideBottom', dy: 20, fontSize: 12 }}
                  tick={renderCustomAxisTick}
                  height={80}
                  interval={0}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={scatterYField || "Y"}
                  label={{ value: scatterYField || 'Y-Axis', angle: -90, position: 'insideLeft', dx: -5, fontSize: 12 }}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  width={60}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <Tooltip
                  formatter={(value, name, props) => {
                    const pointName = props.payload?.name || 'Point';
                    const xVal = formatNumber(props.payload?.x);
                    const yVal = formatNumber(props.payload?.y);
                    return [`X: ${xVal}, Y: ${yVal}`, pointName];
                  }}
                  labelFormatter={() => ''}
                  cursor={{ strokeDasharray: '3 3' }}
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
                  payload={[{ value: `${scatterXField || 'X'} vs ${scatterYField || 'Y'}`, color: CHART_COLORS[0] }]}
                />
                <Scatter
                  name={`${scatterXField || 'X'} vs ${scatterYField || 'Y'}`}
                  data={scatterData}
                  fill={CHART_COLORS[0]}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </div>
    </Card>
  );
} 