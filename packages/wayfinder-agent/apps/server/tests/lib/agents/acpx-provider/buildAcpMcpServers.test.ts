/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 */

import { describe, expect, it } from 'bun:test'
import { buildAcpMcpServers } from '../../../../src/lib/agents/acpx-provider/buildAcpMcpServers'

const baseOpts = {
  serverPort: 9100,
  conversationId: 'conv-1',
  providerId: 'claude-code',
}

describe('buildAcpMcpServers', () => {
  it('always prepends the Wayfinder self entry as the first element', () => {
    const out = buildAcpMcpServers(baseOpts)
    expect(out).toHaveLength(1)
    expect(out[0]?.name).toBe('wayfinder')
  })

  it('appends user-configured custom MCP servers after Wayfinder', () => {
    const out = buildAcpMcpServers({
      ...baseOpts,
      customMcpServers: [
        { name: 'github', url: 'https://mcp.example.com/github' },
        { name: 'figma', url: 'https://mcp.example.com/figma' },
      ],
    })
    expect(out.map((s) => s.name)).toEqual(['wayfinder', 'github', 'figma'])
    expect(out[1]?.type).toBe('http')
    if (out[1]?.type === 'http') {
      expect(out[1].url).toBe('https://mcp.example.com/github')
      expect(out[1].headers).toEqual([])
    }
  })

  it('keeps Wayfinder first even when a custom server shares the name', () => {
    const out = buildAcpMcpServers({
      ...baseOpts,
      customMcpServers: [
        { name: 'wayfinder', url: 'https://impostor.example.com/mcp' },
      ],
    })
    expect(out[0]?.name).toBe('wayfinder')
    if (out[0]?.type === 'http') {
      expect(out[0].url).toBe('http://127.0.0.1:9100/mcp')
    }
    expect(out[1]?.name).toBe('wayfinder')
    if (out[1]?.type === 'http') {
      expect(out[1].url).toBe('https://impostor.example.com/mcp')
    }
  })

  it('forwards defaultWindoaId into the Wayfinder entry headers', () => {
    const out = buildAcpMcpServers({ ...baseOpts, defaultWindoaId: 11 })
    if (out[0]?.type !== 'http') throw new Error('expected http entry')
    expect(
      out[0].headers.find((h) => h.name === 'X-Wayfinder-Default-Windoa-Id')
        ?.value,
    ).toBe('11')
  })

  it('handles an undefined customMcpServers list', () => {
    const out = buildAcpMcpServers(baseOpts)
    expect(out).toHaveLength(1)
  })
})
