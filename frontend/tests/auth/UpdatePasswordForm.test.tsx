import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm"
import { updatePassword } from "@/lib/auth"

// mock updatePassword
jest.mock("@/lib/auth", () => ({
  updatePassword: jest.fn(() => Promise.resolve({ error: null })),
}))

// mock useRouter in next/navigation
const pushMock = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

describe("UpdatePasswordForm", () => {
  test("renders the update password form with all inputs", () => {
    render(<UpdatePasswordForm />)
    const newPasswordInput = screen.getByLabelText("New password")
    const confirmPasswordInput = screen.getByLabelText("Confirm new password")
    const updateButton = screen.getByRole("button", { name: /update password/i })

    expect(newPasswordInput).toBeInTheDocument()
    expect(confirmPasswordInput).toBeInTheDocument()
    expect(updateButton).toBeInTheDocument()
  })

  test("shows password strength meter when password is entered", async () => {
    render(<UpdatePasswordForm />)
    const newPasswordInput = screen.getByLabelText("New password")

    fireEvent.change(newPasswordInput, { target: { value: "test123" } })
    
    await waitFor(() => {
      expect(screen.getByText(/password strength:/i)).toBeInTheDocument()
    })
  })

  test("calls updatePassword on form submission and navigates to login", async () => {
    render(<UpdatePasswordForm />)
    const newPasswordInput = screen.getByLabelText("New password")
    const confirmPasswordInput = screen.getByLabelText("Confirm new password")
    const updateButton = screen.getByRole("button", { name: /update password/i })

    // simulate user input
    fireEvent.change(newPasswordInput, { target: { value: "NewPassword123!" } })
    fireEvent.change(confirmPasswordInput, { target: { value: "NewPassword123!" } })

    // submit form
    fireEvent.click(updateButton)

    // wait for updatePassword to be called
    await waitFor(() => {
      expect(updatePassword).toHaveBeenCalledWith("NewPassword123!")
    })

    // check route navigation (push called to /auth/login)
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/auth/login")
    }, { timeout: 2500 }) // allow for 2s delay in component
  })

  test("sign in link navigates to login", () => {
    render(<UpdatePasswordForm />)
    const signInLink = screen.getByText(/sign in/i)
    expect(signInLink).toHaveAttribute("href", "/auth/login")
  })
}) 