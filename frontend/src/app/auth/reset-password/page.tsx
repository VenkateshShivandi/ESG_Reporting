'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { resetPassword } from '@/lib/auth'
import Link from 'next/link'
import { BarChart3, FileText, Shield, Leaf } from 'lucide-react'

const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  async function onSubmit(data: ResetPasswordFormValues) {
    setIsLoading(true)
    try {
      const { error } = await resetPassword(data.email)
      if (error) throw error
      
      toast.success('Reset link sent!', {
        description: 'Please check your email for the password reset link.',
        duration: 6000,
      })
      
      // Reset the form
      form.reset()
    } catch (error) {
      console.error('Error sending reset link:', error)
      toast.error('Failed to send reset link', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Dark Background */}
      <div className="relative hidden w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 md:block md:w-1/2">
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

        {/* Add animated gradient blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[20%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-[20%] -left-[20%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-3xl animate-pulse animation-delay-2000"></div>
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
      
      {/* Right Panel - Form */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Reset your password</h2>
            <p className="mt-2 text-sm text-slate-600">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                {...form.register("email")}
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                required
                className="h-11"
              />
              {form.formState.errors.email && (
                <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>

            <Button type="submit" className="h-11 w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Sending reset link...
                </>
              ) : (
                "Send reset link"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-slate-600">
              Remember your password?{" "}
              <Link href="/auth/login" className="font-medium text-emerald-600 hover:text-emerald-700">
                Sign in
              </Link>
            </p>
          </div>
          
          <p className="mt-6 text-center">
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
