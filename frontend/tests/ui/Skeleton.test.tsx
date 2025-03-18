import React from "react"
import { render, screen } from "@testing-library/react"
import { Skeleton } from "@/components/ui/skeleton"

describe("Skeleton component", () => {
  test("renders with animate-pulse class", () => {
    render(<Skeleton data-testid="skeleton" />)
    const skeleton = screen.getByTestId("skeleton")
    expect(skeleton).toHaveClass("animate-pulse")
  })
}) 