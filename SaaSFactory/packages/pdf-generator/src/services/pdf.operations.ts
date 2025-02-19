import jsPDF from 'jspdf';
import { QuoteData, PDFGeneratorOptions } from '../types/pdf.types';

export class PDFOperations {
  static async generateQuotePDF(quoteData: QuoteData, options?: PDFGeneratorOptions) {
    try {
      const doc = new jsPDF({
        orientation: options?.orientation || 'portrait',
        unit: 'mm',
        format: options?.format || 'A4'
      });

      // Extraído de tu lógica actual de generación de PDF
      doc.setFont('helvetica');
      doc.setFontSize(20);
      doc.text(`Quote for ${quoteData.customer_name}`, 20, 20);

      // Agregar detalles de la compañía
      doc.setFontSize(12);
      doc.text(`Company: ${quoteData.company}`, 20, 30);
      doc.text(`Phone: ${quoteData.phone_number}`, 20, 40);

      // Tabla de items
      let yPosition = 60;
      quoteData.items.forEach(item => {
        doc.text(item.product_code, 20, yPosition);
        doc.text(item.description, 50, yPosition);
        doc.text(`$${item.unit_price}`, 150, yPosition);
        doc.text(`$${item.total}`, 180, yPosition);
        yPosition += 10;
      });

      // Totales
      doc.text(`Subtotal: $${quoteData.subtotal}`, 150, yPosition + 10);
      doc.text(`Tax: $${quoteData.sales_tax}`, 150, yPosition + 20);
      doc.text(`Total: $${quoteData.total_cost}`, 150, yPosition + 30);

      return doc.output('blob');
    } catch (error) {
      throw new Error(`Error generating PDF: ${error}`);
    }
  }
}
