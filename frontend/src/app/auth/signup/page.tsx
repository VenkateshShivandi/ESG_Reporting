import type { Metadata } from 'next'
import SignupForm from '@/components/auth/SignupForm'

export const metadata: Metadata = {
  title: 'Sign Up | ESG Reporting Platform',
  description: 'Join our green reporting community and track your sustainability metrics.',
}

export default function SignupPage() {
  return (
    <div className="container flex min-h-screen items-center justify-center px-4 py-12">
      <SignupForm />
    </div>
  )
}
