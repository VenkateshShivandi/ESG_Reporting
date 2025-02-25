import type { Metadata } from "next"
import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm"

export const metadata: Metadata = {
  title: "Update Password | ESG Reporting Platform",
  description: "Set your new password for the ESG reporting dashboard.",
}

export default function UpdatePasswordPage() {
  return (
    <div className="container flex items-center justify-center min-h-screen px-4 py-12">
      <UpdatePasswordForm />
    </div>
  )
}

