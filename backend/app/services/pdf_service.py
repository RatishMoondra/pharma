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
from sqlalchemy.orm import Session

from app.models.po import PurchaseOrder
from app.services.configuration_service import ConfigurationService
import logging

logger = logging.getLogger("pharma")


class POPDFService:
    """Generate Purchase Order PDFs"""
    
    def __init__(self, db: Session = None):
        self.db = db
        self.styles = getSampleStyleSheet()
        self._create_custom_styles()
        self._load_company_config()
    
    def _load_company_config(self):
        """Load company details from configuration service"""
        if self.db:
            try:
                config_service = ConfigurationService(self.db)
                
                # Get individual configs
                company_name = config_service.get_config("company_name")
                company_address = config_service.get_config("company_address")
                currency = config_service.get_config("default_currency")
                
                self.COMPANY_NAME = company_name.get("value", "PharmaCo Industries Ltd.")
                
                # Handle address (could be structured object or string)
                if isinstance(company_address, dict):
                    if "street" in company_address:
                        self.COMPANY_ADDRESS = company_address.get("street", "")
                        self.COMPANY_CITY = f"{company_address.get('city', '')}, {company_address.get('state', '')} {company_address.get('postal_code', '')}"
                    else:
                        self.COMPANY_ADDRESS = company_address.get("value", "123 Pharma Street, Medical District")
                        self.COMPANY_CITY = "Mumbai, Maharashtra 400001"
                else:
                    self.COMPANY_ADDRESS = "123 Pharma Street, Medical District"
                    self.COMPANY_CITY = "Mumbai, Maharashtra 400001"
                
                self.CURRENCY_SYMBOL = currency.get("symbol", "₹")
                
                # Static fields (can be added to config later)
                self.COMPANY_PHONE = "+91 22 1234 5678"
                self.COMPANY_EMAIL = "procurement@pharmaco.com"
                self.COMPANY_GST = "27AABCP1234F1Z5"
                
                logger.info("PDF service loaded company config from database")
            except Exception as e:
                logger.warning(f"Failed to load company config, using defaults: {e}")
                self._set_default_company_info()
        else:
            self._set_default_company_info()
    
    def _set_default_company_info(self):
        """Set default company information"""
        self.COMPANY_NAME = "PharmaCo Industries Ltd."
        self.COMPANY_ADDRESS = "123 Pharma Street, Medical District"
        self.COMPANY_CITY = "Mumbai, Maharashtra 400001"
        self.COMPANY_PHONE = "+91 22 1234 5678"
        self.COMPANY_EMAIL = "procurement@pharmaco.com"
        self.COMPANY_GST = "27AABCP1234F1Z5"
        self.CURRENCY_SYMBOL = "₹"
    
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
        elements.append(Spacer(1, 12))
        
        # Add shipping and billing addresses if available
        if po.ship_to or po.bill_to:
            elements.append(self._build_shipping_billing(po))
            elements.append(Spacer(1, 12))
        
        # Add payment and transport terms
        elements.append(self._build_payment_transport_terms(po))
        elements.append(Spacer(1, 12))
        
        # Add quality requirements for RM/PM
        if po.po_type.value in ['RM', 'PM'] and (po.require_coa or po.require_bmr or po.require_msds):
            elements.append(self._build_quality_requirements(po))
            elements.append(Spacer(1, 12))
        
        # Add approval metadata if available
        if po.prepared_by or po.checked_by or po.approved_by:
            elements.append(self._build_approval_metadata(po))
            elements.append(Spacer(1, 12))
        
        # Add items table
        elements.append(Paragraph("ORDER DETAILS", self.styles['SectionHeader']))
        elements.append(Spacer(1, 6))
        elements.append(self._build_items_table(po))
        elements.append(Spacer(1, 20))
        
        # Add terms and conditions
        elements.extend(self._build_terms_and_conditions(po))
        
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
            ['<b>Status:</b>', po.status.value],
            ['<b>Delivery Date:</b>', po.delivery_date.strftime('%d-%b-%Y') if po.delivery_date else 'N/A'],
        ]
        
        # Add amendment info if applicable
        if po.amendment_number > 0:
            po_details.append(['<b>Amendment:</b>', f"#{po.amendment_number} ({po.amendment_date.strftime('%d-%b-%Y') if po.amendment_date else 'N/A'})"])
        
        # Add buyer reference if available
        if po.buyer_reference_no:
            po_details.append(['<b>Buyer Ref:</b>', po.buyer_reference_no])
        
        # Right column: Vendor details
        vendor_details = [
            ['<b>Vendor Name:</b>', vendor.vendor_name if vendor else 'N/A'],
            ['<b>Vendor Code:</b>', vendor.vendor_code if vendor else 'N/A'],
            ['<b>Contact:</b>', vendor.contact_person if vendor else 'N/A'],
            ['<b>Phone:</b>', vendor.phone if vendor else 'N/A'],
        ]
        
        # Add contact person if available
        if po.buyer_contact_person:
            vendor_details.append(['<b>Buyer Contact:</b>', po.buyer_contact_person])
        
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
        """Build items table with conditional columns based on PO type"""
        
        # Determine columns based on PO type
        if po.po_type.value == 'PM':  # Packing Material
            # PM-specific table with artwork specs
            data = [['Sr.', 'Medicine Name', 'HSN', 'Qty', 'Unit', 'Language', 'Artwork\nVersion', 'GSM/PLY', 'Dimensions', 'Delivery']]
            
            for idx, item in enumerate(po.items, 1):
                # GSM/PLY info
                gsm_ply = []
                if item.gsm:
                    gsm_ply.append(f"GSM:{float(item.gsm):.0f}")
                if item.ply:
                    gsm_ply.append(f"PLY:{item.ply}")
                gsm_ply_str = '\n'.join(gsm_ply) if gsm_ply else '-'
                
                data.append([
                    str(idx),
                    item.medicine.medicine_name if item.medicine else 'N/A',
                    item.hsn_code or '-',
                    f"{float(item.ordered_quantity):.2f}",
                    item.unit or 'pcs',
                    item.language or '-',
                    item.artwork_version or '-',
                    gsm_ply_str,
                    item.box_dimensions or '-',
                    item.delivery_date.strftime('%d-%b-%Y') if item.delivery_date else '-'
                ])
            
            table = Table(data, colWidths=[0.3*inch, 1.8*inch, 0.6*inch, 0.7*inch, 0.5*inch, 0.6*inch, 0.7*inch, 0.7*inch, 0.9*inch, 0.8*inch])
            
        elif po.po_type.value == 'RM':  # Raw Material
            # RM-specific table with quality specs
            data = [['Sr.', 'Medicine Name', 'HSN', 'Qty', 'Unit', 'Specification', 'Test Method', 'Pack Size', 'Delivery']]
            
            for idx, item in enumerate(po.items, 1):
                data.append([
                    str(idx),
                    item.medicine.medicine_name if item.medicine else 'N/A',
                    item.hsn_code or '-',
                    f"{float(item.ordered_quantity):.2f}",
                    item.unit or 'kg',
                    item.specification_reference or '-',
                    (item.test_method[:30] + '...') if item.test_method and len(item.test_method) > 30 else (item.test_method or '-'),
                    item.pack_size or '-',
                    item.delivery_date.strftime('%d-%b-%Y') if item.delivery_date else '-'
                ])
            
            table = Table(data, colWidths=[0.3*inch, 2*inch, 0.6*inch, 0.7*inch, 0.5*inch, 0.8*inch, 1.2*inch, 0.7*inch, 0.8*inch])
            
        else:  # FG or general
            # Standard table for Finished Goods
            data = [['Sr.', 'Medicine Name', 'HSN', 'Ordered Qty', 'Fulfilled Qty', 'Unit', 'Pack Size', 'Delivery Date']]
            
            for idx, item in enumerate(po.items, 1):
                data.append([
                    str(idx),
                    item.medicine.medicine_name if item.medicine else 'N/A',
                    item.hsn_code or '-',
                    f"{float(item.ordered_quantity):.2f}",
                    f"{float(item.fulfilled_quantity):.2f}",
                    item.unit or 'pcs',
                    item.pack_size or '-',
                    item.delivery_date.strftime('%d-%b-%Y') if item.delivery_date else '-'
                ])
            
            table = Table(data, colWidths=[0.3*inch, 2.2*inch, 0.6*inch, 1*inch, 1*inch, 0.5*inch, 0.8*inch, 0.9*inch])
        
        # Common table styling
        table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            
            # Data rows
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Sr. No.
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
            
            # Padding
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ]))
        
        return table
    
    def _build_shipping_billing(self, po: PurchaseOrder):
        """Build shipping and billing addresses"""
        data = []
        
        if po.ship_to:
            data.append(['<b>Ship To:</b>', po.ship_to])
        
        if po.bill_to:
            data.append(['<b>Bill To:</b>', po.bill_to])
        
        table = Table(data, colWidths=[1.2*inch, 6*inch])
        table.setStyle(TableStyle([
            ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 9),
            ('FONT', (1, 0), (1, -1), 'Helvetica', 9),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ]))
        
        return table
    
    def _build_payment_transport_terms(self, po: PurchaseOrder):
        """Build payment and transport terms"""
        data = [['<b>COMMERCIAL TERMS</b>', '']]
        
        if po.payment_terms:
            data.append(['Payment Terms:', po.payment_terms])
        
        if po.transport_mode:
            data.append(['Transport Mode:', po.transport_mode])
        
        if po.freight_terms:
            data.append(['Freight Terms:', po.freight_terms])
        
        if po.currency_code:
            data.append(['Currency:', po.currency_code])
        
        table = Table(data, colWidths=[1.5*inch, 5.5*inch])
        table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e3f2fd')),
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
    
    def _build_quality_requirements(self, po: PurchaseOrder):
        """Build quality requirements section"""
        requirements = []
        
        if po.require_coa:
            requirements.append('✓ Certificate of Analysis (CoA)')
        if po.require_bmr:
            requirements.append('✓ Batch Manufacturing Record (BMR)')
        if po.require_msds:
            requirements.append('✓ Material Safety Data Sheet (MSDS)')
        if po.sample_quantity:
            requirements.append(f'✓ Sample Quantity: {float(po.sample_quantity):.2f}')
        if po.shelf_life_minimum:
            requirements.append(f'✓ Minimum Shelf Life: {po.shelf_life_minimum} days')
        
        data = [['<b>QUALITY REQUIREMENTS</b>']]
        for req in requirements:
            data.append([req])
        
        table = Table(data, colWidths=[7*inch])
        table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#fff3e0')),
            ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            
            # Data rows
            ('FONT', (0, 1), (-1, -1), 'Helvetica', 9),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        
        return table
    
    def _build_approval_metadata(self, po: PurchaseOrder):
        """Build approval workflow metadata"""
        data = [['<b>APPROVAL WORKFLOW</b>', '', '', '']]
        
        approval_row = []
        
        if po.preparer:
            approval_row.append(f"Prepared by:\n{po.preparer.username}")
        if po.checker:
            approval_row.append(f"Checked by:\n{po.checker.username}")
        if po.approver:
            approval_row.append(f"Approved by:\n{po.approver.username}")
        if po.verifier:
            approval_row.append(f"Verified by:\n{po.verifier.username}")
        
        # Pad with empty cells if less than 4 approvers
        while len(approval_row) < 4:
            approval_row.append('')
        
        data.append(approval_row)
        
        table = Table(data, colWidths=[1.75*inch, 1.75*inch, 1.75*inch, 1.75*inch])
        table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e8f5e9')),
            ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 10),
            ('SPAN', (0, 0), (-1, 0)),
            ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            
            # Data row
            ('FONT', (0, 1), (-1, 1), 'Helvetica', 8),
            ('ALIGN', (0, 1), (-1, 1), 'CENTER'),
            ('VALIGN', (0, 1), (-1, 1), 'MIDDLE'),
            ('TOPPADDING', (0, 1), (-1, 1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        
        return table
    
    def _build_terms_and_conditions(self, po: PurchaseOrder = None):
        """Build terms and conditions section"""
        elements = []
        
        elements.append(Paragraph("TERMS & CONDITIONS", self.styles['SectionHeader']))
        
        # Try to load from database if PO has terms_conditions
        if po and hasattr(po, 'terms_conditions') and po.terms_conditions:
            terms = [f"{idx + 1}. {tc.term_text}" for idx, tc in enumerate(po.terms_conditions)]
        else:
            # Default terms
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
