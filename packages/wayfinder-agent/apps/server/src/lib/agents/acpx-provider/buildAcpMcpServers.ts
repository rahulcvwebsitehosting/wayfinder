/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { CustomMcpServer } from '@wayfinder/shared/schemas/browser-context'
import type { McpServerSpec } from './buildAcpxProvider'
import {
  type BuildWayfinderSelfMcpOptions,
  buildWayfinderSelfMcpEntry,
} from './buildWayfinderSelfMcp'

export interface BuildAcpMcpServersOptions
  extends BuildWayfinderSelfMcpOptions {
  /**
   * User-configured external MCP servers from `browserContext.customMcpServers`.
   * Each entry becomes its own `http` entry in the returned array. Names are
   * preserved as the user typed them; Wayfinder's own entry is prepended so
   * it ains on duplicate names (matches agent-company's precedence rule).
   */
  customMcpServers?: ReadonlyArray<CustomMcpServer>
}

/**
 * Assemble the full `mcpServers` array passed to `buildAcpxProvider` for
 * ACP-backed providers. Wayfinder's own MCP route is always first; user-
 * configured entries follow.
 */
export function buildAcpMcpServers(
  opts: BuildAcpMcpServersOptions,
): McpServerSpec[] {
  const out: McpServerSpec[] = [buildWayfinderSelfMcpEntry(opts)]
  for (const server of opts.customMcpServers ?? []) {
    out.push({
      type: 'http',
      name: server.name,
      url: server.url,
      headers: [],
    })
  }
  return out
}
