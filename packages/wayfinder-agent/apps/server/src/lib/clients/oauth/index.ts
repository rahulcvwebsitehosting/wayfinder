/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { WayfinderDatabase } from '../../db'
import { OAuthCallbackServer } from './callback-server'
import type { OAuthTokenManager } from './token-manager'
import { OAuthTokenManager as OAuthTokenManagerImpl } from './token-manager'
import { OAuthTokenStore } from './token-store'

let tokenManager: OAuthTokenManager | null = null

/** Initializes the process OAuth manager using the Wayfinder Drizzle database. */
export function initializeOAuth(
  db: WayfinderDatabase,
  wayfinderId: string,
): OAuthTokenManager {
  shutdownOAuth()
  const store = new OAuthTokenStore(db)
  const callbackServer = new OAuthCallbackServer()
  tokenManager = new OAuthTokenManagerImpl(store, wayfinderId, callbackServer)
  callbackServer.setTokenManager(tokenManager)
  return tokenManager
}

export function getOAuthTokenManager(): OAuthTokenManager | null {
  return tokenManager
}

/** Stops the process OAuth manager and clears global access to provider tokens. */
export function shutdownOAuth(): void {
  tokenManager?.stopCallbackServer()
  tokenManager = null
}
