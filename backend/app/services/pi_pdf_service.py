"""
PI PDF Service - Generate Proforma Invoice PDFs

Generates professional PDF documents for Proforma Invoices with:
- Company letterhead
- Partner/customer details
- Country information
- Item list with HSN codes and pack sizes
- Pricing with currency
- Approval status
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


class PIPDFService:
    """Generate Proforma Invoice PDFs"""
    
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
            self.COMPANY_EMAIL = "sales@pharmaco.com"
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
            self.COMPANY_EMAIL = addr.get("email", "sales@pharmaco.com")
            self.COMPANY_GST = addr.get("gst", "27AABCP1234F1Z5")
        else:
            self.COMPANY_ADDRESS = "123 Pharma Street, Medical District"
            self.COMPANY_CITY = "Mumbai, Maharashtra 400001"
            self.COMPANY_PHONE = "+91 22 1234 5678"
            self.COMPANY_EMAIL = "sales@pharmaco.com"
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
            name='PITitle',
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
    
    def generate_pi_pdf(self, pi) -> BytesIO:
        """
        Generate PI PDF with company letterhead.
        
        Args:
            pi: PI model instance (with partner_vendor, country, items loaded)
        
        Returns:
            BytesIO buffer containing the PDF
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=18)
        
        # Container for PDF elements
        elements = []
        
        # Add company letterhead
        elements.extend(self._build_letterhead())
        
        # Add PI title
        elements.append(Paragraph("PROFORMA INVOICE", self.styles['PITitle']))
        elements.append(Spacer(1, 12))
        
        # Add PI details and partner info side-by-side
        elements.append(self._build_pi_header(pi))
        elements.append(Spacer(1, 20))
        
        # Add items table
        elements.append(Paragraph("INVOICE DETAILS", self.styles['SectionHeader']))
        elements.append(Spacer(1, 6))
        elements.append(self._build_items_table(pi))
        elements.append(Spacer(1, 12))
        
        # Add total and approval status
        elements.append(self._build_totals(pi))
        elements.append(Spacer(1, 20))
        
        # Add signature section
        elements.extend(self._build_signature_section())
        
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
    
    def _build_pi_header(self, pi):
        """Build PI header with details and partner info"""
        partner = pi.partner_vendor
        country = pi.country
        
        # Left column: PI details
        pi_details = [
            ['<b>PI Number:</b>', pi.pi_number],
            ['<b>PI Date:</b>', pi.pi_date.strftime('%d-%b-%Y')],
            ['<b>Status:</b>', pi.status.value],
            ['<b>Country:</b>', f"{country.country_name} ({country.country_code})" if country else 'N/A'],
            ['<b>Currency:</b>', pi.currency],
        ]
        
        # Right column: Partner details
        partner_details = [
            ['<b>Customer:</b>', partner.vendor_name if partner else 'N/A'],
            ['<b>Customer Code:</b>', partner.vendor_code if partner else 'N/A'],
            ['<b>Contact:</b>', partner.contact_person if partner else 'N/A'],
            ['<b>Phone:</b>', partner.phone if partner else 'N/A'],
            ['<b>Email:</b>', partner.email if partner else 'N/A'],
        ]
        
        # Combine into two-column layout
        data = []
        for i in range(max(len(pi_details), len(partner_details))):
            row = []
            if i < len(pi_details):
                row.extend(pi_details[i])
            else:
                row.extend(['', ''])
            
            row.append('')  # Spacer column
            
            if i < len(partner_details):
                row.extend(partner_details[i])
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
    
    def _build_items_table(self, pi):
        """Build items table"""
        # Table header
        data = [['Sr.', 'Medicine Name', 'HSN Code', 'Pack Size', 'Quantity', 'Unit Price', 'Total Price']]
        
        # Get currency symbol
        currency_symbol = self.CURRENCY_SYMBOL if pi.currency == "INR" else "$"
        
        # Table data
        for idx, item in enumerate(pi.items, 1):
            data.append([
                str(idx),
                item.medicine.medicine_name if item.medicine else 'N/A',
                item.hsn_code or '-',
                item.pack_size or '-',
                f"{float(item.quantity):.2f}",
                f"{currency_symbol}{float(item.unit_price):.2f}",
                f"{currency_symbol}{float(item.total_price):.2f}"
            ])
        
        # Create table
        table = Table(data, colWidths=[0.4*inch, 2.5*inch, 0.8*inch, 0.8*inch, 0.8*inch, 1*inch, 1*inch])
        table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            
            # Data rows
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Sr. No.
            ('ALIGN', (4, 1), (6, -1), 'RIGHT'),  # Qty, Unit Price, Total
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
            
            # Padding
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ]))
        
        return table
    
    def _build_totals(self, pi):
        """Build totals section"""
        currency_symbol = self.CURRENCY_SYMBOL if pi.currency == "INR" else "$"
        
        data = [
            ['', '<b>TOTAL AMOUNT:</b>', f'<b>{currency_symbol}{float(pi.total_amount):,.2f}</b>']
        ]
        
        # Add approval info if approved
        if pi.status.value == "APPROVED" and pi.approved_by:
            data.append(['', '<b>Approved By:</b>', pi.approver.username])
            data.append(['', '<b>Approved On:</b>', pi.approved_at.strftime('%d-%b-%Y %H:%M') if pi.approved_at else 'N/A'])
        
        table = Table(data, colWidths=[4*inch, 1.5*inch, 1.8*inch])
        table.setStyle(TableStyle([
            ('FONT', (1, 0), (1, -1), 'Helvetica-Bold', 10),
            ('FONT', (2, 0), (2, 0), 'Helvetica-Bold', 12),
            ('FONT', (2, 1), (2, -1), 'Helvetica', 9),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('BACKGROUND', (1, 0), (2, 0), colors.HexColor('#e3f2fd')),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LINEABOVE', (1, 0), (2, 0), 1, colors.grey),
        ]))
        
        return table
    
    def _build_signature_section(self):
        """Build signature section"""
        elements = []
        
        elements.append(Spacer(1, 30))
        
        sig_data = [
            ['For ' + self.COMPANY_NAME, ''],
            ['', ''],
            ['', ''],
            ['_____________________', '_____________________'],
            ['Authorized Signatory', 'Date: ' + datetime.now().strftime('%d-%b-%Y')]
        ]
        
        sig_table = Table(sig_data, colWidths=[3*inch, 3*inch])
        sig_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        elements.append(sig_table)
        
        return elements
