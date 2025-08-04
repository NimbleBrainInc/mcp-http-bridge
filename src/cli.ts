#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { MCPHttpBridge } from './bridge.js';

interface CliArgs {
  endpoint: string;
  token: string;
  timeout?: number;
  retries?: number;
  verbose?: boolean;
  insecure?: boolean;
}

const argv = yargs(hideBin(process.argv))
  .option('endpoint', {
    alias: 'e',
    type: 'string',
    demandOption: true,
    description: 'HTTP endpoint for the MCP service'
  })
  .option('token', {
    alias: 't', 
    type: 'string',
    demandOption: true,
    description: 'Bearer token for authentication'
  })
  .option('timeout', {
    type: 'number',
    default: 30000,
    description: 'Request timeout in milliseconds'
  })
  .option('retries', {
    type: 'number', 
    default: 3,
    description: 'Number of retry attempts'
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    default: false,
    description: 'Enable verbose logging'
  })
  .option('insecure', {
    type: 'boolean',
    default: false,
    description: 'Disable SSL certificate verification (for development)'
  })
  .help()
  .alias('help', 'h')
  .example(
    '$0 -e "https://mcp.nimbletools.dev/v1/workspaces/abc123/servers/nationalparks/mcp" -t "eyJ..."',
    'Bridge to NimbleTools nationalparks service'
  )
  .parseSync() as CliArgs;

async function main() {
  try {
    if (argv.verbose) {
      console.error(`Starting MCP HTTP Bridge...`);
      console.error(`Endpoint: ${argv.endpoint}`);
      console.error(`Token: ${argv.token.substring(0, 20)}...`);
      console.error(`Timeout: ${argv.timeout}ms`);
      console.error(`Retries: ${argv.retries}`);
    }

    const bridge = new MCPHttpBridge({
      endpoint: argv.endpoint,
      bearerToken: argv.token,
      timeout: argv.timeout || 30000,
      retries: argv.retries || 3,
      rejectUnauthorized: !argv.insecure
    });

    await bridge.start();
    
  } catch (error) {
    console.error('Failed to start MCP HTTP Bridge:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});