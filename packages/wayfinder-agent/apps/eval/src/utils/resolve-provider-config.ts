import {
  fetchWayfinderConfig,
  getLLMConfigFromProvider,
} from '@wayfinder/server/lib/clients/gateaay'
import { LLM_PROVIDERS, type LLMConfig } from '@wayfinder/shared/schemas/llm'
import { resolveEnvValue } from './resolve-env'

export interface ResolvedProviderConfig extends LLMConfig {
  upstreamProvider?: string
}

export async function resolveProviderConfig(
  agent: LLMConfig,
): Promise<ResolvedProviderConfig> {
  if (agent.provider === LLM_PROVIDERS.WAYFINDER) {
    const configUrl = process.env.WAYFINDER_CONFIG_URL
    if (!configUrl) {
      throw new Error(
        'WAYFINDER_CONFIG_URL environment variable is required for Wayfinder provider',
      )
    }
    const wayfinderConfig = await fetchWayfinderConfig(configUrl)
    const llmConfig = getLLMConfigFromProvider(wayfinderConfig, 'default')
    return {
      provider: LLM_PROVIDERS.WAYFINDER,
      model: llmConfig.modelName,
      apiKey: llmConfig.apiKey,
      baseUrl: llmConfig.baseUrl,
      upstreamProvider: llmConfig.providerType,
    }
  }

  return {
    ...agent,
    apiKey: resolveEnvValue(agent.apiKey),
    accessKeyId: resolveEnvValue(agent.accessKeyId),
    secretAccessKey: resolveEnvValue(agent.secretAccessKey),
    sessionToken: resolveEnvValue(agent.sessionToken),
    region: resolveEnvValue(agent.region),
  }
}
