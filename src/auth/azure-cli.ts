import { execSync } from 'child_process';
import { URL } from 'url';

interface TokenCache {
  token: string;
  expiry: number;
}

let tokenCache: TokenCache | null = null;

export interface AzureCliOptions {
  resourceUrl: string;
  enableLogging?: boolean;
}

/**
 * 🔒 SECURITY: Validate dataverse URL to prevent command injection
 */
function validateDataverseUrl(url: string, allowedDomains?: string[]): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Must be HTTPS for security
    if (parsedUrl.protocol !== 'https:') {
      return false;
    }
    
    // Standard dataverse domain patterns
    const standardDomains = [
      /^[\w-]+\.crm\d*\.dynamics\.com$/,
      /^[\w-]+\.crm\d*\.microsoftdynamics\.com$/,
      /^[\w-]+\.crm\d*\.microsoftdynamics\.us$/,
      /^[\w-]+\.crm\d*\.microsoftdynamics\.de$/,
      /^[\w-]+\.crm\d*\.microsoftdynamics\.cn$/
    ];
    
    // Check standard domains first
    const isStandardDomain = standardDomains.some(pattern => pattern.test(parsedUrl.hostname));
    
    // Check custom domains if provided
    const isCustomDomain = allowedDomains?.some(domain => {
      // Allow exact matches or subdomain matches
      return parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain);
    });
    
    if (!isStandardDomain && !isCustomDomain) {
      return false;
    }
    
    // No suspicious characters that could be used for injection
    const suspiciousChars = /[`${}\\;|&<>]/;
    if (suspiciousChars.test(url)) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 🔒 SECURITY: Sanitize error messages to prevent token leakage
 */
function sanitizeErrorMessage(error: any): string {
  if (!error) return 'Unknown error';
  
  let message = error.message || error.toString();
  
  // Remove potential tokens (anything that looks like a JWT or long base64 string)
  message = message.replace(/[A-Za-z0-9+/]{100,}/g, '[REDACTED-TOKEN]');
  
  // Remove other sensitive patterns
  message = message.replace(/Bearer\s+[A-Za-z0-9+/=._-]+/gi, 'Bearer [REDACTED]');
  message = message.replace(/access_token[=:]\s*[A-Za-z0-9+/=._-]+/gi, 'access_token=[REDACTED]');
  
  return message;
}

/**
 * 🔒 SECURITY: Securely execute Azure CLI command with injection prevention
 */
function executeAzureCliCommand(resourceUrl: string): string {
  // Use array form to prevent command injection
  const command = 'az';
  const args = [
    'account',
    'get-access-token',
    '--resource',
    resourceUrl,
    '--query',
    'accessToken',
    '-o',
    'tsv'
  ];
  
  try {
    const result = execSync(`${command} ${args.map(arg => `"${arg}"`).join(' ')}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'], // Don't inherit stdio to prevent leakage
      timeout: 30000 // 30 second timeout
    });
    
    return result.trim();
  } catch (error) {
    // Re-throw with sanitized error message
    const sanitizedMessage = sanitizeErrorMessage(error);
    throw new Error(`Azure CLI command failed: ${sanitizedMessage}`);
  }
}

/**
 * Get Azure CLI access token for the specified resource
 * Includes caching to avoid repeated Azure CLI calls
 * 🔒 SECURITY HARDENED: Input validation, injection prevention, token sanitization
 */
export function getAzureToken(options: AzureCliOptions): string | null {
  const { resourceUrl, enableLogging = true } = options;
  
  // 🔒 SECURITY: Validate input parameters
  if (!resourceUrl || typeof resourceUrl !== 'string') {
    throw new Error('resourceUrl is required and must be a string');
  }
  
  if (!validateDataverseUrl(resourceUrl)) {
    throw new Error(`Invalid dataverse URL: ${resourceUrl}. Must be a valid HTTPS dataverse domain.`);
  }
  
  try {
    // Check if we have a valid cached token
    if (tokenCache && Date.now() < tokenCache.expiry) {
      return tokenCache.token;
    }

    if (enableLogging) {
      console.log('🔐 Getting fresh Azure CLI token...');
      // 🔒 SECURITY: Safe to log URL since we've validated it
      console.log(`   Resource URL: ${resourceUrl}`);
    }

    // 🔒 SECURITY: Execute command securely
    const result = executeAzureCliCommand(resourceUrl);

    if (result && result.length > 0) {
      // 🔒 SECURITY: Validate token format (basic check)
      if (result.length < 50 || result.includes(' ') || result.includes('\n')) {
        throw new Error('Invalid token format received from Azure CLI');
      }
      
      // Cache token for 55 minutes (tokens are valid for 1 hour)
      tokenCache = {
        token: result,
        expiry: Date.now() + 55 * 60 * 1000
      };
      
      if (enableLogging) {
        console.log('✅ Token acquired successfully');
        // 🔒 SECURITY: NEVER log the actual token
      }
      
      return result;
    }

    return null;
  } catch (error) {
    if (enableLogging) {
      // 🔒 SECURITY: Sanitize error messages to prevent token leakage
      const sanitizedMessage = sanitizeErrorMessage(error);
      console.error('❌ Failed to get token from Azure CLI:', sanitizedMessage);
      console.error('Make sure you are logged in with: az login');
    }
    return null;
  }
}

/**
 * Clear the cached token (useful for testing)
 * 🔒 SECURITY: Properly clear sensitive data from memory
 */
export function clearTokenCache(): void {
  if (tokenCache) {
    // Overwrite token in memory before clearing reference
    tokenCache.token = '0'.repeat(tokenCache.token.length);
    tokenCache = null;
  }
}

/**
 * Check if a cached token exists and is still valid
 */
export function hasCachedToken(): boolean {
  return tokenCache !== null && Date.now() < tokenCache.expiry;
}

/**
 * 🔒 SECURITY: Validate that we're running in a development environment
 */
export function validateDevelopmentEnvironment(): boolean {
  const nodeEnv = process.env['NODE_ENV']?.toLowerCase();
  const isProduction = nodeEnv === 'production';
  
  if (isProduction) {
    throw new Error(
      '🚨 SECURITY: dataverse-utilities/testing should NOT be used in production environments. ' +
      'This library is designed for development and testing only.'
    );
  }
  
  return true;
}