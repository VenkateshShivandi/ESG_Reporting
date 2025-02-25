import React from "react"
import { render, screen } from "@testing-library/react"
import { ScrollArea } from "@/components/ui/scroll-area"

describe("ScrollArea component", () => {
  test("renders children inside the scroll area", () => {
    render(
      <ScrollArea data-testid="scroll-area">
        <div>Scrollable Content</div>
      </ScrollArea>
    )
    expect(screen.getByText("Scrollable Content")).toBeInTheDocument()
  })
}) 