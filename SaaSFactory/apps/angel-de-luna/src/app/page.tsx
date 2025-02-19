'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <main className="w-full max-w-4xl p-8">
        <h1 className="text-4xl font-bold text-center mb-8">Dr. Ángel E. de Luna</h1>
        <p className="text-xl text-center mb-12">AI-Powered Consultation System</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {!user ? (
            <Link 
              href="/auth"
              className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              <h2 className="text-2xl font-semibold mb-4">Get Started</h2>
              <p>Login to begin your consultation journey</p>
            </Link>
          ) : (
            <>
              <Link 
                href="/consultation"
                className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
              >
                <h2 className="text-2xl font-semibold mb-4">Start Consultation</h2>
                <p>Begin your AI-powered consultation</p>
              </Link>
              <Link 
                href="/reports"
                className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
              >
                <h2 className="text-2xl font-semibold mb-4">View Reports</h2>
                <p>Access your consultation reports and insights</p>
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}