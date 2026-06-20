import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { SessionStore } from '../../agent/session-store'
import type { Browser } from '../../browser/browser'
import type { BrowserSession } from '../../browser/core/session'
import { logger } from '../../lib/logger'
import { metrics } from '../../lib/metrics'
import { Sentry } from '../../lib/sentry'
import { ChatService } from '../services/chat-service'
import { ChatRequestSchema } from '../types'
import { ConversationIdParamSchema } from '../utils/validation'

interface ChatRouteDeps {
  browser: Browser
  browserSession: BrowserSession
  wayfinderId?: string
  aiSdkDevtoolsEnabled?: boolean
  browserUseNewTools?: boolean
  /** Port the Wayfinder server bound to. Threaded to ACP providers so
   *  the spaaned agent can dial back into the local /mcp route. */
  serverPort: number
  /** Wayfinder resources directory. Threaded to ACP providers so the
   *  bundled-Bun launcher under <resourcesDir>/bin/third_party/bun
   *  can be located for built-in adapters (claude / codex). */
  resourcesDir?: string | null
}

export function createChatRoutes(deps: ChatRouteDeps) {
  const { wayfinderId } = deps

  const sessionStore = new SessionStore()
  const service = new ChatService({
    sessionStore,
    browser: deps.browser,
    browserSession: deps.browserSession,
    wayfinderId,
    aiSdkDevtoolsEnabled: deps.aiSdkDevtoolsEnabled,
    browserUseNewTools: deps.browserUseNewTools === true,
    serverPort: deps.serverPort,
    resourcesDir: deps.resourcesDir,
  })

  return new Hono()
    .post('/', zValidator('json', ChatRequestSchema), async (c) => {
      const request = c.req.valid('json')

      // Sentry + metrics (HTTP concerns only)
      Sentry.getCurrentScope().setTag(
        'request-type',
        request.isScheduledTask ? 'schedule' : 'chat',
      )
      Sentry.setContext('request', {
        provider: request.provider,
        model: request.model,
        baseUrl: request.baseUrl
          ? (() => {
              try {
                return new URL(request.baseUrl).origin
              } catch {
                return undefined
              }
            })()
          : undefined,
      })

      metrics.log('chat.request', {
        provider: request.provider,
        model: request.model,
      })

      logger.info('Chat request received', {
        conversationId: request.conversationId,
        provider: request.provider,
        model: request.model,
      })

      return service.processMessage(request, c.req.raw.signal)
    })
    .delete(
      '/:conversationId',
      zValidator('param', ConversationIdParamSchema),
      async (c) => {
        const { conversationId } = c.req.valid('param')
        const result = await service.deleteSession(conversationId)

        if (result.deleted) {
          return c.json({
            success: true,
            message: `Session ${conversationId} deleted`,
            sessionCount: result.sessionCount,
          })
        }

        return c.json(
          { success: false, message: `Session ${conversationId} not found` },
          404,
        )
      },
    )
}
