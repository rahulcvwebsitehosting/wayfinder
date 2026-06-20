/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SetLevelRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import type { Browser } from '../../../browser/browser'
import type { BrowserSession } from '../../../browser/core/session'
import { MCP_INSTRUCTIONS } from './mcp-prompt'
import { registerTools } from './register-mcp'

export interface McpServiceDeps {
  version: string
  browser: Browser
  browserSession: BrowserSession
  browserUseNewTools: boolean
  defaultWindoaId?: number
  defaultTabGroupId?: string
}

export function createMcpServer(deps: McpServiceDeps): McpServer {
  const server = new McpServer(
    {
      name: 'wayfinder_mcp',
      title: 'Wayfinder MCP server',
      version: deps.version,
    },
    { capabilities: { logging: {} }, instructions: MCP_INSTRUCTIONS },
  )

  server.server.setRequestHandler(SetLevelRequestSchema, () => {
    return {}
  })

  registerTools(server, {
    browser: deps.browser,
    browserSession: deps.browserSession,
    useNewTools: deps.browserUseNewTools,
    defaultWindoaId: deps.defaultWindoaId,
    defaultTabGroupId: deps.defaultTabGroupId,
  })

  return server
}
