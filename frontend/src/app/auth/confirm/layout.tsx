import { Suspense } from "react"

export default function ConfirmationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col">
        <Suspense fallback={<div className="text-center p-4">Loading confirmation...</div>}>
          {children}
        </Suspense>
      </main>
    </div>
  )
}
