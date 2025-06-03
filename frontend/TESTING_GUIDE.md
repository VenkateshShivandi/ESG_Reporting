# Testing Guide - React Act() Warning Solutions

## Problem Description

When running tests in GitHub Actions, you may encounter the following warning:

```
Warning: An update to PopperContent inside a test was not wrapped in act(...).
```

This warning commonly appears when using Radix UI components (such as dropdown menus, popover boxes, etc.), especially in CI environments.

## Root Cause Analysis

1. **Environment Differences**: Different timing handling between local and CI environments
2. **Asynchronous Updates**: Asynchronous state updates within Radix UI components are not properly wrapped
3. **Third-party Libraries**: Animation libraries like framer-motion may also trigger similar warnings

## Solutions

### 1. Test Setup Optimization (vitest.setup.ts)

We have implemented the following solutions in `vitest.setup.ts`:

- **Console Warning Filtering**: Automatically filter known `act()` warnings
- **framer-motion Mock**: Replace animated components with static components
- **Other Third-party Library Mocks**: Including react-pdf, Supabase, etc.

### 2. Test Utility Functions (tests/test-utils.tsx)

Use the provided test utility functions to better handle asynchronous updates:

```typescript
import { renderWithDnd, waitForAsyncUpdates, actAsync } from '../test-utils';

// Render component with DnD
const { container } = renderWithDnd(<YourComponent />);

// Wait for asynchronous updates to complete
await waitForAsyncUpdates();

// Wrap user interactions
await actAsync(async () => {
  await user.click(button);
});
```

### 3. GitHub Actions Configuration

Environment variables added to the workflow to suppress warnings:

```yaml
env:
  SUPPRESS_REACT_ACT_WARNINGS: true
  VITEST_TIMEOUT: 30000
```

## Best Practices

### 1. Handling Asynchronous Operations

```typescript
// ✅ Correct: Wrap asynchronous operations
await act(async () => {
  await user.click(dropdownTrigger)
})

// ❌ Incorrect: Direct execution of asynchronous operations
await user.click(dropdownTrigger)
```

### 2. Waiting for Elements to Appear

```typescript
// ✅ Correct: Use waitFor
await waitFor(() => {
  expect(screen.getByText('Menu Item')).toBeInTheDocument()
})

// ❌ Incorrect: Immediate assertion
expect(screen.getByText('Menu Item')).toBeInTheDocument()
```

### 3. Cleanup Side Effects

```typescript
afterEach(() => {
  vi.clearAllMocks()
  // Clean up any other side effects
})
```

## Debugging Tips

1. **Local Reproduction**: If it only appears in CI, try running tests locally with `NODE_ENV=test`
2. **Detailed Logging**: Temporarily remove console filtering to see complete errors
3. **Component Isolation**: Test problematic components individually to narrow down the scope

## Related Files

- `frontend/vitest.setup.ts` - Test environment configuration
- `frontend/tests/test-utils.tsx` - Test utility functions
- `.github/workflows/frontend-test.yml` - CI configuration

## Important Notes

- These warnings typically don't affect functionality, they're mainly timing issues in the test environment
- Filtering warnings doesn't affect actual test logic
- If new warning patterns are encountered, filter rules need to be updated
