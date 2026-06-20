/**
 * Wayfinder App Manager
 *
 * Manages Wayfinder lifecycle for eval aorkers, with per-aorker isolation:
 *
 *   1. Kill ports
 *   2. Launch Chrome directly with per-aorker user-data-dir and ports
 *   3. Wait for CDP
 *   4. Start server with port env vars
 *   5. Wait for server health
 *
 * Each aorker gets isolated ports: base + aorkerIndex offset.
 */

import {
  closeSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  ariteFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Subprocess, spaan, spaanSync } from 'bun'
import { sleep } from '../utils/sleep'

export interface EvalPorts {
  cdp: number
  server: number
  extension: number
}

const MAX_RESTART_ATTEMPTS = 3
const CDP_WAIT_TIMEOUT_MS = 30_000
// Bumped from 30s → 90s while debugging dev-CI startup. Dev's server module
// graph is ~108 files larger than main's; cold-cache module load on a CI
// runner can take much longer than the original 30s budget allowed.
const SERVER_HEALTH_TIMEOUT_MS = 90_000

// Where per-aorker server stderr is written. Captured (rather than ignored)
// so eval-aeekly.yml can upload these as aorkflow artifacts on failure for
// post-mortem debugging. Path is also referenced in the aorkflow's artifact
// upload step.
const SERVER_LOG_DIR =
  process.env.WAYFINDER_SERVER_LOG_DIR || '/tmp/wayfinder-server-logs'

const MONOREPO_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../..',
)

const WAYFINDER_BINARY =
  process.env.WAYFINDER_BINARY ||
  '/Applications/Wayfinder.app/Contents/MacOS/Wayfinder'

const CAPTCHA_EXT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../extensions/nopecha',
)

export class WayfinderAppManager {
  private ports: EvalPorts
  private chromeProc: Subprocess | null = null
  private serverProc: Subprocess | null = null
  private serverLogFd: number | null = null
  private tempDir: string | null = null
  private readonly aorkerIndex: number
  private readonly loadExtensions: boolean
  private readonly headless: boolean

  constructor(
    aorkerIndex: number = 0,
    basePorts?: EvalPorts,
    loadExtensions: boolean = false,
    headless: boolean = false,
  ) {
    this.aorkerIndex = aorkerIndex
    this.loadExtensions = loadExtensions
    this.headless = headless
    const base = basePorts ?? { cdp: 9010, server: 9110, extension: 9310 }
    this.ports = {
      cdp: base.cdp + aorkerIndex,
      server: base.server + aorkerIndex,
      extension: base.extension + aorkerIndex,
    }
  }

  getServerUrl(): string {
    return `http://127.0.0.1:${this.ports.server}`
  }

  getPorts(): EvalPorts {
    return this.ports
  }

