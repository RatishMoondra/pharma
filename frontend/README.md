# Frontend Setup Guide

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   copy .env.example .env
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

   Visit http://localhost:5173

## Build for Production

```bash
npm run build
```

Build output will be in `dist/` directory.

## Project Structure

```
src/
  pages/           # Route-level page components
  components/      # Reusable UI components
  services/        # API client (axios)
  context/         # React Context (AuthContext)
  guards/          # Route guards for authentication
  App.jsx          # Main app component with routing
  main.jsx         # App entry point
```

## Key Features

### Authentication
- JWT-based authentication
- Token stored in localStorage
- Automatic token injection in API requests
- Auto-redirect to login on 401 errors

### Role-Based Access Control
- Route-level permission checking
- Menu items filtered by user role
- Different views for different roles

### API Integration
- Centralized axios instance in `services/api.js`
- Automatic error handling
- Request/response interceptors

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Environment Variables

Create `.env` file:

```env
VITE_API_URL=http://localhost:8000
```

## Adding New Pages

1. Create page component in `src/pages/`
2. Add route in `App.jsx`
3. Add menu item in `Sidebar.jsx` (if needed)
4. Add role-based protection with `PrivateRoute`

## Troubleshooting

### API connection errors
- Check `VITE_API_URL` in `.env`
- Ensure backend is running on correct port
- Check browser console for CORS errors

### Build errors
- Delete `node_modules` and run `npm install` again
- Clear Vite cache: `rm -rf node_modules/.vite`
