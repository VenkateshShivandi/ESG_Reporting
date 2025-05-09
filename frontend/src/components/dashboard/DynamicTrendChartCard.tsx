import { useState, useMemo, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, X, Plus } from "lucide-react";
import * as htmlToImage from "html-to-image";
import { renderCustomAxisTick } from "./chart-utils";
import { Button } from "@/components/ui/button";

// --- Localization ---
const translations = {
  en: {
    title: "Dynamic Trend Chart",
    xAxis: "X-Axis",
    yAxis: "Y-Axis (Lines)",
    groupYears: "Years",
    groupProjections: "Projections/Forecasts",
    groupOther: "Other Metrics",
    noColumns: "No suitable columns found for trend chart. Please upload a table with at least one categorical and one numerical column.",
    tooltipYear: "Year column (detected)",
    tooltipProjection: "Projection/forecast column (detected)",
    tooltipOther: "Other numerical column",
    sample: "Sample value: ",
  },
  es: {
    title: "Gráfico de Tendencia Dinámico",
    xAxis: "Eje X",
    yAxis: "Eje Y (Líneas)",
    groupYears: "Años",
    groupProjections: "Proyecciones/Pronósticos",
    groupOther: "Otras Métricas",
    noColumns: "No se encontraron columnas adecuadas para el gráfico de tendencia. Por favor, suba una tabla con al menos una columna categórica y una numérica.",
    tooltipYear: "Columna de año (detectada)",
    tooltipProjection: "Columna de proyección/pronóstico (detectada)",
    tooltipOther: "Otra columna numérica",
    sample: "Valor de ejemplo: ",
  },
};
function getLang() {
  if (typeof window !== "undefined") {
    const lang = window.navigator.language || window.navigator.languages?.[0] || "en";
    return lang.startsWith("es") ? "es" : "en";
  }
  return "en";
}
const lang = getLang();
const t = translations[lang];

// --- Smart column detection ---
const yearRegex = /^(19|20)\d{2}$/;
const projectionKeywords = [
  "FP", "Proyección", "Proyeccion", "Forecast", "Estimate", "Estimado", "Projection", "Projected", "Capacidad", "Plan", "Target", "Objetivo"
];
function detectColumnType(header: string) {
  if (yearRegex.test(header)) return "year";
  if (projectionKeywords.some(k => header.toLowerCase().includes(k.toLowerCase()))) return "projection";
  return "other";
}

interface DynamicTrendChartCardProps {
  headers: string[];
  tableData: Record<string, any>[];
  yAxisScale?: 'linear' | 'log';
}

// Scenario definitions
const scenarios = [
  { key: "lower", label: { en: "Lower (-100%)", es: "Menor (-100%)" }, percent: -100, color: "red" },
  { key: "base", label: { en: "Base (0%)", es: "Base (0%)" }, percent: 0, color: "blue" },
  { key: "higher", label: { en: "Higher (+100%)", es: "Mayor (+100%)" }, percent: 100, color: "green" },
];

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

