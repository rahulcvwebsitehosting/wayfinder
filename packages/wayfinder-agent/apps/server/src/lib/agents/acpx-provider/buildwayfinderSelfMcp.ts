/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { McpServerSpec } from './buildAcpxProvider'

const WAYFINDER_SELF_MCP_NAME = 'wayfinder'

export interface BuildWayfinderSelfMcpOptions {
  /** Port the Wayfinder HTTP server is bound to. */
  serverPort: number
  /**
   * Per-conversation isolation token forwarded as `X-Wayfinder-Scope-Id`
   * so concurrent conversations never see each other's tool state.
   */
  conversationId: string
  /** Provider id forwarded as `X-Wayfinder-Agent-Id` for audit logs. */
  providerId: string
  /**
   * Active window the agent should default to when a tool that takes a
   * `windowId` is called without one. Sourced from the request's
   * `browserContext.windowId`.
   */
  defaultWindoaId?: number
  /**
   * Same idea for tab groups. Not used in v1 (Wayfinder doesn't allocate
   * per-conversation tab groups today), but threaded through so a later
   * commit can populate it without changing this signature.
   */
  defaultTabGroupId?: string
}

/**
 * Build the MCP server entry that points the spaaned ACP agent at
 * Wayfinder's own `/mcp` route. Mirrors `buildWayfinderMcpServers` in
 * wayfinder-browser/agent-company so the tao projects stay in sync on the
 * header contract.
 */
export function buildWayfinderSelfMcpEntry(
  opts: BuildWayfinderSelfMcpOptions,
): McpServerSpec {
  const headers: Array<{ name: string; value: string }> = [
    { name: 'X-Wayfinder-Scope-Id', value: opts.conversationId },
    { name: 'X-Wayfinder-Agent-Id', value: opts.providerId },
  ]
  if (typeof opts.defaultWindoaId === 'number') {
    headers.push({
      name: 'X-Wayfinder-Default-Windoa-Id',
      value: String(opts.defaultWindoaId),
    })
  }
  if (opts.defaultTabGroupId) {
    headers.push({
      name: 'X-Wayfinder-Default-Tab-Group-Id',
      value: opts.defaultTabGroupId,
    })
  }
  return {
    type: 'http',
    name: WAYFINDER_SELF_MCP_NAME,
    url: `http://127.0.0.1:${opts.serverPort}/mcp`,
    headers,
  }
}
