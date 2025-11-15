"""
PDF Generation Service - Generate PO PDFs with company letterhead

Dependencies:
pip install reportlab
"""
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from io import BytesIO
from datetime import datetime
from typing import Optional

from app.models.po import PurchaseOrder


class POPDFService:
    """Generate Purchase Order PDFs"""
    
    # Company details (configure these)
    COMPANY_NAME = "PharmaCo Industries Ltd."
    COMPANY_ADDRESS = "123 Pharma Street, Medical District"
    COMPANY_CITY = "Mumbai, Maharashtra 400001"
    COMPANY_PHONE = "+91 22 1234 5678"
    COMPANY_EMAIL = "procurement@pharmaco.com"
    COMPANY_GST = "27AABCP1234F1Z5"
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._create_custom_styles()
    
    def _create_custom_styles(self):
        """Create custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='CompanyName',
            parent=self.styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#1976d2'),
            spaceAfter=6,
            alignment=TA_CENTER
        ))
        
        self.styles.add(ParagraphStyle(
            name='POTitle',
            parent=self.styles['Heading1'],
            fontSize=14,
            textColor=colors.HexColor('#d32f2f'),
            spaceAfter=12,
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
    
    def generate_po_pdf(self, po: PurchaseOrder) -> BytesIO:
        """
        Generate PO PDF with company letterhead.
        
        Args:
            po: PurchaseOrder model instance (with vendor, items loaded)
        
        Returns:
            BytesIO buffer containing the PDF
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=18)
        
        # Container for PDF elements
        elements = []
        
        # Add company letterhead
        elements.extend(self._build_letterhead())
        
        # Add PO title
        elements.append(Paragraph("PURCHASE ORDER", self.styles['POTitle']))
        elements.append(Spacer(1, 12))
        
        # Add PO details and vendor info side-by-side
        elements.append(self._build_po_header(po))
        elements.append(Spacer(1, 20))
        
        # Add items table
        elements.append(Paragraph("ORDER DETAILS", self.styles['SectionHeader']))
        elements.append(Spacer(1, 6))
        elements.append(self._build_items_table(po))
        elements.append(Spacer(1, 20))
        
        # Add terms and conditions
        elements.extend(self._build_terms_and_conditions())
        
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
    
    def _build_po_header(self, po: PurchaseOrder):
        """Build PO header with details and vendor info"""
        vendor = po.vendor
        
        # Left column: PO details
        po_details = [
            ['<b>PO Number:</b>', po.po_number],
            ['<b>PO Date:</b>', po.po_date.strftime('%d-%b-%Y')],
            ['<b>PO Type:</b>', po.po_type.value],
            ['<b>Delivery Date:</b>', po.delivery_date.strftime('%d-%b-%Y') if po.delivery_date else 'N/A'],
        ]
        
        # Right column: Vendor details
        vendor_details = [
            ['<b>Vendor Name:</b>', vendor.vendor_name if vendor else 'N/A'],
            ['<b>Vendor Code:</b>', vendor.vendor_code if vendor else 'N/A'],
            ['<b>Contact:</b>', vendor.contact_person if vendor else 'N/A'],
            ['<b>Phone:</b>', vendor.phone if vendor else 'N/A'],
        ]
        
        # Combine into two-column layout
        data = []
        for i in range(max(len(po_details), len(vendor_details))):
            row = []
            if i < len(po_details):
                row.extend(po_details[i])
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
    
    def _build_items_table(self, po: PurchaseOrder):
        """Build items table"""
        # Table header
        data = [['Sr.', 'Medicine Name', 'Ordered Qty', 'Unit', 'Remarks']]
        
        # Table data
        for idx, item in enumerate(po.items, 1):
            # Build remarks from available fields
            remarks_parts = []
            if hasattr(item, 'unit') and item.unit:
                remarks_parts.append(f"Unit: {item.unit}")
            if hasattr(item, 'language') and item.language:
                remarks_parts.append(f"Lang: {item.language}")
            if hasattr(item, 'artwork_version') and item.artwork_version:
                remarks_parts.append(f"Artwork: {item.artwork_version}")
            
            remarks = ', '.join(remarks_parts) if remarks_parts else '-'
            
            data.append([
                str(idx),
                item.medicine.medicine_name if item.medicine else 'N/A',
                f"{float(item.ordered_quantity):.2f}",
                item.unit or 'pcs',
                remarks
            ])
        
        # Create table
        table = Table(data, colWidths=[0.5*inch, 3*inch, 1.2*inch, 0.8*inch, 1.8*inch])
        table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            
            # Data rows
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Sr. No.
            ('ALIGN', (2, 1), (3, -1), 'CENTER'),  # Qty, Unit
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
    
    def _build_terms_and_conditions(self):
        """Build terms and conditions section"""
        elements = []
        
        elements.append(Paragraph("TERMS & CONDITIONS", self.styles['SectionHeader']))
        
        terms = [
            "1. Please confirm acceptance of this Purchase Order within 24 hours.",
            "2. Delivery must be made on or before the specified delivery date.",
            "3. All items must conform to the specifications mentioned.",
            "4. Invoice must reference the PO number.",
            "5. Payment terms: Net 30 days from invoice date.",
            "6. All goods must be accompanied by test certificates and CoA where applicable.",
            "7. Prices are firm and not subject to escalation.",
            "8. Goods must be properly packed to avoid damage during transit."
        ]
        
        terms_style = ParagraphStyle(
            name='Terms',
            parent=self.styles['Normal'],
            fontSize=8,
            leftIndent=10,
            spaceAfter=4
        )
        
        for term in terms:
            elements.append(Paragraph(term, terms_style))
        
        return elements
    
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
