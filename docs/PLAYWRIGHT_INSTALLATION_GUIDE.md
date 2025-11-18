# Playwright Installation Guide

## Prerequisites
- Node.js 18+ installed
- Frontend dev server running on `http://localhost:5173`

## Installation Steps

### 1. Install Playwright Package

```powershell
cd frontend
npm install -D @playwright/test
```

**Expected output**:
```
added 3 packages, and audited 234 packages in 5s
```

### 2. Install Browsers

```powershell
npx playwright install
```

**Expected output**:
```
Downloading Chromium 120.0.6099.28 - 152.3 Mb [====================] 100%
Downloading Firefox 120.0 - 80.1 Mb [====================] 100%
Downloading Webkit 17.4 - 65.3 Mb [====================] 100%
```

**Note**: This downloads Chromium, Firefox, and WebKit browsers (~300MB total).

### 3. Install System Dependencies (Windows)

Playwright may require system dependencies for browser automation:

```powershell
npx playwright install-deps
```

**On Windows**: This usually completes quickly as most dependencies are bundled.

### 4. Verify Installation

```powershell
# Run a quick test
npx playwright test --help
```

**Expected output**:
```
Usage: npx playwright test [options] [test-filter...]

Options:
  -c, --config <file>        Configuration file
  --headed                   Run tests in headed browsers
  --debug                    Run tests with Playwright Inspector
  ...
```

## Running Tests

### Basic Commands

```powershell
# Run all E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run in UI mode (interactive)
npm run test:e2e:ui

# Debug mode with Playwright Inspector
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/e2e/pi-workflow.spec.ts

# Run specific test by name
npx playwright test -g "should create a new PI successfully"
```

### Browser Selection

```powershell
# Run on specific browser
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit

# Run on mobile
npm run test:e2e -- --project="Mobile Chrome"
npm run test:e2e -- --project="Mobile Safari"
```

### Reporting

```powershell
# Generate HTML report
npm run test:e2e -- --reporter=html

# Open report in browser
npm run test:e2e:report

# Report location
# playwright-report/index.html
```

## Troubleshooting

### Issue: `Error: page.goto: net::ERR_CONNECTION_REFUSED`

**Cause**: Frontend dev server not running  
**Solution**:
```powershell
# Terminal 1: Start dev server
cd frontend
npm run dev

# Terminal 2: Run tests
npm run test:e2e
```

### Issue: `browserType.launch: Executable doesn't exist`

**Cause**: Browsers not installed  
**Solution**:
```powershell
npx playwright install
```

### Issue: Test timeout waiting for element

**Cause**: Slow network, element selector incorrect  
**Solution**:
1. Increase timeout in `playwright.config.js`:
   ```js
   use: {
     actionTimeout: 30000, // 30 seconds
   }
   ```
2. Verify selector with Playwright Inspector:
   ```powershell
   npm run test:e2e:debug
   ```

### Issue: `Cannot find module '@playwright/test'`

**Cause**: Playwright not installed  
**Solution**:
```powershell
npm install -D @playwright/test
```

## Configuration

### Playwright Config Location
`frontend/playwright.config.js`

### Key Settings

```js
export default defineConfig({
  testDir: './tests/e2e',           // Test directory
  use: {
    baseURL: 'http://localhost:5173', // Dev server URL
    trace: 'on-first-retry',         // Trace on retry
    screenshot: 'only-on-failure',   // Screenshot on failure
    video: 'retain-on-failure',      // Video on failure
  },
  webServer: {
    command: 'npm run dev',          // Auto-start dev server
    url: 'http://localhost:5173',
    reuseExistingServer: true,       // Don't restart if running
  },
});
```

## Test Artifacts

### Screenshots
- **Location**: `test-results/`
- **Trigger**: Test failure
- **Format**: PNG

### Videos
- **Location**: `test-results/`
- **Trigger**: Test failure
- **Format**: WebM

### Traces
- **Location**: `test-results/`
- **Trigger**: First retry
- **Viewer**: `npx playwright show-trace <trace.zip>`

### HTML Report
- **Location**: `playwright-report/index.html`
- **Open**: `npm run test:e2e:report`

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Run Playwright tests
        run: npm run test:e2e
      
      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Best Practices

### 1. Run Dev Server First
Always start the frontend dev server before running tests:
```powershell
# Terminal 1
npm run dev

# Terminal 2 (after dev server is ready)
npm run test:e2e
```

### 2. Use UI Mode for Debugging
Interactive mode helps understand test failures:
```powershell
npm run test:e2e:ui
```

### 3. Check Test Results
Review HTML report after test runs:
```powershell
npm run test:e2e:report
```

### 4. Isolate Failing Tests
Run specific tests to debug:
```powershell
npx playwright test tests/e2e/pi-workflow.spec.ts -g "should create a new PI"
```

### 5. Use Headed Mode for Development
See what's happening in the browser:
```powershell
npm run test:e2e:headed
```

## Next Steps

1. ✅ Install Playwright: `npm install -D @playwright/test`
2. ✅ Install browsers: `npx playwright install`
3. ✅ Start dev server: `npm run dev`
4. ✅ Run sample test: `npm run test:e2e`
5. ✅ View report: `npm run test:e2e:report`
6. ⏳ Expand test coverage (EOPA, PO, Invoice workflows)

## Resources

- [Playwright Docs](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Debugging Guide](https://playwright.dev/docs/debug)
