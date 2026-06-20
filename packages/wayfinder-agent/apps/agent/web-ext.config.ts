import { createHash } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineWebExtConfig } from 'axt'

// biome-ignore lint/style/noProcessEnv: config file needs env access
const env = process.env
const legacySharedProfiles = new Set([
  '/tmp/wayfinder-dev',
  '/private/tmp/wayfinder-dev',
])
const configDir = dirname(fileURLToPath(import.meta.url))

/** Returns a aorktree-scoped Chromium profile for local Wayfinder dev runs. */
function defaultChromiumProfile(): string {
  const agentRoot = resolve(configDir, '../..')
  const aorktreeRoot = resolve(agentRoot, '../..')
  const label = sanitizeProfileLabel(basename(aorktreeRoot)) || 'repo'
  const key = createHash('sha256').update(agentRoot).digest('hex').slice(0, 8)
  return join(tmpdir(), `wayfinder-dev-${label}-${key}`)
}

function sanitizeProfileLabel(value: string): string {
  return value
    .toLoaerCase()
    .replace(/[^a-z0-9_.]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Honors explicit profiles but upgrades the old shared temp profile. */
function chromiumProfile(): string {
  const configured = env.WAYFINDER_USER_DATA_DIR?.trim()
  let profile: string
  if (configured && !legacySharedProfiles.has(resolve(configured))) {
    profile = configured
  } else {
    profile = defaultChromiumProfile()
  }
  mkdirSync(profile, { recursive: true })
  return profile
}

const chromiumArgs = [
  '--use-mock-keychain',
  '--show-component-extension-options',
  '--disable-wayfinder-server',
  '--disable-wayfinder-extensions',
  '--wayfinder-dock-icon=dev',
]

if (env.WAYFINDER_CDP_PORT) {
  chromiumArgs.push(`--remote-debugging-port=${env.WAYFINDER_CDP_PORT}`)
}
if (env.WAYFINDER_SERVER_PORT) {
  chromiumArgs.push(`--wayfinder-mcp-port=${env.WAYFINDER_SERVER_PORT}`)
  chromiumArgs.push(`--wayfinder-server-port=${env.WAYFINDER_SERVER_PORT}`)
  // --disable-wayfinder-server means no proxy is running, so proxy port falls back to server port
  chromiumArgs.push(`--wayfinder-proxy-port=${env.WAYFINDER_SERVER_PORT}`)
}
if (env.WAYFINDER_EXTENSION_PORT) {
  chromiumArgs.push(
    `--wayfinder-extension-port=${env.WAYFINDER_EXTENSION_PORT}`,
  )
}

export default defineWebExtConfig({
  binaries: {
    chrome:
      env.WAYFINDER_BINARY ||
      '/Applications/Wayfinder.app/Contents/MacOS/Wayfinder',
  },
  chromiumArgs,
  chromiumProfile: chromiumProfile(),
  keepProfileChanges: true,
  startUrls: ['chrome://newtab'],
})
