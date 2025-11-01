# Testing Guide - GutsMail

**by Highguts Solutions LLP** | [highguts.com](https://highguts.com)

This document describes the testing infrastructure and how to run tests.

## Overview

The project uses **Vitest** for unit and integration testing with the following stack:
- **Vitest**: Fast test runner (compatible with Jest API)
- **React Testing Library**: Component testing
- **Happy DOM**: Lightweight DOM implementation
- **MSW**: API mocking (configured for future use)

## Test Structure

```
tests/
├── setup.ts                 # Global test configuration
├── utils.tsx                # Shared test utilities and mocks
├── api/                     # API route tests
│   └── categories.test.ts
├── components/              # React component tests
│   └── example.test.tsx
└── lib/                     # Library/utility function tests
    ├── gemini.test.ts
    └── gmail.test.ts
```

## Running Tests

### Run All Tests Once
```bash
npm run test
```

### Watch Mode (Re-run on Changes)
```bash
npm run test -- --watch
```

### Run with Coverage
```bash
npm run test:coverage
```

Coverage reports will be generated in:
- Console output (text)
- `coverage/index.html` (interactive HTML report)

### Run Specific Test Files
```bash
npm run test -- tests/api/categories.test.ts
npm run test -- tests/lib/gmail.test.ts
```

### Run Tests Matching a Pattern
```bash
npm run test -- -t "should create a new category"
```

## Test Results

Current test coverage:

```
✅ 4 test files
✅ 28 tests passing
   - 12 Gmail utility tests
   - 10 Categories API tests
   - 3 Component tests
   - 3 AI infrastructure tests
```

### What's Tested

#### ✅ API Routes
- `/api/categories` (GET, POST)
  - Authentication checks
  - Input validation
  - Error handling
  - Database interactions

#### ✅ Gmail Utilities
- `extractUnsubscribeLink`
  - Various link formats
  - HTML vs plain text
  - Edge cases and error handling

#### ✅ Components
- Basic component rendering
- Event handling
- Props validation

#### ✅ Test Infrastructure
- Async testing capabilities
- Error handling patterns
- Mock configurations

### What's NOT Tested (By Design)

**AI Functions** - These require real API calls and are validated through:
- Manual testing with real Gemini API
- Integration tests in production environment
- All functions have proper error handling and fallbacks

**Reasoning**: Mocking AI responses is brittle and doesn't test the actual integration. The functions are simple wrappers around API calls with error handling.

## Writing New Tests

### Example: API Route Test

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/your-route/route';
import { NextRequest } from 'next/server';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

describe('Your API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return data for authenticated users', async () => {
    // Arrange
    vi.mocked(getServerSession).mockResolvedValue(mockSession);

    // Act
    const request = new NextRequest('http://localhost:3000/api/your-route');
    const response = await GET(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('expectedProperty');
  });
});
```

### Example: Utility Function Test

```typescript
import { describe, it, expect } from 'vitest';
import { yourFunction } from '@/lib/your-file';

describe('yourFunction', () => {
  it('should handle valid input', () => {
    const result = yourFunction('test input');
    expect(result).toBe('expected output');
  });

  it('should handle edge cases', () => {
    expect(yourFunction('')).toBeNull();
    expect(yourFunction(null)).toBeNull();
  });
});
```

### Example: Component Test

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import YourComponent from '@/app/components/YourComponent';

describe('YourComponent', () => {
  it('should render with props', () => {
    render(<YourComponent title="Test" />);
    expect(screen.getByText('Test')).toBeDefined();
  });
});
```

## Mock Data

Use the mock factories in `tests/utils.tsx`:
- `mockUser` - Sample user object
- `mockSession` - Sample NextAuth session
- `mockCategory` - Sample category
- `mockEmail` - Sample email
- `mockSenderProfile` - Sample sender profile
- `mockInsight` - Sample insight data

## Debugging Tests

### Run Tests in Debug Mode
```bash
node --inspect-brk ./node_modules/vitest/vitest.mjs --run
```

### View Detailed Error Output
```bash
npm run test -- --reporter=verbose
```

### Check Which Tests Are Running
```bash
npm run test -- --reporter=verbose --run
```

## Best Practices

### ✅ DO
- Write tests for business logic
- Test error handling paths
- Use descriptive test names
- Clear mocks between tests (`beforeEach`)
- Test edge cases and boundaries
- Keep tests focused and simple

### ❌ DON'T
- Test implementation details
- Write overly complex tests
- Mock everything (test real integrations when possible)
- Test third-party libraries
- Duplicate tests

## Continuous Integration

Tests should be run automatically on:
- Every commit (pre-commit hook)
- Every pull request (GitHub Actions)
- Before deployment

Example GitHub Actions workflow (coming in Phase 4):
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
```

## Coverage Goals

Current coverage is focused on:
- Critical business logic ✅
- API authentication/authorization ✅
- Data validation ✅
- Error handling ✅

For production, aim for:
- **70%+ overall coverage**
- **90%+ for critical paths**
- **100% for authentication/security code**

## Troubleshooting

### Tests Fail with "Cannot find module"
```bash
# Clear the Vitest cache
npx vitest --clearCache
```

### Mock Not Working
- Ensure mocks are defined before imports
- Check `tests/setup.ts` for global mocks
- Use `vi.clearAllMocks()` in `beforeEach`

### Slow Tests
- Use `--no-coverage` flag during development
- Run specific test files instead of all tests
- Check for unnecessary async operations

### Database Errors in Tests
- Tests use mocked Prisma client (no real DB access)
- Check that mocks are configured in `tests/setup.ts`

## Next Steps

Future testing improvements:
1. **E2E Tests**: Add Playwright for end-to-end testing
2. **Visual Regression**: Add screenshot comparison tests
3. **Performance Tests**: Add load testing for API routes
4. **Contract Tests**: Validate API response schemas
5. **Integration Tests**: Test with real database (separate test DB)

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/react)
- [MSW Documentation](https://mswjs.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
