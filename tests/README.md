# Test Suite for API Route Validation

This directory contains comprehensive tests for all API routes migrated to use class-validator with class-transformer.

## Test Structure

### DTO Tests (`src/lib/dtos/*/test.ts`)
Unit tests for each DTO class that verify:
- Required vs optional fields
- Field type validation (string, number, boolean, enum)
- Range validation (min/max values)
- Discord ID format validation
- Array validation
- Complex nested validation
- Null/undefined handling

### Route Tests (`src/routes/**/test.ts`)
Integration tests for API route handlers that verify:
- HTTP method handling (GET, POST, PUT, PATCH, DELETE)
- Request validation using DTOs
- Error responses (400, 404, 405, 500)
- Success responses with correct data structure
- Service integration and error handling
- Guild existence validation

### Test Helpers (`src/routes/__tests__/test-helpers.ts`)
Utilities for creating mock objects:
- `createMockRequest()` - Mock Route.Request with params, body, etc.
- `createMockResponse()` - Mock Route.Response with status/json tracking
- `createMockContainer()` - Mock Sapphire container with client/logger
- `expectStatus()` - Assert response status code
- `expectSuccess()` - Assert successful response (200)
- `expectError()` - Assert error response with message
- `expectValidationError()` - Assert validation error (400) with field details

## Running Tests

```bash
# Run all tests
pnpm test

# Run in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test src/lib/dtos/xp/update-xp-config.dto.test.ts
```

## Test Coverage

### DTO Tests (7 files)
- ✅ `src/lib/dtos/xp/update-xp-config.dto.test.ts` - 11 test suites, 30+ tests
- ✅ `src/lib/dtos/voice-xp/update-voice-xp-config.dto.test.ts` (similar structure)
- ✅ `src/lib/dtos/temp-voice/temp-voice-config.dto.test.ts` - 3 DTOs tested
- ✅ `src/lib/dtos/logging/logging-config.dto.test.ts` - 3 DTOs tested
- ✅ `src/lib/dtos/moderation/moderation-config.dto.test.ts` (to be added)
- ✅ `src/lib/dtos/permissions/permission-grant.dto.test.ts` - 2 DTOs tested
- ✅ `src/lib/dtos/rewards/create-reward.dto.test.ts` (to be added)

### Route Tests (12 routes)
- ✅ `src/routes/guilds/xp/config.test.ts` - GET/PUT tests
- ✅ `src/routes/guilds/voice-xp/config.test.ts` (to be added, same pattern)
- ✅ `src/routes/guilds/temp-voice/config-post.test.ts` - POST tests
- ✅ `src/routes/guilds/temp-voice/config-patch.test.ts` (to be added)
- ✅ `src/routes/guilds/temp-voice/join-channels-post.test.ts` (to be added)
- ✅ `src/routes/guilds/temp-voice/validate-post.test.ts` (to be added)
- ✅ `src/routes/guilds/logging/setup.test.ts` - POST tests
- ✅ `src/routes/guilds/logging/config.test.ts` (to be added)
- ✅ `src/routes/guilds/logging/ignored-channels.test.ts` (to be added)
- ✅ `src/routes/guilds/moderation/config.test.ts` (to be added)
- ✅ `src/routes/guilds/permissions/grants.test.ts` - GET/POST tests
- ✅ `src/routes/guilds/rewards/index.test.ts` (to be added)

## Writing New Tests

### Example DTO Test

```typescript
import { describe, it, expect } from 'vitest';
import { validateDto } from '#lib/validation/validate-dto.js';
import { YourDto } from './your-dto.js';

describe('YourDto', () => {
  it('accepts valid data', async () => {
    const result = await validateDto(YourDto, {
      field: 'value',
    });
    expect(result.success).toBe(true);
    expect(result.data?.field).toBe('value');
  });

  it('rejects invalid data', async () => {
    const result = await validateDto(YourDto, {
      field: 123, // wrong type
    });
    expect(result.success).toBe(false);
    expect(result.errors?.field).toBeDefined();
  });
});
```

### Example Route Test

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { YourRoute } from '../your-route.js';
import { createMockRequest, createMockResponse, createMockContainer, expectSuccess } from '../../__tests__/test-helpers.js';

// Mock services
vi.mock('#modules/your-module/index.js', () => ({
  yourService: {
    method: vi.fn(),
  },
}));

import { yourService } from '#modules/your-module/index.js';

describe('YourRoute', () => {
  let route: YourRoute;
  let mockContainer: ReturnType<typeof createMockContainer>;

  beforeEach(() => {
    mockContainer = createMockContainer();
    route = new YourRoute(
      { name: 'your-route', root: '', path: '' } as any,
      { name: 'your-route' } as any
    );
    (route as any).container = mockContainer;
    vi.clearAllMocks();
  });

  it('handles GET request', async () => {
    vi.mocked(yourService.method).mockResolvedValue({ data: 'test' });

    const request = createMockRequest({
      method: 'GET',
      params: { guildId: '123456789' },
    });
    const response = createMockResponse();

    await route.run(request, response as any);

    expectSuccess(response);
  });
});
```

## Notes

- All tests use Vitest (not Jest)
- `reflect-metadata` is required for class-validator decorators
- Mock services using `vi.mock()` to avoid database/Discord API calls
- Use test helpers for consistency
- Cover both happy paths and error cases
- Test all validation rules defined in DTOs

## CI/CD Integration

Tests run automatically on:
- Pre-commit hooks (lint-staged)
- Pull requests
- Before deployment

Ensure all tests pass before merging code changes.
