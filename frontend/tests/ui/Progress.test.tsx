import React from "react"
import { render } from "@testing-library/react"
import { Progress } from "@/components/ui/progress"

describe("Progress component", () => {
  test("renders progress indicator with correct transform based on value", () => {
    const { container } = render(<Progress value={60} />)
    // Based on the Progress component logic, translateX(-${100 - value}%) should be translateX(-40%)
    const indicator = container.querySelector('[style*="translateX(-40%)"]')
    expect(indicator).toBeInTheDocument()
  })
}) 