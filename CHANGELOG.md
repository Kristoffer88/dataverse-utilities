# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.1] - 2025-01-17

### Fixed

- 🔧 **Vite Peer Dependency** - Updated peer dependency range from `"^4.0.0 || ^5.0.0"` to `">=4.0.0"` for broader compatibility with Vite versions
- 🐛 **NPM Resolution** - Resolves npm install conflicts with Vite 5.4+ versions

## [1.1.0] - 2025-01-17

### Added

- 🆕 **Vite Plugin Support** - Complete Vite development plugin for Dataverse integration
  - `createDataverseConfig()` - One-line Vite configuration setup
  - `createAuthPlugin()` - Authentication plugin for automatic token injection
  - `createDataverseProxy()` - Smart proxy configuration for `/api/data` routing
  - Environment variable support with `createDataverseConfigWithDefaults()`
- 📦 **New Export Path** - `dataverse-utilities/vite` for Vite-specific utilities
- 🔧 **Enhanced Build Configuration** - Updated tsup config for multi-entry builds
- 📚 **Comprehensive Documentation** - Added Vite usage examples and API reference

### Changed

- 📄 **Updated Package Description** - Now reflects Vite plugin capabilities
- 🏗️ **Build Process** - Added Vite utilities to build output with proper type definitions

## [1.0.2] - 2025-01-17

### Added

- Environment compatibility documentation and improved import support

## [1.0.1] - 2025-01-17

### Added

- Minor improvements and documentation updates

## [1.0.0] - 2025-01-17

### Added

- Initial release of dataverse-utilities
- TypeScript type definitions for common Dataverse operations:
  - `EntityReference` type
  - `DataverseResponse` type
  - `QueryOptions` type
  - `AttributeType` type
- ESM-first package with CommonJS compatibility
- Comprehensive test suite with security testing
- Azure Identity SDK integration for secure authentication
- Testing utilities for Dataverse integration tests
- Modern build tooling with tsup
- Code quality tools (Biome for linting and formatting)
- Full TypeScript support with strict configuration

[Unreleased]: https://github.com/kristoffer88/dataverse-utilities/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/kristoffer88/dataverse-utilities/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/kristoffer88/dataverse-utilities/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/kristoffer88/dataverse-utilities/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/kristoffer88/dataverse-utilities/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/kristoffer88/dataverse-utilities/releases/tag/v1.0.0