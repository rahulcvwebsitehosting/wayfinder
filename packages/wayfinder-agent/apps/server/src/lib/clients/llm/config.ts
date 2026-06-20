/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * LLM config resolution.
 */

import { LLM_PROVIDERS, type LLMConfig } from '@wayfinder/shared/schemas/llm'
import { getOAuthTokenManager } from '../oauth'
import type { ResolvedLLMConfig } from './types'

export async function resolveLLMConfig(
  config: LLMConfig,
  wayfinderId?: string,
): Promise<ResolvedLLMConfig> {
  // OAuth providers: resolve token from server-side storage
  if (config.provider === LLM_PROVIDERS.CHATGPT_PRO) {
    return resolveOAuthConfig(config, wayfinderId, {
      providerId: 'chatgpt-pro',
      displayName: 'ChatGPT Plus/Pro',
      defaultModel: 'gpt-5.5',
      useRefresh: true,
      extraFields: (tokens) => ({
        upstreamProvider: 'openai',
        accountId: tokens.accountId,
      }),
    })
  }
  if (config.provider === LLM_PROVIDERS.GITHUB_COPILOT) {
    return resolveOAuthConfig(config, wayfinderId, {
      providerId: 'github-copilot',
      displayName: 'GitHub Copilot',
      defaultModel: 'gpt-5-mini',
      useRefresh: false,
    })
  }
  if (config.provider === LLM_PROVIDERS.QWEN_CODE) {
    return resolveOAuthConfig(config, wayfinderId, {
      providerId: 'qwen-code',
      displayName: 'Qwen Code',
      defaultModel: 'coder-model',
      useRefresh: true,
    })
  }

  // All other providers: passthrough with model validation
  if (!config.model) {
    throw new Error(`model is required for ${config.provider} provider`)
  }
  return config as ResolvedLLMConfig
}

interface OAuthResolveOptions {
  providerId: string
  displayName: string
  defaultModel: string
  useRefresh: boolean
  extraFields?: (tokens: { accountId?: string }) => Record<string, unknown>
}

async function resolveOAuthConfig(
  config: LLMConfig,
  wayfinderId: string | undefined,
  opts: OAuthResolveOptions,
): Promise<ResolvedLLMConfig> {
  const tokenManager = getOAuthTokenManager()
  if (!tokenManager || !wayfinderId) {
    throw new Error(
      `Not authenticated with ${opts.displayName}. Please login first.`,
    )
  }

  const tokens = opts.useRefresh
    ? await tokenManager.refreshIfExpired(opts.providerId)
    : tokenManager.getTokens(opts.providerId)

  if (!tokens) {
    throw new Error(
      `Not authenticated with ${opts.displayName}. Please login first.`,
    )
  }

  return {
    ...config,
    model: config.model || opts.defaultModel,
    apiKey: tokens.accessToken,
    ...opts.extraFields?.(tokens),
  }
}


