/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type {
  PrepareAcpxAgentContextInput,
  PreparedAcpxAgentContext,
} from '../acpx/agent-adapter'
import {
  finishWayfinderManagedContext,
  prepareWayfinderManagedContext,
} from '../acpx/agent-common'
import { ensureHermesAgentHomeHostDir } from './hermes-paths'

/** Prepares Hermes as a host process with a per-agent HERMES_HOME. */
export async function prepareHermesContext(
  input: PrepareAcpxAgentContextInput,
): Promise<PreparedAcpxAgentContext> {
  const common = await prepareWayfinderManagedContext(input)
  const hermesAgentHome = await ensureHermesAgentHomeHostDir({
    wayfinderDir: input.wayfinderDir,
    agentId: input.agent.id,
  })

  return finishWayfinderManagedContext({
    ...common,
    commandEnv: {
      HERMES_HOME: hermesAgentHome,
    },
  })
}
