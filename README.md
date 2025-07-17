# Dataverse Utilities

A modern TypeScript library providing utilities for working with Microsoft Dataverse.

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
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

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