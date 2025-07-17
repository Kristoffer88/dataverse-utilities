import type { ProxyOptions } from 'vite'

export interface DataverseProxyOptions {
  dataverseUrl: string
  proxyPath?: string
  enableLogging?: boolean
  customProxyOptions?: Partial<ProxyOptions>
  additionalPaths?: string[]
}

/**
 * Generate Vite proxy configuration for Dataverse API calls
 */
export function createDataverseProxy(options: DataverseProxyOptions): Record<string, ProxyOptions> {
  const {
    dataverseUrl,
    proxyPath = '^/api/data',
    enableLogging = true,
    customProxyOptions = {},
  } = options

  const baseProxyConfig: ProxyOptions = {
    target: dataverseUrl,
    changeOrigin: true,
    secure: true,
    rewrite: path => path,
    configure: (proxy, options) => {
      if (enableLogging) {
        proxy.on('proxyReq', (_proxyReq, req) => {
          console.log(`🔄 Proxying: ${req.method} ${req.url} -> ${options.target}${req.url}`)
        })

        proxy.on('proxyRes', (proxyRes, req) => {
          console.log(`✅ Proxy response: ${proxyRes.statusCode} ${req.url}`)
        })

        proxy.on('error', (err, req) => {
          console.error(`❌ Proxy error for ${req.url}:`, err.message)
        })
      }
    },
    ...customProxyOptions,
  }

  return {
    [proxyPath]: baseProxyConfig,
  }
}

/**
 * Create advanced proxy configuration with multiple patterns
 */
export function createAdvancedDataverseProxy(
  options: DataverseProxyOptions & {
    additionalPaths?: string[]
  }
): Record<string, ProxyOptions> {
  const baseProxy = createDataverseProxy(options)

  if (options.additionalPaths) {
    options.additionalPaths.forEach(path => {
      baseProxy[path] = {
        ...baseProxy[options.proxyPath || '^/api/data'],
      }
    })
  }

  return baseProxy
}
