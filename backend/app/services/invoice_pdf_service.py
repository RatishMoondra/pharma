"""
Invoice PDF Service - Generate Vendor Invoice PDFs

Generates professional PDF documents for Vendor Tax Invoices with:
- Company letterhead
- Vendor details
- PO reference
- Invoice items with batch tracking
- GST and tax compliance fields
- Freight/insurance charges
- Currency conversion for international invoices
- Dispatch details (for FG invoices)
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from io import BytesIO
from datetime import datetime
from sqlalchemy.orm import Session

from app.services.configuration_service import ConfigurationService


class InvoicePDFService:
    """Generate Vendor Invoice PDFs"""
    
    def __init__(self, db: Session = None):
        self.db = db
        self.styles = getSampleStyleSheet()
        self._create_custom_styles()
        self._load_company_config()
    
    def _load_company_config(self):
        """Load company configuration from database"""
        if not self.db:
            # Fallback to defaults if no DB session
            self.COMPANY_NAME = "PharmaCo Industries Ltd."
            self.COMPANY_ADDRESS = "123 Pharma Street, Medical District"
            self.COMPANY_CITY = "Mumbai, Maharashtra 400001"
            self.COMPANY_PHONE = "+91 22 1234 5678"
            self.COMPANY_EMAIL = "procurement@pharmaco.com"
            self.COMPANY_GST = "27AABCP1234F1Z5"
            self.CURRENCY_SYMBOL = "₹"
            return
        
        config_service = ConfigurationService(self.db)
        
        # Load company info
        company_name_config = config_service.get_config("company_name", use_cache=True)
        self.COMPANY_NAME = company_name_config.config_value.get("value", "PharmaCo Industries Ltd.") if company_name_config else "PharmaCo Industries Ltd."
        
        company_address_config = config_service.get_config("company_address", use_cache=True)
        if company_address_config:
            addr = company_address_config.config_value
            self.COMPANY_ADDRESS = addr.get("street", "123 Pharma Street")
            self.COMPANY_CITY = f"{addr.get('city', 'Mumbai')}, {addr.get('state', 'Maharashtra')} {addr.get('zip', '400001')}"
            self.COMPANY_PHONE = addr.get("phone", "+91 22 1234 5678")
            self.COMPANY_EMAIL = addr.get("email", "procurement@pharmaco.com")
            self.COMPANY_GST = addr.get("gst", "27AABCP1234F1Z5")
        else:
            self.COMPANY_ADDRESS = "123 Pharma Street, Medical District"
            self.COMPANY_CITY = "Mumbai, Maharashtra 400001"
            self.COMPANY_PHONE = "+91 22 1234 5678"
            self.COMPANY_EMAIL = "procurement@pharmaco.com"
            self.COMPANY_GST = "27AABCP1234F1Z5"
        
        currency_config = config_service.get_config("default_currency", use_cache=True)
        currency_code = currency_config.config_value.get("value", "INR") if currency_config else "INR"
        self.CURRENCY_SYMBOL = "₹" if currency_code == "INR" else "$"
    
    def _create_custom_styles(self):
        """Create custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='CompanyName',
            parent=self.styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#1976d2'),
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='InvoiceTitle',
            parent=self.styles['Heading1'],
            fontSize=14,
            textColor=colors.HexColor('#d32f2f'),
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=11,
            textColor=colors.HexColor('#424242'),
            spaceAfter=6,
            fontName='Helvetica-Bold'
        ))
    
    def generate_invoice_pdf(self, invoice) -> BytesIO:
        """
        Generate Invoice PDF with company letterhead.
        
        Args:
            invoice: VendorInvoice model instance (with vendor, purchase_order, items loaded)
        
        Returns:
            BytesIO buffer containing the PDF
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=18)
        
        # Container for PDF elements
        elements = []
        
        # Add company letterhead
        elements.extend(self._build_letterhead())
        
        # Add invoice title
        invoice_type_name = {
            'RM': 'RAW MATERIAL',
            'PM': 'PACKING MATERIAL',
            'FG': 'FINISHED GOODS'
        }.get(invoice.invoice_type.value, 'VENDOR')
        
        elements.append(Paragraph(f"{invoice_type_name} TAX INVOICE", self.styles['InvoiceTitle']))
        elements.append(Spacer(1, 12))
        
        # Add invoice details and vendor info side-by-side
        elements.append(self._build_invoice_header(invoice))
        elements.append(Spacer(1, 12))
        
        # Add dispatch details for FG invoices
        if invoice.invoice_type.value == 'FG' and (invoice.dispatch_note_number or invoice.warehouse_location):
            elements.append(self._build_dispatch_details(invoice))
            elements.append(Spacer(1, 12))
        
        # Add items table
        elements.append(Paragraph("INVOICE DETAILS", self.styles['SectionHeader']))
        elements.append(Spacer(1, 6))
        elements.append(self._build_items_table(invoice))
        elements.append(Spacer(1, 12))
        
        # Add totals with GST breakdown
        elements.append(self._build_totals(invoice))
        elements.append(Spacer(1, 20))
        
        # Add notes section if remarks exist
        if invoice.remarks:
            elements.append(Paragraph("REMARKS", self.styles['SectionHeader']))
            elements.append(Paragraph(invoice.remarks, self.styles['Normal']))
            elements.append(Spacer(1, 20))
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer
    
    def _build_letterhead(self):
        """Build company letterhead"""
        elements = []
        
        # Company name
        elements.append(Paragraph(self.COMPANY_NAME, self.styles['CompanyName']))
        
        # Company address
        address_style = ParagraphStyle(
            name='Address',
            parent=self.styles['Normal'],
            fontSize=9,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#666666')
        )
        elements.append(Paragraph(self.COMPANY_ADDRESS, address_style))
        elements.append(Paragraph(self.COMPANY_CITY, address_style))
        elements.append(Paragraph(f"Phone: {self.COMPANY_PHONE} | Email: {self.COMPANY_EMAIL}", address_style))
        elements.append(Paragraph(f"GST No: {self.COMPANY_GST}", address_style))
        
        # Horizontal line
        elements.append(Spacer(1, 12))
        line_table = Table([['']], colWidths=[7.5*inch])
        line_table.setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (-1, 0), 2, colors.HexColor('#1976d2')),
        ]))
        elements.append(line_table)
        elements.append(Spacer(1, 12))
        
        return elements
    
    def _build_invoice_header(self, invoice):
        """Build invoice header with details and vendor info"""
        vendor = invoice.vendor
        po = invoice.purchase_order
        
        # Left column: Invoice details
        invoice_details = [
            ['<b>Invoice Number:</b>', invoice.invoice_number],
            ['<b>Invoice Date:</b>', invoice.invoice_date.strftime('%d-%b-%Y')],
            ['<b>Invoice Type:</b>', invoice.invoice_type.value],
            ['<b>PO Number:</b>', po.po_number if po else 'N/A'],
            ['<b>Status:</b>', invoice.status.value],
        ]
        
        # Add currency info if not INR
        if invoice.currency_code != 'INR':
            invoice_details.append(['<b>Currency:</b>', f"{invoice.currency_code} (Rate: {float(invoice.exchange_rate or 1):.4f})"])
        
        # Right column: Vendor details
        vendor_details = [
            ['<b>Vendor Name:</b>', vendor.vendor_name if vendor else 'N/A'],
            ['<b>Vendor Code:</b>', vendor.vendor_code if vendor else 'N/A'],
            ['<b>Contact:</b>', vendor.contact_person if vendor else 'N/A'],
            ['<b>Phone:</b>', vendor.phone if vendor else 'N/A'],
        ]
        
        # Combine into two-column layout
        data = []
        for i in range(max(len(invoice_details), len(vendor_details))):
            row = []
            if i < len(invoice_details):
                row.extend(invoice_details[i])
            else:
                row.extend(['', ''])
            
            row.append('')  # Spacer column
            
            if i < len(vendor_details):
                row.extend(vendor_details[i])
            else:
                row.extend(['', ''])
            
            data.append(row)
        
        table = Table(data, colWidths=[1.2*inch, 1.8*inch, 0.3*inch, 1.2*inch, 1.8*inch])
        table.setStyle(TableStyle([
            ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 9),
            ('FONT', (1, 0), (1, -1), 'Helvetica', 9),
            ('FONT', (3, 0), (3, -1), 'Helvetica-Bold', 9),
            ('FONT', (4, 0), (4, -1), 'Helvetica', 9),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        
        return table
    
    def _build_dispatch_details(self, invoice):
        """Build dispatch details for FG invoices"""
        data = [['<b>DISPATCH DETAILS</b>', '']]
        
        if invoice.dispatch_note_number:
            data.append(['Dispatch Note:', invoice.dispatch_note_number])
        
        if invoice.dispatch_date:
            data.append(['Dispatch Date:', invoice.dispatch_date.strftime('%d-%b-%Y')])
        
        if invoice.warehouse_location:
            data.append(['Warehouse:', invoice.warehouse_location])
        
        if invoice.warehouse_received_by:
            data.append(['Received By:', invoice.warehouse_received_by])
        
        table = Table(data, colWidths=[1.5*inch, 5.5*inch])
        table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#fff3e0')),
            ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 10),
            ('SPAN', (0, 0), (-1, 0)),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            
            # Data rows
            ('FONT', (0, 1), (0, -1), 'Helvetica-Bold', 9),
            ('FONT', (1, 1), (1, -1), 'Helvetica', 9),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 1), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        
        return table
    
    def _build_items_table(self, invoice):
        """Build items table with batch tracking and GST"""
        # Get currency symbol
        currency_code = invoice.currency_code or 'INR'
        currency_symbol = "₹" if currency_code == "INR" else "$"
        
        # Table header
        data = [['Sr.', 'Medicine', 'HSN', 'Batch', 'Mfg Date', 'Exp Date', 'Qty', 'Rate', 'Amount', 'GST%', 'GST Amt', 'Total']]
        
        # Table data
        for idx, item in enumerate(invoice.items, 1):
            data.append([
                str(idx),
                item.medicine.medicine_name if item.medicine else 'N/A',
                item.hsn_code or '-',
                item.batch_number or '-',
                item.manufacturing_date.strftime('%d-%b-%y') if item.manufacturing_date else '-',
                item.expiry_date.strftime('%d-%b-%y') if item.expiry_date else '-',
                f"{float(item.shipped_quantity):.2f}",
                f"{currency_symbol}{float(item.unit_price):.2f}",
                f"{currency_symbol}{float(item.total_price):.2f}",
                f"{float(item.gst_rate or 0):.1f}%" if item.gst_rate else '-',
                f"{currency_symbol}{float(item.gst_amount or 0):.2f}",
                f"{currency_symbol}{(float(item.total_price) + float(item.gst_amount or 0)):.2f}"
            ])
        
        # Create table
        table = Table(data, colWidths=[0.25*inch, 1.5*inch, 0.5*inch, 0.6*inch, 0.6*inch, 0.6*inch, 0.5*inch, 0.7*inch, 0.7*inch, 0.5*inch, 0.6*inch, 0.7*inch])
        table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 7),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            
            # Data rows
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Sr. No.
            ('ALIGN', (6, 1), (-1, -1), 'RIGHT'),  # Numeric columns
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
            
            # Padding
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 1), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
        ]))
        
        return table
    
    def _build_totals(self, invoice):
        """Build totals section with GST breakdown"""
        currency_code = invoice.currency_code or 'INR'
        currency_symbol = "₹" if currency_code == "INR" else "$"
        
        data = []
        
        # Subtotal
        data.append(['', '<b>Subtotal:</b>', f'{currency_symbol}{float(invoice.subtotal):,.2f}'])
        
        # Freight charges if applicable
        if invoice.freight_charges:
            data.append(['', 'Freight Charges:', f'{currency_symbol}{float(invoice.freight_charges):,.2f}'])
        
        # Insurance charges if applicable
        if invoice.insurance_charges:
            data.append(['', 'Insurance Charges:', f'{currency_symbol}{float(invoice.insurance_charges):,.2f}'])
        
        # Tax amount
        data.append(['', 'Tax Amount:', f'{currency_symbol}{float(invoice.tax_amount):,.2f}'])
        
        # Total amount
        data.append(['', '<b>TOTAL AMOUNT:</b>', f'<b>{currency_symbol}{float(invoice.total_amount):,.2f}</b>'])
        
        # Base currency amount if foreign currency
        if currency_code != 'INR' and invoice.base_currency_amount:
            data.append(['', f'Amount in INR:', f'₹{float(invoice.base_currency_amount):,.2f}'])
        
        table = Table(data, colWidths=[4*inch, 1.5*inch, 1.8*inch])
        table.setStyle(TableStyle([
            ('FONT', (1, 0), (1, -3), 'Helvetica', 9),
            ('FONT', (1, -2), (1, -2), 'Helvetica-Bold', 10),
            ('FONT', (1, -1), (1, -1), 'Helvetica', 9),
            ('FONT', (2, 0), (2, -3), 'Helvetica', 9),
            ('FONT', (2, -2), (2, -2), 'Helvetica-Bold', 12),
            ('FONT', (2, -1), (2, -1), 'Helvetica', 9),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('BACKGROUND', (1, -2), (2, -2), colors.HexColor('#e3f2fd')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LINEABOVE', (1, -2), (2, -2), 1, colors.grey),
        ]))
        
        return table
