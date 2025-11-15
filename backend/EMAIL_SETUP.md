# Email Configuration for PO PDF & Email Features

## SMTP Configuration (Required for email functionality)

# Gmail Example (recommended for development/testing):
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=PharmaCo Procurement

# Note: For Gmail, you need to:
# 1. Enable 2-factor authentication
# 2. Generate an "App Password" at https://myaccount.google.com/apppasswords
# 3. Use the app password instead of your regular Gmail password

# Outlook/Office 365 Example:
# SMTP_HOST=smtp.office365.com
# SMTP_PORT=587
# SMTP_USERNAME=your-email@outlook.com
# SMTP_PASSWORD=your-password
# FROM_EMAIL=your-email@outlook.com
# FROM_NAME=PharmaCo Procurement

# Custom SMTP Server Example:
# SMTP_HOST=mail.yourcompany.com
# SMTP_PORT=587
# SMTP_USERNAME=procurement@yourcompany.com
# SMTP_PASSWORD=your-password
# FROM_EMAIL=procurement@yourcompany.com
# FROM_NAME=YourCompany Procurement

## Testing Email Configuration

After configuring, test the email setup using:
```
POST /api/po/test-email
{
  "email": "your-test-recipient@example.com"
}
```

## Security Notes

1. **Never commit .env files with real credentials to version control**
2. Add `.env` to your `.gitignore` file
3. Use environment-specific configurations:
   - Development: Gmail with app password
   - Production: Company SMTP server with secure credentials
4. Store production credentials in secure environment variables (Azure Key Vault, AWS Secrets Manager, etc.)

## Feature Usage

### Download PO PDF
```
GET /api/po/{po_id}/download-pdf
```
Returns PDF file with professional formatting.

### Send PO Email
```
POST /api/po/{po_id}/send-email
{
  "to_emails": ["vendor@example.com"],
  "cc_emails": ["manager@pharmaco.com"],
  "subject": "Purchase Order - PO/FG/24-25/0001",
  "body": "<optional custom HTML body>",
  "attach_pdf": true
}
```
Sends email with auto-generated body template and PDF attachment.

## PDF Customization

Edit `backend/app/services/pdf_service.py` to customize:
- Company name and address
- Logo (add image file)
- Terms & conditions
- Formatting and colors
