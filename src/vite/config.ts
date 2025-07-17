import type { ProxyOptions } from 'vite'
import { createAuthPlugin } from './auth-plugin.js'
import { createDataverseProxy } from './proxy.js'

/**
 * Configuration object returned by createDataverseConfig.
 * This provides type safety without relying on Vite's internal types.
 */
export interface DataverseViteConfig {
  server: {
    proxy: Record<string, ProxyOptions>
  }
  // Using 'any[]' for plugins to avoid Plugin type version conflicts between different Vite versions
  plugins: any[]
}

export interface DataverseViteOptions {
  dataverseUrl: string
  tokenRefreshInterval?: number
  enableConsoleLogging?: boolean
  proxyPath?: string
  customProxyOptions?: Partial<ProxyOptions>
  skipAuthentication?: boolean
  fallbackUrl?: string
  additionalPaths?: string[]
}

/**
 * Create complete Dataverse configuration for Vite
 * Returns both server proxy config and authentication plugin
 */
export function createDataverseConfig(options: DataverseViteOptions): DataverseViteConfig {
  const {
    dataverseUrl,
    tokenRefreshInterval = 50 * 60 * 1000,
    enableConsoleLogging = true,
    proxyPath = '^/api/data',
    customProxyOptions = {},
    skipAuthentication = false,
    additionalPaths = [],
  } = options

  // Validate required options
  if (!dataverseUrl || typeof dataverseUrl !== 'string') {
    throw new Error('dataverseUrl is required and must be a string')
  }

  // Create proxy configuration
  const proxy = createDataverseProxy({
    dataverseUrl,
    proxyPath,
    enableLogging: enableConsoleLogging,
    customProxyOptions,
    additionalPaths,
  })

  // Create authentication plugin if not skipped
  // Using 'any[]' for plugins to avoid Plugin type version conflicts between different Vite versions
  const plugins: any[] = []
  if (!skipAuthentication) {
    plugins.push(
      createAuthPlugin({
        dataverseUrl,
        tokenRefreshInterval,
        enableConsoleLogging,
      })
    )
  }

  return {
    server: {
      proxy,
    },
    plugins,
  }
}

/**
 * Create Dataverse configuration with smart defaults
 */
export function createDataverseConfigWithDefaults(
  dataverseUrl?: string,
  overrides: Partial<DataverseViteOptions> = {}
): DataverseViteConfig {
  const resolvedUrl = dataverseUrl || process.env['VITE_DATAVERSE_URL'] || overrides.fallbackUrl

  if (!resolvedUrl) {
    throw new Error(
      'dataverseUrl must be provided either as parameter, VITE_DATAVERSE_URL environment variable, or fallbackUrl option'
    )
  }

  return createDataverseConfig({
    dataverseUrl: resolvedUrl,
    ...overrides,
  })
}
