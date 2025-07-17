# Dataverse Utilities

A modern TypeScript library providing utilities for working with Microsoft Dataverse, including Vite development plugins and testing utilities.

> **⚠️ CAUTION: AI-Generated Code**
> 
> This project was developed using AI assistance (Claude Code). Users should evaluate the code thoroughly before production use.

## What This Package Provides

- 🔐 **Automatic Azure Authentication** - Handles Azure CLI/Identity authentication for Dataverse API calls
- 🧪 **Easy Integration Testing** - Simple setup for testing against real Dataverse environments
- ⚡ **Vite Development Plugin** - Seamless Dataverse integration for Vite-based applications
- 🛡️ **Security Hardening** - Input validation, token sanitization, and development-only enforcement
- 🔀 **Smart URL Routing** - Automatically routes `/api/data` calls to your Dataverse instance
- ⚡ **Token Management** - Handles token caching and refresh (55-minute cache)
- 🎯 **TypeScript Support** - Full type safety for Dataverse operations

## Installation

```bash
npm install dataverse-utilities
```

### Dependencies

This library uses `@azure/identity` for Azure authentication and `validator` for URL validation.

## Usage

### Basic Usage

The main library provides authentication and testing utilities for Microsoft Dataverse development.

```typescript
import { setupDataverse } from 'dataverse-utilities/testing'

await setupDataverse({
  dataverseUrl: 'https://yourorg.crm4.dynamics.com'
})
```

### Vite Plugin Usage

For Vite-based applications, use the Vite plugin for seamless Dataverse integration during development:

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createDataverseConfig } from "dataverse-utilities/vite";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    
    const config = createDataverseConfig({
        dataverseUrl: env.VITE_DATAVERSE_URL,
    });

    return {
        ...config,
        plugins: [react(), ...config.plugins],
    };
});
```

**Alternative (server-only proxy):**
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createDataverseConfig } from 'dataverse-utilities/vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: createDataverseConfig({
      dataverseUrl: "https://yourorg.crm4.dynamics.com"
    }).server.proxy
  }
})
```

This automatically configures:
- **Proxy setup** - Routes `/api/data/*` requests to your Dataverse instance
- **Authentication plugin** - Injects Azure tokens into browser requests
- **Development optimization** - Token refresh and error handling

**In your application code:**

```typescript
// No imports needed - just use fetch() normally
const response = await fetch('/api/data/v9.1/accounts?$select=name&$top=5')
const data = await response.json()
```

The plugin handles authentication automatically during development.

## API Reference

### Main Library

The main library exports are currently minimal - add your own utilities here as needed.

### Vite Plugin (`dataverse-utilities/vite`)

#### `createDataverseConfig(options: DataverseViteOptions): DataverseViteConfig`

Creates a complete Vite configuration with Dataverse proxy and authentication plugin.

**Options:**
- `dataverseUrl`: Required HTTPS Dataverse URL
- `tokenRefreshInterval`: Optional token refresh interval (default: 50 minutes)
- `enableConsoleLogging`: Optional console logging (default: true)
- `proxyPath`: Optional proxy path pattern (default: '^/api/data')
- `customProxyOptions`: Optional additional proxy configuration
- `skipAuthentication`: Optional skip auth plugin (default: false)
- `additionalPaths`: Optional additional proxy paths

**Returns:** Configuration object with `server.proxy` and `plugins` for Vite

#### `createDataverseConfigWithDefaults(dataverseUrl?, overrides?): DataverseViteConfig`

Creates Dataverse configuration with smart defaults, supporting environment variables.

**Parameters:**
- `dataverseUrl`: Optional URL (falls back to `VITE_DATAVERSE_URL` env var)
- `overrides`: Optional configuration overrides

#### Advanced Exports

- `createAuthPlugin(options)` - Create just the authentication plugin
- `createDataverseProxy(options)` - Create just the proxy configuration  
- `createAdvancedDataverseProxy(options)` - Create proxy with multiple patterns

## Testing Utilities

### 🚨 Security Warning
**This library is designed for development and testing environments only. Do NOT use in production.**

The `dataverse-utilities/testing` module provides secure utilities for integration testing with Microsoft Dataverse. It automatically handles authentication via Azure CLI and provides a clean setup pattern for test environments.

### Installation

```bash
npm install dataverse-utilities
```

### Setup

Choose one of these setup approaches:

**Option 1: Global setup file** (recommended for most projects)

In your test setup file (e.g., `src/test/setup.ts` or `vitest.config.ts` setup):

```typescript
import { setupDataverse } from 'dataverse-utilities/testing';

await setupDataverse({
  dataverseUrl: 'https://yourorg.crm4.dynamics.com'
});
```

**Option 2: Per-test setup** (for more control)

In individual test files using `beforeAll` or `beforeEach`:

