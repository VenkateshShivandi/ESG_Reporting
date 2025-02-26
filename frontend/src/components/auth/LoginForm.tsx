'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { loginSchema } from '@/lib/validators/authSchema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'
import { Icons } from '@/components/ui/icons'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'

type LoginFormValues = {
  email: string
  password: string
  rememberMe?: boolean
}

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { signIn, signInWithGoogle } = useAuth()
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  })

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true)
    try {
      const { error } = await signIn(data.email, data.password)
      if (error) throw error
      toast.success('Welcome back!', {
        description: 'You have successfully logged in.',
      })
      router.push('/')
    } catch (error) {
      console.error(error)
      // Toast handled by auth hook
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setIsLoading(true)
    try {
      await signInWithGoogle()
      // Redirect handled by OAuth provider
    } catch (error) {
      // Error handling done in the hook
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-center text-2xl font-bold">Login</CardTitle>
        <CardDescription className="text-center">
          Track your sustainability metrics securely
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter your password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel>Remember me</FormLabel>
                  </FormItem>
                )}
              />
              <Link href="/auth/reset-password" className="text-sm text-[#2E7D32] hover:underline">
                Forgot password?
              </Link>
            </div>
            <Button
              type="submit"
              className="w-full bg-[#2E7D32] hover:bg-[#1B5E20]"
              disabled={isLoading}
            >
              {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Log in
            </Button>
          </form>
        </Form>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          <Icons.google className="mr-2 h-4 w-4" />
          Google
        </Button>
      </CardContent>
      <CardFooter>
        <div className="w-full space-y-4">
          <div className="flex items-center justify-center space-x-1 text-sm">
            <span className="text-muted-foreground">Don't have an account?</span>
            <Link href="/auth/signup" className="text-[#2E7D32] hover:underline">
              Sign up
            </Link>
          </div>
          <div className="flex items-center justify-center space-x-4">
            <Link href="/auth/update-password" className="text-sm text-[#2E7D32] hover:underline">
              Update Password
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link href="/" className="text-sm text-[#2E7D32] hover:underline">
              Back to Home
            </Link>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

