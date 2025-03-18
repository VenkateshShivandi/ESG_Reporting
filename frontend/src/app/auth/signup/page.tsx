import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, BarChart3 } from "lucide-react"

import SignupForm from "@/components/auth/SignupForm"

export const metadata: Metadata = {
  title: "Sign Up | ESG Reporting Platform",
  description: "Create an account to access our ESG reporting platform.",
}

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Left side - Branding & Info */}
      <div className="relative hidden w-full bg-gradient-to-br from-slate-900 to-slate-800 md:block md:w-1/2">
        <div className="absolute inset-0 z-0 opacity-20">
          <svg className="h-full w-full" viewBox="0 0 800 800">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between p-8 text-white">
          <div>
            <Link href="/" className="flex items-center gap-2 text-xl font-bold">
              <BarChart3 className="h-6 w-6 text-emerald-400" />
              <span>ESG Metrics</span>
            </Link>
          </div>

          <div className="mx-auto max-w-md py-12">
            <h1 className="mb-6 text-4xl font-bold">
              Join the <span className="text-emerald-400">Sustainability</span> Revolution
            </h1>
            <p className="mb-8 text-lg text-slate-300">
              Create an account to start tracking, analyzing, and reporting on your organization's ESG metrics.
            </p>

            <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
              <blockquote className="text-lg italic text-slate-200">
                "ESG Metrics has transformed how we approach sustainability reporting, saving us countless hours and
                providing valuable insights."
              </blockquote>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20"></div>
                <div>
                  <p className="font-medium">Sarah Johnson</p>
                  <p className="text-sm text-slate-300">Sustainability Director, Acme Corp</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-sm text-slate-400">
            <p>© 2024 ESG Metrics Platform. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Right side - Signup Form */}
      <div className="flex w-full items-center justify-center bg-white p-4 md:w-1/2 md:p-8">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="mb-8 flex items-center justify-between md:hidden">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <BarChart3 className="h-6 w-6 text-emerald-600" />
              <span>ESG Metrics</span>
            </Link>
          </div>

          <SignupForm />

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