```typescript
import { beforeAll, describe, it } from 'vitest';
import { setupDataverse } from 'dataverse-utilities/testing';

describe('Dataverse Integration', () => {
  beforeAll(async () => {
    await setupDataverse({
      dataverseUrl: 'https://yourorg.crm4.dynamics.com'
    });
  });

  it('fetches data', async () => {
    const response = await fetch('/api/data/v9.1/accounts?$top=1');
    // ... test code
  });
});
```

**Important:** `setupDataverse` is async and must be awaited. Choose either global setup OR per-test setup, not both.

### Usage in Tests

No imports needed - just use `fetch()` normally:

```typescript
// integration.test.ts
import { describe, it, expect } from 'vitest';

describe('Dataverse Integration', () => {
  it('fetches accounts', async () => {
    // Library automatically adds auth headers and URL prefix
    const response = await fetch('/api/data/v9.1/accounts?$select=name,emailaddress1&$top=5');
    const data = await response.json();
    
    expect(data.value).toBeInstanceOf(Array);
  });
});
```

### URL Patterns Supported

- `/api/data/v9.1/accounts` → `https://yourorg.crm4.dynamics.com/api/data/v9.1/accounts` (adds auth)
- `https://yourorg.crm4.dynamics.com/api/data/v9.1/accounts` → same URL (adds auth)
- Other URLs → passed through as-is (auth only added if URL contains `/api/data`)

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
- **Node.js test environment** (not browser environments like `happy-dom`)

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

1. **"Failed to parse URL from /api/data/..."**: You forgot to `await setupDataverse()` - see setup section above
2. **"Invalid dataverse URL"**: Ensure your URL matches the pattern `https://yourorg.crm*.dynamics.com`
3. **"Authentication required"**: Run `az login` to authenticate with Azure CLI
4. **"Production environment"**: This library is blocked in production for security
5. **Command injection errors**: The library validates all inputs to prevent security vulnerabilities

#### Top-level await Issues

If you get `Top-level 'await' expressions are only allowed when...`, update your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "es2022"
  }
}
```

#### Environment Compatibility

This library requires a **Node.js environment** and has limited compatibility with browser-like test environments:

- ✅ **Supported**: `environment: "node"` (default), `environment: "jsdom"`
- ❌ **Not supported**: `environment: "happy-dom"`



### Testing API

#### `setupDataverse(options: DataverseSetupOptions): Promise<void>`

Setup dataverse testing utilities. **Must be awaited.**

- **Parameters:**
  - `options.dataverseUrl`: Required HTTPS Dataverse URL
  - `options.tokenRefreshInterval`: Optional token refresh interval (default: 50 minutes)
  - `options.enableConsoleLogging`: Optional console logging (default: true)
  - `options.mockToken`: Optional mock token for testing
- **Returns:** Promise that resolves when setup is complete

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

## Available Utilities

### Main Library (`dataverse-utilities`)

Currently minimal - add your own Dataverse utilities here as needed.

### Vite Plugin (`dataverse-utilities/vite`)

- **`createDataverseConfig(options)`** - Complete Vite configuration with proxy and authentication
- **`createDataverseConfigWithDefaults(url?, overrides?)`** - Configuration with environment variable support
- **`createAuthPlugin(options)`** - Authentication plugin for token injection
- **`createDataverseProxy(options)`** - Proxy configuration for API routing
- **`createAdvancedDataverseProxy(options)`** - Multi-pattern proxy configuration

### Testing Utilities (`dataverse-utilities/testing`)

- **`setupDataverse(options)`** - Configure testing environment with automatic Azure authentication
- **`resetDataverseSetup()`** - Reset setup state (useful for testing the library itself)
- **`getAzureToken(options)`** - Get Azure CLI access token for advanced use cases
- **`clearTokenCache()`** - Clear cached authentication tokens
- **`hasCachedToken()`** - Check if valid cached token exists

### Authentication Features

- **Azure Identity SDK integration** - Secure token acquisition using `@azure/identity`
- **Chained credentials** - Supports Azure CLI, Managed Identity, and DefaultAzureCredential
- **Token caching** - Automatic token refresh with 55-minute cache
- **Security hardening** - Input validation, command injection prevention, token sanitization

## Project Structure

```
dataverse-utilities/
├── src/
│   ├── auth/          # Authentication utilities
│   │   └── azure-auth.ts  # Azure Identity SDK integration
│   ├── testing/       # Testing utilities
│   │   ├── index.ts   # Testing exports
│   │   └── setup.ts   # Test environment setup
│   ├── vite/          # Vite plugin utilities
│   │   ├── index.ts   # Vite exports
│   │   ├── auth-plugin.ts  # Authentication plugin
│   │   ├── config.ts  # Configuration helpers
│   │   └── proxy.ts   # Proxy configuration
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