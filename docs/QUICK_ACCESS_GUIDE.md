# Quick Access Guide - Analytics & WOW Features

## 🚀 How to Access the Features

### 1. Analytics Dashboard (Frontend - Complete ✅)
**URL**: http://localhost:5173/analytics

**Navigation**:
1. Log in to the application
2. Click **"Analytics & Insights"** in the left sidebar
3. You'll see 3 tabs:
   - **Invoice-PO Matching** - Auto-match status with visual indicators
   - **Quantity Discrepancies** - Track over/under shipments
   - **Vendor Performance** - Rating cards with metrics

**What You'll See**:
- 📊 Summary cards with key metrics
- ✅ Green checkmarks for matched invoices
- ⚠️ Yellow warnings for partial matches
- ❌ Red errors for mismatches
- 🟢 Excellent vendors (90-100% score)
- 🟡 Average vendors (70-89% score)
- 🔴 Poor vendors (<70% score)

---

### 2. PDF Generation (Backend Ready - Frontend Pending)

**Backend Endpoint**: `GET /api/po/{po_id}/download-pdf`

**Test with cURL** (Windows PowerShell):
```powershell
# Get your auth token from login
$token = "YOUR_JWT_TOKEN_HERE"

# Download PDF for PO ID 1
Invoke-WebRequest -Uri "http://localhost:8000/api/po/1/download-pdf" `
  -Headers @{"Authorization" = "Bearer $token"} `
  -OutFile "PO_Test.pdf"
```

**Test with Browser**:
1. Log in to http://localhost:5173
2. Go to Purchase Orders page
3. Open browser DevTools (F12) → Application → Storage → Local Storage
4. Copy the `token` value
5. Open new tab: `http://localhost:8000/api/po/1/download-pdf`
6. PDF will download automatically

**Frontend Integration** (Coming Soon):
- "Download PDF" button will be added to PO detail page
- One-click download with professional formatting

---

### 3. Email Integration (Backend Ready - Frontend Pending)

**Backend Endpoints**:
- `POST /api/po/{po_id}/send-email` - Send PO to vendor
- `POST /api/po/test-email` - Test SMTP configuration

**Setup Email (Optional)**:
1. Create `.env` file in `backend/` folder
2. Add SMTP configuration:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=PharmaCo Procurement
```

**For Gmail**:
- Enable 2-Factor Authentication
- Generate App Password: https://myaccount.google.com/apppasswords
- Use App Password instead of regular password

**Test Email Configuration**:
```powershell
# Using PowerShell
$token = "YOUR_JWT_TOKEN_HERE"
$body = @{email = "your-test@example.com"} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/po/test-email" `
  -Method POST `
  -Headers @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  } `
  -Body $body
