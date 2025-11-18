# Test Suite Documentation

## Overview
Comprehensive test suite for the Pharmaceutical Procurement & Dispatch System covering backend API testing (pytest) and frontend E2E testing (Playwright).

## Test Structure

```
backend/tests/
  ├── conftest.py                    # Pytest fixtures (database, auth, test data)
  ├── test_pi_workflow.py            # PI creation, approval, validation (13 tests)
  ├── test_eopa_workflow.py          # EOPA generation, vendor assignment (10 tests)
  ├── test_po_workflow.py            # PO creation (RM/PM/FG), artwork specs (18 tests)
  ├── test_invoice_workflow.py      # Invoice processing, PO fulfillment (21 tests)
  ├── test_hsn_gst_logic.py         # HSN validation, GST calculations (10 tests)
  ├── test_material_balance.py      # Material balance tracking (8 tests)
  └── test_integration_workflow.py  # Full PI→EOPA→PO→Invoice→GRN (5 tests)

frontend/tests/
  ├── e2e/
  │   └── pi-workflow.spec.ts       # PI E2E tests (10 tests)
  ├── helpers/
  │   └── auth.helper.ts            # Authentication helper
  └── pages/
      └── pi.page.ts                # PI page object
```

## Backend Testing (pytest)

### Running Tests

```powershell
# Run all tests
cd backend
pytest

# Run with coverage report
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_pi_workflow.py -v

# Run by marker
pytest -m unit          # Unit tests only
pytest -m integration   # Integration tests only
pytest -m workflow      # Workflow tests only
pytest -m "pi and unit" # PI unit tests

# Run slow tests
pytest -m slow

# Stop after first failure
pytest -x

# Run last failed tests
pytest --lf
```

### Test Markers

- `unit` - Unit tests for models and services
- `integration` - Integration tests for API endpoints
- `workflow` - End-to-end workflow tests
- `slow` - Slow tests (full workflows)
- `database` - Database-dependent tests
- `auth` - Authentication tests
- `pi` - Proforma Invoice tests
- `eopa` - EOPA tests
- `po` - Purchase Order tests
- `invoice` - Vendor Invoice tests
- `grn` - GRN tests

### Test Database

- **Type**: SQLite in-memory (`:memory:`)
- **Lifecycle**: Function-scoped (rollback after each test)
- **Fixtures**: Pre-configured test data (users, vendors, medicines, PI, EOPA, PO)

### Test Coverage

Current coverage (estimated):
- **PI Workflow**: 13 tests (creation, approval, validation, HSN auto-population)
- **EOPA Workflow**: 10 tests (generation, vendor defaults, approval, PO generation)
- **PO Workflow**: 18 tests (RM/PM/FG creation, artwork specs, delivery schedules, fulfillment)
- **Invoice Workflow**: 21 tests (creation, HSN/GST validation, batch tracking, PO updates)
- **HSN/GST Logic**: 10 tests (HSN validation, GST calculations, CGST/SGST/IGST)
- **Material Balance**: 8 tests (RM/PM/FG balance updates, validation)
- **Integration**: 5 tests (full workflows, multi-vendor, partial fulfillment)

**Total**: ~85 backend tests

## Frontend Testing (Playwright)

### Setup

```powershell
# Install Playwright
cd frontend
npm install -D @playwright/test

# Install browsers
npx playwright install

# Install OS dependencies (if needed)
npx playwright install-deps
```

### Running E2E Tests

```powershell
# Run all E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run in UI mode (interactive)
npm run test:e2e -- --ui

# Run specific test file
npm run test:e2e tests/e2e/pi-workflow.spec.ts

# Run specific browser
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit

# Debug mode
npm run test:e2e -- --debug
```

### Test Reports

```powershell
# Generate HTML report
npm run test:e2e -- --reporter=html

# Open report
npx playwright show-report
```

### Page Objects

Page objects encapsulate UI interactions for reusability:

- **PIPage**: PI list, creation, approval, PDF download
- **POPage**: PO creation (RM/PM/FG), conditional fields
- **InvoicePage**: Invoice submission, batch tracking

### Authentication

All E2E tests use the `AuthHelper` for login:

```typescript
const auth = new AuthHelper(page);
await auth.loginAsAdmin();
await auth.loginAsProcurement();
await auth.loginAsWarehouse();
```

## Test Data

### Backend Fixtures (conftest.py)

- **Users**: admin, procurement, warehouse (with JWT tokens)
- **Vendors**: partner (customer), manufacturer, RM vendor, PM vendor
- **Medicines**: Paracetamol (HSN 30049099), Amoxicillin (HSN 30042010)
- **Workflow**: Sample PI, EOPA, FG PO

### Frontend Test Data

- **Partner Vendor**: Global Pharma
- **Medicines**: Paracetamol, Amoxicillin
- **Quantities**: 500-5000 units
- **Prices**: ₹50-₹100 per unit

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - run: pip install -r backend/requirements.txt
      - run: pytest backend/tests/ --cov=app --cov-report=xml
      - uses: codecov/codecov-action@v3
  
  frontend-tests:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

## Best Practices

### Backend Testing

1. **Use fixtures** for test data (avoid direct database calls)
2. **Mark tests appropriately** for selective execution
3. **Test one thing per test** (focused, readable)
4. **Use Decimal for monetary values** (not float)
5. **Verify nested relationships** (eager loading)
6. **Test error scenarios** (validation, business rules)

### Frontend Testing

1. **Use page objects** for UI interactions
2. **Avoid hardcoded waits** (use `waitForURL`, `waitForSelector`)
3. **Use semantic selectors** (getByRole, getByLabel, getByText)
4. **Test user workflows** (not implementation details)
5. **Isolate tests** (cleanup state, use beforeEach/afterEach)
6. **Test accessibility** (proper ARIA labels, keyboard navigation)

## Troubleshooting

### Backend Tests

**Issue**: `Import "pytest" could not be resolved`  
**Solution**: Expected - pytest installs in test environment, imports resolve at runtime

**Issue**: `TypeError: unsupported operand type(s) for *: 'decimal.Decimal' and 'float'`  
**Solution**: Convert Pydantic float to Decimal: `Decimal(str(float_value))`

**Issue**: `UniqueViolation: duplicate key value`  
**Solution**: Use `db.flush()` after each insert in loops

### Frontend Tests

**Issue**: Test timeout waiting for element  
**Solution**: Check selector specificity, verify element exists, increase timeout

**Issue**: `Error: page.goto: net::ERR_CONNECTION_REFUSED`  
**Solution**: Ensure dev server is running (`npm run dev`)

**Issue**: Authentication fails  
**Solution**: Check credentials in `auth.helper.ts`, verify API endpoint

## Coverage Goals

- **Backend**: 80%+ code coverage (services, models, routers)
- **Frontend**: 70%+ E2E workflow coverage (critical user paths)

## Test Maintenance

- Update fixtures when database schema changes
- Add new test files for new features
- Review and update page objects when UI changes
- Keep test data realistic and representative
- Document complex test scenarios

## Resources

- [pytest Documentation](https://docs.pytest.org/)
- [Playwright Documentation](https://playwright.dev/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
