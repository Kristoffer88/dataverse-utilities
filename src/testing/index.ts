export type { AzureAuthOptions } from '../auth/azure-auth.js'
// Re-export auth utilities for advanced use cases
export { clearTokenCache, getAzureToken, hasCachedToken } from '../auth/azure-auth.js'
export type { DataverseSetupOptions } from './setup.js'
export { resetDataverseSetup, setupDataverse } from './setup.js'
