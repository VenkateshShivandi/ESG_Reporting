'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Users, Globe, Award, BarChart } from 'lucide-react'

export default function AboutPage() {
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
            <Link href="/about" className="text-[#2E7D32] font-medium">
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
        <section className="bg-gradient-to-b from-white to-green-50 py-16 md:py-24">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl font-bold text-green-800 mb-6">About ESG Reporting</h1>
              <p className="text-xl text-gray-700 mb-8">
                We're on a mission to simplify environmental, social, and governance reporting for organizations of all sizes. Our platform combines powerful analytics with user-friendly tools to make ESG reporting accessible and actionable.
              </p>
              <Button asChild variant="outline" className="mb-12">
                <Link href="/" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
              
              <div className="grid md:grid-cols-2 gap-8 mt-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <div className="mb-4 p-2 bg-green-50 w-fit rounded-full">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Our Team</h3>
                  <p className="text-gray-600">
                    Our team consists of sustainability experts, data scientists, and software engineers passionate about making a positive impact on the planet.
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <div className="mb-4 p-2 bg-green-50 w-fit rounded-full">
                    <Globe className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Our Mission</h3>
                  <p className="text-gray-600">
                    To provide organizations with the tools they need to track, measure, and improve their environmental and social impact.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Company History */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Our Journey</h2>
              
              <div className="space-y-12">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/4">
                    <div className="text-green-600 font-bold text-xl">2020</div>
                  </div>
                  <div className="md:w-3/4">
                    <h3 className="text-xl font-semibold mb-2">Foundation</h3>
                    <p className="text-gray-600">ESG Reporting was founded with a vision to make sustainability reporting accessible to all organizations.</p>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/4">
                    <div className="text-green-600 font-bold text-xl">2021</div>
                  </div>
                  <div className="md:w-3/4">
                    <h3 className="text-xl font-semibold mb-2">Platform Launch</h3>
                    <p className="text-gray-600">Our initial ESG reporting platform was launched, offering basic analytics and document management.</p>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/4">
                    <div className="text-green-600 font-bold text-xl">2022</div>
                  </div>
                  <div className="md:w-3/4">
                    <h3 className="text-xl font-semibold mb-2">AI Integration</h3>
                    <p className="text-gray-600">We integrated AI capabilities to provide advanced analytics and insights from ESG data.</p>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/4">
                    <div className="text-green-600 font-bold text-xl">2023</div>
                  </div>
                  <div className="md:w-3/4">
                    <h3 className="text-xl font-semibold mb-2">Global Expansion</h3>
                    <p className="text-gray-600">Expanded our services globally, helping organizations around the world with their ESG reporting needs.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Values */}
        <section className="py-16 bg-green-50">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Our Values</h2>
              
              <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
                  <div className="mb-4 mx-auto p-2 bg-green-50 w-fit rounded-full">
                    <Globe className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Sustainability</h3>
                  <p className="text-gray-600">
                    We practice what we preach by operating sustainably in all aspects of our business.
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
                  <div className="mb-4 mx-auto p-2 bg-green-50 w-fit rounded-full">
                    <Award className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Excellence</h3>
                  <p className="text-gray-600">
                    We strive for excellence in everything we do, from product development to customer service.
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
                  <div className="mb-4 mx-auto p-2 bg-green-50 w-fit rounded-full">
                    <BarChart className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Innovation</h3>
                  <p className="text-gray-600">
                    We continuously innovate to provide cutting-edge solutions for ESG reporting challenges.
                  </p>
                </div>
              </div>
            </div>
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