```

**Send PO Email**:
```powershell
$token = "YOUR_JWT_TOKEN_HERE"
$body = @{
  to_emails = @("vendor@example.com")
  cc_emails = @("manager@pharmaco.com")
  subject = "Purchase Order - PO/FG/24-25/0001"
  attach_pdf = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/po/1/send-email" `
  -Method POST `
  -Headers @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  } `
  -Body $body
```

---

## 📱 Quick Testing Guide

### Test Analytics API Directly

**1. Invoice-PO Matching**:
```
GET http://localhost:8000/api/analytics/invoice-po-matching
```
Returns: List of invoices with match status, summary stats

**2. Quantity Discrepancies**:
```
GET http://localhost:8000/api/analytics/quantity-discrepancies
```
Returns: List of over/under shipments with variance percentages

**3. Vendor Performance**:
```
GET http://localhost:8000/api/analytics/vendor-performance
```
Returns: Vendor ratings with on-time delivery, quantity accuracy, response time

### Using Postman/Thunder Client

**Step 1: Login**
```
POST http://localhost:8000/api/auth/login
Body (JSON):
{
  "username": "admin",
  "password": "admin123"
}
```
Copy the `access_token` from response.

**Step 2: Test Analytics**
```
GET http://localhost:8000/api/analytics/invoice-po-matching
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
```

**Step 3: Download PDF**
```
GET http://localhost:8000/api/po/1/download-pdf
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
```

**Step 4: Send Email**
```
POST http://localhost:8000/api/po/1/send-email
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
  Content-Type: application/json
Body (JSON):
{
  "to_emails": ["vendor@example.com"],
  "attach_pdf": true
}
```

---

## 🎯 What Each Feature Does

### Analytics Features

**1. Invoice-PO Auto-Matching**
- Automatically compares invoice items to PO items by medicine
- Shows match percentage and status
- Identifies discrepancies instantly
- **Business Value**: Save 10 mins per invoice cross-checking

**2. Quantity Discrepancy Tracker**
- Tracks variance between ordered and fulfilled quantities
- Categorizes by severity: High (>10%), Medium (>5%), Low
- Identifies over-shipments and under-shipments
- **Business Value**: Proactive issue identification

**3. Vendor Performance Ratings**
- Evaluates vendors on 3 dimensions:
  - On-Time Delivery (40% weight)
  - Quantity Accuracy (40% weight)
  - Response Time (20% weight)
- Overall score with rating bands
- **Business Value**: Data-driven vendor decisions

### PDF & Email Features

**4. One-Click PDF Generation**
- Professional letterhead with company branding
- Comprehensive PO details (vendor, items, terms)
- Auto-generated filename
- **Business Value**: Save 5 mins per PO formatting

**5. Email Integration**
- HTML email template with order details
- PDF attachment (optional)
- CC recipients support
- **Business Value**: Save 2 mins per PO sending

---

## 🔧 Troubleshooting

### Analytics Page Shows "No Data"
**Cause**: Database doesn't have POs and invoices yet

**Solution**:
1. Create a PI (Proforma Invoice)
2. Create EOPA from PI
3. Generate PO from EOPA
4. Enter invoice against PO
5. Refresh analytics page

### PDF Download Returns 404
**Cause**: PO ID doesn't exist

**Solution**:
- Check PO exists: `GET http://localhost:8000/api/po/`
- Use valid PO ID from the list

### Email Sending Fails
**Cause**: SMTP not configured or wrong credentials

**Solution**:
1. Check `.env` file has SMTP settings
2. For Gmail: Use App Password, not regular password
3. Test with `/api/po/test-email` endpoint
4. Check backend logs for detailed error

### Analytics API Returns 401 Unauthorized
**Cause**: Not logged in or token expired

**Solution**:
1. Log in again to get fresh token
2. Add `Authorization: Bearer TOKEN` header to requests

---

## 📊 Sample Data for Testing

If you don't have data, here's a quick setup:

**1. Create Vendor**:
```
POST /api/vendors/
{
  "vendor_name": "Test Pharma Ltd",
  "vendor_code": "TP001",
  "vendor_type": "MANUFACTURER"
}
```

**2. Create Medicine**:
```
POST /api/medicines/
{
  "medicine_name": "Paracetamol 500mg",
  "manufacturer_vendor_id": 1
}
```

**3. Create PI**:
```
POST /api/pi/
{
  "partner_vendor_id": 1,
  "items": [
    {
      "medicine_id": 1,
      "quantity": 1000,
      "unit_price": 5.50
    }
  ]
}
```

**4. Create EOPA** → **Generate PO** → **Enter Invoice**

Then visit Analytics page to see the magic! ✨

---

## 🎨 Frontend Enhancements (Coming Soon)

**PO Page Additions**:
- ⬇️ "Download PDF" button
- 📧 "Send Email" button with preview dialog
- 📋 Bulk operations (send multiple POs at once)

**Dashboard Widgets**:
- Quick analytics cards on main dashboard
- Match rate percentage
- Top/bottom performing vendors

**Email Preview**:
- Preview email before sending
- Edit subject and body
- Select recipients from vendor contacts

---

## 🚀 Next Steps

1. **Start Frontend Dev Server** (if not running):
```powershell
cd frontend
npm run dev
```

2. **Access Analytics Dashboard**:
- Open http://localhost:5173
- Login with your credentials
- Click "Analytics & Insights" in sidebar

3. **Test Backend APIs**:
- Use Postman/Thunder Client
- Test all 3 analytics endpoints
- Test PDF download
- Test email (if SMTP configured)

4. **Provide Feedback**:
- What metrics would you like to see?
- Any additional features needed?
- UI/UX improvements?

---

## 📚 Additional Resources

- **Full Documentation**: `docs/WOW_FEATURES_IMPLEMENTATION.md`
- **Email Setup Guide**: `backend/EMAIL_SETUP.md`
- **API Reference**: See Swagger docs at http://localhost:8000/docs
- **Backend Logs**: `backend/app/logs/` (for troubleshooting)

---

## 💡 Pro Tips

1. **Quick Analytics Access**: Bookmark http://localhost:5173/analytics
2. **API Testing**: Use VS Code REST Client extension for quick API tests
3. **PDF Customization**: Edit `backend/app/services/pdf_service.py` for branding
4. **Email Templates**: Modify `backend/app/services/email_service.py` for custom emails
5. **Performance**: Analytics data is calculated in real-time, no caching yet

---

**Need Help?**
- Check backend logs: `backend/app/logs/`
- Enable debug: Set `LOG_LEVEL=DEBUG` in `.env`
- Review error codes in API responses
