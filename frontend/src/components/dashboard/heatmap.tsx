"use client"

import { useMemo } from "react"

interface HeatmapProps {
  data: Array<{
    year: string
    emissions: number
    energy: number
    water: number
    waste: number
  }>
}

export function Heatmap({ data }: HeatmapProps) {
  const factors = ["emissions", "energy", "water", "waste"]

  const maxValues = useMemo(() => {
    return factors.reduce(
      (acc, factor) => {
        acc[factor] = Math.max(...data.map((d) => d[factor as keyof typeof d] as number))
        return acc
      },
      {} as Record<string, number>,
    )
  }, [data])

  const getColor = (intensity: number) => {
    const red = Math.floor(50 + (220 - 50) * intensity)
    const green = Math.floor(150 + (250 - 150) * intensity)
    const blue = Math.floor(50 + (220 - 50) * intensity)
    return `rgb(${red}, ${green}, ${blue})`
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="p-2 bg-gray-100 rounded-tl-md">Year</th>
              {factors.map((factor, index) => (
                <th
                  key={factor}
                  className={`p-2 bg-gray-100 capitalize ${index === factors.length - 1 ? "rounded-tr-md" : ""
                    }`}
                >
                  {factor}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((yearData, rowIndex) => (
              <tr key={yearData.year}>
                <td className="p-2 font-bold bg-gray-50">
                  {yearData.year}
                </td>
                {factors.map((factor) => {
                  const value = yearData[factor as keyof typeof yearData] as number
                  const intensity = value / maxValues[factor]
                  return (
                    <td
                      key={factor}
                      className="p-2 text-center"
                      style={{
                        backgroundColor: getColor(intensity),
                        color: intensity < 0.6 ? "white" : "black",
                      }}
                    >
                      {value.toFixed(0)}
                    </td>
                  )
                })}
              </tr>
            ))}
            <tr>
              <td className="p-2 rounded-bl-md bg-gray-50"></td>
              {factors.map((factor, index) => (
                <td
                  key={`footer-${factor}`}
                  className={`p-1 ${index === factors.length - 1 ? "rounded-br-md" : ""}`}
                ></td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex justify-center items-center text-sm">
        <div className="mr-2">Low Impact</div>
        <div className="w-48 h-3 bg-gradient-to-r from-[#329632] to-[#dcfadc] rounded"></div>
        <div className="ml-2">High Impact</div>
      </div>
    </div>
  )
}

