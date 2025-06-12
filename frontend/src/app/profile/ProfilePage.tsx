"use client"
export const dynamic = "force-dynamic"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import {
  User,
  Mail,
  Calendar,
  Shield,
  Download,
  Trash2,
  Edit,
  LogOut,
  AlertTriangle,
  Loader2,
  ChevronRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { updateProfile } from '@/lib/api/profile'

export default function ProfilePage() {
  const { user, session, signOut } = useAuth()
  const [isExporting, setIsExporting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Function to simulate data export (GDPR compliance)
  const handleExportData = async () => {
    setIsExporting(true)
    try {
      // In a real implementation, this would call an API endpoint to generate 
      // a downloadable file with all the user's personal data
      await new Promise((resolve) => setTimeout(resolve, 1500)) // Simulate API call
      
      toast.success("Data export prepared", {
        description: "Your data export has been prepared and is ready for download.",
      })
      
      // Create a dummy JSON file with user data for download
      const userData = {
        id: user?.id,
        email: user?.email,
        metadata: user?.user_metadata,
        appMetadata: user?.app_metadata,
        lastSignIn: user?.last_sign_in_at,
        createdAt: user?.created_at,
      }
      
      const dataStr = JSON.stringify(userData, null, 2)
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`
      
      const exportFileDefaultName = `user-data-${new Date().toISOString().split("T")[0]}.json`

      const linkElement = document.createElement("a")
      linkElement.setAttribute("href", dataUri)
      linkElement.setAttribute("download", exportFileDefaultName)
      linkElement.click()
    } catch (error) {
      console.error("Error exporting data:", error)
      toast.error("Export failed", {
        description: "There was an error preparing your data export. Please try again.",
      })
    } finally {
      setIsExporting(false)
    }
  }
  
  const handleProfileUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsUpdating(true)
    
    try {
      const formData = new FormData(event.currentTarget)
      const data = {
        jobTitle: formData.get('title') as string,
      }
      
      const result = await updateProfile(data)
      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="container mx-auto max-w-6xl p-6 relative">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-white pointer-events-none -z-10"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNmMtMy4zMTQgMC02IDIuNjg2LTYgNnMyLjY4NiA2IDYgNnptMjQgMjRjMCAzLjMxNC0yLjY4NiA2LTYgNnMtNi0yLjY4Ni02LTZjMC0zLjMxNCAyLjY4Ni02IDYtNnM2IDIuNjg2IDYgNnptLTI0IDEyYy0zLjMxNCAwLTYgMi42ODYtNiA2czIuNjg2IDYgNiA2YzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02ek0wIDZjMCAzLjMxNCAyLjY4NiA2IDYgNnM2LTIuNjg2IDYtNmMwLTMuMzE0LTIuNjg2LTYtNi02UzAgMi42ODYgMCA2eiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utb3BhY2l0eT0iLjAyIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-5 pointer-events-none -z-10"></div>
      
      {/* Add subtle animated gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-20">
        <div className="absolute -top-[40%] -right-[60%] w-[80%] h-[80%] rounded-full bg-blue-100/20 blur-3xl"></div>
        <div className="absolute -bottom-[40%] -left-[60%] w-[80%] h-[80%] rounded-full bg-emerald-100/20 blur-3xl"></div>
        <div className="absolute top-[30%] left-[20%] w-[40%] h-[40%] rounded-full bg-purple-100/10 blur-3xl"></div>
      </div>
      
      {/* Profile Header - Modernized with gradient background and animations */}
      <div className="mb-12 overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-50 via-blue-50 to-purple-50 p-8 shadow-lg relative">
        <div className="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-purple-100/30 to-transparent"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNmMtMy4zMTQgMC02IDIuNjg2LTYgNnMyLjY4NiA2IDYgNnptMjQgMjRjMCAzLjMxNC0yLjY4NiA2LTYgNnMtNi0yLjY4Ni02LTZjMC0zLjMxNCAyLjY4Ni02IDYtNnM2IDIuNjg2IDYgNnptLTI0IDEyYy0zLjMxNCAwLTYgMi42ODYtNiA2czIuNjg2IDYgNiA2YzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02ek0wIDZjMCAzLjMxNCAyLjY4NiA2IDYgNnM2LTIuNjg2IDYtNmMwLTMuMzE0LTIuNjg2LTYtNi02UzAgMi42ODYgMCA2eiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utb3BhY2l0eT0iLjAyIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-5"></div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between relative z-10">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 via-blue-400 to-purple-500 blur-xl opacity-40 animate-pulse"></div>
              <div className="relative group">
                <Avatar className="h-28 w-28 border-4 border-white shadow-xl relative transition-transform duration-300 group-hover:scale-105">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-600 text-3xl font-bold text-white">
                    {user?.email ? user.email.charAt(0).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full border-2 border-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-110"></div>
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  {user?.email?.split("@")[0] || "User"}
                </h1>
                <div className="relative">
                  <Badge className="bg-gradient-to-r from-emerald-400 to-emerald-500 text-white border-0 px-3 py-1 rounded-full text-xs">
                    Active
                  </Badge>
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-20"></span>
                </div>
        </div>
              <p className="text-lg text-slate-500 flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" /> 
                {user?.email}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 md:mt-0">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 bg-white shadow-sm hover:shadow-md transition-all border-0 hover:bg-slate-50">
                  <Edit className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium">Edit Profile</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <form onSubmit={handleProfileUpdate}>
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>Update your profile information.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Job Title</Label>
                      <Input 
                        id="title" 
                        name="title"
                        defaultValue="Sustainability Manager" 
                        className="border-slate-200 focus:border-emerald-500" 
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={isUpdating}
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Save changes'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-0 bg-white shadow-sm hover:bg-red-50 text-red-600 hover:text-red-700 hover:shadow-md transition-all"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
              <span className="font-medium">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Account Section */}
      <div className="space-y-10">
        <div className="w-full">
          {/* Personal Information */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">Personal Information</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1.5 px-0">
                  <Edit className="h-4 w-4" />
                  <span className="font-medium">Edit</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Personal Information</DialogTitle>
                  <DialogDescription>Update your personal information.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Job Title</Label>
                    <Input id="title" defaultValue="Sustainability Manager" className="border-slate-200 focus:border-emerald-500" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700">Save changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
            <div className="divide-y divide-slate-100">
              <div className="flex items-center gap-4 p-5 hover:bg-slate-50 transition-all duration-300 cursor-pointer group">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-500 transition-transform group-hover:scale-110 duration-300">
                  <Mail className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-500 group-hover:text-slate-700 transition-colors">Email Address</p>
                  <p className="text-base font-medium text-slate-900">{user?.email}</p>
                </div>
                <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-0 transition-all group-hover:bg-blue-100">
                  Primary
                </Badge>
              </div>

              <div className="flex items-center gap-4 p-5 hover:bg-slate-50 transition-all duration-300 cursor-pointer group">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-500 transition-transform group-hover:scale-110 duration-300">
                  <Calendar className="h-6 w-6" />
            </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-500 group-hover:text-slate-700 transition-colors">Account Created</p>
                  <p className="text-base font-medium text-slate-900">
                {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "N/A"}
              </p>
            </div>
              </div>

              <div className="flex items-center gap-4 p-5 hover:bg-slate-50 transition-all duration-300 cursor-pointer group">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 transition-transform group-hover:scale-110 duration-300">
                  <Shield className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-500 group-hover:text-slate-700 transition-colors">Authentication Method</p>
                  <p className="text-base font-medium text-slate-900">
                {user?.app_metadata?.provider
                  ? `${user.app_metadata.provider.charAt(0).toUpperCase()}${user.app_metadata.provider.slice(1)}`
                      : "Email"}
              </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Data Management</h2>
          
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl p-8 mb-8 shadow-md border border-blue-100/30">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="rounded-full bg-gradient-to-br from-blue-100 to-blue-200 p-4 text-blue-600 flex-shrink-0 shadow-md">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg mb-3">Data Privacy Notice</p>
                <p className="text-slate-600 leading-relaxed">
                  You have the right to access and delete your personal data. You can export all data associated
                  with your account or permanently delete your account and all related data. 
                </p>
                <p className="text-slate-600 mt-2 leading-relaxed">
                  <span className="text-red-600 font-medium">Important:</span> Deleting your account
                  is irreversible and will remove all your data from our systems.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:space-y-0 sm:gap-4">
            <Button
              variant="outline"
              className="group relative overflow-hidden gap-2 sm:w-auto w-full justify-center bg-white py-6 px-5 shadow-sm hover:shadow-md transition-all duration-300 border-0 rounded-xl"
              onClick={handleExportData}
              disabled={isExporting}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-emerald-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center">
                {isExporting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600 mr-2" />
                    <span className="font-medium">Preparing export...</span>
                  </>
                ) : (
                  <>
                    <div className="mr-2 bg-emerald-100 rounded-full p-1.5 group-hover:scale-110 transition-transform duration-300">
                      <Download className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="font-medium group-hover:tracking-wide transition-all duration-300">Export my data</span>
                  </>
                )}
              </div>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="group gap-2 sm:w-auto w-full justify-center py-6 px-5 border-0 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl"
                >
                  <div className="mr-2 bg-white/20 rounded-full p-1.5 group-hover:scale-110 transition-transform duration-300">
                    <Trash2 className="h-4 w-4" />
                  </div>
                  <span className="font-medium group-hover:tracking-wide transition-all duration-300">Delete account</span>
            </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white rounded-2xl border-0 shadow-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-bold text-slate-900">Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-600 mt-2">
                    This action cannot be undone. This will permanently delete your account and remove all your data
                    from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4">
                  <AlertDialogCancel className="border-0 shadow-sm hover:bg-slate-100 rounded-lg font-medium">Cancel</AlertDialogCancel>
                  <AlertDialogAction className="border-0 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg font-medium">Delete account</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  )
} 