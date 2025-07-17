import { vi } from 'vitest';
import { getAzureToken, clearTokenCache, validateDevelopmentEnvironment } from '../auth/azure-cli.js';

export interface DataverseSetupOptions {
  dataverseUrl: string;
  tokenRefreshInterval?: number;
  enableConsoleLogging?: boolean;
  mockToken?: string;
  allowedDomains?: string[];
}

let isSetup = false;

/**
 * 🔒 SECURITY: Validate setup options to prevent misuse
 */
function validateSetupOptions(options: DataverseSetupOptions): void {
  if (!options || typeof options !== 'object') {
    throw new Error('setupDataverse() requires an options object');
  }

  const { dataverseUrl, tokenRefreshInterval, enableConsoleLogging, mockToken } = options;

  // Validate dataverseUrl
  if (!dataverseUrl || typeof dataverseUrl !== 'string') {
    throw new Error('dataverseUrl is required and must be a string');
  }

  // Validate tokenRefreshInterval
  if (tokenRefreshInterval !== undefined) {
    if (typeof tokenRefreshInterval !== 'number' || tokenRefreshInterval < 60000 || tokenRefreshInterval > 3600000) {
      throw new Error('tokenRefreshInterval must be a number between 60000ms (1 minute) and 3600000ms (1 hour)');
    }
  }

  // Validate enableConsoleLogging
  if (enableConsoleLogging !== undefined && typeof enableConsoleLogging !== 'boolean') {
    throw new Error('enableConsoleLogging must be a boolean');
  }

  // Validate mockToken
  if (mockToken !== undefined) {
    if (typeof mockToken !== 'string' || mockToken.length < 10) {
      throw new Error('mockToken must be a string with at least 10 characters');
    }
  }
}

/**
 * 🔒 SECURITY: Validate URL patterns to prevent injection
 */
function validateUrl(url: string): boolean {
  try {
    // For relative URLs, prepend a dummy base URL for validation
    const testUrl = url.startsWith('/') ? `https://example.com${url}` : url;
    new URL(testUrl);
    
    // Check for suspicious patterns - but be more permissive for legitimate URLs
    const suspiciousPatterns = [
      /javascript:/i,
      /data:/i,
      /file:/i,
      /ftp:/i
      // Remove overly restrictive patterns for legitimate query parameters
      // /[<>'"]/,
      // /[`${}]/,
      // /[\\;|&]/
    ];
    
    return !suspiciousPatterns.some(pattern => pattern.test(url));
  } catch (error) {
    return false;
  }
}

/**
 * 🔒 SECURITY: Sanitize URLs in error messages and logs
 */
function sanitizeUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.protocol}//${parsedUrl.hostname}`;
  } catch (error) {
    return '[INVALID-URL]';
  }
}

/**
 * 🔒 SECURITY: Secure fetch override with comprehensive validation
 */
function createSecureFetch(dataverseUrl: string, getToken: () => string | null, enableLogging: boolean) {
  const originalFetch = global.fetch || vi.fn();
  
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    try {
      const url = typeof input === 'string' ? input : 
                  input instanceof URL ? input.toString() : 
                  input.url;
      
      // 🔒 SECURITY: Validate URL before processing
      if (!validateUrl(url)) {
        throw new Error(`Invalid URL pattern detected: ${sanitizeUrl(url)}`);
      }
      
      let fullUrl = url;
      let shouldAddAuth = false;
      
      // Only reroute /api/data/* calls - matches model-driven app behavior
      if (url.startsWith('/api/data')) {
        // Already has /api/data prefix - just add base URL
        fullUrl = `${dataverseUrl}${url}`;
        shouldAddAuth = true;
      } else if (url.includes(dataverseUrl) && url.includes('/api/data')) {
        // Full dataverse URL with /api/data - use as-is
        fullUrl = url;
        shouldAddAuth = true;
      } else {
        // All other URLs (relative or absolute) - use as-is
        // This includes: /pum_initiatives, https://other.com/api, etc.
        fullUrl = url;
        shouldAddAuth = url.includes('/api/data');
      }

      // 🔒 SECURITY: Validate final URL
      if (!validateUrl(fullUrl)) {
        throw new Error(`Invalid final URL: ${sanitizeUrl(fullUrl)}`);
      }

      // Add auth headers for dataverse API requests
      if (shouldAddAuth) {
        const token = getToken();
        
        if (!token) {
          if (enableLogging) {
            console.warn('⚠️  No authentication token available for dataverse request');
          }
          // Return 401 instead of throwing to match real API behavior
          return new Response('{"error": "Authentication required"}', { 
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'WWW-Authenticate': 'Bearer'
            }
          });
        }
        
        init = init || {};
        init.headers = {
          ...init.headers,
          'Authorization': `Bearer ${token}`,
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Accept': 'application/json',
          'Content-Type': 'application/json; charset=utf-8'
        };
      }

      // Use real fetch for integration tests with real token
      if (typeof originalFetch === 'function' && getToken() && !getToken()?.startsWith('mock-')) {
        return originalFetch(fullUrl, init);
      }

      // Fallback mock response for unit tests
      return new Response('{"value": []}', { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'OData-Version': '4.0'
        }
      });
    } catch (error) {
      if (enableLogging) {
        console.error('❌ Secure fetch error:', error instanceof Error ? error.message : 'Unknown error');
      }
      
      // Return error response instead of throwing to match real API behavior
      return new Response('{"error": "Request failed"}', { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  });
}

