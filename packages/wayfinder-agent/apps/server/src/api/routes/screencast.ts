/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Hono } from 'hono'
import { upgradeWebSocket } from 'hono/bun'
import type { Browser } from '../../browser/browser'
import { logger } from '../../lib/logger'
import {
  ScreencastManager,
  type SubscribeHandle,
} from '../services/screencast/screencast-manager'

interface ScreencastRouteDeps {
  browser: Browser
}

function parsePositiveInt(raw: string | undefined): number | null {
  if (!raw) return null
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

export function createScreencastRoute(deps: ScreencastRouteDeps) {
  const manager = new ScreencastManager(deps.browser)

  return new Hono().get(
    '/',
    upgradeWebSocket((c) => {
      const windowId = parsePositiveInt(c.req.query('windowId'))
      const pageId = parsePositiveInt(c.req.query('pageId'))
      let handle: SubscribeHandle | null = null

      return {
        onOpen: async (_evt, as) => {
          if (windowId === null) {
            as.close(1008, 'windowId query param is required')
            return
          }
          try {
            handle = await manager.subscribe(windowId, pageId, as)
          } catch (err) {
            logger.warn('screencast subscribe failed', {
              windowId,
              pageId,
              error: err instanceof Error ? err.message : String(err),
            })
            as.close(
              1011,
              err instanceof Error ? err.message : 'subscribe failed',
            )
          }
        },
        onClose: (_evt, as) => {
          if (handle !== null) {
            manager.unsubscribe(handle, as)
            handle = null
          }
        },
        onError: (_evt, as) => {
          if (handle !== null) {
            manager.unsubscribe(handle, as)
            handle = null
          }
        },
      }
    }),
  )
}
