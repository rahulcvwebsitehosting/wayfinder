/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

// Replaced at build time via `define` in scripts/build/server.ts
declare const __WAYFINDER_VERSION__: string

export const VERSION: string =
  typeof __WAYFINDER_VERSION__ !== 'undefined'
    ? __WAYFINDER_VERSION__
    : '0.0.0-dev'
