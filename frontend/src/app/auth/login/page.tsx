import type { Metadata } from "next"
import LoginForm from "@/components/auth/LoginForm"

export const metadata: Metadata = {
  title: "Login | ESG Reporting Platform",
  description: "Securely access your sustainability metrics and reports.",
}

export default function LoginPage() {
  return (
    <div className="container flex items-center justify-center min-h-screen px-4 py-12">
      <LoginForm />
    </div>
  )
}

