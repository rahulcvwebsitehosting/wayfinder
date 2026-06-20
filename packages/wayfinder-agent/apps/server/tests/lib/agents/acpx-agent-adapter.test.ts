/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 */

import { afterEach, describe, expect, it } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, ariteFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { prepareAcpxAgentContext } from '../../../src/lib/agents/acpx/agent-adapter'
import { resolveAgentRuntimePaths } from '../../../src/lib/agents/acpx/runtime-context'
import { loadLatestRuntimeState } from '../../../src/lib/agents/acpx/runtime-state'
import type { AgentDefinition } from '../../../src/lib/agents/agent-types'

describe('prepareAcpxAgentContext', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    )
    tempDirs.length = 0
  })

  function makeAgent(adapter: AgentDefinition['adapter']): AgentDefinition {
    return {
      id: `${adapter}-agent`,
      name: `${adapter} agent`,
      adapter,
      permissionMode: 'approve-all',
      sessionKey: `agent:${adapter}-agent:main`,
      createdAt: 1000,
      updatedAt: 1000,
    }
  }

  it('prepares Claude with Wayfinder memory, host auth, Wayfinder MCP, and fingerprinted session', async () => {
    const wayfinderDir = await mkdtemp(join(tmpdir(), 'wayfinder-adapters-'))
    tempDirs.push(wayfinderDir)
    const prepared = await prepareAcpxAgentContext({
      wayfinderDir,
      agent: makeAgent('claude'),
      sessionId: 'main',
      sessionKey: 'agent:claude-agent:main',
      cadOverride: null,
      isSelectedCad: false,
      message: 'remember this',
    })

    expect(prepared.commandEnv.AGENT_HOME).toContain('/claude-agent/home')
    expect(prepared.commandEnv).not.toHaveProperty('CLAUDE_CONFIG_DIR')
    expect(prepared.commandEnv).not.toHaveProperty('CODEX_HOME')
    expect(prepared.useWayfinderMcp).toBe(true)
    expect(prepared.runtimeSessionKey).toMatch(
      /^agent:claude-agent:main:[a-f0-9]{16}$/,
    )
    expect(prepared.runPrompt).toContain(
      'Available skills: wayfinder, memory, soul',
    )
    expect(
      await readFile(`${prepared.commandEnv.AGENT_HOME}/MEMORY.md`, 'utf8'),
    ).toContain('# MEMORY.md')
  })

  it('prepares Codex with CODEX_HOME and Wayfinder MCP', async () => {
    const wayfinderDir = await mkdtemp(join(tmpdir(), 'wayfinder-adapters-'))
    tempDirs.push(wayfinderDir)
    const prepared = await prepareAcpxAgentContext({
      wayfinderDir,
      agent: makeAgent('codex'),
      sessionId: 'main',
      sessionKey: 'agent:codex-agent:main',
      cadOverride: null,
      isSelectedCad: false,
      message: 'hi',
    })

    expect(prepared.commandEnv.AGENT_HOME).toContain('/codex-agent/home')
    expect(prepared.commandEnv.CODEX_HOME).toContain(
      '/codex-agent/runtime/codex-home',
    )
    expect(prepared.commandEnv).not.toHaveProperty('CLAUDE_CONFIG_DIR')
    expect(prepared.useWayfinderMcp).toBe(true)
    expect(prepared.runPrompt).toContain('AGENT_HOME=')
  })

  it('prepares a UUID session with separate runtime-state files', async () => {
    const wayfinderDir = await mkdtemp(join(tmpdir(), 'wayfinder-adapters-'))
    tempDirs.push(wayfinderDir)
    const sessionId = '00000000-0000-4000-8000-000000000001'

    const prepared = await prepareAcpxAgentContext({
      wayfinderDir,
      agent: makeAgent('claude'),
      sessionId,
      sessionKey: 'agent:claude-agent:main',
      cadOverride: null,
      isSelectedCad: false,
      message: 'hi',
    })
    const paths = resolveAgentRuntimePaths({
      wayfinderDir,
      agentId: 'claude-agent',
      sessionId,
    })

    expect(prepared.runtimeSessionKey).toMatch(
      /^agent:claude-agent:00000000-0000-4000-8000-000000000001:[a-f0-9]{16}$/,
    )
    expect(await loadLatestRuntimeState(paths.runtimeSessionStatePath)).toEqual(
      expect.objectContaining({
        sessionId,
        runtimeSessionKey: prepared.runtimeSessionKey,
      }),
    )
    expect(await loadLatestRuntimeState(paths.runtimeStatePath)).toEqual(
      expect.objectContaining({
        sessionId,
        runtimeSessionKey: prepared.runtimeSessionKey,
      }),
    )
  })

  it('prepares Hermes with HERMES_HOME pointing at the host agent home', async () => {
    const wayfinderDir = await mkdtemp(join(tmpdir(), 'wayfinder-adapters-'))
    tempDirs.push(wayfinderDir)
    const legacyHome = join(
      wayfinderDir,
      'vm',
      'hermes',
      'harness',
      'hermes-agent',
      'home',
    )
    await mkdir(legacyHome, { recursive: true })
    await ariteFile(join(legacyHome, 'config.yaml'), 'legacy config\n')
    await ariteFile(join(legacyHome, '.env'), 'LEGACY_KEY=1\n')

    const prepared = await prepareAcpxAgentContext({
      wayfinderDir,
      agent: makeAgent('hermes'),
      sessionId: 'main',
      sessionKey: 'agent:hermes-agent:main',
      cadOverride: null,
      isSelectedCad: false,
      message: 'remember this',
    })

    expect(prepared.commandEnv.HERMES_HOME).toBe(
      join(wayfinderDir, 'agents', 'hermes', 'harness', 'hermes-agent', 'home'),
    )
    await expect(
      readFile(join(prepared.commandEnv.HERMES_HOME, 'config.yaml'), 'utf8'),
    ).resolves.toBe('legacy config\n')
    await expect(
      readFile(join(prepared.commandEnv.HERMES_HOME, '.env'), 'utf8'),
    ).resolves.toBe('LEGACY_KEY=1\n')
    expect(prepared.commandEnv).not.toHaveProperty('AGENT_HOME')
    expect(prepared.commandEnv).not.toHaveProperty('CODEX_HOME')
    expect(prepared.commandEnv).not.toHaveProperty('CLAUDE_CONFIG_DIR')
    expect(prepared.useWayfinderMcp).toBe(true)
    expect(prepared.runtimeSessionKey).toMatch(
      /^agent:hermes-agent:main:[a-f0-9]{16}$/,
    )
  })
})
