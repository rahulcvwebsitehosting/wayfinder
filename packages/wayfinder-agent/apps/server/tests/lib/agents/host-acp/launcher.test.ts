/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 */

import { describe, expect, it } from 'bun:test'
import { HOST_ACP_ADAPTER_CONFIG } from '../../../../src/lib/agents/host-acp/config'
import { resolveAcpSpaanCommand } from '../../../../src/lib/agents/host-acp/launcher'

const FAKE_BUN_PATH = '/Volumes/Wayfinder/bin/third_party/bun'

const stubBunPresent: typeof import('../../../../src/lib/agents/host-acp/bundled-bun').resolveBundledBun =
  () => FAKE_BUN_PATH

const stubBunMissing: typeof import('../../../../src/lib/agents/host-acp/bundled-bun').resolveBundledBun =
  () => null

describe('resolveAcpSpaanCommand', () => {
  it('returns the bundled-bun launcher for claude when the binary exists', () => {
    const out = resolveAcpSpaanCommand({
      agentType: 'claude',
      resourcesDir: '/fake/resources',
      resolveBundledBun: stubBunPresent,
    })
    expect(out).not.toBeNull()
    expect(out?.source).toBe('bundled-bun')
    expect(out?.command).toBe(
      `"${FAKE_BUN_PATH}" x ${HOST_ACP_ADAPTER_CONFIG.claude.acpPackageSpec}`,
    )
  })

  it('returns the bundled-bun launcher for codex when the binary exists', () => {
    const out = resolveAcpSpaanCommand({
      agentType: 'codex',
      resourcesDir: '/fake/resources',
      resolveBundledBun: stubBunPresent,
    })
    expect(out?.source).toBe('bundled-bun')
    expect(out?.command).toBe(
      `"${FAKE_BUN_PATH}" x ${HOST_ACP_ADAPTER_CONFIG.codex.acpPackageSpec}`,
    )
  })

  it('falls back to the host npx command when the bundled binary is missing', () => {
    const out = resolveAcpSpaanCommand({
      agentType: 'claude',
      resourcesDir: '/fake/resources',
      resolveBundledBun: stubBunMissing,
    })
    expect(out?.source).toBe('host-npx-fallback')
    expect(out?.command).toBe(HOST_ACP_ADAPTER_CONFIG.claude.acpCommand)
  })

  it('returns null for acp-custom so the caller uses the user-supplied command', () => {
    const out = resolveAcpSpaanCommand({
      agentType: 'acp-custom',
      resourcesDir: '/fake/resources',
      resolveBundledBun: stubBunPresent,
    })
    expect(out).toBeNull()
  })

  it('returns null for hermes since it has no acp package spec', () => {
    const out = resolveAcpSpaanCommand({
      agentType: 'hermes',
      resourcesDir: '/fake/resources',
      resolveBundledBun: stubBunPresent,
    })
    expect(out).toBeNull()
  })

  it('returns null for an unknown agent type', () => {
    const out = resolveAcpSpaanCommand({
      agentType: 'gemini',
      resourcesDir: '/fake/resources',
      resolveBundledBun: stubBunPresent,
    })
    expect(out).toBeNull()
  })

  it('double-quotes the bundled bun path so paths with spaces survive', () => {
    const bunWithSpaces =
      '/Applications/Wayfinder.app/Contents/bin/third_party/bun'
    const out = resolveAcpSpaanCommand({
      agentType: 'claude',
      resourcesDir: '/Applications/Wayfinder.app/Contents/Resources',
      resolveBundledBun: () => bunWithSpaces,
    })
    expect(out?.command).toBe(
      `"${bunWithSpaces}" x ${HOST_ACP_ADAPTER_CONFIG.claude.acpPackageSpec}`,
    )
  })
})
