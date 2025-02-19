import { jsPDF } from 'jspdf';
import type { PdfConfig } from '../types/pdf.types';

export interface PdfInstance {
  doc: jsPDF;
}

export const initializePdf = (config: PdfConfig): PdfInstance => {
  const doc = new jsPDF({
    format: config.format || 'a4',
    orientation: config.orientation || 'portrait',
    unit: config.unit || 'mm'
  });
  return { doc };
};