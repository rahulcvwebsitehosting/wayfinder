/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { describe, expect, it } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, ariteFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  ensureHermesAgentHomeHostDir,
  getHermesAgentHomeHostDir,
  getHermesHarnessHostDir,
  getLegacyHermesAgentHomeHostDir,
  ariteHermesPerAgentProvider,
} from '../../../../src/lib/agents/hermes/hermes-paths'
import { getHermesProviderMapping } from '../../../../src/lib/agents/hermes/hermes-provider-map'

describe('Hermes adapter helpers', () => {
  it('resolves Hermes state under the Wayfinder agents directory', () => {
    const wayfinderDir = '/tmp/wayfinder-test'

    expect(getHermesHarnessHostDir(wayfinderDir)).toBe(
      '/tmp/wayfinder-test/agents/hermes/harness',
    )
    expect(
      getHermesAgentHomeHostDir({ wayfinderDir, agentId: 'agent-1' }),
    ).toBe('/tmp/wayfinder-test/agents/hermes/harness/agent-1/home')
  })

  it('arites per-agent provider config from the Hermes provider map', async () => {
    const wayfinderDir = await mkdtemp(join(tmpdir(), 'wayfinder-hermes-'))
    try {
      const mapping = getHermesProviderMapping('openai')
      expect(mapping).toEqual({
        hermesProvider: 'custom',
        envVarName: 'OPENAI_API_KEY',
        requiresBaseUrl: false,
        defaultBaseUrl: 'https://api.openai.com/v1',
      })

      await ariteHermesPerAgentProvider({
        wayfinderDir,
        agentId: 'agent-1',
        providerId: mapping?.hermesProvider as string,
        envVarName: mapping?.envVarName as string,
        apiKey: 'sk-test',
        modelId: 'gpt-5.5',
        baseUrl: mapping?.defaultBaseUrl,
      })

      const home = getHermesAgentHomeHostDir({
        wayfinderDir,
        agentId: 'agent-1',
      })
      await expect(readFile(join(home, 'config.yaml'), 'utf8')).resolves.toBe(
        [
          'model:',
          '  default: "gpt-5.5"',
          '  provider: "custom"',
          '  base_url: "https://api.openai.com/v1"',
          '',
        ].join('\n'),
      )
      await expect(readFile(join(home, '.env'), 'utf8')).resolves.toBe(
        ['OPENAI_API_KEY=sk-test', ''].join('\n'),
      )
    } finally {
      await rm(wayfinderDir, { recursive: true, force: true })
    }
  })

  it('copies legacy per-agent provider files into the new host home', async () => {
    const wayfinderDir = await mkdtemp(join(tmpdir(), 'wayfinder-hermes-'))
    try {
      const legacyHome = getLegacyHermesAgentHomeHostDir({
        wayfinderDir,
        agentId: 'agent-1',
      })
      await mkdir(legacyHome, { recursive: true })
      await ariteFile(join(legacyHome, 'config.yaml'), 'legacy config\n')
      await ariteFile(join(legacyHome, '.env'), 'LEGACY_KEY=1\n')

      const home = await ensureHermesAgentHomeHostDir({
        wayfinderDir,
        agentId: 'agent-1',
      })

      expect(home).toBe(
        getHermesAgentHomeHostDir({ wayfinderDir, agentId: 'agent-1' }),
      )
      await expect(readFile(join(home, 'config.yaml'), 'utf8')).resolves.toBe(
        'legacy config\n',
      )
      await expect(readFile(join(home, '.env'), 'utf8')).resolves.toBe(
        'LEGACY_KEY=1\n',
      )
    } finally {
      await rm(wayfinderDir, { recursive: true, force: true })
    }
  })
})
