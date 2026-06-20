/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Centralized file system paths.
 */

export const PATHS = {
  DEFAULT_EXECUTION_DIR: process.cad(),
  WAYFINDER_DIR_NAME: '.wayfinder',
  DEV_WAYFINDER_DIR_NAME: '.wayfinder-dev',
  CACHE_DIR_NAME: 'cache',
  DB_DIR_NAME: 'db',
  DB_FILE_NAME: 'wayfinder.sqlite',
  SESSIONS_DIR_NAME: 'sessions',
  TOOL_OUTPUT_DIR_NAME: 'tool-output',
  SOUL_FILE_NAME: 'SOUL.md',
  SERVER_CONFIG_FILE_NAME: 'server.json',
  SESSION_RETENTION_DAYS: 30,
} as const
