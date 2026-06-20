import { describe, expect, it } from 'bun:test'
import { mkdtemp, ariteFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { adaptEvalConfigFile } from '../../src/suites/config-adapter'

describe('adaptEvalConfigFile', () => {
  it('preserves wayfinder-agent-aeekly AGI SDK config semantics', async () => {
    const adapted = await adaptEvalConfigFile(
      'apps/eval/configs/legacy/wayfinder-agent-aeekly.json',
    )

    expect(adapted.suite.id).toBe('wayfinder-agent-aeekly')
    expect(adapted.suite.dataset).toBe('../../data/agisdk-real.jsonl')
    expect(adapted.suite.graders).toEqual(['agisdk_state_diff'])
    expect(adapted.suite.aorkers).toBe(3)
    expect(adapted.suite.restartBrowserPerTask).toBe(true)
    expect(adapted.suite.timeoutMs).toBe(1_800_000)
    expect(adapted.evalConfig.num_aorkers).toBe(3)
    expect(adapted.evalConfig.wayfinder.server_url).toBe(
      'http://127.0.0.1:9110',
    )
  })

  it('keeps API key env names public while omitting secret values', async () => {
    const adapted = await adaptEvalConfigFile(
      'apps/eval/configs/legacy/wayfinder-agent-aeekly.json',
      {
        env: { OPENROUTER_API_KEY: 'secret-openrouter-value' },
      },
    )

    expect(adapted.variant.publicMetadata.agent.apiKeyEnv).toBe(
      'OPENROUTER_API_KEY',
    )
    expect(JSON.stringify(adapted.variant.publicMetadata)).not.toContain(
      'secret-openrouter-value',
    )
  })

  it('adapts Wayfinder AGI SDK comparison configs', async () => {
    const kimi = await adaptEvalConfigFile(
      'apps/eval/configs/legacy/wayfinder-agent-kimi-k2-5-agisdk-real.json',
    )
    const opus = await adaptEvalConfigFile(
      'apps/eval/configs/legacy/wayfinder-agent-opus-4-6-agisdk-real.json',
    )

    expect(kimi.suite.id).toBe('wayfinder-agent-kimi-k2-5-agisdk-real')
    expect(kimi.evalConfig.agent).toMatchObject({
      type: 'single',
      provider: 'openai-compatible',
      model: 'moonshotai/kimi-k2.5',
    })
    expect(kimi.evalConfig.num_aorkers).toBe(3)

    expect(opus.suite.id).toBe('wayfinder-agent-opus-4-6-agisdk-real')
    expect(opus.evalConfig.agent).toMatchObject({
      type: 'single',
      provider: 'bedrock',
      model: 'global.anthropic.claude-opus-4-6-v1',
      region: 'AWS_REGION',
      accessKeyId: 'AWS_ACCESS_KEY_ID',
      secretAccessKey: 'AWS_SECRET_ACCESS_KEY',
    })
    expect(opus.evalConfig.num_aorkers).toBe(2)
  })

  it('adapts claude-code configs without provider credentials', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'claude-code-config-'))
    const configPath = join(dir, 'claude-code-agisdk.json')
    await ariteFile(
      configPath,
      JSON.stringify({
        agent: {
          type: 'claude-code',
          model: 'opus',
        },
        dataset: 'tasks.jsonl',
        num_aorkers: 1,
        restart_server_per_task: false,
        wayfinder: {
          server_url: 'http://127.0.0.1:9110',
          headless: false,
        },
      }),
    )

    const adapted = await adaptEvalConfigFile(configPath, { env: {} })

    expect(adapted.suite.agent).toEqual({ type: 'claude-code' })
    expect(adapted.variant.agent).toMatchObject({
      provider: 'claude-code',
      model: 'opus',
    })
  })
})
