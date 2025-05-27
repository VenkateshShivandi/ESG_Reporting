import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import SignupForm from '@/components/auth/SignupForm'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'

jest.mock('@/hooks/use-auth')
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

const mockSignUp = jest.fn()
const mockSignInWithGoogle = jest.fn()
const mockPush = jest.fn()
jest.clearAllMocks()

beforeEach(() => {
  (useAuth as jest.Mock).mockReturnValue({
    signUp: mockSignUp,
    signInWithGoogle: mockSignInWithGoogle,
    user: null,
    session: null,
    isLoading: false,
    isAuthenticated: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
  })
  ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
})

/**
 * Render the SignupForm and check for all fields and buttons.
 */
test('renders all form fields and buttons', () => {
  render(<SignupForm />)
  expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
  expect(screen.getByText(/already have an account/i)).toBeInTheDocument()
})

/**
 * Test validation errors for invalid email and password.
 */
test('shows validation errors for invalid input', async () => {
  render(<SignupForm />)
  fireEvent.input(screen.getByLabelText(/email address/i), { target: { value: 'bademail' } })
  fireEvent.input(screen.getByLabelText(/^password$/i), { target: { value: 'short' } })
  fireEvent.input(screen.getByLabelText(/confirm password/i), { target: { value: 'different' } })
  fireEvent.click(screen.getByRole('button', { name: /create account/i }))

  await waitFor(() => {
    expect(screen.getByText(/Must be at least 8 characters and include a number and a special character/i)).toBeInTheDocument()
  })
})

/**
 * Test password visibility toggling for password and confirm password fields.
 */
test('toggles password visibility', () => {
  render(<SignupForm />)
  const passwordInput = screen.getByLabelText(/^password$/i)
  const toggleBtn = screen.getAllByRole('button', { name: /show password|hide password/i })[0]
  expect(passwordInput).toHaveAttribute('type', 'password')
  fireEvent.click(toggleBtn)
  expect(passwordInput).toHaveAttribute('type', 'text')
  fireEvent.click(toggleBtn)
  expect(passwordInput).toHaveAttribute('type', 'password')
})

test('toggles confirm password visibility', () => {
  render(<SignupForm />)
  const confirmInput = screen.getByLabelText(/confirm password/i)
  const toggleBtn = screen.getAllByRole('button', { name: /show password|hide password/i })[1]
  expect(confirmInput).toHaveAttribute('type', 'password')
  fireEvent.click(toggleBtn)
  expect(confirmInput).toHaveAttribute('type', 'text')
  fireEvent.click(toggleBtn)
  expect(confirmInput).toHaveAttribute('type', 'password')
})

/**
 * Test that the password strength meter is rendered.
 */
test('renders password strength meter', () => {
  render(<SignupForm />)
  expect(screen.getByText(/must be at least 8 characters/i)).toBeInTheDocument()
})

/**
 * Test successful form submission and redirect.
 */
test('submits form successfully and redirects', async () => {
  jest.useFakeTimers()
  mockSignUp.mockResolvedValue({ error: null })
  render(<SignupForm />)
  fireEvent.input(screen.getByLabelText(/email address/i), { target: { value: 'user@example.com' } })
  fireEvent.input(screen.getByLabelText(/^password$/i), { target: { value: 'Password1!' } })
  fireEvent.input(screen.getByLabelText(/confirm password/i), { target: { value: 'Password1!' } })
  fireEvent.click(screen.getByRole('button', { name: /create account/i }))

  await waitFor(() => {
    expect(mockSignUp).toHaveBeenCalledWith('user@example.com', 'Password1!')
  })

  jest.advanceTimersByTime(5000)

  await waitFor(() => {
    expect(mockPush).toHaveBeenCalledWith('/auth/login')
  })

  jest.useRealTimers()
})

/**
 * Test Google sign-in button click.
 */
test('calls signInWithGoogle on Google button click', async () => {
  render(<SignupForm />)
  fireEvent.click(screen.getByRole('button', { name: /google/i }))
  await waitFor(() => {
    expect(mockSignInWithGoogle).toHaveBeenCalled()
  })
})

/**
 * Test navigation to login page link.
 */
test('navigates to login page when link is clicked', () => {
  render(<SignupForm />)
  const link = screen.getByRole('link', { name: /sign in/i })
  expect(link).toHaveAttribute('href', '/auth/login')
})
