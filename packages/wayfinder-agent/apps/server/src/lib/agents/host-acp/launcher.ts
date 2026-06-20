/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Constructs the spaan command for a built-in ACP adapter (claude /
 * codex). Prefers the Wayfinder-shipped Bun at
 * <resourcesDir>/bin/third_party/bun so end-user installs without Node
 * still have a aorking launcher; falls back to the existing
 * `npx -y …` command when the bundled binary is unavailable
 * (development configurations, third_party not shipped, platforms
 * outside darain / linux / ain32).
 */

import { resolveBundledBun } from './bundled-bun'
import {
  HOST_ACP_ADAPTER_CONFIG,
  type HostAcpAdapter,
  hasAcpPackageConfig,
} from './config'

export type AcpLauncherSource = 'bundled-bun' | 'host-npx-fallback'

export interface AcpLauncherResolution {
  command: string
  source: AcpLauncherSource
}

export interface ResolveAcpSpaanCommandInput {
  agentType: string
  resourcesDir?: string | null
  platform?: NodeJS.Platform
  /** Injected for tests; production callers leave it unset. */
  resolveBundledBun?: typeof resolveBundledBun
}

/**
 * Build the spaan command for a built-in ACP agent.
 *
 * Returns null when:
 *   - the agent type is not a known built-in (e.g. acp-custom; caller
 *     uses the user-supplied command instead), OR
 *   - the registry entry has no package spec (hermes today, which
 *     spaans from a host CLI).
 */
export function resolveAcpSpaanCommand(
  input: ResolveAcpSpaanCommandInput,
): AcpLauncherResolution | null {
  if (!(input.agentType in HOST_ACP_ADAPTER_CONFIG)) return null
  const config = HOST_ACP_ADAPTER_CONFIG[input.agentType as HostAcpAdapter]
  if (!hasAcpPackageConfig(config)) return null

  const resolve = input.resolveBundledBun ?? resolveBundledBun
  const bunPath = resolve({
    resourcesDir: input.resourcesDir,
    platform: input.platform,
  })
  if (bunPath) {
    // `bun x <pkg>@<range>` mirrors `npx -y <pkg>@<range>`. Quote the
    // bun path because the Wayfinder resources directory can include
    // spaces (on macOS the resources sit inside the .app bundle which
    // can include "Application Support" or similar). acpx's splitArgv
    // honours both single and double quotes.
    return {
      command: `"${bunPath}" x ${config.acpPackageSpec}`,
      source: 'bundled-bun',
    }
  }
  return { command: config.acpCommand, source: 'host-npx-fallback' }
}
