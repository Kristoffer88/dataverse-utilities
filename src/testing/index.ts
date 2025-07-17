export { setupDataverse, resetDataverseSetup } from './setup.js'
export type { DataverseSetupOptions } from './setup.js'

// Re-export auth utilities for advanced use cases
export { getAzureToken, clearTokenCache, hasCachedToken } from '../auth/azure-auth.js'
export type { AzureAuthOptions } from '../auth/azure-auth.js'
