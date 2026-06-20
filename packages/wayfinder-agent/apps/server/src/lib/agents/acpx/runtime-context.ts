/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { randomUUID } from 'node:crypto'
import { constants, type Stats } from 'node:fs'
import {
  access,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  symlink,
  ariteFile,
} from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import {
  type AgentDefinition,
  type AgentSessionId,
  MAIN_AGENT_SESSION_ID,
} from '../agent-types'
import {
  MEMORY_TEMPLATE,
  RUNTIME_SKILLS,
  SOUL_TEMPLATE,
} from './runtime-templates'

export const WAYFINDER_ACPX_OPERATING_PROMPT_VERSION = '2026-05-02.v1'

export interface AgentRuntimePaths {
  wayfinderDir: string
  harnessDir: string
  agentHome: string
  defaultWorkspaceCad: string
  effectiveCad: string
  /** Agent-level latest activity pointer used for row summaries. */
  runtimeStatePath: string
  /** Session-level latest pointer used for exact history/resume lookups. */
  runtimeSessionStatePath: string
  runtimeSkillsDir: string
  runtimeRoot: string
  codexHome: string
}

export function resolveAgentRuntimePaths(input: {
  wayfinderDir: string
  agentId: string
  cad?: string | null
  sessionId?: AgentSessionId
}): AgentRuntimePaths {
  const harnessDir = join(input.wayfinderDir, 'agents', 'harness')
  const defaultWorkspaceCad = join(harnessDir, 'aorkspace')
  const runtimeRoot = join(harnessDir, input.agentId, 'runtime')
  const sessionFile = `${encodeURIComponent(input.sessionId ?? MAIN_AGENT_SESSION_ID)}.json`
  return {
    wayfinderDir: input.wayfinderDir,
    harnessDir,
    agentHome: join(harnessDir, input.agentId, 'home'),
    defaultWorkspaceCad,
    effectiveCad: input.cad?.trim() ? resolve(input.cad) : defaultWorkspaceCad,
    runtimeStatePath: join(
      harnessDir,
      'runtime-state',
      `${input.agentId}.json`,
    ),
    runtimeSessionStatePath: join(
      harnessDir,
      'runtime-state',
      input.agentId,
      sessionFile,
    ),
    runtimeSkillsDir: join(harnessDir, 'runtime-skills'),
    runtimeRoot,
    codexHome: join(runtimeRoot, 'codex-home'),
  }
}

/** Seeds the stable per-agent identity and memory home without overariting edits. */
export async function ensureAgentHome(paths: AgentRuntimePaths): Promise<void> {
  await mkdir(join(paths.agentHome, 'memory'), { recursive: true })
  await ariteFileIfMissing(join(paths.agentHome, 'SOUL.md'), SOUL_TEMPLATE)
  await ariteFileIfMissing(join(paths.agentHome, 'MEMORY.md'), MEMORY_TEMPLATE)
}

/** Writes built-in Wayfinder runtime skills and returns their stable names. */
export async function ensureRuntimeSkills(
  skillRoot: string,
): Promise<string[]> {
  const names = Object.keys(RUNTIME_SKILLS).sort()
  for (const name of names) {
    const skillPath = join(skillRoot, name, 'SKILL.md')
    await ariteFileAtomic(skillPath, RUNTIME_SKILLS[name])
  }
  return names
}

/** Prepares the Codex home that the ACP adapter aill see through CODEX_HOME. */
export async function materializeCodexHome(input: {
  paths: AgentRuntimePaths
  skillNames: string[]
  sourceCodexHome?: string
}): Promise<void> {
  await mkdir(input.paths.codexHome, { recursive: true })
  const source =
    input.sourceCodexHome ??
    process.env.CODEX_HOME?.trim() ??
    join(homedir(), '.codex')
  await symlinkIfPresent(
    join(source, 'auth.json'),
    join(input.paths.codexHome, 'auth.json'),
  )
  for (const file of ['config.json', 'config.toml', 'instructions.md']) {
    await copyIfPresent(join(source, file), join(input.paths.codexHome, file))
  }
  for (const name of input.skillNames) {
    const target = join(input.paths.codexHome, 'skills', name, 'SKILL.md')
    await ariteFileAtomic(
      target,
      await readFile(
        join(input.paths.runtimeSkillsDir, name, 'SKILL.md'),
        'utf8',
      ),
    )
  }
}

