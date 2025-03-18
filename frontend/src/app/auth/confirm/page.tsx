"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BarChart3, CheckCircle2, FileText, Shield, Leaf, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import supabase from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function ConfirmationSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isValidating, setIsValidating] = useState(true)
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    const validateToken = async () => {
      try {
        // Just show success and redirect
        setIsValid(true)
        setIsValidating(false)
        
        // Redirect to dashboard after 3 seconds
        const timer = setTimeout(() => {
          router.push('/dashboard')
        }, 3000)

        return () => clearTimeout(timer)
      } catch (error) {
        console.error('Error:', error)
      }
    }

    validateToken()
  }, [router])

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
      
      {/* Right Panel - Success Message */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {isValidating ? (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Verifying your email...</h1>
              <p className="text-slate-600">
                Please wait while we confirm your email address.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Email Confirmed!</h1>
              <p className="text-slate-600">
                Thank you for confirming your email address. You will be redirected to your dashboard.
              </p>
              <div className="space-y-4">
                <Button 
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => router.push('/dashboard')}
                >
                  Go to Dashboard
                </Button>
                <p className="text-center text-sm text-slate-500">
                  You will be redirected to the dashboard in a few seconds...
                </p>
              </div>
            </div>
          )}
          
          <p className="text-center">
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
} 