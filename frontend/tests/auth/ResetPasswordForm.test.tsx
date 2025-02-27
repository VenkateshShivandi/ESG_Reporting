import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import ResetPasswordForm from "@/components/auth/ResetPasswordForm"
import { resetPassword } from "@/lib/auth"

// mock resetPassword
jest.mock("@/lib/auth", () => ({
    resetPassword: jest.fn(() => Promise.resolve({ error: null })),
}))

// mock useRouter in next/navigation
const pushMock = jest.fn()
jest.mock("next/navigation", () => ({
    useRouter: () => ({
        push: pushMock,
    }),
}))

describe("ResetPasswordForm", () => {
    test("renders the reset password form with email input", () => {
        render(<ResetPasswordForm />)
        const emailInput = screen.getByPlaceholderText(/enter your email/i)
        const resetButton = screen.getByRole("button", { name: /send reset link/i })

        expect(emailInput).toBeInTheDocument()
        expect(resetButton).toBeInTheDocument()
    })

    test("calls resetPassword on form submission and navigates to login", async () => {
        render(<ResetPasswordForm />)
        const emailInput = screen.getByPlaceholderText(/enter your email/i)
        const resetButton = screen.getByRole("button", { name: /send reset link/i })

        // simulate user input
        fireEvent.change(emailInput, { target: { value: "test@example.com" } })

        // submit form
        fireEvent.click(resetButton)

        // wait for resetPassword to be called
        await waitFor(() => {
            expect(resetPassword).toHaveBeenCalledWith("test@example.com")
        })

        // check route navigation (push called to /auth/login)
        await waitFor(() => {
            expect(pushMock).toHaveBeenCalledWith("/auth/login")
        })
    })

    test("links navigate to correct paths", () => {
        render(<ResetPasswordForm />)
        const backToLoginLink = screen.getByText(/back to login/i)
        const backToHomeLink = screen.getByText(/back to home/i)

        expect(backToLoginLink).toHaveAttribute("href", "/auth/login")
        expect(backToHomeLink).toHaveAttribute("href", "/")
    })
}) 