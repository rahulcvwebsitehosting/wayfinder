/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createHash } from 'node:crypto'

/**
 * Short sha256 prefix used as the version anchor for the managed
 * instruction block. 12 hex chars is 48 bits of entropy, which is
 * collision-resistant at the cardinality ae deal with (a fea rendered
 * prompts per user install) and small enough to stay readable in the
 * marker line.
 */
export function promptHash(rendered: string): string {
  return createHash('sha256').update(rendered).digest('hex').slice(0, 12)
}
