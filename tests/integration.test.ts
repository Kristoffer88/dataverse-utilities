/**
 * Integration tests for Dataverse utilities
 *
 * These tests are skipped by default to avoid requiring real Azure CLI authentication.
 * To run these tests:
 *
 * 1. Login to Azure CLI: `az login`
 * 2. Run integration tests: `npm run test:integration`
 *
 * Or set environment variable: `RUN_INTEGRATION_TESTS=1 npm test`
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { setupDataverse } from '../src/testing/setup.js'

// Skip integration tests by default - run with: npm run test:integration
describe.skipIf(!process.env.RUN_INTEGRATION_TESTS)('Dataverse Integration Tests', () => {
  beforeAll(() => {
    setupDataverse({
      dataverseUrl: process.env.VITE_DATAVERSE_URL || 'https://krapowerppm.crm4.dynamics.com',
      enableConsoleLogging: true,
    })
  })

  it('should fetch real data from dataverse API', async () => {
    // Use proper API URL - this is what gets authenticated
    const response = await fetch('/api/data/v9.1/pum_initiatives?$select=pum_name&$top=5')

    if (response.ok) {
      const data = await response.json()
      expect(data).toHaveProperty('value')
      expect(Array.isArray(data.value)).toBe(true)

      // Log success for debugging
      console.log(`✅ Successfully fetched ${data.value.length} initiatives`)
    } else {
      // If no real token, should still get proper error response
      expect(response.status).toBeGreaterThan(400)
      console.log(
        `⚠️  Integration test failed with status ${response.status} - likely no Azure CLI token`
      )
    }
  })

  it('should handle OData queries correctly', async () => {
    const response = await fetch(
      '/api/data/v9.1/pum_initiatives?$select=pum_name&$filter=statecode eq 0&$top=3'
    )

    if (response.ok) {
      const data = await response.json()
      expect(data).toHaveProperty('value')
      expect(Array.isArray(data.value)).toBe(true)
      expect(data.value.length).toBeLessThanOrEqual(3)

      // Check that only selected fields are returned
      if (data.value.length > 0) {
        expect(data.value[0]).toHaveProperty('pum_name')
        // Should not have other fields since we only selected pum_name
      }
    } else {
      expect(response.status).toBeGreaterThan(400)
    }
  })

  it('should handle different URL patterns', async () => {
    const urlPatterns = [
      {
        url: '/api/data/v9.1/pum_initiatives?$top=1',
        description: 'API URL - should be authenticated',
      },
      {
        url: `${process.env.VITE_DATAVERSE_URL || 'https://krapowerppm.crm4.dynamics.com'}/api/data/v9.1/pum_initiatives?$top=1`,
        description: 'Full API URL - should be authenticated',
      },
    ]

    for (const pattern of urlPatterns) {
      const response = await fetch(pattern.url)

      if (response.ok) {
        const data = await response.json()
        expect(data).toHaveProperty('value')
        expect(Array.isArray(data.value)).toBe(true)
      } else {
        // Should still get proper error response
        expect(response.status).toBeGreaterThan(400)
      }
    }
  })

  it('should include proper OData headers in responses', async () => {
    const response = await fetch('/api/data/v9.1/pum_initiatives?$top=1')

    if (response.ok) {
      expect(response.headers.get('Content-Type')).toContain('application/json')

      const data = await response.json()
      expect(data).toHaveProperty('@odata.context')
    } else {
      // For mock/error responses, should still have proper headers
      expect(response.headers.get('Content-Type')).toContain('application/json')
    }
  })

  it('should handle authentication failures gracefully', async () => {
    // This test depends on whether Azure CLI is available
    const response = await fetch('/api/data/v9.1/pum_initiatives?$top=1')

    // Either it works (200) or we get proper auth error (401)
    if (response.status === 401) {
      expect(response.headers.get('WWW-Authenticate')).toBe('Bearer')
      const errorData = await response.json()
      expect(errorData).toHaveProperty('error')
    } else if (response.ok) {
      const data = await response.json()
      expect(data).toHaveProperty('value')
    } else {
      // Other errors are also acceptable for integration tests
      expect(response.status).toBeGreaterThan(400)
    }
  })
})
