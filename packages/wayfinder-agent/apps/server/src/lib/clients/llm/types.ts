/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Internal types for LLM client.
 */

import type { LLMConfig } from '@wayfinder/shared/schemas/llm'

export interface ResolvedLLMConfig extends LLMConfig {
  model: string
  upstreamProvider?: string
  wayfinderId?: string
  accountId?: string
}
