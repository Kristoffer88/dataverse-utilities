import { URL } from 'node:url'
import {
  AzureCliCredential,
  ChainedTokenCredential,
  DefaultAzureCredential,
  ManagedIdentityCredential,
} from '@azure/identity'
import validator from 'validator'

interface TokenCache {
  token: string
  expiry: number
}

let tokenCache: TokenCache | null = null

export interface AzureAuthOptions {
  resourceUrl: string
  enableLogging?: boolean
}

/**
 * 🔒 SECURITY: Validate dataverse URL using validator library
 */
function validateDataverseUrl(url: string, allowedDomains?: string[]): boolean {
  try {
    // Use validator library for robust URL validation
    if (
      !validator.isURL(url, {
        protocols: ['https'],
        require_protocol: true,
        require_valid_protocol: true,
      })
    ) {
      return false
    }

    const parsedUrl = new URL(url)

    // Standard dataverse domain patterns
    const standardDomains = [
      /^[\w-]+\.crm\d*\.dynamics\.com$/,
      /^[\w-]+\.crm\d*\.microsoftdynamics\.com$/,
      /^[\w-]+\.crm\d*\.microsoftdynamics\.us$/,
      /^[\w-]+\.crm\d*\.microsoftdynamics\.de$/,
      /^[\w-]+\.crm\d*\.microsoftdynamics\.cn$/,
    ]

    // Check standard domains first
    const isStandardDomain = standardDomains.some(pattern => pattern.test(parsedUrl.hostname))

    // Check custom domains if provided
    const isCustomDomain = allowedDomains?.some(domain => {
      // Allow exact matches or subdomain matches
      return parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
    })

    if (!isStandardDomain && !isCustomDomain) {
      return false
    }

    // Additional security check - no suspicious characters
    const suspiciousChars = /[`${}\\;|&<>]/
    if (suspiciousChars.test(url)) {
      return false
    }

    return true
  } catch (_error) {
    return false
  }
}

/**
 * 🔒 SECURITY: Sanitize error messages to prevent token leakage
 */
function sanitizeErrorMessage(error: unknown): string {
  if (!error) return 'Unknown error'

  let message = error instanceof Error ? error.message : String(error)

  // Remove potential tokens (anything that looks like a JWT or long base64 string)
  message = message.replace(/[A-Za-z0-9+/]{100,}/g, '[REDACTED-TOKEN]')

  // Remove other sensitive patterns
  message = message.replace(/Bearer\s+[A-Za-z0-9+/=._-]+/gi, 'Bearer [REDACTED]')
  message = message.replace(/access_token[=:]\s*[A-Za-z0-9+/=._-]+/gi, 'access_token=[REDACTED]')

  return message
}

/**
 * 🔒 SECURITY: Get Azure access token using Azure Identity SDK
 * Uses chained credentials for better flexibility and security
 */
async function getAzureAccessToken(resourceUrl: string): Promise<string> {
  // Create credential chain - try Azure CLI first, then managed identity
  const credential = new ChainedTokenCredential(
    new AzureCliCredential(),
    new ManagedIdentityCredential()
  )

  try {
    const tokenResponse = await credential.getToken(resourceUrl)
    return tokenResponse.token
  } catch (_error) {
    // If chained credential fails, fall back to DefaultAzureCredential
    const defaultCredential = new DefaultAzureCredential()
    const tokenResponse = await defaultCredential.getToken(resourceUrl)
    return tokenResponse.token
  }
}

/**
 * Get Azure access token for the specified resource using Azure Identity SDK
 * Includes caching to avoid repeated token requests
 * 🔒 SECURITY HARDENED: Input validation, credential chaining, token sanitization
 */
export async function getAzureToken(options: AzureAuthOptions): Promise<string | null> {
  const { resourceUrl, enableLogging = true } = options

  // 🔒 SECURITY: Validate input parameters
  if (!resourceUrl || typeof resourceUrl !== 'string') {
    throw new Error('resourceUrl is required and must be a string')
  }

  if (!validateDataverseUrl(resourceUrl)) {
    throw new Error(
      `Invalid dataverse URL: ${resourceUrl}. Must be a valid HTTPS dataverse domain.`
    )
  }

  try {
    // Check if we have a valid cached token
    if (tokenCache && Date.now() < tokenCache.expiry) {
      return tokenCache.token
    }

    if (enableLogging) {
      console.log('🔐 Getting fresh Azure access token...')
      // 🔒 SECURITY: Safe to log URL since we've validated it
      console.log(`   Resource URL: ${resourceUrl}`)
    }

    // 🔒 SECURITY: Get token using Azure Identity SDK
    const result = await getAzureAccessToken(resourceUrl)

    if (result && result.length > 0) {
      // 🔒 SECURITY: Validate token format (basic check)
      if (result.length < 50 || result.includes(' ') || result.includes('\n')) {
        throw new Error('Invalid token format received from Azure CLI')
      }

      // Cache token for 55 minutes (tokens are valid for 1 hour)
      tokenCache = {
        token: result,
        expiry: Date.now() + 55 * 60 * 1000,
      }

      if (enableLogging) {
        console.log('✅ Token acquired successfully')
        // 🔒 SECURITY: NEVER log the actual token
      }

      return result
    }

    return null
  } catch (error) {
    if (enableLogging) {
      // 🔒 SECURITY: Sanitize error messages to prevent token leakage
      const sanitizedMessage = sanitizeErrorMessage(error)
      console.error('❌ Failed to get token from Azure Identity SDK:', sanitizedMessage)
      console.error(
        'Make sure you are authenticated (az login) or have managed identity configured'
      )
    }
    return null
  }
}

/**
 * Clear the cached token (useful for testing)
 * 🔒 SECURITY: Properly clear sensitive data from memory
 */
export function clearTokenCache(): void {
  if (tokenCache) {
    // Overwrite token in memory before clearing reference
    tokenCache.token = '0'.repeat(tokenCache.token.length)
    tokenCache = null
  }
}

/**
 * Check if a cached token exists and is still valid
 */
export function hasCachedToken(): boolean {
  return tokenCache !== null && Date.now() < tokenCache.expiry
}

/**
 * 🔒 SECURITY: Validate that we're running in a development environment
 */
export function validateDevelopmentEnvironment(): boolean {
  const nodeEnv = process.env.NODE_ENV?.toLowerCase()
  const isProduction = nodeEnv === 'production'

  if (isProduction) {
    throw new Error(
      '🚨 SECURITY: dataverse-utilities/testing should NOT be used in production environments. ' +
        'This library is designed for development and testing only.'
    )
  }

  return true
}
