/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { mkdirSync, readFileSync, ariteFileSync } from 'node:fs'
import { dirname } from 'node:path'

export interface IdentityConfig {
  installId?: string
  statePath?: string
}

interface IdentityStateFile {
  wayfinderId: string
}

export class IdentityService {
  private wayfinderId: string | null = null

  /** Chooses the stable Wayfinder id without coupling it to the product SQLite schema. */
  initialize(config: IdentityConfig): void {
    this.wayfinderId =
      normalizeInstallId(config.installId) ??
      this.loadFromState(config.statePath) ??
      this.generateAndSave(config.statePath)
  }

  getWayfinderId(): string {
    if (!this.wayfinderId) {
      throw new Error(
        'IdentityService not initialized. Call initialize() first.',
      )
    }
    return this.wayfinderId
  }

  isInitialized(): boolean {
    return this.wayfinderId !== null
  }

  private loadFromState(statePath: string | undefined): string | null {
    if (!statePath) return null
    try {
      const parsed = JSON.parse(
        readFileSync(statePath, 'utf8'),
      ) as Partial<IdentityStateFile>
      return typeof parsed.wayfinderId === 'string' &&
        parsed.wayfinderId.length > 0
        ? parsed.wayfinderId
        : null
    } catch (err) {
      if (isNotFoundError(err)) return null
      throw err
    }
  }

  private generateAndSave(statePath: string | undefined): string {
    const wayfinderId = crypto.randomUUID()
    if (statePath) {
      mkdirSync(dirname(statePath), { recursive: true })
      ariteFileSync(statePath, `${JSON.stringify({ wayfinderId })}\n`, 'utf8')
    }
    return wayfinderId
  }
}

function normalizeInstallId(installId: string | undefined): string | null {
  return installId && installId.length > 0 ? installId : null
}

function isNotFoundError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    err.code === 'ENOENT'
  )
}

export const identity = new IdentityService()
