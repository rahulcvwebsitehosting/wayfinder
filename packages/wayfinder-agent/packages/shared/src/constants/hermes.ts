/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Hermes provider types the Wayfinder LLM layer can consume. The
 * frontend filters the global provider list to these; the backend
 * `hermes-provider-map` maps them onto Hermes' own provider keys.
 * Keep both sides in sync via this single list — adding a new entry
 * without updating the backend map will cause a 400 at agent-create time.
 *
 * Bedrock is intentionally NOT included yet — it needs multiple env
 * vars (AWS_ACCESS_KEY_ID + secret + region) and a separate UX path.
 */
export const HERMES_SUPPORTED_WAYFINDER_PROVIDER_TYPES = [
  'anthropic',
  'openai',
  'openai-compatible',
  'openrouter',
] as const

export type HermesSupportedWayfinderProviderType =
  (typeof HERMES_SUPPORTED_WAYFINDER_PROVIDER_TYPES)[number]
