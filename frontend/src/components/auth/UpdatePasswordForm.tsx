'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updatePassword } from '@/lib/auth'
import { updatePasswordSchema } from '@/lib/validators/authSchema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'

type UpdatePasswordFormValues = {
  password: string
  confirmPassword: string
}

export default function UpdatePasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  
  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(data: UpdatePasswordFormValues) {
    setIsLoading(true)
    try {
      const { error } = await updatePassword(data.password)
      if (error) throw error
      
      toast.success('Password updated!', {
        description: 'Your password has been successfully updated.',
        duration: 3000,
      })
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)
    } catch (error) {
      console.error('Error updating password:', error)
      toast.error('Failed to update password', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Update your password</h2>
        <p className="mt-2 text-sm text-slate-600">
          Please enter your new password below.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Input
              id="password"
              {...form.register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              className="h-11 pr-10 placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrengthMeter password={form.watch("password")} />
          {form.formState.errors.password && (
            <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>
          )}
          <p className="text-xs text-slate-500">
            Must be at least 8 characters and include a number and a special character
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              {...form.register("confirmPassword")}
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              className="h-11 pr-10 placeholder:text-slate-400"
              onPaste={(e) => e.preventDefault()}
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.formState.errors.confirmPassword && (
            <p className="text-xs text-red-500">{form.formState.errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" className="h-11 w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating password...
            </>
          ) : (
            "Update password"
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
    </div>
  )
}
