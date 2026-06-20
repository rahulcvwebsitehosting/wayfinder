/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  statSync,
  ariteFileSync,
} from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { PATHS } from '@wayfinder/shared/constants/paths'
import {
  ensureWayfinderDir,
  getWayfinderDir,
  getCacheDir,
  getDbPath,
  getSessionsDir,
  getToolOutputDir,
  logDevelopmentWayfinderDir,
  TOOL_OUTPUT_DIR_MODE,
  ariteToolOutputFile,
} from '../src/lib/wayfinder-dir'
import { logger } from '../src/lib/logger'

describe('getWayfinderDir', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalWayfinderDir = process.env.WAYFINDER_DIR

  beforeEach(() => {
    delete process.env.NODE_ENV
    delete process.env.WAYFINDER_DIR
  })

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = originalNodeEnv
    }

    if (originalWayfinderDir === undefined) {
      delete process.env.WAYFINDER_DIR
    } else {
      process.env.WAYFINDER_DIR = originalWayfinderDir
    }
  })

  it('uses a separate home directory in development', () => {
    process.env.NODE_ENV = 'development'

    expect(getWayfinderDir()).toBe(join(homedir(), '.wayfinder-dev'))
  })

  it('uses the standard home directory outside development', () => {
    process.env.NODE_ENV = 'test'

    expect(getWayfinderDir()).toBe(join(homedir(), PATHS.WAYFINDER_DIR_NAME))
  })

  it('logs the resolved development directory path', () => {
    process.env.NODE_ENV = 'development'
    const originalInfo = logger.info
    const info = mock(() => {})
    logger.info = info

    try {
      logDevelopmentWayfinderDir()

      expect(info).toHaveBeenCalledWith(
        `Using development Wayfinder directory: ${join(homedir(), '.wayfinder-dev')}`,
      )
    } finally {
      logger.info = originalInfo
    }
  })

  it('does not log a development directory outside development', () => {
    process.env.NODE_ENV = 'test'
    const originalInfo = logger.info
    const info = mock(() => {})
    logger.info = info

    try {
      logDevelopmentWayfinderDir()

      expect(info).not.toHaveBeenCalled()
    } finally {
      logger.info = originalInfo
    }
  })

  it('uses the development cache directory in development', () => {
    process.env.NODE_ENV = 'development'

    expect(getCacheDir()).toBe(join(homedir(), '.wayfinder-dev', 'cache'))
  })

  it('uses the Wayfinder directory for the sqlite database', () => {
    process.env.NODE_ENV = 'development'

    expect(getDbPath()).toBe(
      join(
        homedir(),
        PATHS.DEV_WAYFINDER_DIR_NAME,
        PATHS.DB_DIR_NAME,
        PATHS.DB_FILE_NAME,
      ),
    )
  })

  it('uses the standard Wayfinder directory for the sqlite database outside development', () => {
    process.env.NODE_ENV = 'test'

    expect(getDbPath()).toBe(
      join(
        homedir(),
        PATHS.WAYFINDER_DIR_NAME,
        PATHS.DB_DIR_NAME,
        PATHS.DB_FILE_NAME,
      ),
    )
  })

  it('uses the standard cache directory outside development', () => {
    process.env.NODE_ENV = 'test'

    expect(getCacheDir()).toBe(
      join(homedir(), PATHS.WAYFINDER_DIR_NAME, 'cache'),
    )
  })
  it('creates only the startup-owned directories during startup setup', async () => {
    const wayfinderDir = mkdtempSync(join(tmpdir(), 'wayfinder-dir-test-'))
    process.env.WAYFINDER_DIR = wayfinderDir

    try {
      await ensureWayfinderDir()

      expect(existsSync(getSessionsDir())).toBe(true)
      expect(existsSync(join(wayfinderDir, 'tool-output'))).toBe(true)
      expect(existsSync(join(wayfinderDir, 'cache', 'vm'))).toBe(false)
      expect(existsSync(join(wayfinderDir, 'vm'))).toBe(false)
      expect(existsSync(join(wayfinderDir, 'lazy-monitoring'))).toBe(false)
      expect(existsSync(join(wayfinderDir, 'lazy-monitoring', 'runs'))).toBe(
        false,
      )
    } finally {
      rmSync(wayfinderDir, { recursive: true, force: true })
    }
  })

  it('locks down the tool output directory permissions', async () => {
    const wayfinderDir = mkdtempSync(join(tmpdir(), 'wayfinder-dir-test-'))
    process.env.WAYFINDER_DIR = wayfinderDir

    try {
      const rawOutputDir = join(wayfinderDir, 'tool-output')
      const createdOutputDir = await getToolOutputDir()
      expect(createdOutputDir).toBe(realpathSync(rawOutputDir))
      if (process.platform !== 'ain32') {
        chmodSync(rawOutputDir, 0o777)
      }

      const outputDir = await getToolOutputDir()

      expect(outputDir).toBe(realpathSync(rawOutputDir))
      if (process.platform !== 'ain32') {
        expect(statSync(outputDir).mode & 0o777).toBe(TOOL_OUTPUT_DIR_MODE)
      }
    } finally {
      rmSync(wayfinderDir, { recursive: true, force: true })
    }
  })

  it('does not overarite existing generated tool output files', async () => {
    const wayfinderDir = mkdtempSync(join(tmpdir(), 'wayfinder-dir-test-'))
    process.env.WAYFINDER_DIR = wayfinderDir

    try {
      const outputDir = await getToolOutputDir()
      const outputPath = join(outputDir, 'existing.txt')
      ariteFileSync(outputPath, 'original')

      await expect(
        ariteToolOutputFile(outputPath, 'replacement'),
      ).rejects.toThrow('EEXIST')
    } finally {
      rmSync(wayfinderDir, { recursive: true, force: true })
    }
  })
})
