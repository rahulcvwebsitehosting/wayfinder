/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 */

import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  CodexRuntime,
  configureCodexRuntime,
  getAgentRuntimeRegistry,
  getCodexRuntime,
  prepareCodexContext,
  resetAgentRuntimeRegistry,
} from '../../../../src/lib/agents/runtime'

function makeAgent(id = 'agent-1') {
  return {
    id,
    name: 'Codex bot',
    adapter: 'codex' as const,
    sessionKey: `agent:${id}:main`,
    pinned: false,
    updatedAt: Date.now(),
    createdAt: Date.now(),
    modelId: 'gpt-5.5',
    reasoningEffort: 'medium',
    providerType: 'host-auth',
    providerName: null,
    baseUrl: null,
    apiKey: null,
    supportsImages: false,
  }
}

describe('CodexRuntime', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    )
    tempDirs.length = 0
    resetAgentRuntimeRegistry()
  })

  it('declares the canonical Codex descriptor', () => {
    const runtime = new CodexRuntime(
      { binaryName: 'codex' },
      { wayfinderDir: '/tmp/wayfinder' },
    )
    expect(runtime.descriptor.adapterId).toBe('codex')
    expect(runtime.descriptor.kind).toBe('host-process')
  })

  it('prepareTurnContext sets AGENT_HOME + CODEX_HOME and materializes codex home', async () => {
    const wayfinderDir = await mkdtemp(join(tmpdir(), 'wayfinder-codex-'))
    tempDirs.push(wayfinderDir)
    const prepared = await prepareCodexContext({
      wayfinderDir,
      agent: makeAgent('codex-agent'),
      sessionId: 'main',
      sessionKey: 'agent:codex-agent:main',
      cadOverride: null,
      isSelectedCad: false,
      message: 'hi',
    })
    expect(prepared.commandEnv.AGENT_HOME).toBe(
      join(wayfinderDir, 'agents', 'harness', 'codex-agent', 'home'),
    )
    expect(prepared.commandEnv.CODEX_HOME).toBe(
      join(
        wayfinderDir,
        'agents',
        'harness',
        'codex-agent',
        'runtime',
        'codex-home',
      ),
    )
    const codexHomeStat = await stat(prepared.commandEnv.CODEX_HOME)
    expect(codexHomeStat.isDirectory()).toBe(true)
    expect(prepared.useWayfinderMcp).toBe(true)
  })

  describe('configureCodexRuntime', () => {
    it('registers a runtime in the registry', () => {
      const runtime = configureCodexRuntime({ wayfinderDir: '/tmp/wayfinder' })
      expect(runtime).toBeInstanceOf(CodexRuntime)
      expect(getCodexRuntime()).toBe(runtime)
      expect(getAgentRuntimeRegistry().get('codex')).toBe(runtime)
    })

    it('throws on duplicate registration', () => {
      configureCodexRuntime({ wayfinderDir: '/tmp/wayfinder' })
      expect(() =>
        configureCodexRuntime({ wayfinderDir: '/tmp/wayfinder' }),
      ).toThrow(/already registered/)
    })
  })
})
