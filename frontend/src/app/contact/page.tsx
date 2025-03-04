'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { ArrowLeft, Mail, MapPin, Phone } from 'lucide-react'

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    setTimeout(() => {
      toast.success('Message sent!', {
        description: 'We\'ll get back to you as soon as possible.',
      })
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      })
      setIsSubmitting(false)
    }, 1500)
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header Bar */}
      <header className="border-b border-gray-200 bg-white py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-[#2E7D32]">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#E8F5E9] text-[#2E7D32]">
              ESG
            </span>
            <span>Reporting</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/about" className="text-gray-600 hover:text-[#2E7D32]">
              About Us
            </Link>
            <Link href="/contact" className="text-[#2E7D32] font-medium">
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
        <section className="bg-gradient-to-b from-white to-green-50 py-16 md:py-24">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl font-bold text-green-800 mb-6">Contact Us</h1>
              <p className="text-xl text-gray-700 mb-8">
                Have questions about our ESG reporting platform? We're here to help! Fill out the form below or use one of our contact methods.
              </p>
              <Button asChild variant="outline" className="mb-12">
                <Link href="/" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
              
              <div className="grid md:grid-cols-12 gap-8 mt-8">
                {/* Contact Form */}
                <div className="md:col-span-8 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-2xl font-semibold mb-6">Send us a message</h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">
                          Name
                        </label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="Your name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">
                          Email
                        </label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="Your email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="subject" className="text-sm font-medium">
                        Subject
                      </label>
                      <Input
                        id="subject"
                        name="subject"
                        placeholder="Message subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="message" className="text-sm font-medium">
                        Message
                      </label>
                      <Textarea
                        id="message"
                        name="message"
                        placeholder="Your message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={5}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-[#2E7D32] hover:bg-[#1B5E20]"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Sending...' : 'Send Message'}
                    </Button>
                  </form>
                </div>
                
                {/* Contact Info */}
                <div className="md:col-span-4 space-y-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex gap-4 items-start">
                      <div className="p-2 bg-green-50 rounded-full">
                        <Mail className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">Email</h3>
                        <p className="text-gray-600 mt-1">info@esgreporting.com</p>
                        <p className="text-gray-600">support@esgreporting.com</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex gap-4 items-start">
                      <div className="p-2 bg-green-50 rounded-full">
                        <Phone className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">Phone</h3>
                        <p className="text-gray-600 mt-1">+1 (555) 123-4567</p>
                        <p className="text-gray-600">Mon-Fri, 9AM-5PM EST</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex gap-4 items-start">
                      <div className="p-2 bg-green-50 rounded-full">
                        <MapPin className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">Office</h3>
                        <p className="text-gray-600 mt-1">123 Sustainability St.</p>
                        <p className="text-gray-600">New York, NY 10001</p>
                      </div>
                    </div>
                  </div>
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