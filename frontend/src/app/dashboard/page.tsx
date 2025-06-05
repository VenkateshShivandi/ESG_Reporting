"use client"

import { Container } from "../container/ContainerPage"

export default function DashboardPage() {
  // Force the container to take full height and width
  return (
    <div className="h-screen w-full">
      <Container />
    </div>
  )
} 