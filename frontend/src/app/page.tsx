'use client'

// React and Next.js imports
import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  BarChart3,
  FileUp,
  MessageCircle,
  ArrowRight,
  Home,
  BarChart2,
  FileText,
  Settings,
  Users,
  ChevronRight,
  Menu,
  X,
  Leaf,
  Globe,
  Building2,
  TrendingUp,
  Shield,
} from "lucide-react"

import { Button } from "@/components/ui/button"

// Sample data for charts
const environmentalData = [
  { month: "Jan", emissions: 65, waste: 28, energy: 42 },
  { month: "Feb", emissions: 59, waste: 30, energy: 40 },
  { month: "Mar", emissions: 80, waste: 32, energy: 45 },
  { month: "Apr", emissions: 81, waste: 35, energy: 48 },
  { month: "May", emissions: 56, waste: 25, energy: 38 },
  { month: "Jun", emissions: 55, waste: 27, energy: 36 },
  { month: "Jul", emissions: 40, waste: 20, energy: 30 },
]

const socialData = [
  { quarter: "Q1", diversity: 68, engagement: 75, training: 82 },
  { quarter: "Q2", diversity: 72, engagement: 78, training: 85 },
  { quarter: "Q3", diversity: 75, engagement: 80, training: 87 },
  { quarter: "Q4", diversity: 78, engagement: 82, training: 90 },
]

const governanceData = [
  { year: "2020", compliance: 85, risk: 65, ethics: 78 },
  { year: "2021", compliance: 88, risk: 70, ethics: 80 },
  { year: "2022", compliance: 90, risk: 75, ethics: 83 },
  { year: "2023", compliance: 92, risk: 78, ethics: 85 },
  { year: "2024", compliance: 95, risk: 82, ethics: 88 },
]

