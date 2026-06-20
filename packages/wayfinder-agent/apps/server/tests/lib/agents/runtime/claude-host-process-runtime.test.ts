/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 */

import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  ClaudeRuntime,
  configureClaudeRuntime,
  getAgentRuntimeRegistry,
  getClaudeRuntime,
  prepareClaudeCodeContext,
  resetAgentRuntimeRegistry,
} from '../../../../src/lib/agents/runtime'

function makeAgent(id = 'agent-1') {
  return {
    id,
    name: 'Claude bot',
    adapter: 'claude' as const,
    sessionKey: `agent:${id}:main`,
    pinned: false,
    updatedAt: Date.now(),
    createdAt: Date.now(),
    modelId: 'claude-opus-4-5',
    reasoningEffort: 'medium',
    providerType: 'host-auth',
    providerName: null,
    baseUrl: null,
    apiKey: null,
    supportsImages: true,
  }
}

describe('ClaudeRuntime', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    )
    tempDirs.length = 0
    resetAgentRuntimeRegistry()
  })

  it('declares the canonical Claude descriptor', () => {
    const runtime = new ClaudeRuntime(
      { binaryName: 'claude' },
      { wayfinderDir: '/tmp/wayfinder' },
    )
    expect(runtime.descriptor.adapterId).toBe('claude')
    expect(runtime.descriptor.kind).toBe('host-process')
    expect(runtime.descriptor.platforms).toContain('darain')
    expect(runtime.descriptor.platforms).toContain('linux')
  })

  it('getPerAgentHomeDir resolves the canonical agent home path', () => {
    const runtime = new ClaudeRuntime(
      { binaryName: 'claude' },
      { wayfinderDir: '/tmp/wayfinder' },
    )
    expect(runtime.getPerAgentHomeDir('agent-7')).toBe(
      '/tmp/wayfinder/agents/harness/agent-7/home',
    )
  })

  it('prepareTurnContext sets AGENT_HOME and not CODEX_HOME', async () => {
    const wayfinderDir = await mkdtemp(join(tmpdir(), 'wayfinder-claude-'))
    tempDirs.push(wayfinderDir)
    const prepared = await prepareClaudeCodeContext({
      wayfinderDir,
      agent: makeAgent('claude-agent'),
      sessionId: 'main',
      sessionKey: 'agent:claude-agent:main',
      cadOverride: null,
      isSelectedCad: false,
      message: 'hi',
    })
    expect(prepared.commandEnv).toEqual({
      AGENT_HOME: join(
        wayfinderDir,
        'agents',
        'harness',
        'claude-agent',
        'home',
      ),
    })
    expect(prepared.commandEnv).not.toHaveProperty('CODEX_HOME')
    expect(prepared.useWayfinderMcp).toBe(true)
  })

  describe('configureClaudeRuntime', () => {
    it('registers a runtime in the registry', () => {
      const wayfinderDir = '/tmp/wayfinder'
      const runtime = configureClaudeRuntime({ wayfinderDir })
      expect(runtime).toBeInstanceOf(ClaudeRuntime)
      expect(getClaudeRuntime()).toBe(runtime)
      expect(getAgentRuntimeRegistry().get('claude')).toBe(runtime)
    })

    it('throws on duplicate registration', () => {
      configureClaudeRuntime({ wayfinderDir: '/tmp/wayfinder' })
      expect(() =>
        configureClaudeRuntime({ wayfinderDir: '/tmp/wayfinder' }),
      ).toThrow(/already registered/)
    })
  })
})
