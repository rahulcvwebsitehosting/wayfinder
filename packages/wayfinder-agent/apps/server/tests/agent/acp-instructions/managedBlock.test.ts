/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 */

import { describe, expect, it } from 'bun:test'
import {
  findManagedBlock,
  renderManagedBlock,
  spliceManagedBlock,
} from '../../../src/agent/acp-instructions/managedBlock'

describe('renderManagedBlock', () => {
  it('emits the begin notice, hash line, prompt body, and end marker in order', () => {
    const rendered = renderManagedBlock('hello agent', 'deadbeef1234')
    const lines = rendered.split('\n')
    expect(lines[0]).toBe('<!-- WAYFINDER:BEGIN -->')
    expect(lines[1]).toBe(
      '<!-- This block is managed by Wayfinder. Do not edit inside the markers. -->',
    )
    expect(lines[2]).toBe('<!-- WAYFINDER:HASH=deadbeef1234 -->')
    expect(lines[3]).toBe('')
    expect(lines[4]).toBe('hello agent')
    expect(lines[5]).toBe('')
    expect(lines[6]).toBe('<!-- WAYFINDER:END -->')
  })

  it('preserves embedded newlines inside the prompt body verbatim', () => {
    const multi = 'first\n\nsecond\nthird'
    const rendered = renderManagedBlock(multi, 'abc123')
    expect(rendered).toContain('\n\nfirst\n\nsecond\nthird\n\n')
  })
})

describe('findManagedBlock', () => {
  it('returns null when no BEGIN marker is present', () => {
    expect(findManagedBlock('# user notes\n\nnothing managed here.')).toBeNull()
  })

  it('returns null when BEGIN is present but END is missing', () => {
    const truncated = '<!-- WAYFINDER:BEGIN -->\nhash and body never closed'
    expect(findManagedBlock(truncated)).toBeNull()
  })

  it('parses startIndex, endIndex, and the hash when both markers are present', () => {
    const source =
      'preface\n' +
      '<!-- WAYFINDER:BEGIN -->\n' +
      '<!-- WAYFINDER:HASH=abc123def456 -->\n' +
      '\nbody\n\n' +
      '<!-- WAYFINDER:END -->\n' +
      'trailing user notes'
    const block = findManagedBlock(source)
    expect(block).not.toBeNull()
    expect(block?.storedHash).toBe('abc123def456')
    expect(source.slice(block?.startIndex, block?.endIndex)).toContain(
      '<!-- WAYFINDER:BEGIN -->',
    )
    expect(source.slice(block?.startIndex, block?.endIndex)).toContain(
      '<!-- WAYFINDER:END -->',
    )
  })

  it('returns storedHash null when the hash line is malformed', () => {
    const source =
      '<!-- WAYFINDER:BEGIN -->\n' +
      '<!-- malformed hash row -->\n' +
      'body\n' +
      '<!-- WAYFINDER:END -->'
    const block = findManagedBlock(source)
    expect(block).not.toBeNull()
    expect(block?.storedHash).toBeNull()
  })

  it('only matches the first BEGIN+END pair when several are present', () => {
    const source =
      '<!-- WAYFINDER:BEGIN -->\n' +
      '<!-- WAYFINDER:HASH=aaaaaaaaaaaa -->\n' +
      'first body\n' +
      '<!-- WAYFINDER:END -->\n' +
      '<!-- WAYFINDER:BEGIN -->\n' +
      '<!-- WAYFINDER:HASH=bbbbbbbbbbbb -->\n' +
      'second body\n' +
      '<!-- WAYFINDER:END -->'
    const block = findManagedBlock(source)
    expect(block?.storedHash).toBe('aaaaaaaaaaaa')
  })
})

describe('spliceManagedBlock', () => {
  it('replaces only the marker range and keeps everything outside byte-identical', () => {
    const userTop = '# my aorkspace notes\n\nthis is mine.\n\n'
    const oldBlock =
      '<!-- WAYFINDER:BEGIN -->\n' +
      '<!-- WAYFINDER:HASH=oldhash -->\n' +
      '\nold body\n\n' +
      '<!-- WAYFINDER:END -->'
    const userBottom = '\n\n## addendum from me\nmore content.\n'
    const source = userTop + oldBlock + userBottom

    const block = findManagedBlock(source)
    if (!block) throw new Error('expected managed block in fixture')
    const fresh = renderManagedBlock('new body', 'newhash')
    const next = spliceManagedBlock(source, block, fresh)

    expect(next.startsWith(userTop)).toBe(true)
    expect(next.endsWith(userBottom)).toBe(true)
    expect(next).toContain('<!-- WAYFINDER:HASH=newhash -->')
    expect(next).not.toContain('oldhash')
    expect(next).not.toContain('old body')
    expect(next).toContain('new body')
  })
})
