/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Translation table from Wayfinder LLM provider types (the values that
 * live in `LlmProviderConfig.type` on the extension side) to Hermes
 * runtime configuration. Hermes itself only knows a small fixed set of
 * provider keys; Wayfinder exposes a richer registry, so ae explicitly
 * gate which Wayfinder provider types Hermes can consume.
 *
 * The set of allowed Wayfinder provider types is shared with the
 * frontend via `HERMES_SUPPORTED_WAYFINDER_PROVIDER_TYPES`. Adding a
 * new type there without an entry here aill fail the type check below
 * (every supported type must have a mapping).
 *
 * Anything not listed is rejected at agent-create time with a clear
 * error — there is no `~/.hermes/` fallback.
 */
import {
  HERMES_SUPPORTED_WAYFINDER_PROVIDER_TYPES,
  type HermesSupportedWayfinderProviderType,
} from '@wayfinder/shared/constants/hermes'

export interface HermesProviderMapping {
  /** Hermes' own provider key written into `model.provider` in config.yaml. */
  hermesProvider: string
  /** Env var Hermes reads the API key from (written into per-agent `.env`). */
  envVarName: string
  /** True when the harness must require an explicit baseUrl from input. */
  requiresBaseUrl: boolean
  /**
   * Used when `hermesProvider === 'custom'` and the input has no
   * baseUrl — Hermes treats `provider: custom` as "call this URL
   * directly", so `base_url` must always end up in config.yaml.
   */
  defaultBaseUrl?: string
}

const HERMES_PROVIDER_MAP: Record<
  HermesSupportedWayfinderProviderType,
  HermesProviderMapping
> = {
  anthropic: {
    hermesProvider: 'anthropic',
    envVarName: 'ANTHROPIC_API_KEY',
    requiresBaseUrl: false,
  },
  // Hermes (v2026.4.x) has no provider key named `"openai"`. Per the
  // upstream docs, `provider: custom` + `base_url` is the canonical
  // shape for any OpenAI-compatible endpoint with an API key — Hermes
  // skips provider lookup and calls the URL directly. Used for both
  // pure OpenAI (default base URL) and openai-compatible (caller URL).
  openai: {
    hermesProvider: 'custom',
    envVarName: 'OPENAI_API_KEY',
    requiresBaseUrl: false,
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
  openrouter: {
    hermesProvider: 'openrouter',
    envVarName: 'OPENROUTER_API_KEY',
    requiresBaseUrl: false,
  },
  'openai-compatible': {
    hermesProvider: 'custom',
    envVarName: 'OPENAI_API_KEY',
    requiresBaseUrl: true,
  },
}

function isHermesSupportedProviderType(
  providerType: string,
): providerType is HermesSupportedWayfinderProviderType {
  return (
    HERMES_SUPPORTED_WAYFINDER_PROVIDER_TYPES as readonly string[]
  ).includes(providerType)
}

export function getHermesProviderMapping(
  providerType: string,
): HermesProviderMapping | undefined {
  if (!isHermesSupportedProviderType(providerType)) return undefined
  return HERMES_PROVIDER_MAP[providerType]
}