export default function DynamicTrendChartCard({ headers, tableData, yAxisScale = 'linear' }: DynamicTrendChartCardProps) {
  // Detect column types and group
  const columnGroups = useMemo(() => {
    const years: string[] = [];
    const projections: string[] = [];
    const others: string[] = [];
    if (!headers || !tableData || tableData.length === 0) return { years, projections, others };
    headers.forEach((header) => {
      // Only consider numerical columns
      const isNumeric = tableData.some((row) => {
        const val = row[header];
        return (
          (typeof val === "number" && !isNaN(val)) ||
          (typeof val === "string" && val.trim() !== "" && !isNaN(Number(val)))
        );
      });
      if (!isNumeric) return;
      const type = detectColumnType(header);
      if (type === "year") years.push(header);
      else if (type === "projection") projections.push(header);
      else others.push(header);
    });
    return { years, projections, others };
  }, [headers, tableData]);

  // All numerical columns fallback
  const allNumerical = useMemo(() => {
    if (!headers || !tableData || tableData.length === 0) return [];
    return headers.filter((header) =>
      tableData.some((row) => typeof row[header] === "number" && !isNaN(row[header]))
    );
  }, [headers, tableData]);

  // Default X: first non-numeric, else first header
  const defaultXAxis = useMemo(() => {
    if (!headers) return "";
    const nonNumeric = headers.find((h) => !allNumerical.includes(h));
    return nonNumeric || headers[0] || "";
  }, [headers, allNumerical]);

  // Default Y: years > projections > others > allNumerical
  const defaultYAxes = useMemo(() => {
    if (columnGroups.years.length > 0) return columnGroups.years.slice(0, 2);
    if (columnGroups.projections.length > 0) return columnGroups.projections.slice(0, 2);
    if (columnGroups.others.length > 0) return columnGroups.others.slice(0, 2);
    return allNumerical.slice(0, 2);
  }, [columnGroups, allNumerical]);

  const [xAxis, setXAxis] = useState(defaultXAxis);
  const [yAxes, setYAxes] = useState<string[]>(defaultYAxes);

  // Update defaults if table changes
  // eslint-disable-next-line
  useMemo(() => { setXAxis(defaultXAxis); setYAxes(defaultYAxes); }, [defaultXAxis, defaultYAxes]);

  // --- Scenario and projection state ---
  const [selectedScenario, setSelectedScenario] = useState("base");
  const [customPercent, setCustomPercent] = useState(5);
  const scenario = scenarios.find(s => s.key === selectedScenario) || scenarios[1];
  const projectionPercent = customPercent;

  // --- Projected line calculation ---
  // Assume X-axis is months if detected, else use all X values
  const xValues = useMemo(() => {
    if (!xAxis || !tableData) return [];
    // Try to get unique X values in order
    return Array.from(new Set(tableData.map(row => row[xAxis])));
  }, [tableData, xAxis]);

  // Find the Y column to project (first selected Y, or fallback)
  const projectedY = yAxes.length > 0 ? yAxes[0] : null;

  // Find the last real data point for the projected Y
  const lastRealIdx = useMemo(() => {
    if (!projectedY || !xValues.length) return -1;
    for (let i = tableData.length - 1; i >= 0; i--) {
      if (typeof tableData[i][projectedY] === "number" && !isNaN(tableData[i][projectedY])) {
        return i;
      }
    }
    return -1;
  }, [tableData, projectedY, xValues]);

  // Build projected line data
  const projectedLine = useMemo(() => {
    if (!projectedY || lastRealIdx === -1 || !xValues.length) return [];
    const base = tableData[lastRealIdx][projectedY];
    const projected = [];
    let value = base;
    for (let i = lastRealIdx + 1; i < xValues.length; i++) {
      value = value * (1 + projectionPercent / 100);
      projected.push({ [xAxis]: xValues[i], projected: value });
    }
    return projected;
  }, [projectedY, lastRealIdx, xValues, tableData, xAxis, projectionPercent]);

  // Build chart data with nulls for missing/unparseable values
  const chartData = useMemo(() => {
    if (!xAxis || yAxes.length === 0) return [];
    // Build a row for each unique X value
    return Array.from(new Set(tableData.map(row => row[xAxis])))
      .map(xVal => {
        const baseRow = tableData.find(row => row[xAxis] === xVal) || {};
        const rowObj: Record<string, any> = { [xAxis]: xVal };
        yAxes.forEach(y => {
          rowObj[y] = getNumericOrNull(baseRow[y]);
        });
        // Add projections if needed (existing logic)
        // ...
        return rowObj;
      });
  }, [tableData, xAxis, yAxes /*, projectedLine, etc. */]);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#4f46e5", "#be123c"];

  // Tooltip for Y-axis options
  function getTooltip(col: string) {
    const type = detectColumnType(col);
    let label = t.tooltipOther;
    if (type === "year") label = t.tooltipYear;
    else if (type === "projection") label = t.tooltipProjection;
    // Find a sample value
    const sample = tableData.find((row) => typeof row[col] === "number" && !isNaN(row[col]))?.[col];
    return `${label}${sample !== undefined ? `\n${t.sample}${sample}` : ""}`;
  }

  // --- Dynamic Y-axis dropdowns ---
  const allYOptions = useMemo(() => {
    // Grouped and labeled for dropdowns
    const opts: { label: string; options: string[] }[] = [];
    if (columnGroups.years.length > 0) opts.push({ label: t.groupYears, options: columnGroups.years });
    if (columnGroups.projections.length > 0) opts.push({ label: t.groupProjections, options: columnGroups.projections });
    if (columnGroups.others.length > 0) opts.push({ label: t.groupOther, options: columnGroups.others });
    if (opts.length === 0 && allNumerical.length > 0) opts.push({ label: t.groupOther, options: allNumerical });
    return opts;
  }, [columnGroups, allNumerical, t]);

  // Add new Y dropdown
  const addYDropdown = () => {
    const allCols = allYOptions.flatMap(g => g.options);
    const unused = allCols.find(col => !yAxes.includes(col));
    setYAxes(prev => [...prev, unused || allCols[0] || ""]);
  };

  // Remove Y dropdown
  const removeYDropdown = (idx: number) => {
    setYAxes(prev => prev.filter((_, i) => i !== idx));
  };

  // Change Y dropdown value
  const setYDropdown = (idx: number, value: string) => {
    setYAxes(prev => prev.map((col, i) => (i === idx ? value : col)));
  };

  // Prevent duplicate selections
  const availableYOptions = (idx: number) => {
    const selected = new Set(yAxes.filter((_, i) => i !== idx));
    return allYOptions.map(group => ({
      label: group.label,
      options: group.options.filter(opt => !selected.has(opt)),
    }));
  };

  const [showProjection, setShowProjection] = useState(false);

  // 1. Add state for projections: an array of { name: string, percent: number, scenario: string }
  const [projections, setProjections] = useState<{ name: string; percent: number; scenario: string }[]>([]);

  // 2. When "+ Add Projection" is clicked, add a new projection with a unique default name
  const addProjection = () => {
    setProjections(prev => {
      // Find the next available projection number
      let num = 1;
      let name = `Projection ${num}`;
      const existingNames = new Set(prev.map(p => p.name));
      while (existingNames.has(name)) {
        num++;
        name = `Projection ${num}`;
      }
      return [...prev, { name, percent: projectionPercent, scenario: selectedScenario }];
    });
  };

  // 3. Render each projection as a line, with an inline-editable name, a percent/slider, and remove (x) button
  // 4. Allow adding more projections with a "+" button
  // 5. Each projection line is calculated from the last real data point, using its percent
  // 6. Show all projections in the chart, with their custom names in the legend

  // --- Determine which series have all nulls or all zeros ---
  const seriesStatus = useMemo(() => {
    const status: Record<string, "allNull" | "allZero" | "mixed"> = {};
    yAxes.forEach(y => {
      const vals = chartData.map(row => row[y]);
      const allNull = vals.every(v => v === null || v === undefined);
      const allZero = vals.every(v => v === 0);
      status[y] = allNull ? "allNull" : allZero ? "allZero" : "mixed";
    });
    return status;
  }, [chartData, yAxes]);

  // --- Y-axis domain logic for all-zero case ---
  const yValues = yAxes.flatMap(y => chartData.map(row => row[y]).filter(v => typeof v === "number"));
  const allZeros = yValues.length > 0 && yValues.every(v => v === 0);
  const yAxisDomain: [number, number] | ['auto', (dataMax: number) => number] = allZeros ? [0, 1] : ['auto', (dataMax: number) => dataMax * 1.05];

  // --- Message logic ---
  const allSeriesMissing = yAxes.every(y => seriesStatus[y] === "allNull");
  const missingSeries = yAxes.filter(y => seriesStatus[y] === "allNull");
  const zeroSeries = yAxes.filter(y => seriesStatus[y] === "allZero");

  // Add a ref for the chart container to enable downloads
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Chart download handler
  const handleDownloadChart = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(chartRef.current, { backgroundColor: '#fff', pixelRatio: 2 });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = "dynamic-trend-chart.png";
      link.click();
    } catch (err) {
      console.error("Failed to export chart image:", err);
      alert('Failed to export chart image.');
    }
  };

  return (
    <Card className="mb-6 bg-white rounded-3xl shadow-2xl px-8 py-8 relative transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_16px_48px_0_rgba(60,72,100,0.20),0_4px_16px_0_rgba(60,72,100,0.14)] overflow-hidden border-none">
      <div className="absolute top-4 left-1/4 w-2/3 h-8 bg-white/30 rounded-full rotate-[18deg] pointer-events-none z-20" />
      <div className="relative z-20">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center text-lg">
            📈 {t.title}
          </CardTitle>
          <div className="flex space-x-2">
            {chartData.length > 0 && (
              <Button
                onClick={handleDownloadChart}
                variant="outline"
                className="h-9 px-3 border-gray-200 hover:bg-gray-50"
                disabled={chartData.length === 0 || allSeriesMissing}
                title="Download the trend chart as an image"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Chart
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* X and Y Axis Controls - Refactored Layout */}
          <div className="flex flex-col gap-4">
            {/* X-Axis Row */}
            <div className="flex items-end gap-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.xAxis}</label>
                <Select value={xAxis} onValueChange={setXAxis}>
                  <SelectTrigger className="w-48 h-11 border border-gray-300 rounded-xl bg-white shadow-sm text-base font-medium focus:ring-2 focus:ring-blue-200 focus:border-blue-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-gray-200 shadow-xl bg-white text-base font-medium">
                    {headers.map((header) => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Y-Axis Row */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.yAxis}</label>
              <div className="flex flex-row flex-wrap gap-2 items-center">
                {yAxes.map((col, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-1">
                    <Select
                      value={col}
                      onValueChange={val => setYDropdown(idx, val)}
                    >
                      <SelectTrigger className="w-48 h-11 border border-gray-300 rounded-xl bg-white shadow-sm text-base font-medium focus:ring-2 focus:ring-blue-200 focus:border-blue-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-gray-200 shadow-xl bg-white text-base font-medium">
                        {availableYOptions(idx).map(group => (
                          <div key={group.label}>
                            <div className="text-xs font-semibold text-gray-500 px-2 pt-2 pb-1">{group.label}</div>
                            {group.options.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                    {yAxes.length > 2 && (
                      <button type="button" className="ml-1 text-gray-400 hover:text-red-500" onClick={() => removeYDropdown(idx)} title={lang === "es" ? "Eliminar línea" : "Remove line"}>
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium ml-2" onClick={addYDropdown} title={lang === "es" ? "Agregar línea" : "Add line"}>
                  <Plus className="w-4 h-4" /> {lang === "es" ? "Agregar línea" : "Add line"}
                </button>
              </div>
            </div>
            {/* Add Projection Button and Controls */}
            <div className="mt-2 flex flex-col gap-2">
              {/* Render projection controls for each projection */}
              {projections.map((proj, idx) => {
                // Find the Y column to project (first selected Y, or fallback)
                const projY = yAxes.length > 0 ? yAxes[0] : null;
                // Find the last real data point for the projected Y
                const lastRealIdx = (() => {
                  if (!projY || !xValues.length) return -1;
                  for (let i = tableData.length - 1; i >= 0; i--) {
                    if (typeof tableData[i][projY] === "number" && !isNaN(tableData[i][projY])) {
                      return i;
                    }
                  }
                  return -1;
                })();
                // Calculate the next X value (e.g., next year or next period)
                let nextX = "Next Year";
                if (xValues.length > 0) {
                  const lastX = xValues[xValues.length - 1];
                  // Try to increment if it's a year
                  if (/^(19|20)\d{2}$/.test(lastX)) {
                    nextX = (parseInt(lastX) + idx + 1).toString();
                  } else {
                    nextX = proj.name;
                  }
                }
                // Calculate projected value
                let projectedValue = null;
                if (projY && lastRealIdx !== -1) {
                  let base = tableData[lastRealIdx][projY];
                  projectedValue = base * Math.pow(1 + proj.percent / 100, idx + 1);
                }
                return (
                  <div key={idx} className="flex items-center gap-3 bg-green-50 rounded-lg p-2 border border-green-200 relative">
                    <input
                      type="text"
                      value={proj.name}
                      onChange={e => {
                        const newName = e.target.value;
                        setProjections(prev => prev.map((p, i) => i === idx ? { ...p, name: newName } : p));
                      }}
                      className="w-32 px-2 py-1 rounded border border-gray-200 text-sm font-semibold text-green-700 bg-white focus:outline-none focus:border-green-400"
                    />
                    <div className="flex gap-2">
                      {scenarios.map(s => (
                        <button
                          key={s.key}
                          type="button"
                          className={`px-3 py-1 rounded border font-semibold text-xs transition-all shadow-sm ${proj.scenario === s.key ? `bg-${s.color}-600 text-white border-${s.color}-700` : `bg-white border-gray-200 text-${s.color}-700 hover:bg-${s.color}-50`}`}
                          onClick={() => setProjections(prev => prev.map((p, i) => i === idx ? { ...p, scenario: s.key, percent: s.percent } : p))}
                        >
                          {s.label[lang]}
                        </button>
                      ))}
                    </div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      step={0.1}
                      value={proj.percent}
                      onChange={e => setProjections(prev => prev.map((p, i) => i === idx ? { ...p, percent: Number(e.target.value), scenario: "" } : p))}
                      className="w-32 accent-green-600"
                    />
                    <span className="text-base font-bold text-green-700 min-w-[40px] text-right">{proj.percent}%</span>
                    <button type="button" className="text-gray-400 hover:text-red-500 ml-2" onClick={() => setProjections(prev => prev.filter((_, i) => i !== idx))} title={lang === "es" ? "Eliminar Proyección" : "Remove Projection"}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              <button type="button" className="flex items-center gap-1 text-green-600 hover:text-green-800 text-sm font-medium mt-1" onClick={addProjection}>
                <Plus className="w-4 h-4" /> {lang === "es" ? "Agregar Proyección" : "Add Projection"}
              </button>
            </div>
            {/* Chart remains below */}
            <div className="mt-6 relative">
              <div className="h-[500px] w-full relative" ref={chartRef}>
                {allSeriesMissing ? (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-lg">
                    No data available for selected series.
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 50, right: 40, left: 0, bottom: 90 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey={xAxis} tick={renderCustomAxisTick} height={80} interval={0} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickLine={{ stroke: '#e5e7eb' }}
                        domain={yAxisDomain}
                        scale={yAxisScale}
                      />
                    <Tooltip />
                    <Legend />
                      {yAxes.map((col, idx) =>
                        seriesStatus[col] !== "allNull" ? (
                      <Line
                            key={col}
                        type="monotone"
                            dataKey={col}
                            stroke={COLORS[idx % COLORS.length]}
                        strokeWidth={2.5}
                            dot={{ r: 2 }}
                            activeDot={{ r: 5 }}
                            connectNulls={false}
                      />
                        ) : null
                      )}
                  </LineChart>
                </ResponsiveContainer>
                )}
                {/* Per-series missing message */}
                {missingSeries.length > 0 && !allSeriesMissing && (
                  <div className="absolute top-2 right-2 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded shadow">
                    {missingSeries.map(s => `No data for ${s}`).join(", ")}
                  </div>
                )}
                {/* Optionally, per-series all-zero message */}
                {zeroSeries.length > 0 && (
                  <div className="absolute top-8 right-2 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded shadow">
                    {zeroSeries.map(s => `All values are zero for ${s}`).join(", ")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
} 