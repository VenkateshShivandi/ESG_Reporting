import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter"

describe("PasswordStrengthMeter", () => {
  test("displays weak strength for an empty password", async () => {
    render(<PasswordStrengthMeter password="" />)
    await waitFor(() => {
      expect(screen.getByText(/Password strength: weak/i)).toBeInTheDocument()
    })
  })

  test("displays medium strength for moderately complex password", async () => {
    // for example: includes uppercase, lowercase, and numbers but no special characters
    render(<PasswordStrengthMeter password="Abcd1234" />)
    await waitFor(() => {
      expect(screen.getByText(/Password strength: medium/i)).toBeInTheDocument()
    })
  })

  test("displays strong strength for a complex password", async () => {
    // for example: includes uppercase, lowercase, numbers and special characters
    render(<PasswordStrengthMeter password="Abcd1234!" />)
    await waitFor(() => {
      expect(screen.getByText(/Password strength: strong/i)).toBeInTheDocument()
    })
  })
}) 