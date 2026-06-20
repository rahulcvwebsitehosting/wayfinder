import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'

const MCP_PORT_PREF = 'wayfinder.server.mcp_port'
let originalChrome: typeof globalThis.chrome | undefined

function readPref(name: string): { value: unknown } {
  return name === MCP_PORT_PREF ? { value: 9105 } : { value: null }
}

mock.module('./prefs', () => ({
  WAYFINDER_PREFS: {
    MCP_PORT: MCP_PORT_PREF,
    PROVIDERS: 'wayfinder.providers',
    THIRD_PARTY_LLM_PROVIDERS: 'wayfinder.third_party_llm.providers',
    PROXY_PORT: 'wayfinder.server.proxy_port',
    SERVER_PORT: 'wayfinder.server.server_port',
    ALLOW_REMOTE_MCP: 'wayfinder.server.allow_remote_in_mcp',
    RESTART_SERVER: 'wayfinder.server.restart_requested',
    SHOW_LLM_CHAT: 'wayfinder.show_llm_chat',
    SHOW_TOOLBAR_LABELS: 'wayfinder.show_toolbar_labels',
    VERTICAL_TABS_ENABLED: 'wayfinder.vertical_tabs_enabled',
    INSTALL_ID: 'wayfinder.metrics_install_id',
  },
}))

mock.module('./adapter', () => ({
  WayfinderAdapter: {
    getInstance: () => ({
      getPref: async (name: string) => readPref(name),
      getWayfinderVersion: async () => null,
    }),
  },
  getWayfinderAdapter: () => ({
    getPref: async (name: string) => readPref(name),
  }),
}))

describe('getAgentServerUrl', () => {
  beforeEach(() => {
    originalChrome = globalThis.chrome
    Object.assign(globalThis, {
      chrome: {
        ...originalChrome,
        wayfinder: {
          ...originalChrome?.wayfinder,
          getPref: (
            name: string,
            resolve: (result: { value: unknown }) => void,
          ) => {
            resolve(readPref(name))
          },
        },
      },
    })
  })

  afterEach(() => {
    if (originalChrome) {
      Object.assign(globalThis, { chrome: originalChrome })
      return
    }
    Reflect.deleteProperty(globalThis, 'chrome')
  })

  it('uses the Wayfinder MCP port as the server URL', async () => {
    const { getAgentServerUrl } = await import('./helpers')

    await expect(getAgentServerUrl()).resolves.toBe('http://127.0.0.1:9105')
  })
})
