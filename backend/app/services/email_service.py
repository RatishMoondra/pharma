"""
Email Service - Send PO emails to vendors with PDF attachments

Dependencies:
pip install python-multipart aiosmtplib
"""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, List
from io import BytesIO
import os
from sqlalchemy.orm import Session

from app.models.po import PurchaseOrder
from app.services.pdf_service import POPDFService


class EmailService:
    """Send emails with PO PDFs"""
    
    def __init__(self, db: Session = None):
        self.db = db
        
        # Load configuration from database if available, otherwise use environment variables
        if db:
            try:
                from app.services.configuration_service import ConfigurationService
                config_service = ConfigurationService(db)
                
                # Get SMTP settings from configuration
                smtp_host_config = config_service.get_config("smtp_host")
                smtp_port_config = config_service.get_config("smtp_port")
                smtp_username_config = config_service.get_config("smtp_username")
                smtp_password_config = config_service.get_config("smtp_password")
                email_sender_config = config_service.get_config("email_sender")
                
                self.smtp_host = smtp_host_config.get("value", "smtp.gmail.com")
                self.smtp_port = smtp_port_config.get("value", 587)
                self.smtp_username = smtp_username_config.get("value", "")
                self.smtp_password = smtp_password_config.get("value", "")
                self.from_email = email_sender_config.get("email", self.smtp_username)
                self.from_name = email_sender_config.get("name", "PharmaCo Procurement")
            except Exception:
                # Fallback to environment variables if configuration service fails
                self._load_from_env()
        else:
            self._load_from_env()
        
        self.pdf_service = POPDFService(db)
    
    def _load_from_env(self):
        """Load SMTP configuration from environment variables"""
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_username)
        self.from_name = os.getenv("FROM_NAME", "PharmaCo Procurement")
    
    def send_po_email(
        self,
        po: PurchaseOrder,
        to_emails: List[str],
        cc_emails: Optional[List[str]] = None,
        subject: Optional[str] = None,
        body: Optional[str] = None,
        attach_pdf: bool = True
    ) -> dict:
        """
        Send PO email to vendor with PDF attachment.
        
        Args:
            po: PurchaseOrder instance
            to_emails: List of recipient email addresses
            cc_emails: List of CC email addresses
            subject: Email subject (default: auto-generated)
            body: Email body (default: template)
            attach_pdf: Whether to attach PDF (default: True)
        
        Returns:
            dict with success status and message
        """
        try:
            # Validate configuration
            if not self.smtp_username or not self.smtp_password:
                return {
                    "success": False,
                    "message": "SMTP credentials not configured. Set SMTP_USERNAME and SMTP_PASSWORD environment variables."
                }
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = ', '.join(to_emails)
            if cc_emails:
                msg['Cc'] = ', '.join(cc_emails)
            msg['Subject'] = subject or f"Purchase Order - {po.po_number}"
            
            # Email body
            if not body:
                body = self._generate_email_body(po)
            
            msg.attach(MIMEText(body, 'html'))
            
            # Attach PDF
            if attach_pdf:
                pdf_buffer = self.pdf_service.generate_po_pdf(po)
                pdf_attachment = MIMEBase('application', 'pdf')
                pdf_attachment.set_payload(pdf_buffer.read())
                encoders.encode_base64(pdf_attachment)
                pdf_attachment.add_header(
                    'Content-Disposition',
                    f'attachment; filename="{po.po_number}.pdf"'
                )
                msg.attach(pdf_attachment)
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                
                all_recipients = to_emails + (cc_emails or [])
                server.sendmail(self.from_email, all_recipients, msg.as_string())
            
            return {
                "success": True,
                "message": f"Email sent successfully to {', '.join(to_emails)}"
            }
        
        except smtplib.SMTPAuthenticationError:
            return {
                "success": False,
                "message": "SMTP authentication failed. Check your credentials."
            }
        except smtplib.SMTPException as e:
            return {
                "success": False,
                "message": f"SMTP error: {str(e)}"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to send email: {str(e)}"
            }
    
    def _generate_email_body(self, po: PurchaseOrder) -> str:
        """Generate HTML email body template"""
        vendor = po.vendor
        
        items_html = ""
        for idx, item in enumerate(po.items, 1):
            items_html += f"""
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">{idx}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">{item.medicine.medicine_name if item.medicine else 'N/A'}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">{float(item.ordered_quantity):.2f}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">{item.unit or 'pcs'}</td>
            </tr>
            """
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 800px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #1976d2; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9f9f9; }}
                table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                th {{ background-color: #1976d2; color: white; padding: 10px; text-align: left; }}
                .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Purchase Order</h1>
                    <h2>{po.po_number}</h2>
                </div>
                
                <div class="content">
                    <p>Dear {vendor.contact_person if vendor and vendor.contact_person else 'Sir/Madam'},</p>
                    
                    <p>Please find attached Purchase Order <strong>{po.po_number}</strong> dated <strong>{po.po_date.strftime('%d-%b-%Y')}</strong>.</p>
                    
                    <h3>Order Details:</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Sr.</th>
                                <th style="border: 1px solid #ddd; padding: 10px;">Medicine Name</th>
                                <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Quantity</th>
                                <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Unit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items_html}
                        </tbody>
                    </table>
                    
                    <p><strong>Delivery Date:</strong> {po.delivery_date.strftime('%d-%b-%Y') if po.delivery_date else 'As per agreement'}</p>
                    
                    <p>Please confirm acceptance of this order within 24 hours.</p>
                    
                    <p>For any queries, please contact us at {POPDFService.COMPANY_EMAIL} or {POPDFService.COMPANY_PHONE}.</p>
                    
                    <div class="footer">
                        <p><strong>{POPDFService.COMPANY_NAME}</strong><br>
                        {POPDFService.COMPANY_ADDRESS}<br>
                        {POPDFService.COMPANY_CITY}<br>
                        Phone: {POPDFService.COMPANY_PHONE} | Email: {POPDFService.COMPANY_EMAIL}</p>
                        
                        <p style="font-size: 0.8em; color: #999; margin-top: 20px;">
                            This is an auto-generated email. Please do not reply directly to this email.
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html
    
    def send_test_email(self, to_email: str) -> dict:
        """
        Send a test email to verify SMTP configuration.
        
        Args:
            to_email: Test recipient email
        
        Returns:
            dict with success status and message
        """
        try:
            msg = MIMEMultipart()
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            msg['Subject'] = "PharmaCo Email Configuration Test"
            
            body = """
            <html>
            <body>
                <h2>Email Configuration Test</h2>
                <p>This is a test email from PharmaCo Procurement System.</p>
                <p>If you received this email, your SMTP configuration is working correctly.</p>
                <p><strong>Configuration Details:</strong></p>
                <ul>
                    <li>SMTP Host: {}</li>
                    <li>SMTP Port: {}</li>
                    <li>From Email: {}</li>
                </ul>
            </body>
            </html>
            """.format(self.smtp_host, self.smtp_port, self.from_email)
            
            msg.attach(MIMEText(body, 'html'))
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.sendmail(self.from_email, [to_email], msg.as_string())
            
            return {
                "success": True,
                "message": f"Test email sent successfully to {to_email}"
            }
        
        except Exception as e:
            return {
                "success": False,
                "message": f"Test email failed: {str(e)}"
            }
