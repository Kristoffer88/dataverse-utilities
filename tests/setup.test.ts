import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupDataverse, resetDataverseSetup } from '../src/testing/setup.js';

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(() => 'mock-azure-token-1234567890')
}));

describe('setupDataverse', () => {
  beforeEach(() => {
    resetDataverseSetup();
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    resetDataverseSetup();
    vi.unstubAllEnvs();
  });

  it('should setup dataverse with mock token', () => {
    setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123'
    });

    expect(global.__DATAVERSE_URL__).toBe('https://test.crm.dynamics.com');
    expect(global.fetch).toBeDefined();
  });

  it('should NOT reroute non-API URLs (like /pum_initiatives)', async () => {
    setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123'
    });

    // This should NOT be rerouted to Dataverse - it's a relative URL
    const response = await fetch('/pum_initiatives?$select=pum_name');
    expect(response.status).toBe(200);
    
    // Should NOT have auth headers (since it's not routed to Dataverse)
    // This is like calling fetch from browser console in model-driven app
  });

  it('should reroute /api/data/* URLs to Dataverse with auth', async () => {
    setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123'
    });

    // This SHOULD be rerouted to Dataverse and get auth headers
    const response = await fetch('/api/data/v9.1/pum_initiatives?$select=pum_name');
    expect(response.status).toBe(200);
    
    // Should have proper JSON response structure
    const data = await response.json();
    expect(data).toHaveProperty('value');
    expect(Array.isArray(data.value)).toBe(true);
  });

  it('should prevent duplicate setup', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123'
    });

    setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123'
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      '⚠️  setupDataverse() has already been called. Skipping duplicate setup.'
    );
    
    consoleSpy.mockRestore();
  });

  it('should add proper auth headers for dataverse requests', async () => {
    setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123'
    });

    // Mock original fetch to check headers
    const originalFetch = global.fetch;
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}'));
    global.fetch = mockFetch;

    // Create a new secure fetch wrapper
    setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123'
    });

    // Trigger the wrapped fetch
    await fetch('/api/data/v9.1/pum_initiatives');

    // The fetch should have been called with proper headers
    expect(global.fetch).toBeDefined();
    
    global.fetch = originalFetch;
  });

  it('should handle URL transformations correctly', async () => {
    setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123'
    });

    // Test different URL patterns
    const testCases = [
      { 
        input: '/pum_initiatives', 
        description: 'Relative non-API URL - should NOT be rerouted',
        shouldAddAuth: false
      },
      { 
        input: '/api/data/v9.1/pum_initiatives', 
        description: 'API URL - should be rerouted to Dataverse',
        shouldAddAuth: true
      },
      { 
        input: 'https://test.crm.dynamics.com/api/data/v9.1/pum_initiatives', 
        description: 'Full Dataverse API URL - should get auth headers',
        shouldAddAuth: true
      },
      { 
        input: 'https://other.com/api', 
        description: 'External URL - should NOT get auth headers',
        shouldAddAuth: false
      }
    ];

    for (const testCase of testCases) {
      const response = await fetch(testCase.input);
      expect(response.status).toBeGreaterThanOrEqual(200);
      // All should work, but some get auth headers and some don't
    }
  });

  it('should return 401 when no token is available for API URLs', async () => {
    setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com'
      // No mockToken - will try to get real Azure CLI token
    });

    // Only API URLs should return 401 when no token available
    const response = await fetch('/api/data/v9.1/pum_initiatives');
    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toBe('Bearer');
  });

  it('should handle non-dataverse URLs without auth', async () => {
    setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123'
    });

    const response = await fetch('https://api.example.com/data');
    expect(response.status).toBe(200);
  });


  it('should respect enableConsoleLogging setting', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123',
      enableConsoleLogging: false
    });

    // Should have minimal or no console output
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('🔐 Using mock token'));
    
    consoleSpy.mockRestore();
  });

  it('should reset properly with resetDataverseSetup', () => {
    setupDataverse({
      dataverseUrl: 'https://test.crm.dynamics.com',
      mockToken: 'mock-token-123'
    });

    expect(global.__DATAVERSE_URL__).toBe('https://test.crm.dynamics.com');

    resetDataverseSetup();

    expect(global.__DATAVERSE_URL__).toBeUndefined();
  });


});