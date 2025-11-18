# PharmaFlow 360 Logo Assets

## Required Logo File

Please place your logo file here:

📁 **Location:** `/frontend/src/assets/logo-pharmaflow.png`

### Logo Requirements:

- **Format:** PNG (with transparent background recommended)
- **Recommended Dimensions:** 
  - Width: 160-200px
  - Height: 40-50px
  - Aspect Ratio: ~4:1 (landscape orientation)
  
- **Color Mode:** RGB
- **Resolution:** 72-144 DPI (retina-ready)

### Where the Logo Appears:

1. **Top Navbar (Header)**
   - Height: 40px (scales to 32-28px on mobile)
   - Clickable - navigates to dashboard
   - Hover tooltip: "PharmaFlow 360 - Go to Dashboard"

2. **Sidebar (Left Navigation)**
   - Height: 32px
   - Positioned at the top above menu items
   - Clickable - navigates to dashboard
   - Hover tooltip: "PharmaFlow 360"

3. **Login Page**
   - Height: 48px
   - Centered above the login form

### Integration Complete ✅

The following files have been updated to use the logo:
- ✅ `Navbar.jsx` - Top navigation bar
- ✅ `Sidebar.jsx` - Left sidebar menu
- ✅ `LoginPage.jsx` - Login screen
- ✅ `index.css` - Logo CSS styles with responsive breakpoints

### Next Steps:

1. Add your logo file: `logo-pharmaflow.png` to this folder
2. Verify the logo appears correctly across all pages
3. Test responsiveness on different screen sizes
4. Adjust logo dimensions in CSS if needed

### Fallback:

If the logo file is missing, the application will show a broken image icon. The file path is imported as:
```javascript
import logo from '../assets/logo-pharmaflow.png'
```
