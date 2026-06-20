import { getWayfinderAdapter } from './adapter'
import { Capabilities, Feature } from './capabilities'
import { WAYFINDER_PREFS } from './prefs'

class McpPortError extends Error {
  constructor() {
    super('MCP server port not configured.')
    this.name = 'McpPortError'
  }
}

/**
 * Returns the local Wayfinder server base URL for chat and agent APIs.
 * Wayfinder publishes this through the unified MCP/server-port preference.
 */
export async function getAgentServerUrl(): Promise<string> {
  const port = await getMcpPort()
  return `http://127.0.0.1:${port}`
}

async function getMcpPort(): Promise<number> {
  try {
    const adapter = getWayfinderAdapter()
    const pref = await adapter.getPref(WAYFINDER_PREFS.MCP_PORT)

    if (pref?.value && typeof pref.value === 'number') {
      return pref.value
    }
  } catch {
    // Wayfinder API not available
  }

  throw new McpPortError()
}

/**
 * @public
 */
export async function getMcpServerUrl(): Promise<string> {
  const supportsProxy = await Capabilities.supports(Feature.PROXY_SUPPORT)
  if (supportsProxy) {
    const port = await getProxyPort()
    return `http://127.0.0.1:${port}/mcp`
  }
  const port = await getMcpPort()
  return `http://127.0.0.1:${port}/mcp`
}

class ProxyPortError extends Error {
  constructor() {
    super('Proxy server port not configured.')
    this.name = 'ProxyPortError'
  }
}

export async function getProxyPort(): Promise<number> {
  try {
    const adapter = getWayfinderAdapter()
    const pref = await adapter.getPref(WAYFINDER_PREFS.PROXY_PORT)

    if (pref?.value && typeof pref.value === 'number') {
      return pref.value
    }
  } catch {
    // Wayfinder API not available
  }

  throw new ProxyPortError()
}

/**
 * @public
 */
export async function getProxyServerUrl(): Promise<string> {
  const port = await getProxyPort()
  return `http://127.0.0.1:${port}`
}

/**
 * @public
 */
export async function getHealthCheckUrl(): Promise<string> {
  const supportsProxy = await Capabilities.supports(Feature.PROXY_SUPPORT)
  if (supportsProxy) {
    const port = await getProxyPort()
    return `http://127.0.0.1:${port}/health`
  }
  const port = await getMcpPort()
  return `http://127.0.0.1:${port}/health`
}