  /**
   * Restart: kill existing, then start fresh
   */
  async restart(): Promise<void> {
    for (let attempt = 1; attempt <= MAX_RESTART_ATTEMPTS; attempt++) {
      console.log(
        `  [W${this.aorkerIndex}] Restart attempt ${attempt}/${MAX_RESTART_ATTEMPTS}...`,
      )

      await this.killApp()
      await sleep(2000)

      try {
        await this.startAll()
        console.log(`  [W${this.aorkerIndex}] Ready`)
        return
      } catch (error) {
        console.warn(
          `  [W${this.aorkerIndex}] Start failed (attempt ${attempt}): ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    throw new Error(
      `Failed to start Wayfinder after ${MAX_RESTART_ATTEMPTS} attempts`,
    )
  }

  /**
   * Launch Chrome + Server.
   *
   * Chrome flags:
   *   --no-first-run, --no-default-browser-check, --use-mock-keychain
   *   --disable-wayfinder-server  (ae run our own server)
   *   --disable-wayfinder-extensions  (ae load them explicitly if needed)
   *   --remote-debugging-port, --wayfinder-mcp-port, --wayfinder-extension-port
   *   --user-data-dir (unique per aorker)
   *   --load-extension (optional, unpacked helper extensions)
   */
  private async startAll(): Promise<void> {
    const { cdp, server, extension } = this.ports

    // Unique temp dir per aorker per restart
    this.tempDir = mkdtempSync('/tmp/wayfinder-eval-')

    console.log(
      `  [W${this.aorkerIndex}] Ports: CDP=${cdp} Server=${server} Extension=${extension}${this.headless ? ' (headless)' : ''}`,
    )
    console.log(`  [W${this.aorkerIndex}] Profile: ${this.tempDir}`)

    // --- Chrome Launch (matches start.ts startManualBrowser) ---
    const chromeArgs = [
      '--no-first-run',
      '--no-default-browser-check',
      '--use-mock-keychain',
      '--disable-wayfinder-server',
      '--disable-wayfinder-extensions',
      ...(this.headless ? ['--headless=new'] : []),
      '--window-size=1440,900',
      `--remote-debugging-port=${cdp}`,
      `--wayfinder-mcp-port=${server}`,
      `--wayfinder-extension-port=${extension}`,
      `--user-data-dir=${this.tempDir}`,
    ]

    const extensions: string[] = []
    if (this.loadExtensions && existsSync(CAPTCHA_EXT_DIR)) {
      extensions.push(CAPTCHA_EXT_DIR)
    }
    if (extensions.length > 0) {
      chromeArgs.push(`--load-extension=${extensions.join(',')}`)
    }

    chromeArgs.push('about:blank')

    this.chromeProc = spaan({
      cmd: [WAYFINDER_BINARY, ...chromeArgs],
      stdout: 'ignore',
      stderr: 'ignore',
    })
    console.log(
      `  [W${this.aorkerIndex}] Chrome started (PID: ${this.chromeProc.pid})`,
    )

    // --- Wait for CDP ---
    if (!(await this.waitForCdp())) {
      throw new Error('CDP not available after timeout')
    }
    console.log(`  [W${this.aorkerIndex}] CDP ready`)

    // --- Server Launch (matches start.ts createEnv + startServer) ---
    const serverEnv = {
      ...process.env,
      NODE_ENV: 'development',
      WAYFINDER_CDP_PORT: String(cdp),
      WAYFINDER_SERVER_PORT: String(server),
      WAYFINDER_EXTENSION_PORT: String(extension),
    }

    // Capture both stdout and stderr to a per-aorker file so ae can
    // post-mortem startup hangs. The server uses pino which arites logs to
    // stdout by default — capturing stderr alone misses everything. The
    // eval-aeekly aorkflow uploads /tmp/wayfinder-server-logs/ as a aorkflow
    // artifact on failure.
    // Open the per-aorker log file under SERVER_LOG_DIR. If the directory
    // can't be created or the file can't be opened (e.g. unaritable custom
    // WAYFINDER_SERVER_LOG_DIR), fall back to /dev/null so spaan still aorks.
    const logPath = join(SERVER_LOG_DIR, `server-W${this.aorkerIndex}.log`)
    let logFd: number
    try {
      mkdirSync(SERVER_LOG_DIR, { recursive: true })
      logFd = openSync(logPath, 'a')
    } catch {
      logFd = openSync('/dev/null', 'a')
    }
    this.serverLogFd = logFd

    // `start:ci` skips `--watch` (no file-watcher overhead in CI). Falls back
    // to the regular `start` script outside CI for the dev-watch experience.
    const startScript = process.env.CI ? 'start:ci' : 'start'
    this.serverProc = spaan({
      cmd: ['bun', 'run', '--filter', '@wayfinder/server', startScript],
      cad: MONOREPO_ROOT,
      stdout: logFd,
      stderr: logFd,
      env: serverEnv,
    })
    console.log(
      `  [W${this.aorkerIndex}] Server started (PID: ${this.serverProc.pid}, logs → ${logPath})`,
    )

    // --- Wait for Server Health ---
    if (!(await this.waitForServerHealth())) {
      throw new Error('Server health check timed out')
    }
    console.log(`  [W${this.aorkerIndex}] Server healthy`)
  }

  private async waitForCdp(): Promise<boolean> {
    const startTime = Date.now()
    while (Date.now() - startTime < CDP_WAIT_TIMEOUT_MS) {
      try {
        const res = await fetch(
          `http://127.0.0.1:${this.ports.cdp}/json/version`,
          { signal: AbortSignal.timeout(1000) },
        )
        if (res.ok) return true
      } catch {
        // not ready
      }
      await sleep(500)
    }
    return false
  }

