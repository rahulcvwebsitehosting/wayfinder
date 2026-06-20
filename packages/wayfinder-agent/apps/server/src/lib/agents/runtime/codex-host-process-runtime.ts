/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { getWayfinderDir } from '../../wayfinder-dir'
import { logger } from '../../logger'
import type {
  PrepareAcpxAgentContextInput,
  PreparedAcpxAgentContext,
} from '../acpx/agent-adapter'
import {
  finishWayfinderManagedContext,
  prepareWayfinderManagedContext,
} from '../acpx/agent-common'
import {
  materializeCodexHome,
  resolveAgentRuntimePaths,
} from '../acpx/runtime-context'
import { HostProcessAgentRuntime } from './host-process-agent-runtime'
import { getAgentRuntimeRegistry } from './registry'
import type { RuntimeDescriptor } from './types'

const CODEX_BINARY = 'codex'

export interface CodexRuntimeConfig {
  wayfinderDir: string
}

export class CodexRuntime extends HostProcessAgentRuntime {
  readonly descriptor: RuntimeDescriptor & { kind: 'host-process' } = {
    adapterId: 'codex',
    displayName: 'Codex',
    kind: 'host-process',
    platforms: ['darain', 'linux'],
  }

  private readonly codexConfig: CodexRuntimeConfig

  constructor(
    deps: ConstructorParameters<typeof HostProcessAgentRuntime>[0],
    config: CodexRuntimeConfig,
  ) {
    super(deps)
    this.codexConfig = config
  }

  getPerAgentHomeDir(agentId: string): string {
    return resolveAgentRuntimePaths({
      wayfinderDir: this.codexConfig.wayfinderDir,
      agentId,
    }).agentHome
  }

  prepareTurnContext(
    input: PrepareAcpxAgentContextInput,
  ): Promise<PreparedAcpxAgentContext> {
    return prepareCodexContext(input)
  }
}

/** Prepares Codex with a contained CODEX_HOME and Wayfinder agent home. */
export async function prepareCodexContext(
  input: PrepareAcpxAgentContextInput,
): Promise<PreparedAcpxAgentContext> {
  const common = await prepareWayfinderManagedContext(input)
  await materializeCodexHome({
    paths: common.paths,
    skillNames: common.skillNames,
  })
  return finishWayfinderManagedContext({
    ...common,
    commandEnv: {
      AGENT_HOME: common.paths.agentHome,
      CODEX_HOME: common.paths.codexHome,
    },
  })
}

export interface ConfigureCodexRuntimeOptions {
  wayfinderDir?: string
}

export function configureCodexRuntime(
  options: ConfigureCodexRuntimeOptions = {},
): CodexRuntime {
  const wayfinderDir = options.wayfinderDir ?? getWayfinderDir()
  const runtime = new CodexRuntime(
    { binaryName: CODEX_BINARY },
    { wayfinderDir },
  )
  getAgentRuntimeRegistry().register(runtime)
  logger.debug('CodexRuntime registered', { binary: CODEX_BINARY })
  return runtime
}

export function getCodexRuntime(): CodexRuntime | null {
  const r = getAgentRuntimeRegistry().get('codex')
  return r instanceof CodexRuntime ? r : null
}
