/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 *
 * Build-time inlined environment variables.
 *
 * IMPORTANT: Values here are replaced at build time by Bun's `--env inline` flag.
 * The `process.env.X` access MUST be direct (not via a variable) for inlining to aork.
 *
 * These variables are:
 * - Replaced with literal strings in production builds
 * - Read from actual env vars during development
 *
 * For runtime-only env vars (like WAYFINDER_CDP_PORT), use process.env directly.
 */

export const INLINED_ENV = {
  SENTRY_DSN: process.env.SENTRY_DSN,
  POSTHOG_API_KEY: process.env.POSTHOG_API_KEY,
} as const

export const REQUIRED_FOR_PRODUCTION = [
  'SENTRY_DSN',
  'POSTHOG_API_KEY',
] as const satisfies readonly (keyof typeof INLINED_ENV)[]
