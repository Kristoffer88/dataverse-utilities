# Dataverse Utilities

A modern TypeScript library providing utilities for working with Microsoft Dataverse.

> **⚠️ CAUTION: AI-Generated Code**
> 
> This project was developed using AI assistance (Claude Code). Users should evaluate the code thoroughly before production use.

## Features

- 🚀 **ESM-first** with CommonJS compatibility
- 🔒 **Type-safe** with full TypeScript support
- 🧪 **Well-tested** with comprehensive test coverage
- 📦 **Zero dependencies** (peer dependencies only)
- ⚡ **Fast** builds with tsup
- 🎯 **Modern** JavaScript (ES2022+)

## Installation

```bash
npm install dataverse-utilities
```

### Peer Dependencies

This library uses [Zod](https://zod.dev/) for runtime validation:

```bash
npm install zod
```

## Usage

### Basic Usage

```typescript
import { formatEntityName, validateEntityMetadata } from 'dataverse-utilities'

// Format entity logical names
const displayName = formatEntityName('custom_entity')
console.log(displayName) // "Custom Entity"

// Validate entity metadata
const metadata = {
  logicalName: 'contact',
  displayName: 'Contact',
  primaryIdAttribute: 'contactid',
  primaryNameAttribute: 'fullname'
}

const validatedMetadata = validateEntityMetadata(metadata)
```

### Type Definitions

The library provides TypeScript types for common Dataverse operations:

```typescript
import type { EntityReference, DataverseResponse, QueryOptions } from 'dataverse-utilities'

const entityRef: EntityReference = {
  id: '12345',
  logicalName: 'contact',
  name: 'John Doe'
}

const queryOptions: QueryOptions = {
  select: ['fullname', 'emailaddress1'],
  filter: "statuscode eq 1",
  top: 10
}
```

## API Reference

### Functions

#### `formatEntityName(logicalName: string): string`

Formats a Dataverse entity logical name to a display name.

- **Parameters:**
  - `logicalName`: The logical name of the entity
- **Returns:** Formatted display name

#### `validateEntityMetadata(metadata: unknown): EntityMetadata`

Validates entity metadata against the schema.

- **Parameters:**
  - `metadata`: The metadata object to validate
- **Returns:** Validated `EntityMetadata` object
- **Throws:** `ZodError` if validation fails

### Types

#### `EntityMetadata`

```typescript
type EntityMetadata = {
  logicalName: string
  displayName: string
  primaryIdAttribute: string
  primaryNameAttribute?: string
}
```

#### `EntityReference`

```typescript
type EntityReference = {
  id: string
  logicalName: string
  name?: string
}
```

#### `DataverseResponse<T>`

```typescript
type DataverseResponse<T = unknown> = {
  value: T[]
  '@odata.context': string
  '@odata.count'?: number
  '@odata.nextLink'?: string
}
```

#### `QueryOptions`

```typescript
type QueryOptions = {
  select?: string[]
  filter?: string
  orderBy?: string[]
  top?: number
  skip?: number
  expand?: string[]
}
```

## Testing Utilities

### 🚨 Security Warning
**This library is designed for development and testing environments only. Do NOT use in production.**

The `dataverse-utilities/testing` module provides secure utilities for integration testing with Microsoft Dataverse. It automatically handles authentication via Azure CLI and provides a clean setup pattern for test environments.

### Installation

```bash
npm install dataverse-utilities
```

### Setup

In your test setup file (e.g., `src/test/setup.ts`):

```typescript
import { setupDataverse } from 'dataverse-utilities/testing';

setupDataverse({
  dataverseUrl: 'https://yourorg.crm4.dynamics.com'
});
```

### Usage in Tests

No imports needed - just use `fetch()` normally:

```typescript
// integration.test.ts
import { describe, it, expect } from 'vitest';

describe('Dataverse Integration', () => {
  it('fetches initiatives', async () => {
    // Library automatically adds auth headers and URL prefix
    const response = await fetch('/pum_initiatives?$select=pum_name&$top=5');
    const data = await response.json();
    
    expect(data.value).toBeInstanceOf(Array);
  });
});
```

### URL Patterns Supported

- `/pum_initiatives` → `https://yourorg.crm4.dynamics.com/api/data/v9.1/pum_initiatives`
- `/api/data/v9.1/pum_initiatives` → `https://yourorg.crm4.dynamics.com/api/data/v9.1/pum_initiatives`
- Full URLs work as-is

### Security Features

- ✅ **Command injection prevention**: URL validation and safe shell execution
- ✅ **Token protection**: Never logs tokens, sanitizes error messages
- ✅ **Input validation**: Comprehensive validation of all parameters
- ✅ **Environment enforcement**: Prevents production usage
- ✅ **HTTPS enforcement**: Only allows secure connections
- ✅ **Memory management**: Proper cleanup of sensitive data

### Prerequisites

- Azure CLI installed and logged in (`az login`)
- Access to the target Dataverse environment
- Node.js development or test environment (not production)

### Configuration Options

```typescript
setupDataverse({
  dataverseUrl: 'https://yourorg.crm4.dynamics.com',           // Required
  tokenRefreshInterval: 50 * 60 * 1000,                       // Optional: 50 minutes
  enableConsoleLogging: true,                                  // Optional: true
  mockToken: 'mock-token-for-testing'                          // Optional: for testing
});
```

### Troubleshooting

1. **"Invalid dataverse URL"**: Ensure your URL matches the pattern `https://yourorg.crm*.dynamics.com`
2. **"Authentication required"**: Run `az login` to authenticate with Azure CLI
3. **"Production environment"**: This library is blocked in production for security
4. **Command injection errors**: The library validates all inputs to prevent security vulnerabilities

### Testing API

#### `setupDataverse(options: DataverseSetupOptions): void`

Setup dataverse testing utilities.

- **Parameters:**
  - `options.dataverseUrl`: Required HTTPS Dataverse URL
  - `options.tokenRefreshInterval`: Optional token refresh interval (default: 50 minutes)
  - `options.enableConsoleLogging`: Optional console logging (default: true)
  - `options.mockToken`: Optional mock token for testing

#### `resetDataverseSetup(): void`

Reset the setup state (useful for testing the library itself).

#### `getAzureToken(options: AzureCliOptions): string | null`

Get Azure CLI access token for advanced use cases.

- **Parameters:**
  - `options.resourceUrl`: Required Dataverse URL
  - `options.enableLogging`: Optional logging (default: true)

## Development

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd dataverse-utilities

# Install dependencies
npm install

# Build the project
npm run build
```

### Scripts

- `npm run build` - Build the library
- `npm run dev` - Build in watch mode
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Lint the code
- `npm run lint:fix` - Fix linting errors
- `npm run format` - Format the code
- `npm run clean` - Clean build artifacts

### Testing

Tests are written using [Vitest](https://vitest.dev/) and located in the `tests/` directory:

```bash
# Run all tests (unit + security tests)
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run integration tests (requires Azure CLI login)
npm run test:integration
```

#### Integration Tests

Integration tests are skipped by default to avoid requiring real Azure CLI authentication. To run them:

1. Login to Azure CLI: `az login`
2. Run integration tests: `npm run test:integration`

These tests validate the library against real Dataverse environments and are useful for manual verification but not required for CI/CD.

### Code Quality

This project uses [Biome](https://biomejs.dev/) for linting and formatting:

```bash
# Check code quality
npm run lint

# Fix issues automatically
npm run lint:fix

# Format code
npm run format
```

## Project Structure

```
dataverse-utilities/
├── src/
│   ├── lib/           # Core library code
│   │   ├── index.ts   # Library exports
│   │   └── utils.ts   # Utility functions
│   ├── types/         # Type definitions
│   │   ├── index.ts   # Type exports
│   │   └── common.ts  # Common types
│   └── index.ts       # Main entry point
├── tests/             # Test files
├── dist/              # Build output
├── package.json       # Package configuration
├── tsconfig.json      # TypeScript configuration
├── tsup.config.ts     # Build configuration
├── vitest.config.ts   # Test configuration
└── biome.json         # Linting configuration
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Add tests for new functionality
5. Run tests and linting: `npm test && npm run lint`
6. Commit your changes: `git commit -m 'Add new feature'`
7. Push to the branch: `git push origin feature/new-feature`
8. Submit a pull request

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes.