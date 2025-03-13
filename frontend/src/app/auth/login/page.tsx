import type { Metadata } from 'next'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Login | ESG Reporting Platform',
  description: 'Securely access your sustainability metrics and reports.',
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-lg mx-auto px-4 py-8">
        <LoginForm />
      </div>
    </div>
  )
}
