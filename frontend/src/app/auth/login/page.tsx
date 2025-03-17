import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Leaf, Shield, BarChart3 } from 'lucide-react'

import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Login | ESG Reporting Platform',
  description: 'Securely access your sustainability metrics and reports.',
}

export default function LoginPage() {
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
              Welcome to your <span className="text-emerald-400">Sustainability</span> Dashboard
            </h1>
            <p className="mb-8 text-lg text-slate-300">
              Access your ESG metrics, reports, and insights to drive sustainable business decisions.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-emerald-500/20 p-2">
                  <Leaf className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-medium">Environmental Tracking</h3>
                  <p className="text-sm text-slate-300">Monitor carbon emissions and resource usage</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full bg-emerald-500/20 p-2">
                  <Shield className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-medium">Secure Data Management</h3>
                  <p className="text-sm text-slate-300">Enterprise-grade security for your ESG data</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full bg-emerald-500/20 p-2">
                  <BarChart3 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-medium">Interactive Analytics</h3>
                  <p className="text-sm text-slate-300">Visualize performance and identify trends</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-sm text-slate-400">
            <p>© 2024 ESG Metrics Platform. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex w-full items-center justify-center bg-white p-4 md:w-1/2 md:p-8">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="mb-8 flex items-center justify-between md:hidden">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <BarChart3 className="h-6 w-6 text-emerald-600" />
              <span>ESG Metrics</span>
            </Link>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Sign in to your account</h2>
              <p className="mt-2 text-sm text-slate-600">Enter your credentials to access your ESG dashboard</p>
            </div>

            <LoginForm />

            <div className="mt-6 text-center text-sm">
              <p className="text-slate-600">
                Don't have an account?{" "}
                <Link href="/auth/signup" className="font-medium text-emerald-600 hover:text-emerald-700">
                  Sign up
                </Link>
              </p>
            </div>
          </div>

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
