"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"

type PasswordStrength = "weak" | "medium" | "strong"

export function PasswordStrengthMeter({ password }: { password: string }) {
  const [strength, setStrength] = useState<PasswordStrength>("weak")
  const [score, setScore] = useState(0)

  useEffect(() => {
    const calculateStrength = (pwd: string): [PasswordStrength, number] => {
      if (pwd.length === 0) return ["weak", 0]

      let score = 0
      if (pwd.length >= 8) score += 1
      if (/[A-Z]/.test(pwd)) score += 1
      if (/[a-z]/.test(pwd)) score += 1
      if (/[0-9]/.test(pwd)) score += 1
      if (/[^A-Za-z0-9]/.test(pwd)) score += 1

      if (score <= 2) return ["weak", score * 20]
      if (score <= 4) return ["medium", score * 20]
      return ["strong", 100]
    }

    const [newStrength, newScore] = calculateStrength(password)
    setStrength(newStrength)
    setScore(newScore)
  }, [password])

  const getColor = () => {
    switch (strength) {
      case "weak":
        return "bg-red-500"
      case "medium":
        return "bg-yellow-500"
      case "strong":
        return "bg-green-500"
      default:
        return "bg-gray-300"
    }
  }

  return (
    <div className="mt-2">
      <Progress value={score} className={`h-2 ${getColor()}`} />
      <p className="text-sm mt-1 text-gray-600">Password strength: {strength}</p>
    </div>
  )
}

