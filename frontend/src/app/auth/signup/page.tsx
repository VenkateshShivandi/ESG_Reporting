import type { Metadata } from "next"
import SignupForm from "@/components/auth/SignupForm"

export const metadata: Metadata = {
  title: "Sign Up | ESG Reporting Platform",
  description: "Join our green reporting community and track your sustainability metrics.",
}

export default function SignupPage() {
  return (
    <div className="container flex items-center justify-center min-h-screen px-4 py-12">
      <SignupForm />
    </div>
  )
}

