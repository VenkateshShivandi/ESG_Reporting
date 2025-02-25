import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import SignupForm from "@/components/auth/SignupForm"
import { signUp } from "@/lib/auth"

// mock auth functions
jest.mock("@/lib/auth", () => ({
    signUp: jest.fn(() => Promise.resolve({ error: null })),
    signInWithOAuth: jest.fn(),
}))

// mock useRouter in next/navigation
const pushMock = jest.fn()
jest.mock("next/navigation", () => ({
    useRouter: () => ({
        push: pushMock,
    }),
}))

describe("SignupForm", () => {
    test("renders the signup form with all inputs", () => {
        render(<SignupForm />)
        const emailInput = screen.getByPlaceholderText(/enter your email/i)
        const passwordInput = screen.getByPlaceholderText(/create a password/i)
        const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i)
        const signupButton = screen.getByRole("button", { name: /sign up/i })

        expect(emailInput).toBeInTheDocument()
        expect(passwordInput).toBeInTheDocument()
        expect(confirmPasswordInput).toBeInTheDocument()
        expect(signupButton).toBeInTheDocument()
    })

    test("shows password strength meter when password is entered", async () => {
        render(<SignupForm />)
        const passwordInput = screen.getByPlaceholderText(/create a password/i)

        fireEvent.change(passwordInput, { target: { value: "test123" } })

        await waitFor(() => {
            expect(screen.getByText(/password strength:/i)).toBeInTheDocument()
        })
    })

    test("calls signUp on form submission and navigates to dashboard", async () => {
        render(<SignupForm />)
        const emailInput = screen.getByPlaceholderText(/enter your email/i)
        const passwordInput = screen.getByPlaceholderText(/create a password/i)
        const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i)
        const signupButton = screen.getByRole("button", { name: /sign up/i })

        // simulate user input
        fireEvent.change(emailInput, { target: { value: "test@example.com" } })
        fireEvent.change(passwordInput, { target: { value: "Password123!" } })
        fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } })

        // submit form
        fireEvent.click(signupButton)

        // wait for signUp to be called
        await waitFor(() => {
            expect(signUp).toHaveBeenCalledWith("test@example.com", "Password123!")
        })

        // check route navigation (push called to /dashboard)
        await waitFor(() => {
            expect(pushMock).toHaveBeenCalledWith("/dashboard")
        })
    })

    test("links navigate to correct paths", () => {
        render(<SignupForm />)
        const loginLink = screen.getByText(/log in/i)
        const backToHomeLink = screen.getByText(/back to home/i)

        expect(loginLink).toHaveAttribute("href", "/auth/login")
        expect(backToHomeLink).toHaveAttribute("href", "/")
    })
}) 