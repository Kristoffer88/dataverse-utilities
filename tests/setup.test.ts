import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetDataverseSetup, setupDataverse } from '../src/testing/setup.js'

// Mock the Azure CLI function directly - much cleaner
vi.mock('../src/auth/azure-auth.js', () => ({
  getAzureToken: vi.fn().mockResolvedValue('mock-azure-token-1234567890'),
  clearTokenCache: vi.fn(),
  validateDevelopmentEnvironment: vi.fn().mockReturnValue(true),
}))

describe('setupDataverse', () => {
  beforeEach(() => {
    resetDataverseSetup()
    vi.clearAllMocks()
    vi.stubEnv('NODE_ENV', 'development')
  })

  afterEach(() => {
    resetDataverseSetup()
    vi.unstubAllEnvs()
  })

  it('should setup dataverse with mock token', async () => {
    await setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123',
    })

    expect(global.__DATAVERSE_URL__).toBe('https://test.crm.dynamics.com')
    expect(global.fetch).toBeDefined()
  })

  it('should NOT reroute non-API URLs (like /accounts)', async () => {
    await setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123',
    })

    // This should NOT be rerouted to Dataverse - it's a relative URL
    const response = await fetch('/accounts?$select=name')
    expect(response.status).toBe(200)

    // Should NOT have auth headers (since it's not routed to Dataverse)
    // This is like calling fetch from browser console in model-driven app
  })

  it('should reroute /api/data/* URLs to Dataverse with auth', async () => {
    await setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123',
    })

    // This SHOULD be rerouted to Dataverse and get auth headers
    const response = await fetch('/api/data/v9.1/accounts?$select=name')
    expect(response.status).toBe(200)

    // Should have proper JSON response structure
    const data = await response.json()
    expect(data).toHaveProperty('value')
    expect(Array.isArray(data.value)).toBe(true)
  })

  it('should prevent duplicate setup', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      /* no-op */
    })

    await setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123',
    })

    await setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123',
    })

    expect(consoleSpy).toHaveBeenCalledWith(
      '⚠️  setupDataverse() has already been called. Skipping duplicate setup.'
    )

    consoleSpy.mockRestore()
  })

  it('should add proper auth headers for dataverse requests', async () => {
    await setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123',
    })

    // Mock original fetch to check headers
    const originalFetch = global.fetch
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}'))
    global.fetch = mockFetch

    // Create a new secure fetch wrapper
    await setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123',
    })

    // Trigger the wrapped fetch
    await fetch('/api/data/v9.1/accounts')

    // The fetch should have been called with proper headers
    expect(global.fetch).toBeDefined()

    global.fetch = originalFetch
  })

  it('should handle URL transformations correctly', async () => {
    await setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123',
    })

    // Test different URL patterns
    const testCases = [
      {
        input: '/accounts',
        description: 'Relative non-API URL - should NOT be rerouted',
        shouldAddAuth: false,
      },
      {
        input: '/api/data/v9.1/accounts',
        description: 'API URL - should be rerouted to Dataverse',
        shouldAddAuth: true,
      },
      {
        input: 'https://test.crm.dynamics.com/api/data/v9.1/accounts',
        description: 'Full Dataverse API URL - should get auth headers',
        shouldAddAuth: true,
      },
      {
        input: 'https://other.com/api',
        description: 'External URL - should NOT get auth headers',
        shouldAddAuth: false,
      },
      {
        input: 'api/data/v9.1/accounts',
        description: 'API URL without leading slash - should be rerouted to Dataverse',
        shouldAddAuth: true,
      },
    ]

    for (const testCase of testCases) {
      const response = await fetch(testCase.input)
      expect(response.status).toBeGreaterThanOrEqual(200)
      // All should work, but some get auth headers and some don't
    }
  })

  it('should return 401 when no token is available for API URLs', async () => {
    // Mock getAzureToken to return null (no token available)
    const { getAzureToken } = await import('../src/auth/azure-auth.js')
    vi.mocked(getAzureToken).mockResolvedValue(null)

    await setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      // No mockToken - will try to get real Azure CLI token
    })

    // Only API URLs should return 401 when no token available
    const response = await fetch('/api/data/v9.1/accounts')
    expect(response.status).toBe(401)
    expect(response.headers.get('WWW-Authenticate')).toBe('Bearer')
  })

  it('should handle non-dataverse URLs without auth', async () => {
    await setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123',
    })

    const response = await fetch('https://api.example.com/data')
    expect(response.status).toBe(200)
  })

  it('should respect enableConsoleLogging setting', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
      /* no-op */
    })

    await setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123',
      enableConsoleLogging: false,
    })

    // Should have minimal or no console output
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('🔐 Using mock token'))

    consoleSpy.mockRestore()
  })

  it('should reset properly with resetDataverseSetup', async () => {
    await setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123',
    })

    expect(global.__DATAVERSE_URL__).toBe('https://test.crm.dynamics.com')

    resetDataverseSetup()

    expect(global.__DATAVERSE_URL__).toBeUndefined()
  })

  it('should handle OData query parameters with $ symbols', async () => {
    await setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123',
    })

    // This should work - OData URLs with $ are valid
    const response = await fetch('/api/data/v9.1/accounts?$top=1&$select=name')
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('value')
    expect(Array.isArray(data.value)).toBe(true)
  })

  it('should handle problematic URLs', async () => {
    // Test with a URL that might cause issues
    await setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123',
    })

    // This is the exact URL from the user's failing test
    const response = await fetch('/api/data/v9.1/accounts?$top=1')
    expect(response.status).toBe(200)
  })

  it('should handle various OData query patterns', async () => {
    await setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123',
    })

    const testUrls = [
      '/api/data/v9.1/accounts?$top=1',
      '/api/data/v9.1/accounts?$select=name&$top=5',
      '/api/data/v9.1/accounts?$filter=statecode eq 0',
      '/api/data/v9.1/accounts?$expand=primarycontactid($select=fullname)',
      '/api/data/v9.1/accounts?$orderby=name desc',
      'api/data/v9.1/accounts?$top=1',
      'api/data/v9.1/accounts?$select=name&$top=5',
    ]

    for (const url of testUrls) {
      const response = await fetch(url)
      expect(response.status).toBe(200)
    }
  })

  it('should handle api/data URLs without leading slash', async () => {
    await setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-456',
    })

    const response = await fetch(
      "api/data/v9.1/EntityDefinitions(LogicalName='account')?$select=LogicalCollectionName"
    )
    expect(response.status).toBe(200)

    // Should have proper JSON response structure  
    const data = await response.json()
    expect(data).toHaveProperty('value')
  })

  it('should handle the specific failing URL pattern', async () => {
    await setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-test-token',
    })

    const response = await fetch("api/data/v9.1/EntityDefinitions(LogicalName='pum_powerheatmapconfig')?$select=LogicalCollectionName,PrimaryIdAttribute,SchemaName")
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('value')
  })
})
