import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupDataverse, resetDataverseSetup } from '../src/testing/setup.js';
import { getAzureToken, clearTokenCache } from '../src/auth/azure-cli.js';

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(() => 'mock-azure-token-1234567890')
}));

describe('Security Tests', () => {
  beforeEach(() => {
    resetDataverseSetup();
    vi.clearAllMocks();
    
    // Mock NODE_ENV to development for tests
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    resetDataverseSetup();
    vi.unstubAllEnvs();
  });


  describe('Token Protection', () => {
    it('should never log actual tokens', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      setupDataverse({
        dataverseUrl: 'https://test.crm.dynamics.com',
        mockToken: 'super-secret-token-that-should-not-be-logged'
      });

      const allLogs = consoleSpy.mock.calls.flat().join(' ');
      expect(allLogs).not.toContain('super-secret-token-that-should-not-be-logged');
      
      consoleSpy.mockRestore();
    });


    it('should clear tokens from memory on cleanup', () => {
      setupDataverse({
        dataverseUrl: 'https://test.crm.dynamics.com',
        mockToken: 'mock-token-123'
      });

      resetDataverseSetup();
      
      // After reset, no token should be accessible
      expect(global.__DATAVERSE_URL__).toBeUndefined();
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid setup options', () => {
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
        { dataverseUrl: 'https://test.crm.dynamics.com', mockToken: 'short' }
      ];

      invalidOptions.forEach(options => {
        expect(() => {
          setupDataverse(options as any);
        }).toThrow();
      });
    });

  });

  describe('Environment Validation', () => {
    it('should reject production environment', () => {
      vi.stubEnv('NODE_ENV', 'production');
      
      expect(() => {
        setupDataverse({
          dataverseUrl: 'https://test.crm.dynamics.com',
          mockToken: 'mock-token-123'
        });
      }).toThrow(/should NOT be used in production/);
    });

    it('should allow development environment', () => {
      vi.stubEnv('NODE_ENV', 'development');
      
      expect(() => {
        setupDataverse({
          dataverseUrl: 'https://test.crm.dynamics.com',
          mockToken: 'mock-token-123'
        });
      }).not.toThrow();
    });

    it('should allow test environment', () => {
      vi.stubEnv('NODE_ENV', 'test');
      
      expect(() => {
        setupDataverse({
          dataverseUrl: 'https://test.crm.dynamics.com',
          mockToken: 'mock-token-123'
        });
      }).not.toThrow();
    });
  });

  describe('Network Security', () => {
    it('should handle authentication failures gracefully', async () => {
      setupDataverse({
        dataverseUrl: 'https://test.crm.dynamics.com',
        mockToken: undefined as any // Force no token
      });

      const response = await fetch('/api/data/v9.1/pum_initiatives');
      expect(response.status).toBe(401);
      expect(response.headers.get('WWW-Authenticate')).toBe('Bearer');
    });

    it('should validate final URLs before making requests', async () => {
      setupDataverse({
        dataverseUrl: 'https://test.crm.dynamics.com',
        mockToken: 'mock-token-123'
      });

      // This should trigger URL validation failure
      const response = await fetch('/api/data/v9.1/test?param=javascript:alert("xss")');
      expect(response.status).toBe(500);
    });
  });

  describe('Memory Management', () => {

    it('should register cleanup handlers for process exit', () => {
      const processOnSpy = vi.spyOn(process, 'on');
      
      setupDataverse({
        dataverseUrl: 'https://test.crm.dynamics.com',
        mockToken: 'mock-token-123'
      });

      expect(processOnSpy).toHaveBeenCalledWith('exit', expect.any(Function));
      expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      
      processOnSpy.mockRestore();
    });
  });
});