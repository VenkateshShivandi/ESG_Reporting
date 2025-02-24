import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, BarChart3, FileUp, MessageCircle } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="w-full px-4 lg:px-6 h-14 flex items-center justify-center fixed top-0 left-0 right-0 bg-white/95 backdrop-blur shadow-md inset-0 z-50 dark:bg-gray-950/90">
        <div className="w-full max-w-7xl flex items-center justify-between">
          <Link className="flex items-center justify-center" href="#">
            <BarChart3 className="h-6 w-6" />
            <span className="sr-only">ESG Reporting</span>
          </Link>
          <nav className="flex items-center gap-6 sm:gap-8">
            <Link className="text-sm font-medium hover:underline underline-offset-4" href="#">
              Features
            </Link>
            <Link className="text-sm font-medium hover:underline underline-offset-4" href="#">
              About
            </Link>
            <Link className="text-sm font-medium hover:underline underline-offset-4" href="#">
              Contact
            </Link>
            <Button asChild className="ml-4">
              <Link href="/login">Login</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 mt-14">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Revolutionize Your ESG Reporting
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Streamline your Environmental, Social, and Governance reporting with our AI-powered platform. Gain
                  insights, manage data, and stay compliant with ease.
                </p>
              </div>
              <div className="space-x-4">
                <Button asChild>
                  <Link href="/login">Get Started</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="#features">Learn More</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-12">
              Key Features
            </h2>
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4 text-center">
                <MessageCircle className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">AI-Powered Chat</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Get instant answers to your ESG questions with our advanced AI chatbot.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <FileUp className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Easy File Upload</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Securely upload and process your ESG documents with our intuitive interface.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <BarChart3 className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Comprehensive Dashboard</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Visualize your ESG data and track progress with our interactive dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Ready to Transform Your ESG Reporting?
                </h2>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Join leading companies in streamlining their ESG processes and gaining valuable insights.
                </p>
              </div>
              <Button asChild>
                <Link href="/login">
                  Get Started Now <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t">
        <div className="container mx-auto flex flex-col gap-2 sm:flex-row py-6 items-center px-4 md:px-6">
          <p className="text-xs text-gray-500 dark:text-gray-400">© 2024 ESG Reporting Platform. All rights reserved.</p>
          <nav className="sm:ml-auto flex gap-4 sm:gap-6">
            <Link className="text-xs hover:underline underline-offset-4" href="#">
              Terms of Service
            </Link>
            <Link className="text-xs hover:underline underline-offset-4" href="#">
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
