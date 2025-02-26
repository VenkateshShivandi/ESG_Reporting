'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { BarChart3, FileText, MessageSquare, Shield } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && isAuthenticated && !isLoading) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, mounted, router])

  if (!mounted || isLoading) {
    return null
  }

  const features = [
    {
      icon: <BarChart3 className="h-10 w-10 text-emerald-600" />,
      title: 'Comprehensive Analytics',
      description: 'Track and visualize your ESG metrics with our intuitive analytics dashboard.'
    },
    {
      icon: <FileText className="h-10 w-10 text-emerald-600" />,
      title: 'Document Management',
      description: 'Securely store and organize all your ESG documents and reports in one place.'
    },
    {
      icon: <MessageSquare className="h-10 w-10 text-emerald-600" />,
      title: 'AI Assistant',
      description: 'Get instant answers to your ESG reporting questions with our AI-powered assistant.'
    },
    {
      icon: <Shield className="h-10 w-10 text-emerald-600" />,
      title: 'Secure Compliance',
      description: 'Ensure your ESG reporting meets all regulatory requirements with our compliance tools.'
    }
  ]

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header Bar */}
      <header className="border-b border-gray-200 bg-white py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-[#2E7D32]">
            <span className="flex h-8 w-8 items-center justify-center rounded-md text-[#2E7D32]">
              ESG
            </span>
            <span>Reporting</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/about" className="text-gray-600 hover:text-[#2E7D32]">
              About Us
            </Link>
            <Link href="/contact" className="text-gray-600 hover:text-[#2E7D32]">
              Contact Us
            </Link>
            <Button 
              asChild
              className="bg-[#2E7D32] hover:bg-[#1B5E20]"
            >
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </nav>
          
          {/* Mobile Sign In Button */}
          <Button 
            asChild
            className="md:hidden bg-[#2E7D32] hover:bg-[#1B5E20]"
          >
            <Link href="/auth/login">Sign In</Link>
          </Button>
        </div>
      </header>
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-b from-white to-green-50 px-6 py-20 md:py-28">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-4xl font-bold tracking-tight text-green-800 sm:text-5xl md:text-6xl">
              Streamline Your ESG Reporting
            </h1>
            <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform simplifies environmental, social, and governance reporting with powerful tools and AI-driven analytics.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild
                className="bg-green-600 hover:bg-green-700 text-lg py-6 px-8 rounded-lg"
              >
                <Link href="/auth/login">Get Started</Link>
              </Button>
              <Button 
                variant="outline" 
                className="text-green-600 border-green-600 hover:bg-green-50 text-lg py-6 px-8 rounded-lg"
                asChild
              >
                <Link href="#features">Learn More</Link>
              </Button>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                Powerful Features for ESG Reporting
              </h2>
              <p className="mt-4 text-xl text-gray-600">
                Our comprehensive platform provides everything you need for efficient ESG management.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-12 mt-12">
              {features.map((feature, index) => (
                <div key={index} className="flex flex-col items-start">
                  <div className="mb-4 p-3 bg-green-50 rounded-xl">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="bg-green-700 py-16 px-6 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Transform Your ESG Reporting?</h2>
            <p className="text-lg text-green-100 mb-8">
              Join companies worldwide that are using our platform to simplify their ESG reporting and make data-driven sustainability decisions.
            </p>
            <Button 
              asChild
              className="bg-white text-green-700 hover:bg-green-50 text-lg py-6 px-8 rounded-lg"
            >
              <Link href="/auth/login">Sign Up Now</Link>
            </Button>
          </div>
        </section>
      </main>
      
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">ESG Reporting</h3>
            <p className="text-gray-400">
              Simplifying environmental, social, and governance reporting for organizations worldwide.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Features</h3>
            <ul className="space-y-2 text-gray-400">
              <li>Analytics Dashboard</li>
              <li>Document Management</li>
              <li>AI Assistant</li>
              <li>Compliance Tools</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-gray-400">
              <li>Documentation</li>
              <li>API Reference</li>
              <li>Blog</li>
              <li>Support</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-gray-400">
              <li>About Us</li>
              <li>Careers</li>
              <li>Contact</li>
              <li>Privacy Policy</li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-gray-800 text-center text-gray-500">
          <p>© {new Date().getFullYear()} ESG Reporting. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
