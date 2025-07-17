# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-01-17

### Added

- Initial release of dataverse-utilities
- `formatEntityName` function for formatting entity logical names to display names
- `validateEntityMetadata` function for validating entity metadata with Zod schema
- `EntityMetadataSchema` for runtime validation of entity metadata
- TypeScript type definitions for common Dataverse operations:
  - `EntityReference` type
  - `DataverseResponse` type
  - `QueryOptions` type
  - `AttributeType` type
- ESM-first package with CommonJS compatibility
- Comprehensive test suite with 100% coverage
- Modern build tooling with tsup
- Code quality tools (Biome for linting and formatting)
- Full TypeScript support with strict configuration

[Unreleased]: https://github.com/username/dataverse-utilities/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/username/dataverse-utilities/releases/tag/v0.1.0