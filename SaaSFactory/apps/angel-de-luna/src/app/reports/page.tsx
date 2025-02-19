'use client';

import { useEffect } from 'react';
import { useAuth } from '@theamiteshtripathi/firebase-auth';
import { PDFOperations } from '@theamiteshtripathi/pdf-generator';
import { useRouter } from 'next/navigation';
import { adaptConsultationToQuoteData } from '../../utils/pdf-adapters';

export default function ReportsPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/auth');
    }
  }, [user, router]);

  const handleDownloadReport = async () => {
    try {
      if (!user) return null;

      const consultationData = {
        userId: user.uid,
        templateName: 'consultation-report',
        chatHistory: [
          {
            message: "Hello, how can I help you today?",
            timestamp: new Date().toISOString(),
            sender: "Consultant"
          },
          // Add more chat messages as needed
        ]
      };

      const quoteData = adaptConsultationToQuoteData(consultationData);
      await PDFOperations.generateQuotePDF(quoteData);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Consultation Report</h1>
      <button
        onClick={handleDownloadReport}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Download Report
      </button>
    </div>
  );
}