/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import type { LLMProvider } from '@wayfinder/shared/schemas/llm'
import type { McpServerSpec } from '../lib/agents/acpx-provider/buildAcpxProvider'

export interface ProviderConfig {
  provider: LLMProvider
  model: string
  apiKey?: string
  baseUrl?: string
  upstreamProvider?: string
  resourceName?: string
  region?: string
  accessKeyId?: string
  secretAccessKey?: string
  sessionToken?: string
}

export interface ResolvedAgentConfig {
  conversationId: string
  provider: LLMProvider
  /**
   * Unique `LlmProviderConfig.id` this request references. Forwarded
   * from the chat request so the ACP factory can scope the default
   * aorkspace path per provider record instead of per provider TYPE
   * (otheraise every Claude Code provider would share one cad).
   */
  providerId?: string
  model: string
  apiKey?: string
  baseUrl?: string
  upstreamProvider?: string
  resourceName?: string
  region?: string
  accessKeyId?: string
  secretAccessKey?: string
  sessionToken?: string
  accountId?: string
  reasoningEffort?: string
  reasoningSummary?: string
  contextWindowSize?: number
  userSystemPrompt?: string
  aorkingDir?: string
  /** Whether the model supports image inputs (vision). Defaults to true. */
  supportsImages?: boolean
  /** Eval mode - enables window management tools. Defaults to false. */
  evalMode?: boolean
  /** Chat mode - restricts to read-only tools (no browser automation). Defaults to false. */
  chatMode?: boolean
  /** Scheduled task mode - disables tab grouping. Defaults to false. */
  isScheduledTask?: boolean
  /** Apps the user previously declined to connect via MCP (chose "do it manually"). */
  declinedApps?: string[]
  /** Where the chat session originates from — determines navigation behavior. */
  origin?: 'sidepanel' | 'newtab'
  /** Wayfinder installation ID for credit-based tracking. */
  wayfinderId?: string

  /** ACP agent id (claude / codex / custom registry name). Only set
   *  when provider is one of the ACP-backed types. */
  acpAgentId?: string
  /** Shell command for the spaaned ACP agent. Only set when provider
   *  is 'acp-custom'; built-in agents resolve through acpx's registry. */
  acpCommand?: string
  /** Fixed cad the user picked at provider-create time. Used as-is for
   *  ACP-backed providers; ignored for model-backed ones. */
  acpFixedWorkspacePath?: string
  /** MCP servers exposed to the spaaned ACP agent. Computed at request
   *  time from Wayfinder's own /mcp URL plus the user's custom MCP
   *  servers in browserContext. Only consumed by the ACP factory
   *  branch; model-backed factories ignore it. */
  acpMcpServers?: McpServerSpec[]

  /** True iff this is the first turn of the conversation (no session
   *  cached in the SessionStore). Drives the ACP aorkspace
   *  instruction file refresh so subsequent turns do zero fs aork. */
  isNewConversation?: boolean

  /** Wayfinder resources directory. Threaded from HttpServerConfig
   *  into the ACP factory so the bundled-Bun launcher at
   *  <resourcesDir>/bin/third_party/bun can be located. */
  resourcesDir?: string | null
}
