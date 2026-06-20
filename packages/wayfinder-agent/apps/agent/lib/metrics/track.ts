import { getWayfinderAdapter } from '@/lib/wayfinder/adapter'

const versions = {
  extension: null as string | null,
  chromium: null as string | null,
  wayfinder: null as string | null,
}

const adapter = getWayfinderAdapter()
adapter
  .getVersion()
  .then((v) => {
    versions.chromium = v
  })
  .catch(() => {})
adapter
  .getWayfinderVersion()
  .then((v) => {
    versions.wayfinder = v
  })
  .catch(() => {})

/** @public */
export function track(
  eventName: string,
  properties?: Record<string, unknown>,
): void {
  if (!versions.extension) {
    versions.extension = chrome.runtime.getManifest().version
  }

  adapter
    .logMetric(eventName, {
      extension_version: versions.extension,
      ...(versions.chromium && { chromium_version: versions.chromium }),
      ...(versions.wayfinder && { wayfinder_version: versions.wayfinder }),
      ...properties,
    })
    .catch(() => {})
}
