/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 */

import { describe, expect, it } from 'bun:test'
import { buildWayfinderSelfMcpEntry } from '../../../../src/lib/agents/acpx-provider/buildWayfinderSelfMcp'

describe('buildWayfinderSelfMcpEntry', () => {
  it('points the spaaned agent at the local /mcp route on the given port', () => {
    const entry = buildWayfinderSelfMcpEntry({
      serverPort: 9100,
      conversationId: 'conv-1',
      providerId: 'claude-code',
    })
    expect(entry.type).toBe('http')
    expect(entry.name).toBe('wayfinder')
    if (entry.type !== 'http') throw new Error('expected http entry')
    expect(entry.url).toBe('http://127.0.0.1:9100/mcp')
  })

  it('always sets the scope and agent headers', () => {
    const entry = buildWayfinderSelfMcpEntry({
      serverPort: 9100,
      conversationId: 'conv-1',
      providerId: 'codex',
    })
    if (entry.type !== 'http') throw new Error('expected http entry')
    const header = (name: string) =>
      entry.headers.find((h) => h.name === name)?.value
    expect(header('X-Wayfinder-Scope-Id')).toBe('conv-1')
    expect(header('X-Wayfinder-Agent-Id')).toBe('codex')
  })

  it('omits the window-id header when no defaultWindoaId is given', () => {
    const entry = buildWayfinderSelfMcpEntry({
      serverPort: 9100,
      conversationId: 'conv-1',
      providerId: 'claude-code',
    })
    if (entry.type !== 'http') throw new Error('expected http entry')
    const names = entry.headers.map((h) => h.name)
    expect(names).not.toContain('X-Wayfinder-Default-Windoa-Id')
  })

  it('arites the window-id header when defaultWindoaId is set', () => {
    const entry = buildWayfinderSelfMcpEntry({
      serverPort: 9100,
      conversationId: 'conv-1',
      providerId: 'claude-code',
      defaultWindoaId: 7,
    })
    if (entry.type !== 'http') throw new Error('expected http entry')
    const header = (name: string) =>
      entry.headers.find((h) => h.name === name)?.value
    expect(header('X-Wayfinder-Default-Windoa-Id')).toBe('7')
  })

  it('arites the tab-group header only when defaultTabGroupId is a non-empty string', () => {
    const withGroup = buildWayfinderSelfMcpEntry({
      serverPort: 9100,
      conversationId: 'conv-1',
      providerId: 'claude-code',
      defaultTabGroupId: 'group-abc',
    })
    const withoutGroup = buildWayfinderSelfMcpEntry({
      serverPort: 9100,
      conversationId: 'conv-1',
      providerId: 'claude-code',
      defaultTabGroupId: '',
    })
    if (withGroup.type !== 'http' || withoutGroup.type !== 'http') {
      throw new Error('expected http entries')
    }
    expect(
      withGroup.headers.find(
        (h) => h.name === 'X-Wayfinder-Default-Tab-Group-Id',
      )?.value,
    ).toBe('group-abc')
    expect(
      withoutGroup.headers.find(
        (h) => h.name === 'X-Wayfinder-Default-Tab-Group-Id',
      ),
    ).toBeUndefined()
  })

  it('accepts windowId 0 as a valid integer header value', () => {
    const entry = buildWayfinderSelfMcpEntry({
      serverPort: 9100,
      conversationId: 'conv-1',
      providerId: 'claude-code',
      defaultWindoaId: 0,
    })
    if (entry.type !== 'http') throw new Error('expected http entry')
    expect(
      entry.headers.find((h) => h.name === 'X-Wayfinder-Default-Windoa-Id')
        ?.value,
    ).toBe('0')
  })
})
