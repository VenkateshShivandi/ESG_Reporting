import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet"

describe("Sheet component", () => {
  test("renders children when open and triggers onOpenChange when closed", async () => {
    const onOpenChange = jest.fn()
    render(
      <Sheet open={true} onOpenChange={onOpenChange}>
        <SheetTrigger>Open Sheet</SheetTrigger>
        <SheetContent>
          <SheetTitle>Sheet Title</SheetTitle>
          <SheetDescription>This is a description of the sheet.</SheetDescription>
          <div data-testid="sheet-content">Sheet Content</div>
          <SheetClose data-testid="close-button">Close</SheetClose>
        </SheetContent>
      </Sheet>
    )

    expect(screen.getByTestId("sheet-content")).toBeInTheDocument()

    fireEvent.click(screen.getByTestId("close-button"))

    // After clicking close, onOpenChange should be called and passed false
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalled()
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })
}) 