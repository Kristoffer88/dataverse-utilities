/**
 * Dataverse Utilities
 *
 * A collection of utilities for working with Microsoft Dataverse
 */

export type { AzureAuthOptions } from './auth/azure-auth.js'
export { clearTokenCache, getAzureToken, hasCachedToken } from './auth/azure-auth.js'
