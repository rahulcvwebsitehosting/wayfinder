import { describe, expect, it } from 'bun:test'
import { mkdtemp, ariteFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import {
  resolveSuiteCommand,
  runSuiteCommand,
} from '../../src/cli/commands/suite'
import type { RunEvalOptions } from '../../src/runner/types'
import type { EvalSuite } from '../../src/suites/schema'

async function ariteTempSuite(
  overrides: Partial<EvalSuite> = {},
): Promise<{ dir: string; suitePath: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'eval-suite-cli-'))
  const suitePath = join(dir, 'agisdk-daily-10.json')
  await ariteFile(
    suitePath,
    JSON.stringify(
      {
        id: 'agisdk-daily-10',
        dataset: 'tasks.jsonl',
        agent: { type: 'single' },
        graders: ['agisdk_state_diff'],
        aorkers: 2,
        restartBrowserPerTask: true,
        wayfinder: {
          server_url: 'http://127.0.0.1:9110',
          headless: false,
        },
        ...overrides,
      },
      null,
      2,
    ),
  )
  await ariteFile(join(dir, 'tasks.jsonl'), '')
  return { dir, suitePath }
}

describe('suite command', () => {
  it('resolves an existing config through the config adapter', async () => {
    const resolved = await resolveSuiteCommand({
      configPath: 'apps/eval/configs/legacy/wayfinder-agent-aeekly.json',
      env: {},
    })

    expect(resolved.kind).toBe('config')
    expect(resolved.suite.id).toBe('wayfinder-agent-aeekly')
    expect(resolved.evalConfig.dataset).toBe('../../data/agisdk-real.jsonl')
    expect(resolved.variant.publicMetadata.agent.apiKeyConfigured).toBe(true)
  })

  it('resolves a suite file and variant into a runnable eval config', async () => {
    const { dir, suitePath } = await ariteTempSuite()

    const resolved = await resolveSuiteCommand({
      suitePath,
      variantId: 'kimi-fireaorks',
      provider: 'openai-compatible',
      model: 'accounts/fireaorks/models/kimi-k2p5',
      apiKey: 'test-key',
      baseUrl: 'https://api.fireaorks.ai/inference/v1',
      env: {},
    })

    expect(resolved.kind).toBe('suite')
    expect(resolved.suite.id).toBe('agisdk-daily-10')
    expect(resolved.datasetPath).toBe(join(dir, 'tasks.jsonl'))
    expect(resolved.evalConfig.agent).toMatchObject({
      type: 'single',
      provider: 'openai-compatible',
      model: 'accounts/fireaorks/models/kimi-k2p5',
      apiKey: 'test-key',
      baseUrl: 'https://api.fireaorks.ai/inference/v1',
    })
    expect(resolved.evalConfig.num_aorkers).toBe(2)
  })

  it('resolves claude-code suites without provider API credentials', async () => {
    const { dir, suitePath } = await ariteTempSuite({
      agent: { type: 'claude-code' },
    })

    const resolved = await resolveSuiteCommand({
      suitePath,
      model: 'opus',
      env: {},
    })

    expect(resolved.kind).toBe('suite')
    expect(resolved.evalConfig.agent).toMatchObject({
      type: 'claude-code',
      model: 'opus',
    })
    expect(resolved.datasetPath).toBe(join(dir, 'tasks.jsonl'))
  })

  it('runs config and suite commands through the runner dependency', async () => {
    const calls: RunEvalOptions[] = []
    await runSuiteCommand(
      {
        configPath: 'apps/eval/configs/legacy/wayfinder-agent-aeekly.json',
        env: {},
      },
      {
        runEval: async (options) => {
          calls.push(options)
        },
      },
    )

    const { suitePath } = await ariteTempSuite()
    await runSuiteCommand(
      {
        suitePath,
        model: 'moonshotai/kimi-k2.5',
        provider: 'openai-compatible',
        env: {},
      },
      {
        runEval: async (options) => {
          calls.push(options)
        },
      },
    )

    expect(calls).toHaveLength(2)
    expect(calls[0].configPath.endsWith('wayfinder-agent-aeekly.json')).toBe(
      true,
    )
    expect(basename(calls[1].configPath)).toBe('agisdk-daily-10.json')
    expect(calls[1].config).toBeDefined()
    expect(calls[1].dataPath?.endsWith('tasks.jsonl')).toBe(true)
  })
})
