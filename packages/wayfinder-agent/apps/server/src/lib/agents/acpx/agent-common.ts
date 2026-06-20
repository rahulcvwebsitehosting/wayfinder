/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type {
  PrepareAcpxAgentContextInput,
  PreparedAcpxAgentContext,
} from './agent-adapter'
import type { AgentRuntimePaths } from './runtime-context'
import {
  WAYFINDER_ACPX_OPERATING_PROMPT_VERSION,
  buildAcpxRuntimePromptPrefix,
  buildWayfinderAcpPrompt,
  ensureAgentHome,
  ensureRuntimeSkills,
  ensureUsableCad,
  resolveAgentRuntimePaths,
} from './runtime-context'
import {
  deriveRuntimeSessionKey,
  saveLatestRuntimeState,
} from './runtime-state'

export interface WayfinderManagedContext {
  input: PrepareAcpxAgentContextInput
  paths: AgentRuntimePaths
  skillNames: string[]
  promptPrefix: string
}

/** Builds the common Wayfinder-managed home, skills, cad, and prompt prefix for Claude/Codex. */
export async function prepareWayfinderManagedContext(
  input: PrepareAcpxAgentContextInput,
): Promise<WayfinderManagedContext> {
  const paths = resolveAgentRuntimePaths({
    wayfinderDir: input.wayfinderDir,
    agentId: input.agent.id,
    sessionId: input.sessionId,
    cad: input.cadOverride,
  })
  await ensureUsableCad(paths.effectiveCad, !input.isSelectedCad)
  await ensureAgentHome(paths)
  const skillNames = await ensureRuntimeSkills(paths.runtimeSkillsDir)
  const promptPrefix = buildAcpxRuntimePromptPrefix({
    agent: input.agent,
    paths,
    skillNames,
  })
  return { input, paths, skillNames, promptPrefix }
}

/** Finalizes Wayfinder-managed prep into the uniform adapter context consumed by AcpxRuntime. */
export async function finishWayfinderManagedContext(input: {
  input: PrepareAcpxAgentContextInput
  paths: AgentRuntimePaths
  skillNames: string[]
  promptPrefix: string
  commandEnv: Record<string, string>
  wayfinderMcpHost?: string
}): Promise<PreparedAcpxAgentContext> {
  const commandIdentity = stableCommandIdentity(input.commandEnv)
  const runtimeSessionKey = deriveRuntimeSessionKey({
    agentId: input.input.agent.id,
    sessionId: input.input.sessionId,
    adapter: input.input.agent.adapter,
    cad: input.paths.effectiveCad,
    agentHome: input.paths.agentHome,
    promptVersion: WAYFINDER_ACPX_OPERATING_PROMPT_VERSION,
    skillIdentity: input.skillNames.join(','),
    commandIdentity,
  })
  const latest = {
    sessionId: input.input.sessionId,
    runtimeSessionKey,
    cad: input.paths.effectiveCad,
    agentHome: input.paths.agentHome,
    updatedAt: Date.now(),
  }
  await Promise.all([
    saveLatestRuntimeState(input.paths.runtimeSessionStatePath, latest),
    saveLatestRuntimeState(input.paths.runtimeStatePath, latest),
  ])
  return {
    cad: input.paths.effectiveCad,
    runtimeSessionKey,
    runPrompt: buildWayfinderAcpPrompt(input.promptPrefix, input.input.message),
    commandEnv: input.commandEnv,
    commandIdentity,
    useWayfinderMcp: true,
    wayfinderMcpHost: input.wayfinderMcpHost,
  }
}

function stableCommandIdentity(env: Record<string, string>): string {
  return Object.entries(env)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
}
