"use client"

import { useEffect, useState } from "react"
import * as d3 from "d3"

interface HeatmapProps {
  data: Array<{
    year: string
    emissions: number
    energy: number
    water: number
    waste: number
  }>
  config?: {
    title?: string
    showLegend?: boolean
    dataKeys?: string[]
    colors?: string[]
  }
}

export function Heatmap({ data, config }: HeatmapProps) {
  const [mounted, setMounted] = useState(false)

  // Default configuration
  const defaultConfig = {
    showLegend: true,
    dataKeys: ["emissions", "energy", "water", "waste"],
    colors: ["#E8F5E9", "#C8E6C9", "#81C784", "#4CAF50", "#2E7D32"]
  }

  // Merge provided config with defaults
  const mergedConfig = { ...defaultConfig, ...config }
  const { showLegend, dataKeys, colors } = mergedConfig

  useEffect(() => {
    setMounted(true)

    if (mounted && data.length > 0) {
      renderHeatmap()
    }

    return () => {
      const svg = d3.select("#heatmap-container svg")
      if (!svg.empty()) {
        svg.remove()
      }
    }
  }, [data, mounted, showLegend, dataKeys, colors])

  const renderHeatmap = () => {
    // Clear previous SVG
    d3.select("#heatmap-container svg").remove()

    const margin = { top: 20, right: 30, bottom: 30, left: 40 }
    const width = 400 - margin.left - margin.right
    const height = 250 - margin.top - margin.bottom

    const svg = d3
      .select("#heatmap-container")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // Get all metrics data for scaling
    const allValues: number[] = []
    data.forEach((d) => {
      dataKeys.forEach((key) => {
        allValues.push(d[key as keyof typeof d] as number)
      })
    })

    // Color scale
    const colorScale = d3
      .scaleQuantile<string>()
      .domain([Math.min(...allValues), Math.max(...allValues)])
      .range(colors)

    // Create X scale
    const x = d3
      .scaleBand()
      .range([0, width])
      .domain(data.map((d) => d.year))
      .padding(0.05)

    // Create Y scale
    const y = d3
      .scaleBand()
      .range([height, 0])
      .domain(dataKeys)
      .padding(0.05)

    // Add X axis
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))

    // Add X-axis Label
    svg.append("text")
        .attr("class", "x-axis-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10) // Positioned within the bottom margin
        .style("font-size", "10px")
        .text("Year")

    // Add Y axis
    svg.append("g").call(d3.axisLeft(y).tickSizeOuter(0))

    // Add cells
    dataKeys.forEach((key) => {
      svg
        .selectAll(`.cell-${key}`)
        .data(data)
        .enter()
        .append("rect")
        .attr("class", `cell-${key}`)
        .attr("x", (d) => x(d.year) as number)
        .attr("y", y(key) as number)
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", (d) => colorScale(d[key as keyof typeof d] as number))
        .style("stroke", "#fff")
        .style("stroke-width", 1)
        .on("mouseover", function (event, d) {
          d3.select(this).style("stroke", "#333").style("stroke-width", 2)

          // Create tooltip
          const value = d[key as keyof typeof d]
          const tooltip = d3.select("#heatmap-container")
            .append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "white")
            .style("padding", "5px")
            .style("border", "1px solid #ccc")
            .style("border-radius", "4px")
            .style("pointer-events", "none")
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 25}px`)
            .html(`${key}: ${value}`)
        })
        .on("mouseout", function () {
          d3.select(this).style("stroke", "#fff").style("stroke-width", 1)
          d3.select("#heatmap-container .tooltip").remove()
        })
    })

    // Add legend if showLegend is true
    if (showLegend) {
      const legendWidth = 200
      const legendHeight = 20
      const legendValues = d3.range(
        Math.min(...allValues),
        Math.max(...allValues),
        (Math.max(...allValues) - Math.min(...allValues)) / colors.length
      )

      const legendScale = d3
        .scaleLinear()
        .domain([Math.min(...allValues), Math.max(...allValues)])
        .range([0, legendWidth])

      const legend = svg
        .append("g")
        .attr("transform", `translate(${width - legendWidth}, ${height + 20})`)

      legend
        .selectAll("rect")
        .data(legendValues)
        .enter()
        .append("rect")
        .attr("x", (d) => legendScale(d))
        .attr("width", legendWidth / colors.length)
        .attr("height", legendHeight)
        .style("fill", (d) => colorScale(d))

      // Add legend axis
      const legendAxis = d3
        .axisBottom(legendScale)
        .ticks(5)
        .tickFormat((d) => d3.format(".1f")(d as number))

      legend
        .append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis)

      // Add legend labels
      legend
        .append("text")
        .attr("class", "legend-label-low")
        .attr("x", 0)
        .attr("y", legendHeight + 15) // Position below the axis
        .style("font-size", "10px")
        .style("text-anchor", "start")
        .text("Low Impact");

      legend
        .append("text")
        .attr("class", "legend-label-high")
        .attr("x", legendWidth)
        .attr("y", legendHeight + 15) // Position below the axis
        .style("font-size", "10px")
        .style("text-anchor", "end")
        .text("High Impact");
    }
  }

  return (
    <div className="w-full">
      <div id="heatmap-container" className="h-[250px] w-full relative" />
    </div>
  )
}

