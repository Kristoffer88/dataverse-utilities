import type { IncomingMessage, ServerResponse } from 'node:http'
import { clearTokenCache, getAzureToken } from '../auth/azure-auth.js'

export interface AuthPluginOptions {
  dataverseUrl: string
  tokenRefreshInterval?: number
  enableConsoleLogging?: boolean
}

/**
 * Custom plugin interface that defines exactly what our auth plugin returns.
 * Uses generic types to avoid version conflicts with Vite's strict Plugin type.
 */
export interface DataverseAuthPlugin {
  name: string
  // biome-ignore lint/suspicious/noExplicitAny: Using 'any' for server to avoid Vite version conflicts (ViteDevServer types change between versions)
  configureServer: (server: any) => void
  transformIndexHtml: {
    order: 'pre'
    // biome-ignore lint/suspicious/noExplicitAny: Using 'any' for context to avoid IndexHtmlTransformContext version conflicts
    handler: (html: string, context: any) => string
  }
}

/**
 * Create authentication plugin that injects token fetching into the browser
 */
export function createAuthPlugin(options: AuthPluginOptions): DataverseAuthPlugin {
  const {
    dataverseUrl,
    tokenRefreshInterval = 50 * 60 * 1000,
    enableConsoleLogging = true,
  } = options

  let currentToken: string | null = null
  let tokenRefreshTimer: NodeJS.Timeout | null = null
  let tokenExpiry: number = 0

  const refreshToken = async (): Promise<void> => {
    try {
      // Check if we have a valid cached token
      if (currentToken && Date.now() < tokenExpiry) {
        if (enableConsoleLogging) {
          console.log(
            '🔄 Using cached token (expires in:',
            Math.round((tokenExpiry - Date.now()) / 1000),
            'seconds)'
          )
        }
        return
      }

      if (enableConsoleLogging) {
        console.log('🔐 Fetching new Azure token for:', dataverseUrl)
      }

      currentToken = await getAzureToken({
        resourceUrl: dataverseUrl,
        enableLogging: enableConsoleLogging,
      })

      if (currentToken) {
        // Token typically valid for 1 hour, refresh 5 minutes before expiry
        tokenExpiry = Date.now() + 55 * 60 * 1000
        if (enableConsoleLogging) {
          console.log(
            '✅ Token acquired successfully, expires at:',
            new Date(tokenExpiry).toLocaleTimeString()
          )
        }
      }

      if (!currentToken && enableConsoleLogging) {
        console.log('⚠️  Could not get Azure token - API calls may fail')
        console.log('   Make sure you are authenticated (az login or other Azure credentials)')
      }
    } catch (error) {
      if (enableConsoleLogging) {
        console.error(
          '❌ Token refresh failed:',
          error instanceof Error ? error.message : 'Unknown error'
        )
      }
      currentToken = null
    }
  }

  return {
    name: 'dataverse-auth',
    // biome-ignore lint/suspicious/noExplicitAny: Using 'any' for server parameter to avoid ViteDevServer version conflicts
    configureServer(server: any) {
      // Initial token fetch
      refreshToken()

      // Set up periodic token refresh
      if (tokenRefreshTimer) {
        clearInterval(tokenRefreshTimer)
      }
      tokenRefreshTimer = setInterval(refreshToken, tokenRefreshInterval)

      // Add endpoint to serve current token
      server.middlewares.use(
        '/__dataverse_token__',
        (_req: IncomingMessage, res: ServerResponse) => {
          if (enableConsoleLogging) {
            console.log('🔍 Token endpoint accessed:', {
              hasToken: !!currentToken,
              tokenExpiry: tokenExpiry,
              currentTime: Date.now(),
              isExpired: Date.now() >= tokenExpiry,
            })
          }

          if (currentToken && Date.now() < tokenExpiry) {
            res.setHeader('Content-Type', 'text/plain')
            res.end(currentToken)
          } else {
            res.statusCode = 401
            res.end('No token available')
          }
        }
      )

      // Cleanup on server close
      server.httpServer?.on('close', () => {
        if (tokenRefreshTimer) {
          clearInterval(tokenRefreshTimer)
          tokenRefreshTimer = null
        }
        clearTokenCache()
      })
    },
    transformIndexHtml: {
      order: 'pre',
      // biome-ignore lint/suspicious/noExplicitAny: Using 'any' for context parameter to avoid IndexHtmlTransformContext version conflicts
      handler(html: string, { server }: any): string {
        // Only inject in development mode
        if (!server || server.config.mode !== 'development') {
          return html
        }

        // Inject authentication script into the page
        const authScript = `
          <script>
            (function() {
              // Store the original fetch
              const originalFetch = window.fetch;
              
              // Override global fetch
              window.fetch = async function(input, init = {}) {
                // Only modify requests to /api/data or api/data
                const url = typeof input === 'string' ? input : input.url;
                if (url.startsWith('/api/data') || url.startsWith('api/data')) {
                  let token = null;
                  
                  // Get token from server endpoint
                  try {
                    const tokenResponse = await originalFetch('/__dataverse_token__');
                    if (tokenResponse.ok) {
                      token = await tokenResponse.text();
                      ${enableConsoleLogging ? 'console.log("🔐 Token retrieved for request:", url);' : ''}
                    } else {
                      ${enableConsoleLogging ? 'console.warn("Token endpoint returned:", tokenResponse.status, tokenResponse.statusText);' : ''}
                    }
                  } catch (error) {
                    console.warn('Failed to get authentication token:', error);
                  }
                  
                  if (!token) {
                    console.error('No Dataverse token available. Check server logs.');
                    throw new Error('Authentication token not available');
                  }
                  
                  // Add Authorization header
                  init.headers = {
                    ...init.headers,
                    'Authorization': \`Bearer \${token}\`,
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0',
                    'Accept': 'application/json',
                    'Content-Type': 'application/json; charset=utf-8'
                  };
                }
                
                return originalFetch(input, init);
              };
              
              ${enableConsoleLogging ? 'console.log("🔐 Dataverse authentication initialized");' : ''}
            })();
          </script>
        `

        // Inject at the beginning of head
        return html.replace('<head>', `<head>${authScript}`)
      },
    },
  }
}
