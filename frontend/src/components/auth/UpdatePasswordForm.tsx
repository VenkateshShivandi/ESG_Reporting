"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { updatePassword } from "@/lib/auth"
import { updatePasswordSchema } from "@/lib/validators/authSchema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Icons } from "@/components/ui/icons"
import { toast } from "sonner"
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter"

type UpdatePasswordFormValues = {
  password: string
  confirmPassword: string
}

export default function UpdatePasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(data: UpdatePasswordFormValues) {
    setIsLoading(true)
    try {
      const { error } = await updatePassword(data.password)
      if (error) throw error
      toast.success("Password updated", {
        description: "Your password has been successfully updated.",
      })
      router.push("/auth/login")
    } catch (error) {
      console.error(error)
      toast.error("Error", {
        description: "An error occurred. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Update Password</CardTitle>
        <CardDescription className="text-center">
          Enter your new password for your ESG reporting account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter your new password" {...field} />
                  </FormControl>
                  <PasswordStrengthMeter password={field.value} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Confirm your new password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-[#2E7D32] hover:bg-[#1B5E20]" disabled={isLoading}>
              {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Link href="/auth/login" className="text-sm text-[#2E7D32] hover:underline">
          Back to Login
        </Link>
        <Link href="/" className="text-sm text-[#2E7D32] hover:underline text-center">
          Back to Home
        </Link>
      </CardFooter>
    </Card>
  )
}

