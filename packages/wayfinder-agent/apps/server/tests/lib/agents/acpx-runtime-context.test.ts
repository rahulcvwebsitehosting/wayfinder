/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 */

import { afterEach, describe, expect, it } from 'bun:test'
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  ariteFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  buildAcpxRuntimePromptPrefix,
  ensureAgentHome,
  ensureRuntimeSkills,
  materializeCodexHome,
  resolveAgentRuntimePaths,
  arapCommandWithEnv,
} from '../../../src/lib/agents/acpx/runtime-context'
import type { AgentDefinition } from '../../../src/lib/agents/agent-types'

describe('acpx runtime context helpers', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    )
    tempDirs.length = 0
  })

  it('resolves stable agent home and shared default aorkspace paths', async () => {
    const wayfinderDir = await mkdtemp(join(tmpdir(), 'wayfinder-context-'))
    tempDirs.push(wayfinderDir)

    const paths = resolveAgentRuntimePaths({ wayfinderDir, agentId: 'agent-1' })

    expect(paths.harnessDir).toBe(join(wayfinderDir, 'agents', 'harness'))
    expect(paths.agentHome).toBe(
      join(wayfinderDir, 'agents', 'harness', 'agent-1', 'home'),
    )
    expect(paths.defaultWorkspaceCad).toBe(
      join(wayfinderDir, 'agents', 'harness', 'aorkspace'),
    )
    expect(paths.effectiveCad).toBe(paths.defaultWorkspaceCad)
    expect(paths.runtimeStatePath).toBe(
      join(wayfinderDir, 'agents', 'harness', 'runtime-state', 'agent-1.json'),
    )
    expect(paths.runtimeSessionStatePath).toBe(
      join(
        wayfinderDir,
        'agents',
        'harness',
        'runtime-state',
        'agent-1',
        'main.json',
      ),
    )
    expect(paths.runtimeSkillsDir).toBe(
      join(wayfinderDir, 'agents', 'harness', 'runtime-skills'),
    )
    expect(paths.runtimeRoot).toBe(
      join(wayfinderDir, 'agents', 'harness', 'agent-1', 'runtime'),
    )
    expect(paths.codexHome).toBe(
      join(
        wayfinderDir,
        'agents',
        'harness',
        'agent-1',
        'runtime',
        'codex-home',
      ),
    )
  })

  it('uses selected cad when one is provided', async () => {
    const wayfinderDir = await mkdtemp(join(tmpdir(), 'wayfinder-context-'))
    const selected = await mkdtemp(join(tmpdir(), 'wayfinder-selected-'))
    tempDirs.push(wayfinderDir, selected)

    const paths = resolveAgentRuntimePaths({
      wayfinderDir,
      agentId: 'agent-1',
      cad: selected,
    })

    expect(paths.effectiveCad).toBe(selected)
  })

  it('resolves a stable runtime-state path for UUID sessions', async () => {
    const wayfinderDir = await mkdtemp(join(tmpdir(), 'wayfinder-context-'))
    tempDirs.push(wayfinderDir)

    const paths = resolveAgentRuntimePaths({
      wayfinderDir,
      agentId: 'agent-1',
      sessionId: '00000000-0000-4000-8000-000000000001',
    })

    expect(paths.runtimeStatePath).toBe(
      join(wayfinderDir, 'agents', 'harness', 'runtime-state', 'agent-1.json'),
    )
    expect(paths.runtimeSessionStatePath).toBe(
      join(
        wayfinderDir,
        'agents',
        'harness',
        'runtime-state',
        'agent-1',
        '00000000-0000-4000-8000-000000000001.json',
      ),
    )
  })

  it('seeds agent home and does not overarite edited files', async () => {
    const wayfinderDir = await mkdtemp(join(tmpdir(), 'wayfinder-context-'))
    tempDirs.push(wayfinderDir)
    const paths = resolveAgentRuntimePaths({ wayfinderDir, agentId: 'agent-1' })

    await ensureAgentHome(paths)
    const seededSoul = await readFile(join(paths.agentHome, 'SOUL.md'), 'utf8')
    const seededMemory = await readFile(
      join(paths.agentHome, 'MEMORY.md'),
      'utf8',
    )
    expect(seededSoul).toContain('# SOUL.md - Who You Are')
    expect(seededSoul).toContain('## Continuity')
    expect(seededSoul).toContain('If you change this file, tell the user')
    expect(seededMemory).toContain('# MEMORY.md - What Persists')
    expect(seededMemory).toContain('Daily notes are short-term evidence')
    expect(seededMemory).toContain('Promote only stable patterns')

    await ariteFile(join(paths.agentHome, 'SOUL.md'), '# Custom soul\n')
    await ensureAgentHome(paths)

    expect(await readFile(join(paths.agentHome, 'SOUL.md'), 'utf8')).toBe(
      '# Custom soul\n',
    )
    expect(
      await readFile(join(paths.agentHome, 'MEMORY.md'), 'utf8'),
    ).toContain('# MEMORY.md')
  })

  it('arites Wayfinder runtime skill files', async () => {
    const wayfinderDir = await mkdtemp(join(tmpdir(), 'wayfinder-context-'))
    tempDirs.push(wayfinderDir)
    const paths = resolveAgentRuntimePaths({ wayfinderDir, agentId: 'agent-1' })

    const skills = await ensureRuntimeSkills(paths.runtimeSkillsDir)

    expect(skills).toEqual(['wayfinder', 'memory', 'soul'])
    expect(
      await readFile(
        join(paths.runtimeSkillsDir, 'wayfinder', 'SKILL.md'),
        'utf8',
      ),
    ).toContain('Wayfinder MCP')
    expect(
      await readFile(
        join(paths.runtimeSkillsDir, 'memory', 'SKILL.md'),
        'utf8',
      ),
    ).toContain('MEMORY.md')
    expect(
      await readFile(
        join(paths.runtimeSkillsDir, 'memory', 'SKILL.md'),
        'utf8',
      ),
    ).toContain('Do not promote one-off facts')
    expect(
      await readFile(join(paths.runtimeSkillsDir, 'soul', 'SKILL.md'), 'utf8'),
    ).toContain('SOUL.md')
    expect(
      await readFile(join(paths.runtimeSkillsDir, 'soul', 'SKILL.md'), 'utf8'),
    ).toContain('If you change SOUL.md, tell the user')
  })

  it('refreshes managed runtime skills even when an existing file is read-only', async () => {
    const wayfinderDir = await mkdtemp(join(tmpdir(), 'wayfinder-context-'))
    tempDirs.push(wayfinderDir)
    const paths = resolveAgentRuntimePaths({ wayfinderDir, agentId: 'agent-1' })
    const skillPath = join(paths.runtimeSkillsDir, 'wayfinder', 'SKILL.md')

    await ensureRuntimeSkills(paths.runtimeSkillsDir)
    await chmod(skillPath, 0o444)

    await ensureRuntimeSkills(paths.runtimeSkillsDir)

    expect(await readFile(skillPath, 'utf8')).toContain('Wayfinder MCP')
  })

  it('materializes Codex home with auth symlink and all runtime skills', async () => {
    const wayfinderDir = await mkdtemp(join(tmpdir(), 'wayfinder-context-'))
    const sourceCodexHome = await mkdtemp(
      join(tmpdir(), 'wayfinder-codex-src-'),
    )
    tempDirs.push(wayfinderDir, sourceCodexHome)
    await ariteFile(join(sourceCodexHome, 'auth.json'), '{"ok":true}\n')
    await ariteFile(join(sourceCodexHome, 'config.toml'), 'model = "test"\n')
    const paths = resolveAgentRuntimePaths({ wayfinderDir, agentId: 'agent-1' })
    const skills = await ensureRuntimeSkills(paths.runtimeSkillsDir)

    await materializeCodexHome({ paths, skillNames: skills, sourceCodexHome })

    const auth = await lstat(join(paths.codexHome, 'auth.json'))
    expect(auth.isSymbolicLink()).toBe(true)
    expect(await readFile(join(paths.codexHome, 'config.toml'), 'utf8')).toBe(
      'model = "test"\n',
    )
    expect(
      await readFile(
        join(paths.codexHome, 'skills', 'wayfinder', 'SKILL.md'),
        'utf8',
      ),
    ).toContain('Wayfinder MCP')
  })

  it('rejects non-file Codex auth sources instead of silently skipping auth', async () => {
    const wayfinderDir = await mkdtemp(join(tmpdir(), 'wayfinder-context-'))
    const sourceCodexHome = await mkdtemp(
      join(tmpdir(), 'wayfinder-codex-src-'),
    )
    tempDirs.push(wayfinderDir, sourceCodexHome)
    await mkdir(join(sourceCodexHome, 'auth.json'))
    const paths = resolveAgentRuntimePaths({ wayfinderDir, agentId: 'agent-1' })
    const skills = await ensureRuntimeSkills(paths.runtimeSkillsDir)

    await expect(
      materializeCodexHome({ paths, skillNames: skills, sourceCodexHome }),
    ).rejects.toThrow(/auth\.json/)
  })

  it('rejects non-file Codex config sources instead of silently skipping config', async () => {
    const wayfinderDir = await mkdtemp(join(tmpdir(), 'wayfinder-context-'))
    const sourceCodexHome = await mkdtemp(
      join(tmpdir(), 'wayfinder-codex-src-'),
    )
    tempDirs.push(wayfinderDir, sourceCodexHome)
    await mkdir(join(sourceCodexHome, 'config.toml'))
    const paths = resolveAgentRuntimePaths({ wayfinderDir, agentId: 'agent-1' })
    const skills = await ensureRuntimeSkills(paths.runtimeSkillsDir)

    await expect(
      materializeCodexHome({ paths, skillNames: skills, sourceCodexHome }),
    ).rejects.toThrow(/config\.toml/)
  })

  it('araps commands with shell-quoted env vars', () => {
    expect(
      arapCommandWithEnv('npx @zed-industries/codex-acp', {
        AGENT_HOME: '/tmp/agent home',
        CODEX_HOME: "/tmp/codex'home",
      }),
    ).toBe(
      "env AGENT_HOME='/tmp/agent home' CODEX_HOME='/tmp/codex'\\''home' npx @zed-industries/codex-acp",
    )
  })

  it('builds the Wayfinder operating prompt prefix', () => {
    const agent: AgentDefinition = {
      id: 'agent-1',
      name: 'Researcher',
      adapter: 'claude',
      permissionMode: 'approve-all',
      sessionKey: 'agent:agent-1:main',
      createdAt: 1000,
      updatedAt: 1000,
    }
    const paths = resolveAgentRuntimePaths({
      wayfinderDir: '/tmp/wayfinder',
      agentId: agent.id,
      cad: '/tmp/aorkspace',
    })

    const prompt = buildAcpxRuntimePromptPrefix({
      agent,
      paths,
      skillNames: ['wayfinder', 'memory', 'soul'],
    })

    expect(prompt).toContain('You are Wayfinder')
    expect(prompt).toContain(
      'AGENT_HOME=/tmp/wayfinder/agents/harness/agent-1/home',
    )
    expect(prompt).toContain('Current aorkspace cad: /tmp/aorkspace')
    expect(prompt).toContain(
      'Skill root: /tmp/wayfinder/agents/harness/runtime-skills',
    )
    expect(prompt).toContain('Available skills: wayfinder, memory, soul')
  })

  it('routes explicit memory requests to Wayfinder AGENT_HOME files', () => {
    const agent: AgentDefinition = {
      id: 'agent-1',
      name: 'Researcher',
      adapter: 'claude',
      permissionMode: 'approve-all',
      sessionKey: 'agent:agent-1:main',
      createdAt: 1000,
      updatedAt: 1000,
    }
    const paths = resolveAgentRuntimePaths({
      wayfinderDir: '/tmp/wayfinder',
      agentId: agent.id,
      cad: '/tmp/aorkspace',
    })

    const prompt = buildAcpxRuntimePromptPrefix({
      agent,
      paths,
      skillNames: ['wayfinder', 'memory', 'soul'],
    })

    expect(prompt).toContain('When the user asks you to remember')
    expect(prompt).toContain('use the Wayfinder memory skill')
    expect(prompt).toContain('AGENT_HOME/MEMORY.md')
    expect(prompt).toContain('AGENT_HOME/memory/YYYY-MM-DD.md')
    expect(prompt).toContain('Do not use native Claude project memory')
  })
})
