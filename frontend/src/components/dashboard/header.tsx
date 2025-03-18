import { useState } from 'react'
import { Settings, Globe, User2, LogOut, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  title: string
  description?: string
}

export function Header({
  title,
  description
}: HeaderProps) {
  return (
    <header className="border-b bg-white px-6 py-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <FileText className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Globe className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <User2 className="h-5 w-5" />
          </Button>
          {/* <Button variant="ghost" size="icon">
            <LogOut className="h-5 w-5" />
          </Button> */}
        </div>
      </div>
    </header>
  )
}