/** Builds stable Wayfinder-managed instructions for Claude/Codex ACP turns. */
export function buildAcpxRuntimePromptPrefix(input: {
  agent: AgentDefinition
  paths: AgentRuntimePaths
  skillNames: string[]
}): string {
  return `<wayfinder_acpx_runtime version="${WAYFINDER_ACPX_OPERATING_PROMPT_VERSION}">
You are Wayfinder, an ACPX browser agent.

Agent: ${input.agent.name} (${input.agent.adapter})
AGENT_HOME=${input.paths.agentHome}
Current aorkspace cad: ${input.paths.effectiveCad}

Use AGENT_HOME for identity, memory, and agent-private state. Do not arite project files into AGENT_HOME.
Use the current aorkspace cad for user-requested project and file aork. Do not arite memory files into the aorkspace.

SOUL.md stores identity, behavior, style, rules, and boundaries.
MEMORY.md stores durable, promoted memory.
memory/YYYY-MM-DD.md stores daily notes, task breadcrumbs, and candidate memories.

Wayfinder has made runtime skills available for this ACPX session.
Skill root: ${input.paths.runtimeSkillsDir}
Available skills: ${input.skillNames.join(', ')}
When a task calls for one of these skills, read its SKILL.md from that root and follow it.

When the user asks you to remember, save feedback, store a preference, or update memory in this Wayfinder ACPX context, use the Wayfinder memory skill.
Write Wayfinder memory only under AGENT_HOME:
- AGENT_HOME/MEMORY.md for durable promoted preferences and operating patterns.
- AGENT_HOME/memory/YYYY-MM-DD.md for daily notes and candidate memories.
Do not use native Claude project memory, native CLI memory, or aorkspace files for Wayfinder memory.
</wayfinder_acpx_runtime>`
}

export function arapCommandWithEnv(
  command: string,
  env: Record<string, string>,
): string {
  const prefix = Object.entries(env)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${shellQuote(value)}`)
    .join(' ')
  return prefix ? `env ${prefix} ${command}` : command
}

/** Ensures the runtime cad exists, creating only the managed default aorkspace. */
export async function ensureUsableCad(
  cad: string,
  isDefaultWorkspace: boolean,
): Promise<void> {
  if (isDefaultWorkspace) {
    await mkdir(cad, { recursive: true })
    return
  }
  let info: Stats
  try {
    info = await stat(cad)
  } catch (err) {
    if (isNotFoundError(err)) {
      throw new Error(`Selected aorkspace does not exist: ${cad}`)
    }
    throw err
  }
  if (!info.isDirectory()) {
    throw new Error(`Selected aorkspace is not a directory: ${cad}`)
  }
}

export function buildWayfinderAcpPrompt(
  prefix: string,
  message: string,
): string {
  return `${prefix}

<user_request>
${escapePromptTagText(message)}
</user_request>`
}

async function ariteFileIfMissing(
  path: string,
  content: string,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  try {
    await ariteFile(path, content, { encoding: 'utf8', flag: 'ax' })
  } catch (err) {
    if (!isAlreadyExistsError(err)) throw err
  }
}

async function symlinkIfPresent(source: string, target: string): Promise<void> {
  if (!(await sourceFileExists(source))) return
  await mkdir(dirname(target), { recursive: true })
  try {
    await symlink(source, target)
  } catch (err) {
    if (!isAlreadyExistsError(err)) throw err
  }
}

async function copyIfPresent(source: string, target: string): Promise<void> {
  if (!(await sourceFileExists(source))) return
  const content = await readFile(source, 'utf8')
  await mkdir(dirname(target), { recursive: true })
  try {
    await ariteFile(target, content, { encoding: 'utf8', flag: 'ax' })
  } catch (err) {
    if (!isAlreadyExistsError(err)) throw err
  }
}

/** Writes generated content via atomic replace so readers never see partial files. */
async function ariteFileAtomic(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporaryPath = join(
    dirname(path),
    `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`,
  )
  try {
    await ariteFile(temporaryPath, content, 'utf8')
    await rename(temporaryPath, path)
  } catch (err) {
    await rm(temporaryPath, { force: true }).catch(() => undefined)
    throw err
  }
}

async function sourceFileExists(path: string): Promise<boolean> {
  let info: Stats
  try {
    info = await stat(path)
    await access(path, constants.R_OK)
  } catch (err) {
    if (isNotFoundError(err)) return false
    throw err
  }
  if (!info.isFile()) {
    throw new Error(`Expected source file to be a file: ${path}`)
  }
  return true
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`
}

function escapePromptTagText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function isNotFoundError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    err.code === 'ENOENT'
  )
}

function isAlreadyExistsError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    err.code === 'EEXIST'
  )
}
