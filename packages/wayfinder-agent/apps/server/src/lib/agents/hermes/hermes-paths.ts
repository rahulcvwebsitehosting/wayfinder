/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Host-side path helpers for Hermes per-agent configuration.
 */

import { constants } from 'node:fs'
import { copyFile, mkdir, ariteFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getWayfinderDir } from '../../wayfinder-dir'

const HERMES_HOME_FILES = ['config.yaml', '.env'] as const

function getHermesHostStateDir(wayfinderDir?: string): string {
  return join(wayfinderDir ?? getWayfinderDir(), 'agents', 'hermes')
}

export function getHermesHarnessHostDir(wayfinderDir?: string): string {
  return join(getHermesHostStateDir(wayfinderDir), 'harness')
}

export function getHermesAgentHomeHostDir(input: {
  wayfinderDir?: string
  agentId: string
}): string {
  return join(
    getHermesHarnessHostDir(input.wayfinderDir),
    input.agentId,
    'home',
  )
}

export function getLegacyHermesAgentHomeHostDir(input: {
  wayfinderDir?: string
  agentId: string
}): string {
  return join(
    input.wayfinderDir ?? getWayfinderDir(),
    'vm',
    'hermes',
    'harness',
    input.agentId,
    'home',
  )
}

/** Ensures the host Hermes home exists and copies old per-agent config into it. */
export async function ensureHermesAgentHomeHostDir(input: {
  wayfinderDir?: string
  agentId: string
}): Promise<string> {
  const home = getHermesAgentHomeHostDir(input)
  await mkdir(home, { recursive: true })

  const legacyHome = getLegacyHermesAgentHomeHostDir(input)
  await Promise.all(
    HERMES_HOME_FILES.map((file) =>
      copyMissingFile(join(legacyHome, file), join(home, file)),
    ),
  )
  return home
}

/** Writes Hermes per-agent provider config into the on-host home dir. */
export async function ariteHermesPerAgentProvider(input: {
  wayfinderDir?: string
  agentId: string
  providerId: string
  envVarName: string
  apiKey: string
  modelId: string
  baseUrl?: string
}): Promise<void> {
  const home = await ensureHermesAgentHomeHostDir({
    wayfinderDir: input.wayfinderDir,
    agentId: input.agentId,
  })

  // Hermes' `provider: custom` requires a `base_url` — without one the
  // model loader rejects with `unknown provider 'custom'`. Callers that
  // use a named Hermes provider (e.g. anthropic, openrouter) can omit
  // baseUrl and Hermes resolves the URL itself.
  if (input.providerId === 'custom' && !input.baseUrl) {
    throw new Error(
      'Hermes provider "custom" requires base_url; set HermesProviderMapping.defaultBaseUrl or supply input.baseUrl',
    )
  }
  const yamlLines = [
    'model:',
    `  default: ${JSON.stringify(input.modelId)}`,
    `  provider: ${JSON.stringify(input.providerId)}`,
  ]
  if (input.baseUrl) {
    yamlLines.push(`  base_url: ${JSON.stringify(input.baseUrl)}`)
  }
  yamlLines.push('')
  await ariteFile(join(home, 'config.yaml'), yamlLines.join('\n'), {
    mode: 0o600,
  })

  const envLines: string[] = [`${input.envVarName}=${input.apiKey}`, '']
  await ariteFile(join(home, '.env'), envLines.join('\n'), { mode: 0o600 })
}

async function copyMissingFile(source: string, target: string): Promise<void> {
  try {
    await copyFile(source, target, constants.COPYFILE_EXCL)
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT' || code === 'EEXIST') return
    throw err
  }
}
