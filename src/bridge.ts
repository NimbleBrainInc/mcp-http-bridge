#!/usr/bin/env node

import axios, { AxiosResponse } from 'axios';
import https from 'https';

interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number | undefined;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number | undefined;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface BridgeConfig {
  endpoint: string;
  bearerToken: string;
  timeout: number;
  retries: number;
  rejectUnauthorized?: boolean;
}

export class MCPHttpBridge {
  private config: BridgeConfig;
  private axiosInstance;

  constructor(config: BridgeConfig) {
    this.config = config;
    
    const axiosConfig: any = {
      timeout: config.timeout,
      headers: {
        'Authorization': `Bearer ${config.bearerToken}`,
        'Content-Type': 'application/json',
      },
    };

    // Add HTTPS agent for SSL configuration
    if (config.rejectUnauthorized === false) {
      axiosConfig.httpsAgent = new https.Agent({
        rejectUnauthorized: false
      });
    }

    this.axiosInstance = axios.create(axiosConfig);
  }

  async start() {
    process.stdin.setEncoding('utf8');
    
    let buffer = '';
    
    process.stdin.on('data', (chunk: string) => {
      buffer += chunk;
      
      // Process complete lines (JSON-RPC messages)
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.trim()) {
          this.handleMCPRequest(line.trim()).catch(error => {
            console.error(`[Bridge] Unhandled error in request processing: ${error.message}`);
          });
        }
      }
    });

    process.stdin.on('end', () => {
      if (buffer.trim()) {
        this.handleMCPRequest(buffer.trim()).catch(error => {
          console.error(`[Bridge] Unhandled error in final request processing: ${error.message}`);
        });
      }
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  private async handleMCPRequest(requestLine: string) {
    try {
      const request: MCPRequest = JSON.parse(requestLine);
      
      // Add verbose logging
      if (process.env.MCP_BRIDGE_VERBOSE === 'true') {
        console.error(`[Bridge] Processing request: ${request.method} (id: ${request.id})`);
      }
      
      const response = await this.processMCPRequest(request);
      if (response !== null) {
        this.sendResponse(response);
      } else if (process.env.MCP_BRIDGE_VERBOSE === 'true') {
        console.error(`[Bridge] No response sent for ${request.method}`);
      }
    } catch (error) {
      console.error(`[Bridge] Error processing request: ${error instanceof Error ? error.message : String(error)}`);
      
      const errorResponse: MCPResponse = {
        jsonrpc: '2.0',
        id: undefined,
        error: {
          code: -32700, // Parse error
          message: 'Invalid JSON-RPC request',
          data: error instanceof Error ? error.message : String(error)
        }
      };
      this.sendResponse(errorResponse);
    }
  }

  private async processMCPRequest(request: MCPRequest): Promise<MCPResponse | null> {
    try {
      // Forward the MCP request to the HTTP endpoint
      const httpResponse = await this.makeHttpRequest(request);
      
      // Check if the response is already a valid MCP response
      const responseData = httpResponse.data;
      
      if (process.env.MCP_BRIDGE_VERBOSE === 'true') {
        console.error(`[Bridge] Received from HTTP: ${JSON.stringify(responseData)}`);
        console.error(`[Bridge] Request ID: ${request.id}, Response has result: ${'result' in responseData}, Response has error: ${'error' in responseData}`);
      }
      
      // Handle empty responses (like notifications that return 200 with no body)
      if (!responseData || responseData === '' || Object.keys(responseData).length === 0) {
        if (process.env.MCP_BRIDGE_VERBOSE === 'true') {
          console.error(`[Bridge] Empty response received, no response needed for ${request.method}`);
        }
        return null; // Don't send any response for notifications
      }
      
      if (responseData && responseData.jsonrpc === '2.0' && ('result' in responseData || 'error' in responseData)) {
        // The HTTP service returned a complete MCP response, but ensure ID matches
        const finalResponse = {
          ...responseData,
          id: request.id // Ensure ID matches the request
        };
        
        if (process.env.MCP_BRIDGE_VERBOSE === 'true') {
          console.error(`[Bridge] Returning formatted response: ${JSON.stringify(finalResponse)}`);
        }
        
        return finalResponse;
      }
      
      // Otherwise, wrap the response data in an MCP result
      const wrappedResponse: MCPResponse = {
        jsonrpc: '2.0',
        id: request.id,
        result: responseData
      };
      
      if (process.env.MCP_BRIDGE_VERBOSE === 'true') {
        console.error(`[Bridge] Returning wrapped response: ${JSON.stringify(wrappedResponse)}`);
      }
      
      return wrappedResponse;
      
    } catch (error) {
      return this.createErrorResponse(request.id, error);
    }
  }

  private async makeHttpRequest(request: MCPRequest): Promise<AxiosResponse> {
    const retries = this.config.retries;
    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.axiosInstance.post(this.config.endpoint, request);
        return response;
        
      } catch (error: any) {
        lastError = error;
        
        // If it's not a retryable error (4xx), fail immediately
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          throw error;
        }
        
        // Only retry on 5xx server errors or network issues
        if (attempt < retries) {
          await this.sleep(1000 * attempt); // Exponential backoff
        }
      }
    }
    
    throw lastError;
  }

  private createErrorResponse(id: string | number | undefined, error: any): MCPResponse {
    let code = -32603; // Internal error
    let message = 'Internal error';
    let data: any = undefined;

    if (error.response) {
      // HTTP error response
      code = -32000; // Server error
      message = `HTTP ${error.response.status}: ${error.response.statusText}`;
      data = error.response.data;
    } else if (error.code === 'ECONNREFUSED') {
      code = -32001;
      message = 'Service unavailable - connection refused';
    } else if (error.code === 'ETIMEDOUT') {
      code = -32002;
      message = 'Service timeout';
    } else if (error instanceof Error) {
      message = error.message;
      data = error.stack;
    }

    return {
      jsonrpc: '2.0',
      id,
      error: { code, message, data }
    };
  }

  private sendResponse(response: MCPResponse) {
    try {
      if (!process.stdout.destroyed) {
        // Add debug logging to see what we're actually sending
        if (process.env.MCP_BRIDGE_VERBOSE === 'true') {
          console.error(`[Bridge] Sending response: ${JSON.stringify(response)}`);
        }
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    } catch (error: any) {
      if (error.code === 'EPIPE' || error.message.includes('stream was destroyed')) {
        // Client disconnected, ignore silently
        console.error('[Bridge] Client disconnected, stopping bridge');
        process.exit(0);
      } else {
        console.error(`[Bridge] Error writing response: ${error.message}`);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private shutdown() {
    console.error('Bridge shutting down...');
    process.exit(0);
  }
}