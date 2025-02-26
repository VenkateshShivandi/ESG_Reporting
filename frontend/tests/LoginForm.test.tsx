import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import LoginForm from "@/components/auth/LoginForm"
import { signIn } from "@/lib/auth"

// mock signIn
jest.mock("@/lib/auth", () => ({
  signIn: jest.fn(() => Promise.resolve({ error: null })),
  signInWithOAuth: jest.fn(),
}))

// mock useRouter in next/navigation
const pushMock = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

describe("LoginForm", () => {
  test("renders the login form with email and password inputs", () => {
    render(<LoginForm />)
    const emailInput = screen.getByPlaceholderText(/enter your email/i)
    const passwordInput = screen.getByPlaceholderText(/enter your password/i)
    const loginButton = screen.getByRole("button", { name: /log in/i })

    expect(emailInput).toBeInTheDocument()
    expect(passwordInput).toBeInTheDocument()
    expect(loginButton).toBeInTheDocument()
  })

  test("calls signIn on form submission and navigates to dashboard", async () => {
    render(<LoginForm />)
    const emailInput = screen.getByPlaceholderText(/enter your email/i)
    const passwordInput = screen.getByPlaceholderText(/enter your password/i)
    const loginButton = screen.getByRole("button", { name: /log in/i })

    // simulate user input
    fireEvent.change(emailInput, { target: { value: "test@example.com" } })
    fireEvent.change(passwordInput, { target: { value: "Password123!" } })

    // submit form
    fireEvent.click(loginButton)

    // wait for signIn to be called
    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("test@example.com", "Password123!")
    })

    // check route navigation (push called to /)
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/")
    })
  })
}) 