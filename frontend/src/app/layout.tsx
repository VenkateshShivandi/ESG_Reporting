import { Toaster } from 'sonner'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/hooks/use-auth'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'ESG Reporting Platform',
  description: 'Manage your ESG metrics and reporting',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
