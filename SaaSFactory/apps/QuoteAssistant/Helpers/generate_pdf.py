import logging

logger = logging.getLogger(__name__)

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from io import BytesIO
import os

def generate_quote_pdf(quote_data):
    logger.info("Entered generate_quote_pdf function")
    logger.info(f"Quote data received: {quote_data}")
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    try:
        logger.info("Adding logo")
        logo_path = os.path.join(os.path.dirname(__file__), '..', 'static', 'logo.png')
        if os.path.exists(logo_path):
            logo = Image(logo_path, width=100, height=50)
            elements.append(logo)
            elements.append(Spacer(1, 12))
        else:
            logger.warning(f"Logo not found at {logo_path}")

        logger.info("Adding title and customer details")
        elements.append(Paragraph("Quote", styles['Title']))
        elements.append(Spacer(1, 12))
        elements.append(Paragraph(f"Customer: {quote_data['customer_name']}", styles['Normal']))
        elements.append(Paragraph(f"Company: {quote_data['company']}", styles['Normal']))
        elements.append(Spacer(1, 12))

        logger.info("Creating items table")
        data = [['Item', 'Quantity', 'Unit Price', 'Total']]
        for item in quote_data['items']:
            data.append([item['name'], str(item['quantity']), f"${item['unit_price']:.2f}", f"${item['total']:.2f}"])
        data.append(['', '', 'Total', f"${quote_data['total']:.2f}"])

        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 12),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(table)
        elements.append(Spacer(1, 12))

        logger.info("Adding summary and additional information")
        elements.append(Paragraph("Summary:", styles['Heading2']))
        elements.append(Paragraph(quote_data['summary'], styles['Normal']))
        elements.append(Spacer(1, 12))

        validity_style = ParagraphStyle('Validity', parent=styles['Normal'], textColor=colors.red)
        elements.append(Paragraph("This quote is only valid for 24 hours. Actual Price may vary upto 15%.", validity_style))

        company_info = """
        Peach Perfect Produce Co.
        123 Orchard Lane, Fruitville, GA 30000
        Phone: (555) 123-4567
        Email: sales@peachperfect.com
        """
        elements.append(Paragraph(company_info, styles['Normal']))

        logger.info("Building PDF document")
        doc.build(elements)
        pdf_data = buffer.getvalue()
        buffer.close()
        logger.info("PDF generation completed")
        return pdf_data
    except Exception as e:
        logger.error(f"Error in generate_quote_pdf: {e}")
        raise
