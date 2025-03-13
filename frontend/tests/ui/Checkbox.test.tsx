import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { Checkbox } from "@/components/ui/checkbox"

describe("Checkbox component", () => {
    test("renders and toggles checked state on click", () => {
        render(<Checkbox data-testid="checkbox" />)
        const checkbox = screen.getByTestId("checkbox")

        // Initially, there should be no check icon
        expect(checkbox.querySelector("svg")).toBeNull()

        // Simulate click
        fireEvent.click(checkbox)

        // After clicking, the check icon should be displayed
        expect(checkbox.querySelector("svg")).toBeInTheDocument()
    })
}) 