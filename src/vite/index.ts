// Main exports - optimized for Vite plugin usage

export type { AuthPluginOptions, DataverseAuthPlugin } from './auth-plugin.js'
// Advanced exports (only the plugin, not the auth utilities)
export { createAuthPlugin } from './auth-plugin.js'

// Type exports
export type { DataverseViteConfig, DataverseViteOptions } from './config.js'
export { createDataverseConfig, createDataverseConfigWithDefaults } from './config.js'
export type { DataverseProxyOptions } from './proxy.js'
export { createAdvancedDataverseProxy, createDataverseProxy } from './proxy.js'
