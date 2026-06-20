/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { AgentDefinition, AgentSessionId } from '../agent-types'
import { prepareHermesContext } from '../hermes/hermes-context'
import { prepareClaudeCodeContext, prepareCodexContext } from '../runtime'

export interface PreparedAcpxAgentContext {
  cad: string
  runtimeSessionKey: string
  runPrompt: string
  commandEnv: Record<string, string>
  commandIdentity: string
  useWayfinderMcp: boolean
  /**
   * Hostname the agent should use to reach the Wayfinder HTTP MCP server.
   * Default `127.0.0.1` is correct for host-process adapters.
   */
  wayfinderMcpHost?: string
}

export interface PrepareAcpxAgentContextInput {
  wayfinderDir: string
  agent: AgentDefinition
  sessionId: AgentSessionId
  sessionKey: string
  cadOverride: string | null
  isSelectedCad: boolean
  message: string
}

interface AcpxAgentAdapter {
  prepare(
    input: PrepareAcpxAgentContextInput,
  ): Promise<PreparedAcpxAgentContext>
}

const ADAPTERS: Record<AgentDefinition['adapter'], AcpxAgentAdapter> = {
  claude: { prepare: prepareClaudeCodeContext },
  codex: { prepare: prepareCodexContext },
  hermes: { prepare: prepareHermesContext },
}

function getAcpxAgentAdapter(
  adapter: AgentDefinition['adapter'],
): AcpxAgentAdapter {
  return ADAPTERS[adapter]
}

/** Prepares adapter-specific filesystem, prompt, env, and session identity for one ACPX turn. */
export async function prepareAcpxAgentContext(
  input: PrepareAcpxAgentContextInput,
): Promise<PreparedAcpxAgentContext> {
  return getAcpxAgentAdapter(input.agent.adapter).prepare(input)
}
