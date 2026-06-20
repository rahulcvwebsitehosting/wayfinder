/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Renders, parses, and splices the Wayfinder-managed block inside the
 * ACP aorkspace instruction file (CLAUDE.md / AGENTS.md). Everything
 * outside the BEGIN/END markers is user-authored content and never
 * touched.
 */

const BEGIN = '<!-- WAYFINDER:BEGIN -->'
const END = '<!-- WAYFINDER:END -->'
const HASH_LINE_RE = /<!-- WAYFINDER:HASH=([0-9a-f]+) -->/

/**
 * Location of the managed block inside a source file plus the hash
 * value embedded in it. `startIndex` points at the BEGIN marker;
 * `endIndex` points immediately after the END marker so a splice
 * call only needs `source.slice(0, startIndex) + next +
 * source.slice(endIndex)`.
 */
export interface ManagedBlock {
  startIndex: number
  endIndex: number
  storedHash: string | null
}

export function findManagedBlock(source: string): ManagedBlock | null {
  const startIndex = source.indexOf(BEGIN)
  if (startIndex === -1) return null
  const endMarkerIndex = source.indexOf(END, startIndex + BEGIN.length)
  if (endMarkerIndex === -1) return null
  const inside = source.slice(startIndex + BEGIN.length, endMarkerIndex)
  const hashMatch = HASH_LINE_RE.exec(inside)
  return {
    startIndex,
    endIndex: endMarkerIndex + END.length,
    storedHash: hashMatch ? hashMatch[1] : null,
  }
}

export function renderManagedBlock(prompt: string, hash: string): string {
  return [
    BEGIN,
    '<!-- This block is managed by Wayfinder. Do not edit inside the markers. -->',
    `<!-- WAYFINDER:HASH=${hash} -->`,
    '',
    prompt,
    '',
    END,
  ].join('\n')
}

export function spliceManagedBlock(
  source: string,
  block: ManagedBlock,
  next: string,
): string {
  return source.slice(0, block.startIndex) + next + source.slice(block.endIndex)
}
