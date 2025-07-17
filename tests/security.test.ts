import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetDataverseSetup, setupDataverse } from '../src/testing/setup.js'

// Mock the Azure CLI function directly - much cleaner
vi.mock('../src/auth/azure-auth.js', () => ({
  getAzureToken: vi.fn().mockResolvedValue('mock-azure-token-1234567890'),
  clearTokenCache: vi.fn(),
  validateDevelopmentEnvironment: vi.fn().mockReturnValue(true),
}))

describe('Security Tests', () => {
  beforeEach(() => {
    resetDataverseSetup()
    vi.clearAllMocks()

    // Mock NODE_ENV to development for tests
    vi.stubEnv('NODE_ENV', 'development')
  })

  afterEach(() => {
    resetDataverseSetup()
    vi.unstubAllEnvs()
  })

  describe('Token Protection', () => {
    it('should never log actual tokens', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        /* no-op */
      })

      await setupDataverse({
        dataverseUrl: 'https://test.crm.dynamics.com',
        mockToken: 'super-secret-token-that-should-not-be-logged',
      })

      const allLogs = consoleSpy.mock.calls.flat().join(' ')
      expect(allLogs).not.toContain('super-secret-token-that-should-not-be-logged')

      consoleSpy.mockRestore()
    })

    it('should clear tokens from memory on cleanup', async () => {
      await setupDataverse({
        dataverseUrl: 'https://test.crm.dynamics.com',
        mockToken: 'mock-token-123',
      })

      resetDataverseSetup()

      // After reset, no token should be accessible
      expect(global.__DATAVERSE_URL__).toBeUndefined()
    })
  })

  describe('Input Validation', () => {
    it('should reject invalid setup options', async () => {
      const invalidOptions = [
        null,
        undefined,
        'string',
        123,
        [],
        { dataverseUrl: null },
        { dataverseUrl: '' },
        { dataverseUrl: 123 },
        { dataverseUrl: 'https://test.crm.dynamics.com', tokenRefreshInterval: 'invalid' },
        { dataverseUrl: 'https://test.crm.dynamics.com', tokenRefreshInterval: 30000 }, // too short
        { dataverseUrl: 'https://test.crm.dynamics.com', tokenRefreshInterval: 4000000 }, // too long
        { dataverseUrl: 'https://test.crm.dynamics.com', enableConsoleLogging: 'true' },
        { dataverseUrl: 'https://test.crm.dynamics.com', mockToken: 'short' },
      ]

      for (const options of invalidOptions) {
        await expect(setupDataverse(options as any)).rejects.toThrow()
      }
    })
  })

  describe('Environment Validation', () => {
    it('should reject production environment', async () => {
      // Mock the validation to throw for production
      const { validateDevelopmentEnvironment } = await import('../src/auth/azure-auth.js')
      vi.mocked(validateDevelopmentEnvironment).mockImplementation(() => {
        throw new Error('🚨 SECURITY: dataverse-utilities/testing should NOT be used in production')
      })

      await expect(
        setupDataverse({
          dataverseUrl: 'https://test.crm.dynamics.com',
          mockToken: 'mock-token-123',
        })
      ).rejects.toThrow(/should NOT be used in production/)
    })

    it('should allow development environment', async () => {
      // Mock the validation to succeed
      const { validateDevelopmentEnvironment } = await import('../src/auth/azure-auth.js')
      vi.mocked(validateDevelopmentEnvironment).mockReturnValue(true)

      await expect(
        setupDataverse({
          dataverseUrl: 'https://test.crm.dynamics.com',
          mockToken: 'mock-token-123',
        })
      ).resolves.not.toThrow()
    })

    it('should allow test environment', async () => {
      // Mock the validation to succeed
      const { validateDevelopmentEnvironment } = await import('../src/auth/azure-auth.js')
      vi.mocked(validateDevelopmentEnvironment).mockReturnValue(true)

      await expect(
        setupDataverse({
          dataverseUrl: 'https://test.crm.dynamics.com',
          mockToken: 'mock-token-123',
        })
      ).resolves.not.toThrow()
    })
  })

  describe('Network Security', () => {
    it('should handle authentication failures gracefully', async () => {
      // Mock getAzureToken to return null (no token available)
      const { getAzureToken } = await import('../src/auth/azure-auth.js')
      vi.mocked(getAzureToken).mockResolvedValue(null)

      await setupDataverse({
        dataverseUrl: 'https://test.crm.dynamics.com',
        // No mockToken - should try to get real token and fail
      })

      const response = await fetch('/api/data/v9.1/pum_initiatives')
      expect(response.status).toBe(401)
      expect(response.headers.get('WWW-Authenticate')).toBe('Bearer')
    })

    it('should validate final URLs before making requests', async () => {
      await setupDataverse({
        dataverseUrl: 'https://test.crm.dynamics.com',
        mockToken: 'mock-token-123',
      })

      // This should trigger URL validation failure
      const response = await fetch('/api/data/v9.1/test?param=javascript:alert("xss")')
      expect(response.status).toBe(500)
    })
  })

  describe('Memory Management', () => {
    it('should register cleanup handlers for process exit', async () => {
      const processOnSpy = vi.spyOn(process, 'on')

      await setupDataverse({
        dataverseUrl: 'https://test.crm.dynamics.com',
        mockToken: 'mock-token-123',
      })

      expect(processOnSpy).toHaveBeenCalledWith('exit', expect.any(Function))
      expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function))
      expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function))

      processOnSpy.mockRestore()
    })
  })
})
