export { setupDataverse, resetDataverseSetup } from './setup.js';
export type { DataverseSetupOptions } from './setup.js';

// Re-export auth utilities for advanced use cases
export { getAzureToken, clearTokenCache, hasCachedToken } from '../auth/azure-cli.js';
export type { AzureCliOptions } from '../auth/azure-cli.js';