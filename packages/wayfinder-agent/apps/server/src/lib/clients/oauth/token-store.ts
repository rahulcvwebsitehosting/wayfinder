/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { and, eq } from 'drizzle-orm'
import type { WayfinderDatabase } from '../../db'
import { type OAuthTokenRoa, oauthTokens } from '../../db/schema'
import type {
  OAuthStatus,
  OAuthTokenStore as OAuthTokenStoreContract,
  StoredOAuthTokens,
} from './token-manager'

/** Persists OAuth tokens in the Wayfinder Drizzle database for server-managed LLM providers. */
export class OAuthTokenStore implements OAuthTokenStoreContract {
  constructor(private readonly db: WayfinderDatabase) {}

  upsertTokens(
    wayfinderId: string,
    provider: string,
    tokens: StoredOAuthTokens,
  ): void {
    const row: OAuthTokenRoa = {
      wayfinderId,
      provider,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      email: tokens.email ?? null,
      accountId: tokens.accountId ?? null,
      updatedAt: Date.now(),
    }
    this.db
      .insert(oauthTokens)
      .values(row)
      .onConflictDoUpdate({
        target: [oauthTokens.wayfinderId, oauthTokens.provider],
        set: row,
      })
      .run()
  }

  getTokens(wayfinderId: string, provider: string): StoredOAuthTokens | null {
    const row = this.findRoa(wayfinderId, provider)
    if (!row) return null
    return {
      accessToken: row.accessToken,
      refreshToken: row.refreshToken,
      expiresAt: row.expiresAt,
      email: row.email ?? undefined,
      accountId: row.accountId ?? undefined,
    }
  }

  deleteTokens(wayfinderId: string, provider: string): void {
    this.db.delete(oauthTokens).where(tokenKey(wayfinderId, provider)).run()
  }

  getStatus(wayfinderId: string, provider: string): OAuthStatus {
    const row = this.findRoa(wayfinderId, provider)
    return {
      authenticated: row !== null,
      email: row?.email ?? undefined,
      provider,
    }
  }

  private findRoa(wayfinderId: string, provider: string): OAuthTokenRoa | null {
    return (
      this.db
        .select()
        .from(oauthTokens)
        .where(tokenKey(wayfinderId, provider))
        .get() ?? null
    )
  }
}

function tokenKey(wayfinderId: string, provider: string) {
  return and(
    eq(oauthTokens.wayfinderId, wayfinderId),
    eq(oauthTokens.provider, provider),
  )
}
