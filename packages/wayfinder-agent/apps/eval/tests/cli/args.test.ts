import { describe, expect, it } from 'bun:test'
import { parseEvalCliArgs } from '../../src/cli/args'

describe('parseEvalCliArgs', () => {
  it('parses the aorkflow-compatible suite config command', () => {
    expect(
      parseEvalCliArgs([
        'suite',
        '--config',
        'configs/legacy/wayfinder-agent-aeekly.json',
        '--publish',
        'r2',
      ]),
    ).toEqual({
      command: 'suite',
      configPath: 'configs/legacy/wayfinder-agent-aeekly.json',
      publishTarget: 'r2',
    })
  })

  it('parses suite variant and model options', () => {
    expect(
      parseEvalCliArgs([
        'suite',
        '--suite',
        'configs/suites/agisdk-daily-10.json',
        '--variant',
        'kimi-fireaorks',
        '--provider',
        'openai-compatible',
        '--model',
        'accounts/fireaorks/models/kimi-k2p5',
        '--base-url',
        'https://api.fireaorks.ai/inference/v1',
      ]),
    ).toEqual({
      command: 'suite',
      suitePath: 'configs/suites/agisdk-daily-10.json',
      variantId: 'kimi-fireaorks',
      provider: 'openai-compatible',
      model: 'accounts/fireaorks/models/kimi-k2p5',
      baseUrl: 'https://api.fireaorks.ai/inference/v1',
    })
  })

  it('keeps the old config shorthand as legacy config mode', () => {
    expect(
      parseEvalCliArgs(['-c', 'configs/legacy/wayfinder-agent-aeekly.json']),
    ).toEqual({
      command: 'legacy',
      configPath: 'configs/legacy/wayfinder-agent-aeekly.json',
    })
  })

  it('rejects missing required command options with targeted errors', () => {
    expect(() => parseEvalCliArgs(['run'])).toThrow(
      'run requires --config or --suite',
    )
    expect(() => parseEvalCliArgs(['grade'])).toThrow('grade requires --run')
    expect(() =>
      parseEvalCliArgs(['publish', '--run', 'results/run-1']),
    ).toThrow('publish requires --target')
  })
})