export default function LandingPage() {
  // State for UI effects
  const [scrolled, setScrolled] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setProgress(66), 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header - Simplified layout without sidebar */}
      <header
        className={`sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 transition-shadow dark:border-slate-800 dark:bg-slate-900 lg:px-6 ${scrolled ? "shadow-md" : ""}`}
      >
        <div className="flex items-center gap-2">
          <Link className="flex items-center gap-2 font-semibold" href="#">
            <BarChart3 className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
            <span className="text-slate-900 dark:text-white">ESG Metrics</span>
          </Link>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-white"
              href="#"
            >
              Features
            </Link>
            <Link
              className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-white"
              href="#"
            >
              About
            </Link>
            <Link
              className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-white"
              href="#"
            >
              Contact
            </Link>
          </nav>
          <Button asChild>
            <Link href="/auth/login">Login</Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 py-20 text-white md:py-32">
          <div className="absolute inset-0 z-0 opacity-20">
            <svg className="h-full w-full" viewBox="0 0 800 800">
              <defs>
                <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          <div className="container relative z-10 mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="mb-4 inline-block rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                  Enterprise Solution
                </span>
                <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                  Revolutionize Your <span className="text-emerald-400">ESG Reporting</span>
                </h1>
                <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-300 md:text-xl">
                  Streamline your Environmental, Social, and Governance reporting with our AI-powered platform. Gain
                  insights, manage data, and stay compliant with ease.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="flex flex-wrap justify-center gap-4"
              >
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700" asChild>
                  <Link href="/auth/signup">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-500 text-white hover:bg-slate-700"
                  asChild
                >
                  <Link href="#platform-overview">View Features</Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Platform Overview Section */}
        <section id="platform-overview" className="py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Enterprise-Grade ESG Platform
              </h2>
              <p className="mx-auto max-w-2xl text-slate-600 dark:text-slate-400">
                Our comprehensive solution helps organizations track, analyze, and report on their ESG metrics with
                precision.
              </p>
            </div>

            <div className="mx-auto max-w-6xl">
              <div className="grid gap-8 md:grid-cols-2">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  className="flex flex-col justify-center space-y-4"
                >
                  <div className="inline-flex items-center rounded-lg bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <Leaf className="mr-2 h-4 w-4" />
                    Environmental
                  </div>
                  <h3 className="text-2xl font-bold">Comprehensive Environmental Tracking</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Monitor carbon emissions, waste management, energy consumption, and water usage with our advanced
                    tracking tools. Set targets, measure progress, and identify areas for improvement.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <ChevronRight className="mr-2 h-4 w-4 text-emerald-600" />
                      <span>Carbon footprint calculation and reporting</span>
                    </li>
                    <li className="flex items-center">
                      <ChevronRight className="mr-2 h-4 w-4 text-emerald-600" />
                      <span>Energy efficiency monitoring</span>
                    </li>
                    <li className="flex items-center">
                      <ChevronRight className="mr-2 h-4 w-4 text-emerald-600" />
                      <span>Waste reduction tracking</span>
                    </li>
                  </ul>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  className="relative flex items-center justify-center rounded-xl bg-slate-900 p-8"
                >
                  <div className="absolute inset-0 opacity-50">
                    <svg className="h-full w-full" viewBox="0 0 800 800">
                      <defs>
                        <pattern id="grid-env" width="60" height="60" patternUnits="userSpaceOnUse">
                          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid-env)" />
                    </svg>
                  </div>
                  <div className="relative z-10 rounded-lg bg-white/10 p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-white">Carbon Emissions</h4>
                      <span className="rounded-full bg-emerald-600/20 px-2 py-1 text-xs font-medium text-emerald-400">
                        -12% YoY
                      </span>
                    </div>
                    <div className="mt-4 h-[200px] w-full">
                      <div className="h-full w-full rounded-md bg-gradient-to-r from-emerald-600/20 to-emerald-600/5 p-4">
                        <div className="flex h-full flex-col justify-between">
                          <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 3, 4].map((i) => (
                              <div key={i} className="h-2 rounded-full bg-emerald-500/30"></div>
                            ))}
                          </div>
                          <div className="h-24 w-full">
                            <div className="relative h-full w-full">
                              <div className="absolute bottom-0 left-0 h-[60%] w-4 rounded-t bg-emerald-500/40"></div>
                              <div className="absolute bottom-0 left-[calc(20%)] h-[80%] w-4 rounded-t bg-emerald-500/60"></div>
                              <div className="absolute bottom-0 left-[calc(40%)] h-[50%] w-4 rounded-t bg-emerald-500/40"></div>
                              <div className="absolute bottom-0 left-[calc(60%)] h-[70%] w-4 rounded-t bg-emerald-500/50"></div>
                              <div className="absolute bottom-0 left-[calc(80%)] h-[40%] w-4 rounded-t bg-emerald-500/30"></div>
                            </div>
                          </div>
                          <div className="grid grid-cols-5 gap-2 text-center text-xs text-emerald-300">
                            <div>Q1</div>
                            <div>Q2</div>
                            <div>Q3</div>
                            <div>Q4</div>
                            <div>Q1</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="mt-16 grid gap-8 md:grid-cols-2">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  className="relative flex items-center justify-center rounded-xl bg-slate-900 p-8 md:order-1"
                >
                  <div className="absolute inset-0 opacity-50">
                    <svg className="h-full w-full" viewBox="0 0 800 800">
                      <defs>
                        <pattern id="grid-social" width="60" height="60" patternUnits="userSpaceOnUse">
                          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid-social)" />
                    </svg>
                  </div>
                  <div className="relative z-10 rounded-lg bg-white/10 p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-white">Diversity & Inclusion</h4>
                      <span className="rounded-full bg-blue-600/20 px-2 py-1 text-xs font-medium text-blue-400">
                        +8% YoY
                      </span>
                    </div>
                    <div className="mt-4 h-[200px] w-full">
                      <div className="h-full w-full rounded-md bg-gradient-to-r from-blue-600/20 to-blue-600/5 p-4">
                        <div className="grid h-full grid-cols-2 gap-4">
                          <div className="flex flex-col items-center justify-center rounded-md bg-white/5 p-4">
                            <div className="text-3xl font-bold text-blue-400">78%</div>
                            <div className="mt-2 text-center text-xs text-blue-200">Gender Diversity</div>
                            <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
                              <div className="h-1.5 w-[78%] rounded-full bg-blue-500"></div>
                            </div>
                          </div>
                          <div className="flex flex-col items-center justify-center rounded-md bg-white/5 p-4">
                            <div className="text-3xl font-bold text-blue-400">82%</div>
                            <div className="mt-2 text-center text-xs text-blue-200">Employee Engagement</div>
                            <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
                              <div className="h-1.5 w-[82%] rounded-full bg-blue-500"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  className="flex flex-col justify-center space-y-4 md:order-2"
                >
                  <div className="inline-flex items-center rounded-lg bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    <Users className="mr-2 h-4 w-4" />
                    Social
                  </div>
                  <h3 className="text-2xl font-bold">Robust Social Impact Measurement</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Track diversity metrics, employee engagement, community involvement, and social impact
                    initiatives. Ensure your organization is making a positive difference in society.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <ChevronRight className="mr-2 h-4 w-4 text-blue-600" />
                      <span>Diversity and inclusion metrics</span>
                    </li>
                    <li className="flex items-center">
                      <ChevronRight className="mr-2 h-4 w-4 text-blue-600" />
                      <span>Employee satisfaction tracking</span>
                    </li>
                    <li className="flex items-center">
                      <ChevronRight className="mr-2 h-4 w-4 text-blue-600" />
                      <span>Community engagement measurement</span>
                    </li>
                  </ul>
                </motion.div>
              </div>

              <div className="mt-16 grid gap-8 md:grid-cols-2">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  className="flex flex-col justify-center space-y-4"
                >
                  <div className="inline-flex items-center rounded-lg bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                    <Building2 className="mr-2 h-4 w-4" />
                    Governance
                  </div>
                  <h3 className="text-2xl font-bold">Transparent Governance Reporting</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Ensure compliance with regulations, track board diversity, monitor ethical practices, and maintain
                    transparency in corporate governance with our comprehensive tools.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <ChevronRight className="mr-2 h-4 w-4 text-indigo-600" />
                      <span>Regulatory compliance tracking</span>
                    </li>
                    <li className="flex items-center">
                      <ChevronRight className="mr-2 h-4 w-4 text-indigo-600" />
                      <span>Board diversity monitoring</span>
                    </li>
                    <li className="flex items-center">
                      <ChevronRight className="mr-2 h-4 w-4 text-indigo-600" />
                      <span>Ethics and transparency reporting</span>
                    </li>
                  </ul>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  className="relative flex items-center justify-center rounded-xl bg-slate-900 p-8"
                >
                  <div className="absolute inset-0 opacity-50">
                    <svg className="h-full w-full" viewBox="0 0 800 800">
                      <defs>
                        <pattern id="grid-gov" width="60" height="60" patternUnits="userSpaceOnUse">
                          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid-gov)" />
                    </svg>
                  </div>
                  <div className="relative z-10 rounded-lg bg-white/10 p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-white">Compliance Rate</h4>
                      <span className="rounded-full bg-indigo-600/20 px-2 py-1 text-xs font-medium text-indigo-400">
                        95% Complete
                      </span>
                    </div>
                    <div className="mt-4 h-[200px] w-full">
                      <div className="h-full w-full rounded-md bg-gradient-to-r from-indigo-600/20 to-indigo-600/5 p-4">
                        <div className="flex h-full flex-col justify-between">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="rounded-md bg-white/10 p-3">
                              <div className="mb-1 text-xs text-indigo-300">Ethics</div>
                              <div className="text-lg font-bold text-white">88%</div>
                              <div className="mt-2 h-1 w-full rounded-full bg-white/10">
                                <div className="h-1 w-[88%] rounded-full bg-indigo-500"></div>
                              </div>
                            </div>
                            <div className="rounded-md bg-white/10 p-3">
                              <div className="mb-1 text-xs text-indigo-300">Risk</div>
                              <div className="text-lg font-bold text-white">82%</div>
                              <div className="mt-2 h-1 w-full rounded-full bg-white/10">
                                <div className="h-1 w-[82%] rounded-full bg-indigo-500"></div>
                              </div>
                            </div>
                            <div className="rounded-md bg-white/10 p-3">
                              <div className="mb-1 text-xs text-indigo-300">Board</div>
                              <div className="text-lg font-bold text-white">90%</div>
                              <div className="mt-2 h-1 w-full rounded-full bg-white/10">
                                <div className="h-1 w-[90%] rounded-full bg-indigo-500"></div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 rounded-md bg-white/5 p-3">
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-indigo-300">Overall Compliance</div>
                              <div className="text-sm font-medium text-white">95%</div>
                            </div>
                            <div className="mt-2 h-2 w-full rounded-full bg-white/10">
                              <div className="h-2 w-[95%] rounded-full bg-indigo-500"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-slate-100 py-16 dark:bg-slate-800 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Enterprise-Grade Features
              </h2>
              <p className="mx-auto max-w-2xl text-slate-600 dark:text-slate-400">
                Our platform offers comprehensive tools designed specifically for ESG reporting and analytics.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="flex flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="mb-4 rounded-full bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold">AI-Powered Analytics</h3>
                <p className="mb-4 flex-1 text-slate-600 dark:text-slate-400">
                  Get instant answers to your ESG questions with our advanced AI chatbot and predictive analytics.
                </p>
                <Button variant="link" className="justify-start p-0 text-emerald-600 dark:text-emerald-400" asChild>
                  <Link href="#" className="flex items-center">
                    Learn more <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="flex flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="mb-4 rounded-full bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <FileUp className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Document Processing</h3>
                <p className="mb-4 flex-1 text-slate-600 dark:text-slate-400">
                  Securely upload and process your ESG documents with our intelligent data extraction system.
                </p>
                <Button variant="link" className="justify-start p-0 text-emerald-600 dark:text-emerald-400" asChild>
                  <Link href="#" className="flex items-center">
                    Learn more <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="flex flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="mb-4 rounded-full bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Interactive Dashboards</h3>
                <p className="mb-4 flex-1 text-slate-600 dark:text-slate-400">
                  Visualize your ESG data and track progress with our customizable interactive dashboards.
                </p>
                <Button variant="link" className="justify-start p-0 text-emerald-600 dark:text-emerald-400" asChild>
                  <Link href="#" className="flex items-center">
                    Learn more <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
                className="flex flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="mb-4 rounded-full bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <Globe className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Global Standards Compliance</h3>
                <p className="mb-4 flex-1 text-slate-600 dark:text-slate-400">
                  Stay compliant with GRI, SASB, TCFD, and other global ESG reporting standards.
                </p>
                <Button variant="link" className="justify-start p-0 text-emerald-600 dark:text-emerald-400" asChild>
                  <Link href="#" className="flex items-center">
                    Learn more <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                viewport={{ once: true }}
                className="flex flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="mb-4 rounded-full bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Benchmarking & Forecasting</h3>
                <p className="mb-4 flex-1 text-slate-600 dark:text-slate-400">
                  Compare your performance against industry peers and forecast future ESG metrics.
                </p>
                <Button variant="link" className="justify-start p-0 text-emerald-600 dark:text-emerald-400" asChild>
                  <Link href="#" className="flex items-center">
                    Learn more <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                viewport={{ once: true }}
                className="flex flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="mb-4 rounded-full bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Enterprise Security</h3>
                <p className="mb-4 flex-1 text-slate-600 dark:text-slate-400">
                  Bank-level encryption and security protocols to protect your sensitive ESG data.
                </p>
                <Button variant="link" className="justify-start p-0 text-emerald-600 dark:text-emerald-400" asChild>
                  <Link href="#" className="flex items-center">
                    Learn more <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800 py-16 text-white md:py-24">
          <div className="absolute inset-0 z-0 opacity-20">
            <svg className="h-full w-full" viewBox="0 0 800 800">
              <defs>
                <pattern id="grid-cta" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-cta)" />
            </svg>
          </div>
          <div className="container relative z-10 mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Ready to Transform Your ESG Reporting?
              </h2>
              <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-300">
                Join leading companies in streamlining their ESG processes and gaining valuable insights with our
                enterprise platform.
              </p>
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700" asChild>
                <Link href="/auth/signup">
                  Get Started Now <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="container mx-auto px-4 py-8 md:px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link className="mb-4 flex items-center gap-2 font-semibold" href="#">
                <BarChart3 className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
                <span className="text-slate-900 dark:text-white">ESG Metrics</span>
              </Link>
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                Enterprise-grade ESG reporting and analytics platform for sustainable business practices.
              </p>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                Product
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    href="#"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    href="#"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    href="#"
                  >
                    Case Studies
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                Company
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    href="#"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    href="#"
                  >
                    Careers
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    href="#"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                Legal
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    href="#"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    href="#"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    href="#"
                  >
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-200 pt-8 dark:border-slate-800">
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              © 2024 ESG Metrics Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
