"use client"

import { useMemo, useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { BarChart2, ChevronLeft, ChevronRight } from "lucide-react" // Use a generic icon and navigation icons
import { Button } from "@/components/ui/button" // Import Button component
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface GenericHeatmapPreviewProps {
  parsedData: {
    headers: string[]
    tableData: Record<string, any>[]
  } | null
}

// Helper function to format numbers with k suffix
const formatNumber = (num: number): string => {
  if (Math.abs(num) >= 1000000) {
    return (num / 1000000).toFixed(1) + "M"
  }
  if (Math.abs(num) >= 1000) {
    return (num / 1000).toFixed(1) + "k"
  }
  if (Math.abs(num) < 1 && Math.abs(num) > 0) {
      return num.toFixed(2); // Show decimals for small numbers
  }
  return num.toFixed(0) // No decimals for integers or larger numbers < 1000
}

// Helper function to determine card background color based on value magnitude
// Interpolates from green (low) to yellow (mid) to red (high)
const getValueColor = (value: number, minVal: number, maxVal: number): string => {
  if (minVal === maxVal) return "bg-slate-600"; // Handle single value case

  const range = maxVal - minVal;
  const normalizedValue = (value - minVal) / range; // Value between 0 and 1

  let r, g, b;

  if (normalizedValue < 0.5) {
    // Interpolate between green (0, 128, 0) and yellow (255, 255, 0)
    const factor = normalizedValue * 2; // Scale 0-0.5 to 0-1
    r = Math.round(0 + factor * (255 - 0));
    g = Math.round(128 + factor * (255 - 128));
    b = 0;
    // Use shades of green/teal for lower values
    // return `bg-emerald-${Math.max(5, Math.round(9 - normalizedValue * 8)) * 100}`;
  } else {
    // Interpolate between yellow (255, 255, 0) and red (255, 0, 0)
    const factor = (normalizedValue - 0.5) * 2; // Scale 0.5-1 to 0-1
    r = 255;
    g = Math.round(255 + factor * (0 - 255));
    b = 0;
   // Use shades of orange/red for higher values
   // return `bg-orange-${Math.max(5, Math.round(5 + (normalizedValue-0.5)*8)) * 100}`;
  }
  
   // Using fixed palette based on normalized value for better contrast/steps
  if (normalizedValue <= 0.1) return "bg-emerald-800";
  if (normalizedValue <= 0.3) return "bg-emerald-700";
  if (normalizedValue <= 0.5) return "bg-yellow-600";
  if (normalizedValue <= 0.7) return "bg-orange-700";
  return "bg-red-800";
}

export default function GenericHeatmapPreview({ parsedData }: GenericHeatmapPreviewProps) {
  // Add pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const cardsPerPage = 10; // Show 10 cards per page
  
  // Add state for column selection
  const [selectedCategoryField, setSelectedCategoryField] = useState<string>("");
  const [selectedValueField, setSelectedValueField] = useState<string>("");

  const heatmapData = useMemo(() => {
    if (!parsedData?.tableData || parsedData.tableData.length === 0 || !parsedData.headers || parsedData.headers.length < 2) {
      return { cards: [], title: "Data Distribution Heatmap", categoryField: "", valueField: "" };
    }

    // --- Identify Category and Value Fields --- 
    console.log("[Heatmap] Initial Headers:", parsedData.headers);
    
    // Use user-selected fields if set, otherwise auto-detect
    let categoryField = selectedCategoryField || parsedData.headers[0]; 
    let valueField = selectedValueField || "";
    
    // Only auto-detect if not manually selected
    if (!selectedCategoryField) {
      // Find first likely string/object column as category (should not look numeric)
      const firstStringCol = parsedData.headers.find(h => {
          const firstValidValue = parsedData.tableData.find(row => row[h] != null)?.[h];
          // Ensure it's likely a string and not easily parsed as a number
          return firstValidValue != null && typeof firstValidValue === 'string' && isNaN(Number(String(firstValidValue).replace(/[,$%*]/g, '')));
      });
      if (firstStringCol) categoryField = firstStringCol;
      console.log("[Heatmap] Auto-detected Category Field:", categoryField);
    }

    // Only auto-detect value field if not manually selected
    if (!selectedValueField) {
      // Find first likely numeric column as value (preferring non-category, non-ID)
      const potentialValueFields = parsedData.headers.filter(h => {
          if (h === categoryField) return false; // Don't pick category as value
          
          // Deprioritize common ID/Code patterns
          const lowerH = h.toLowerCase();
          if (lowerH.includes('cve') || lowerH.includes('id') || lowerH === 'no.' || lowerH.includes('code')) {
              return false; 
          }
          
          // Check if a significant portion of non-null values can be parsed as numbers
          let numericCount = 0;
          let nonNullCount = 0;
          parsedData.tableData.forEach(row => {
              const val = row[h];
              if (val != null && String(val).trim() !== '') {
                  nonNullCount++;
                  if (!isNaN(Number(String(val).replace(/[,$%*]/g, '')))) {
                      numericCount++;
                  }
              }
          });
          // Require at least 70% of non-null values to be numeric-parseable
          return nonNullCount > 0 && (numericCount / nonNullCount) >= 0.7; 
      });

      console.log("[Heatmap] Potential Value Fields (numeric & not ID/Category):", potentialValueFields);
      valueField = potentialValueFields[0] || ""; // Pick the first likely candidate

      // Fallback if no numeric found, pick the first non-category column
      if (!valueField && parsedData.headers.length > 1) {
        valueField = parsedData.headers.find(h => h !== categoryField) || "";
        console.log("[Heatmap] Fallback Value Field (first non-category):", valueField);
      }
      
      // Final fallback if only one column
      if (!valueField && parsedData.headers.length === 1) {
          valueField = parsedData.headers[0] || "";
          console.log("[Heatmap] Fallback Value Field (only one column):", valueField);
      }
    }

    if (!valueField || !categoryField) {
         // Cannot proceed if fields aren't identified
         console.error("[Heatmap] Could not reliably determine Category or Value field.");
         return { cards: [], title: "Cannot Determine Columns", categoryField: "", valueField: "" };
    }
    console.log(`[Heatmap] Final Selection - Category: ${categoryField}, Value: ${valueField}`);
    // --- End Identification ---

    const aggregatedData: Record<string, number> = {};
    let validRowCount = 0;

    // --- Aggregate Data --- 
    parsedData.tableData.forEach(row => {
      const category = row[categoryField]?.toString() || 'N/A';
      // Ensure valueField exists before trying to access it
      let valueStr = valueField && row[valueField] != null ? String(row[valueField]).replace(/[,$*]/g, '') : '0';
      const value = Number.parseFloat(valueStr);

      if (!isNaN(value)) { // Only include if value is a valid number
          if (aggregatedData[category]) {
            aggregatedData[category] += value;
          } else {
            aggregatedData[category] = value;
          }
          validRowCount++;
      }
    });
    console.log("[Heatmap] Aggregated Data:", aggregatedData); // Log aggregated data
    
    if (Object.keys(aggregatedData).length === 0) {
         console.warn(`[Heatmap] No numeric data found in selected value column '${valueField}'.`);
         return { cards: [], title: `No Numeric Data in '${valueField}'`, categoryField, valueField };
    }
    // --- End Aggregation ---
    
    const values = Object.values(aggregatedData);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    const cards = Object.entries(aggregatedData)
      .map(([name, value]) => ({
        name,
        value,
        color: getValueColor(value, minVal, maxVal),
        unit: String(valueField).includes('kWh') ? 'kWh' : String(valueField).includes('%') ? '%' : '' // Basic unit inference
      }))
      .sort((a, b) => b.value - a.value); // Sort by value descending

    const title = `Distribution of ${valueField} by ${categoryField}`;

    return { cards, title, categoryField, valueField };

  }, [parsedData, selectedCategoryField, selectedValueField]);

  // Set initial field selections when data changes or auto-detection happens
  useEffect(() => {
    if (heatmapData.categoryField && !selectedCategoryField) {
      setSelectedCategoryField(heatmapData.categoryField);
    }
    
    if (heatmapData.valueField && !selectedValueField) {
      setSelectedValueField(heatmapData.valueField);
    }
  }, [heatmapData.categoryField, heatmapData.valueField, selectedCategoryField, selectedValueField]);

  // Reset pagination when selection changes
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedCategoryField, selectedValueField]);

  const hasValidData = heatmapData.cards.length > 0;
  
  // Calculate pagination details
  const totalPages = Math.ceil(heatmapData.cards.length / cardsPerPage);
  const startIndex = currentPage * cardsPerPage;
  const endIndex = startIndex + cardsPerPage;
  const currentCards = heatmapData.cards.slice(startIndex, endIndex);
  
  // Pagination handlers
  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };
  
  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  return (
    <div className="w-full bg-slate-900 p-4 rounded-lg mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white text-xl font-semibold flex items-center">
          <BarChart2 className="h-5 w-5 mr-2 text-sky-400" />
          Heatmap Distribution
        </h2>
        {hasValidData && (
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-emerald-700"></span>
                <span className="text-slate-300 text-xs">Lower Value</span>
              </div>
               <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-yellow-600"></span>
                <span className="text-slate-300 text-xs">Mid Value</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-red-700"></span>
                <span className="text-slate-300 text-xs">Higher Value</span>
              </div>
            </div>
        )}
      </div>

      {/* Field selection controls */}
      {parsedData?.headers && parsedData.headers.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4 relative">
          <Select 
            value={selectedCategoryField} 
            onValueChange={setSelectedCategoryField}
          >
            <SelectTrigger className="w-[180px] h-9 bg-slate-800 border-slate-700 text-slate-300">
              <SelectValue placeholder="Category Field" />
            </SelectTrigger>
            <SelectContent 
              className="bg-slate-800 border-slate-700 text-slate-300 z-[100] min-w-[180px]" 
              position="popper"
              sideOffset={5}
              align="start"
            >
              {parsedData.headers.map(header => (
                <SelectItem key={`cat-${header}`} value={header} className="hover:bg-slate-700 focus:bg-slate-700 focus:text-white">
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={selectedValueField} 
            onValueChange={setSelectedValueField}
          >
            <SelectTrigger className="w-[180px] h-9 bg-slate-800 border-slate-700 text-slate-300">
              <SelectValue placeholder="Value Field" />
            </SelectTrigger>
            <SelectContent 
              className="bg-slate-800 border-slate-700 text-slate-300 z-[100] min-w-[180px]" 
              position="popper"
              sideOffset={5}
              align="start"
            >
              {parsedData.headers.map(header => (
                <SelectItem key={`val-${header}`} value={header} className="hover:bg-slate-700 focus:bg-slate-700 focus:text-white">
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {hasValidData ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {currentCards.map((card) => (
              <Card
                key={card.name}
                className={`${card.color} border-none text-white p-3 rounded-md shadow-md hover:shadow-lg transition-shadow duration-200`}
              >
                <h3 className="text-sm font-medium truncate mb-1" title={card.name}>{card.name}</h3>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold">{formatNumber(card.value)}</span>
                  {card.unit && <span className="ml-1 text-xs opacity-80">{card.unit}</span>}
                </div>
              </Card>
            ))}
          </div>
          
          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-slate-300">
              <p className="text-sm">
                Showing {startIndex + 1}-{Math.min(endIndex, heatmapData.cards.length)} of {heatmapData.cards.length} locations
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage} 
                  disabled={currentPage === 0}
                  className="text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous page</span>
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage} 
                  disabled={currentPage >= totalPages - 1}
                  className="text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next page</span>
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
         <div className="flex flex-col items-center justify-center h-[100px] bg-slate-800 rounded-md border border-dashed border-slate-700">
            <p className="text-slate-400 text-center text-sm">
              {!selectedCategoryField || !selectedValueField 
                ? "Please select category and value fields to visualize data" 
                : heatmapData.title.startsWith('Cannot') || heatmapData.title.startsWith('No Numeric') 
                  ? heatmapData.title 
                  : 'Not enough data for visualization with selected fields.'
              }
            </p>
          </div>
      )}
    </div>
  )
} 