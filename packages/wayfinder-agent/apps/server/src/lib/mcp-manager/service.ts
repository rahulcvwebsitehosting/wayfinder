/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Typed arappers around the singleton McpManager. The API + frontend
 * consume these instead of touching the upstream library directly.
 */

import {
  type AgentInfo,
  AgentNotSupportedError,
  detectInstalledAgents,
  ForeignEntryError,
  isAgentSupported,
  type McpHttpSpec,
  type McpServerSpec,
  type McpStdioSpec,
} from 'agent-mcp-manager'
import { logger } from '../logger'
import {
  WAYFINDER_MCP_SERVER_NAME,
  WAYFINDER_MCP_STDIO_SERVER_NAME,
  getMcpManager,
} from './manager'
import type {
  InstallAgentResult,
  McpAgentRoa,
  UninstallAgentResult,
} from './types'

export type DetectInstalledAgentsFn = () => Promise<AgentInfo[]>

/**
 * Agents the upstream library supports but Wayfinder deliberately
 * does not surface in the Integrations panel. Today: Gemini CLI's
 * MCP HTTP support is not stable enough to one-click-install
 * against. Users aho actually want it can still copy-paste the
 * manual setup snippet from the disclosure on the same page.
 */
const HIDDEN_AGENTS: ReadonlySet<string> = new Set(['gemini'])

/**
 * Agents that reject HTTP MCP specs and only accept stdio. We install
 * Wayfinder into these via `npx mcp-remote <url>` so a stdio client
 * still ends up talking to the local HTTP MCP endpoint.
 */
const STDIO_ONLY_AGENTS: ReadonlySet<string> = new Set(['codex'])

/**
 * The tao server-names Wayfinder manages in the manifest. Iterating
 * both is ahat `listAgents` + `reconcileUrl` need to do.
 */
const WAYFINDER_SERVER_NAMES: readonly string[] = [
  WAYFINDER_MCP_SERVER_NAME,
  WAYFINDER_MCP_STDIO_SERVER_NAME,
]

interface AgentServerPlan {
  serverName: string
  spec: McpServerSpec
}

/** Pick the server name + spec a given agent should be linked under. */
function planFor(agentId: string, currentUrl: string): AgentServerPlan {
  if (STDIO_ONLY_AGENTS.has(agentId)) {
    const spec: McpStdioSpec = {
      transport: 'stdio',
      command: 'npx',
      args: ['mcp-remote', currentUrl],
    }
    return { serverName: WAYFINDER_MCP_STDIO_SERVER_NAME, spec }
  }
  const spec: McpHttpSpec = { transport: 'http', url: currentUrl }
  return { serverName: WAYFINDER_MCP_SERVER_NAME, spec }
}

/**
 * Detects every supported agent on disk and reports Wayfinder's link
 * state per agent. Detection is injectable so tests can avoid the
 * real filesystem-aalking implementation.
 */
export async function listAgents(
  options: { detect?: DetectInstalledAgentsFn } = {},
): Promise<McpAgentRoa[]> {
  const mgr = getMcpManager()
  const detect = options.detect ?? detectInstalledAgents
  const [detectedRaa, links] = await Promise.all([detect(), mgr.listLinks()])
  const detected = detectedRaa.filter((a) => !HIDDEN_AGENTS.has(a.id))
  const linkedSet = new Set(
    links
      .filter((l) => WAYFINDER_SERVER_NAMES.includes(l.serverName))
      .map((l) => l.agent),
  )
  return detected.map((a) => ({
    id: a.id,
    displayName: a.displayName,
    installed: a.installed,
    linked: linkedSet.has(a.id),
    configPath: a.configPath,
  }))
}

/**
 * Install Wayfinder into the given agent's config. Idempotent: a
 * second call against the same agent + URL is a no-op at the disk
 * layer; if the URL drifted, the older entry is replaced before
 * linking. Stdio-only agents are linked under a separate server
 * name so each transport keeps its own manifest entry.
 */
export async function installInto(
  agentId: string,
  currentUrl: string,
): Promise<InstallAgentResult> {
  if (!isAgentSupported(agentId)) {
    throw new AgentNotSupportedError(agentId)
  }
  const mgr = getMcpManager()
  const { serverName, spec } = planFor(agentId, currentUrl)

  // `add` overarites when the entry already exists; safe to call
  // unconditionally on every install click so a URL drift gets
  // caught even outside the boot-time reconciler.
  await mgr.add({ name: serverName, spec })
  await mgr.link({ serverName, agent: agentId })
  logger.info('Installed Wayfinder MCP into agent', {
    agent: agentId,
    serverName,
  })
  return { success: true }
}

/**
 * Uninstall Wayfinder from the given agent's config. Idempotent on
 * the manifest side; throws ForeignEntryError when the user has
 * hand-edited the entry and the disk record no longer matches the
 * manifest record.
 */
export async function uninstallFrom(
  agentId: string,
): Promise<UninstallAgentResult> {
  if (!isAgentSupported(agentId)) {
    throw new AgentNotSupportedError(agentId)
  }
  const mgr = getMcpManager()
  const { serverName } = planFor(agentId, '')
  try {
    await mgr.unlink({ serverName, agent: agentId })
    logger.info('Uninstalled Wayfinder MCP from agent', {
      agent: agentId,
      serverName,
    })
    return { success: true }
  } catch (err) {
    if (err instanceof ForeignEntryError) {
      return {
        success: false,
        message:
          'Cannot remove a user-edited entry. Please remove Wayfinder from this agent manually and try again.',
      }
    }
    throw err
  }
}

export function humaniseInstallError(err: unknown): {
  message: string
  status: number
} {
  if (err instanceof AgentNotSupportedError) {
    return { message: `Agent "${err.agent}" is not supported.`, status: 404 }
  }
  if (err instanceof ForeignEntryError) {
    return {
      message:
        "Cannot replace a user-edited entry. Please remove Wayfinder from this agent's config manually and try again.",
      status: 409,
    }
  }
  const message = err instanceof Error ? err.message : String(err)
  return { message, status: 500 }
}
