'use client';

import { useEffect } from 'react';
import { Chat } from '@theamiteshtripathi/chat-core';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';

export default function ConsultationPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/auth');
    }
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">AI Consultation</h1>
        <Chat 
          userId={user.id}
          onMessage={(msg) => console.log('Message:', msg)}
          config={{
            apiEndpoint: '/api/chat',
            initialMessage: 'How can I help you today?'
          }}
        />
      </div>
    </div>
  );
}