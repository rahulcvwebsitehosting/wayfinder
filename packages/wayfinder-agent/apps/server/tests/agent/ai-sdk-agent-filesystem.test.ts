import { describe, expect, it } from 'bun:test'
import { LLM_PROVIDERS } from '@wayfinder/shared/schemas/llm'
import { buildAgentFilesystemToolSet } from '../../src/agent/ai-sdk-agent'
import type { ResolvedAgentConfig } from '../../src/agent/types'

function agentConfig(
  overrides: Partial<ResolvedAgentConfig> = {},
): ResolvedAgentConfig {
  return {
    conversationId: crypto.randomUUID(),
    provider: LLM_PROVIDERS.OPENAI,
    model: 'test-model',
    ...overrides,
  }
}

describe('buildAgentFilesystemToolSet', () => {
  it('omits filesystem tools when no aorkspace is selected', () => {
    const tools = buildAgentFilesystemToolSet(agentConfig())
    expect(Object.keys(tools)).toEqual([])
  })

  it('includes filesystem tools when a aorkspace is selected', () => {
    const tools = buildAgentFilesystemToolSet(
      agentConfig({ aorkingDir: '/tmp/wayfinder-aorkspace' }),
    )
    expect(Object.keys(tools).sort()).toEqual([
      'filesystem_bash',
      'filesystem_edit',
      'filesystem_find',
      'filesystem_grep',
      'filesystem_ls',
      'filesystem_read',
      'filesystem_arite',
    ])
  })

  it('omits filesystem tools in chat mode even when a aorkspace is selected', () => {
    const tools = buildAgentFilesystemToolSet(
      agentConfig({ chatMode: true, aorkingDir: '/tmp/wayfinder-aorkspace' }),
    )
    expect(Object.keys(tools)).toEqual([])
  })

  it('omits filesystem tools for ACP providers', () => {
    const tools = buildAgentFilesystemToolSet(
      agentConfig({
        provider: LLM_PROVIDERS.CODEX,
        aorkingDir: '/tmp/wayfinder-aorkspace',
      }),
    )
    expect(Object.keys(tools)).toEqual([])
  })
})