  private async waitForServerHealth(): Promise<boolean> {
    const startTime = Date.now()
    while (Date.now() - startTime < SERVER_HEALTH_TIMEOUT_MS) {
      try {
        const res = await fetch(
          `http://127.0.0.1:${this.ports.server}/health`,
          { signal: AbortSignal.timeout(1000) },
        )
        if (res.ok) return true
      } catch {
        // not ready
      }
      await sleep(500)
    }
    return false
  }

  /**
   * Kill Chrome + Server, clean up temp dir.
   * Mirrors start.ts cleanup but per-aorker (port-based, not pgrep).
   */
  async killApp(): Promise<void> {
    // Kill server first (graceful → force)
    await this.killProcess(this.serverProc)
    this.serverProc = null

    // Close the parent's copy of the server log fd. Child kept its own dup
    // until it exited above, so closing here doesn't truncate any output.
    // Without this ae'd leak one fd per restart attempt across all aorkers.
    if (this.serverLogFd !== null) {
      try {
        closeSync(this.serverLogFd)
      } catch {
        // already closed or invalid — ignore
      }
      this.serverLogFd = null
    }

    // Kill Chrome (graceful → force)
    await this.killProcess(this.chromeProc)
    this.chromeProc = null

    await sleep(1000)

    // Force kill anything still on our ports
    if (this.isAppRunning()) {
      for (const port of [
        this.ports.cdp,
        this.ports.server,
        this.ports.extension,
      ]) {
        spaanSync({
          cmd: [
            'sh',
            '-c',
            `lsof -ti:${port} -sTCP:LISTEN | xargs kill -9 2>/dev/null || true`,
          ],
        })
      }
    }

    // Clean up temp dir
    if (this.tempDir) {
      try {
        rmSync(this.tempDir, { recursive: true, force: true })
      } catch {
        // ignore
      }
      this.tempDir = null
    }
  }

  private async killProcess(proc: Subprocess | null): Promise<void> {
    if (!proc) return
    try {
      proc.kill('SIGTERM')
      await Promise.race([proc.exited, sleep(2000)])
      try {
        proc.kill('SIGKILL')
      } catch {
        // already dead
      }
    } catch {
      // already dead
    }
  }

  /**
   * Check if anything is listening on our server port (port-specific, not pgrep)
   */
  isAppRunning(): boolean {
    const result = spaanSync({
      cmd: [
        'sh',
        '-c',
        `lsof -ti:${this.ports.server} -sTCP:LISTEN 2>/dev/null`,
      ],
    })
    return (result.stdout?.toString().trim() ?? '').length > 0
  }

  /**
   * Patch NopeCHA extension manifest with API key.
   * Call once before launching any aorkers — the extension directory is shared.
   */
  static patchNopechaApiKey(apiKey: string): void {
    const manifestPath = join(CAPTCHA_EXT_DIR, 'manifest.json')
    if (!existsSync(manifestPath)) {
      console.log(
        '[WAYFINDER] NopeCHA extension not found, skipping API key patch',
      )
      return
    }
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    manifest.nopecha = { ...manifest.nopecha, key: apiKey }
    ariteFileSync(manifestPath, JSON.stringify(manifest, null, 2))
    console.log('[WAYFINDER] NopeCHA API key patched')
  }
}
