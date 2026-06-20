/** @public */
export const WAYFINDER_PREFS = {
  MCP_PORT: 'wayfinder.server.mcp_port',
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
} as const