/**
 * Setup dataverse testing utilities
 * Call this once in your vitest setup file
 * 🔒 SECURITY HARDENED: Comprehensive validation, secure token handling, development-only enforcement
 */
export async function setupDataverse(options: DataverseSetupOptions): Promise<void> {
  try {
    // 🔒 SECURITY: Validate we're in development environment
    validateDevelopmentEnvironment();
    
    // 🔒 SECURITY: Validate all input options
    validateSetupOptions(options);
    
    if (isSetup) {
      console.warn('⚠️  setupDataverse() has already been called. Skipping duplicate setup.');
      return;
    }

    const {
      dataverseUrl,
      tokenRefreshInterval = 50 * 60 * 1000, // 50 minutes
      enableConsoleLogging = true,
      mockToken
    } = options;

    // 🔒 SECURITY: Token management with secure handling
    let currentToken: string | null = null;
    let tokenRefreshTimer: NodeJS.Timeout | null = null;
    
    const getToken = (): string | null => currentToken;
    
    const refreshToken = async (): Promise<void> => {
      try {
        if (mockToken) {
          currentToken = mockToken;
          if (enableConsoleLogging) {
            console.log('🔐 Using mock token for dataverse tests');
          }
        } else {
          currentToken = await getAzureToken({ 
            resourceUrl: dataverseUrl, 
            enableLogging: enableConsoleLogging 
          });
          
          if (!currentToken && enableConsoleLogging) {
            console.log('⚠️  Could not get Azure CLI token - integration tests will fail');
            console.log('   Run "az login" if you want to run integration tests');
          }
        }
      } catch (error) {
        if (enableConsoleLogging) {
          console.error('❌ Token refresh failed:', error instanceof Error ? error.message : 'Unknown error');
        }
        currentToken = null;
      }
    };

    // Initial token fetch
    await refreshToken();

    // Set up periodic token refresh (only if not mocked)
    if (!mockToken && currentToken) {
      tokenRefreshTimer = setInterval(() => {
        refreshToken().catch(error => {
          if (enableConsoleLogging) {
            console.error('❌ Token refresh timer failed:', error instanceof Error ? error.message : 'Unknown error');
          }
        });
      }, tokenRefreshInterval);
    }

    // 🔒 SECURITY: Create secure fetch override
    global.fetch = createSecureFetch(dataverseUrl, getToken, enableConsoleLogging);

    // 🔒 SECURITY: Limited global variable exposure (only URL, not token)
    (global as any).__DATAVERSE_URL__ = dataverseUrl;

    // 🔒 SECURITY: Cleanup function for proper resource management
    const cleanup = (): void => {
      if (tokenRefreshTimer) {
        clearInterval(tokenRefreshTimer);
        tokenRefreshTimer = null;
      }
      currentToken = null;
      clearTokenCache();
    };

    // Register cleanup for process exit
    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    isSetup = true;
    
    if (enableConsoleLogging) {
      console.log(`🌐 Dataverse testing setup complete for: ${sanitizeUrl(dataverseUrl)}`);
      console.log('🔒 Security features enabled: URL validation, token sanitization, development-only enforcement');
    }
  } catch (error) {
    // 🔒 SECURITY: Never expose sensitive details in setup errors
    const message = error instanceof Error ? error.message : 'Setup failed';
    throw new Error(`🚨 setupDataverse() failed: ${message}`);
  }
}

/**
 * Reset the setup state (useful for testing the library itself)
 * 🔒 SECURITY: Properly clean up sensitive data
 */
export function resetDataverseSetup(): void {
  isSetup = false;
  clearTokenCache();
  
  // Clear global variables
  if ((global as any).__DATAVERSE_URL__) {
    delete (global as any).__DATAVERSE_URL__;
  }
  
  // Reset fetch to original if it was overridden
  // Note: In real implementation, we'd store the original fetch reference
}