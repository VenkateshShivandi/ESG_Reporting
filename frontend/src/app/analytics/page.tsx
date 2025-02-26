'use client'

import { BarChart3 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold text-[#2E7D32] mb-8">ESG Analytics</h1>
      
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BarChart3 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Analytics Dashboard</h2>
          <p className="text-slate-500">Coming soon</p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Carbon Emissions</CardTitle>
            <CardDescription>Historical trends</CardDescription>
          </CardHeader>
          <CardContent className="h-40 flex items-center justify-center">
            <p className="text-gray-500">Data visualization coming soon</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Resource Usage</CardTitle>
            <CardDescription>Water and energy</CardDescription>
          </CardHeader>
          <CardContent className="h-40 flex items-center justify-center">
            <p className="text-gray-500">Data visualization coming soon</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Sustainability Score</CardTitle>
            <CardDescription>Overall performance</CardDescription>
          </CardHeader>
          <CardContent className="h-40 flex items-center justify-center">
            <p className="text-gray-500">Data visualization coming soon</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 