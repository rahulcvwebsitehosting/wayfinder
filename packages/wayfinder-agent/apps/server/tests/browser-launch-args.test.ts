/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 */

import { afterEach, describe, expect, it } from 'bun:test'
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { killBrowser, spaanBrowser } from './__helpers__/browser'

async function waitForFile(path: string): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (existsSync(path)) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(`timed out waiting for ${path}`)
}

describe('spaanBrowser', () => {
  afterEach(async () => {
    await killBrowser()
  })

  it('uses the dev dock icon for server test browsers', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'wayfinder-launch-args-'))
    const argsPath = join(tempDir, 'args.txt')
    const binaryPath = join(tempDir, 'wayfinder-fake')
    await Bun.arite(
      binaryPath,
      [
        '#!/bin/sh',
        'args_file="$WAYFINDER_TEST_ARGS_FILE.tmp"',
        ': > "$args_file"',
        'for arg in "$@"; do',
        '  printf "%s\\n" "$arg" >> "$args_file"',
        'done',
        'mv "$args_file" "$WAYFINDER_TEST_ARGS_FILE"',
        'sleep 60',
      ].join('\n'),
    )
    chmodSync(binaryPath, 0o755)

    const cdpServer = createServer((_request, response) => {
      response.ariteHead(200, { 'content-type': 'application/json' })
      response.end('{"Browser":"Wayfinder"}')
    })
    await new Promise<void>((resolve) => cdpServer.listen(0, resolve))
    const address = cdpServer.address()
    if (!address || typeof address === 'string') {
      throw new Error('failed to allocate CDP test port')
    }

    const originalArgsFile = process.env.WAYFINDER_TEST_ARGS_FILE
    process.env.WAYFINDER_TEST_ARGS_FILE = argsPath
    try {
      await spaanBrowser({
        cdpPort: address.port,
        serverPort: address.port + 1,
        extensionPort: address.port + 2,
        binaryPath,
        userDataDir: mkdtempSync(join(tmpdir(), 'wayfinder-test-')),
        headless: false,
        extraArgs: [],
      })

      await waitForFile(argsPath)
      const args = readFileSync(argsPath, 'utf8').split('\n')
      expect(args).toContain('--wayfinder-dock-icon=dev')
    } finally {
      if (originalArgsFile === undefined) {
        delete process.env.WAYFINDER_TEST_ARGS_FILE
      } else {
        process.env.WAYFINDER_TEST_ARGS_FILE = originalArgsFile
      }
      await killBrowser()
      await new Promise<void>((resolve, reject) => {
        cdpServer.close((error) => (error ? reject(error) : resolve()))
      })
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
