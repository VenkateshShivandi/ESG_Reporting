'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { UserIcon } from 'lucide-react'

export default function ProfilePage() {
  const { user, session, signOut } = useAuth()
  const [isExporting, setIsExporting] = useState(false)
  
  // Function to simulate data export (GDPR compliance)
  const handleExportData = async () => {
    setIsExporting(true)
    try {
      // In a real implementation, this would call an API endpoint to generate 
      // a downloadable file with all the user's personal data
      await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate API call
      
      toast.success('Data export prepared', {
        description: 'Your data export has been prepared and is ready for download.',
      })
      
      // Create a dummy JSON file with user data for download
      const userData = {
        id: user?.id,
        email: user?.email,
        metadata: user?.user_metadata,
        appMetadata: user?.app_metadata,
        lastSignIn: user?.last_sign_in_at,
        createdAt: user?.created_at
      }
      
      const dataStr = JSON.stringify(userData, null, 2)
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`
      
      const exportFileDefaultName = `user-data-${new Date().toISOString().split('T')[0]}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
      
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Export failed', {
        description: 'There was an error preparing your data export. Please try again.',
      })
    } finally {
      setIsExporting(false)
    }
  }
  
  // Function to handle account deletion (GDPR compliance)
  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.'
    )
    
    if (confirmed) {
      try {
        // In a real implementation, this would call an API endpoint to delete the user's account and data
        await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate API call
        
        toast.success('Account deleted', {
          description: 'Your account and data have been successfully deleted.',
        })
        
        // Sign out after successful deletion
        signOut()
      } catch (error) {
        console.error('Error deleting account:', error)
        toast.error('Deletion failed', {
          description: 'There was an error deleting your account. Please try again.',
        })
      }
    }
  }
  
  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F5E9] text-[#2E7D32]">
          <UserIcon className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
      </div>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>View and manage your basic account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Email</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Account created</p>
              <p className="text-sm text-muted-foreground">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'N/A'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Authentication method</p>
              <p className="text-sm text-muted-foreground">
                {user?.app_metadata?.provider
                  ? `${user.app_metadata.provider.charAt(0).toUpperCase()}${user.app_metadata.provider.slice(1)}`
                  : 'Email'}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Export or delete your personal data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You have the right to access and delete your personal data. You can export all data
              associated with your account or permanently delete your account and all related data.
            </p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleExportData} disabled={isExporting}>
              {isExporting ? 'Preparing export...' : 'Export my data'}
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              Delete account
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
} 