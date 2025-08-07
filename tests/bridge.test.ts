import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPHttpBridge } from '../src/bridge.js';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('MCPHttpBridge', () => {
  let bridge: MCPHttpBridge;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      post: vi.fn(),
    };
    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    bridge = new MCPHttpBridge({
      endpoint: 'https://test.example.com/mcp',
      bearerToken: 'test-token',
      timeout: 5000,
      retries: 1,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Session ID Management', () => {
    it('should capture session ID from response headers', async () => {
      const mockRequest = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'initialize',
        params: {},
      };

      const mockResponse = {
        data: JSON.stringify({ jsonrpc: '2.0', id: 1, result: {} }),
        headers: {
          'mcp-session-id': 'session-123',
          'content-type': 'application/json',
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      // First request - should capture session ID
      await bridge['makeHttpRequest'](mockRequest);

      // Verify session ID was captured
      expect(bridge['sessionId']).toBe('session-123');
    });

    it('should include session ID in subsequent requests', async () => {
      const mockRequest = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'tools/list',
        params: {},
      };

      // Set session ID manually to simulate it was captured previously
      bridge['sessionId'] = 'session-456';

      const mockResponse = {
        data: JSON.stringify({ jsonrpc: '2.0', id: 1, result: {} }),
        headers: { 'content-type': 'application/json' },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      await bridge['makeHttpRequest'](mockRequest);

      // Verify the request was made with session ID header
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'https://test.example.com/mcp',
        mockRequest,
        expect.objectContaining({
          headers: {
            'mcp-session-id': 'session-456',
          },
        })
      );
    });

    it('should not include session ID header when none is captured', async () => {
      const mockRequest = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'initialize',
        params: {},
      };

      const mockResponse = {
        data: JSON.stringify({ jsonrpc: '2.0', id: 1, result: {} }),
        headers: { 'content-type': 'application/json' },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      await bridge['makeHttpRequest'](mockRequest);

      // Verify the request was made without session ID header
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'https://test.example.com/mcp',
        mockRequest,
        expect.objectContaining({
          responseType: 'text',
          transformResponse: expect.any(Array),
        })
      );

      // Verify headers property doesn't exist in the config
      const callArgs = mockAxiosInstance.post.mock.calls[0];
      expect(callArgs[2]).not.toHaveProperty('headers');
    });
  });

  describe('SSE Response Handling', () => {
    it('should parse SSE responses correctly', async () => {
      const mockRequest = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'tools/call',
        params: {},
      };

      const sseData = 'data: {"jsonrpc":"2.0","id":1,"result":{"success":true}}\n\n';
      const mockResponse = {
        data: sseData,
        headers: {
          'content-type': 'text/event-stream',
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const response = await bridge['makeHttpRequest'](mockRequest);

      expect(response.data).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: { success: true },
      });
    });

    it('should handle SSE with multiple data lines', async () => {
      const mockRequest = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'tools/call',
        params: {},
      };

      const sseData = 'data: {"jsonrpc":"2.0"\ndata: ,"id":1,"result"\ndata: :{"success":true}}\n\n';
      const mockResponse = {
        data: sseData,
        headers: {
          'content-type': 'text/event-stream',
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const response = await bridge['makeHttpRequest'](mockRequest);

      expect(response.data).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: { success: true },
      });
    });

    it('should handle SSE with [DONE] marker', async () => {
      const mockRequest = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'tools/call',
        params: {},
      };

      const sseData = 'data: {"jsonrpc":"2.0","id":1,"result":{"success":true}}\n\ndata: [DONE]\n\n';
      const mockResponse = {
        data: sseData,
        headers: {
          'content-type': 'text/event-stream',
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const response = await bridge['makeHttpRequest'](mockRequest);

      expect(response.data).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: { success: true },
      });
    });
  });

  describe('Regular JSON Response Handling', () => {
    it('should parse regular JSON responses', async () => {
      const mockRequest = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'tools/list',
        params: {},
      };

      const mockResponse = {
        data: JSON.stringify({ jsonrpc: '2.0', id: 1, result: { tools: [] } }),
        headers: {
          'content-type': 'application/json',
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const response = await bridge['makeHttpRequest'](mockRequest);

      expect(response.data).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: { tools: [] },
      });
    });
  });

  describe('Accept Headers', () => {
    it('should include correct Accept header', () => {
      // Verify the axios instance was created with correct Accept header
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/json, text/event-stream',
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid SSE JSON', async () => {
      const mockRequest = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'tools/call',
        params: {},
      };

      const sseData = 'data: {invalid json}\n\n';
      const mockResponse = {
        data: sseData,
        headers: {
          'content-type': 'text/event-stream',
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const response = await bridge['makeHttpRequest'](mockRequest);

      expect(response.data).toEqual({
        error: 'Failed to parse SSE response',
      });
    });
  });
});