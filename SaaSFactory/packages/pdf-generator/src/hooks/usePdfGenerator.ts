import { useState } from 'react';
import { PDFOperations } from '../services/pdf.operations';
import { QuoteData } from '../types/pdf.types';

export function usePdfGenerator() {
  const [isDownloading, setIsDownloading] = useState(false);

  const generateAndDownloadPDF = async (quoteData: QuoteData, fileName: string = 'quote.pdf') => {
    try {
      setIsDownloading(true);
      const pdfBlob = await PDFOperations.generateQuotePDF(quoteData);

      // Extraído de tu función handleDownloadPDF
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    generateAndDownloadPDF,
    isDownloading
  };
}
