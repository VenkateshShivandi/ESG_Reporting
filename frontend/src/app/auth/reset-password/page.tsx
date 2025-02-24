import type { Metadata } from 'next'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Reset Password | ESG Reporting Platform',
  description: 'Reset your password to regain access to your ESG reporting dashboard.',
}

export default function ResetPasswordPage() {
  return (
    <div className="container flex min-h-screen items-center justify-center px-4 py-12">
      <ResetPasswordForm />
    </div>
  )
}
