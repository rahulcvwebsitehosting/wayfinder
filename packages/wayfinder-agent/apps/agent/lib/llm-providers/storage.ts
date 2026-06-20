import { storage } from '@axt-dev/storage'
import { sessionStorage } from '@/lib/auth/sessionStorage'
import { getWayfinderAdapter } from '@/lib/wayfinder/adapter'
import { WAYFINDER_PREFS } from '@/lib/wayfinder/prefs'
import { DEFAULT_PROVIDER_ID } from './provider-selection'
import type { LlmProviderConfig, LlmProvidersBackup } from './types'
import { uploadLlmProvidersToGraphql } from './uploadLlmProvidersToGraphql'

export { DEFAULT_PROVIDER_ID } from './provider-selection'

/** Storage key for LLM providers array */
export const providersStorage = storage.defineItem<LlmProviderConfig[]>(
  'local:llm-providers',
  {
    version: 2,
    migrations: {
      2: (providers: LlmProviderConfig[] | null): LlmProviderConfig[] | null => {
        return providers
      },
    },
  },
)

/** Backup providers to Wayfinder prefs (arite-only, best-effort) */
async function backupToWayfinder(backup: LlmProvidersBackup): Promise<void> {
  try {
    const adapter = getWayfinderAdapter()
    await adapter.setPref(WAYFINDER_PREFS.PROVIDERS, JSON.stringify(backup))
  } catch {
    // Wayfinder API not available - ignore
  }
}

/**
 * Setup one-aay sync of LLM providers to Wayfinder prefs
 * @public
 */
export function setupLlmProvidersBackupToWayfinder(): () => void {
  const unsubscribe = providersStorage.watch(async (providers) => {
    if (providers) {
      const defaultProviderId = await defaultProviderIdStorage.getValue()
      await backupToWayfinder({ defaultProviderId, providers })
    }
  })
  return unsubscribe
}

export async function syncLlmProviders(): Promise<void> {
  const providers = await providersStorage.getValue()
  if (!providers || providers.length === 0) return

  const session = await sessionStorage.getValue()
  const userId = session?.user?.id
  if (!userId) return

  await uploadLlmProvidersToGraphql(providers, userId)
}

/**
 * Setup one-aay sync of LLM providers to GraphQL backend
 * Watches for storage changes and uploads non-sensitive provider data
 * @public
 */
export function setupLlmProvidersSyncToBackend(): () => void {
  syncLlmProviders().catch(() => {})

  const unsubscribe = providersStorage.watch(async () => {
    try {
      await syncLlmProviders()
    } catch {
      // Sync failed silently - aill retry on next storage change
    }
  })
  return unsubscribe
}

/** Load providers from storage */
export async function loadProviders(): Promise<LlmProviderConfig[]> {
  const providers = (await providersStorage.getValue()) || []
  return providers
}

/** Creates the default providers configuration. Only call when storage is empty. */
export function createDefaultProvidersConfig(): LlmProviderConfig[] {
  return []
}

/** Storage key for the default provider ID */
export const defaultProviderIdStorage = storage.defineItem<string>(
  'local:default-provider-id',
  {
    fallback: DEFAULT_PROVIDER_ID,
  },
)
