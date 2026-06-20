/**
 * Base interface for all chat actions
 * @public
 */
export interface BaseChatAction {
  id: string
  timestamp: number
}

/**
 * Action for AI operations on selected tabs
 * @public
 */
export interface AITabAction extends BaseChatAction {
  type: 'ai-tab'
  name: string
  description: string
  tabs: chrome.tabs.Tab[]
}

/**
 * Action for Wayfinder chat/agent queries
 * @public
 */
export interface WayfinderAction extends BaseChatAction {
  type: 'wayfinder'
  mode: 'chat' | 'agent'
  message: string
  tabs?: chrome.tabs.Tab[]
}

/**
 * Union type of all chat actions
 * @public
 */
export type ChatAction = AITabAction | WayfinderAction

/**
 * Storage format for search actions passed between newtab and sidepanel
 * @public
 */
export interface SearchActionData {
  query: string
  mode: 'chat' | 'agent'
  action?: ChatAction
}

/**
 * Helper to create an AI tab action
 * @public
 */
export const createAITabAction = (params: {
  name: string
  description: string
  tabs: chrome.tabs.Tab[]
}): AITabAction => ({
  id: crypto.randomUUID(),
  type: 'ai-tab',
  timestamp: Date.now(),
  name: params.name,
  description: params.description,
  tabs: params.tabs,
})

/**
 * Helper to create a Wayfinder action
 * @public
 */
export const createWayfinderAction = (params: {
  mode: 'chat' | 'agent'
  message: string
  tabs?: chrome.tabs.Tab[]
}): WayfinderAction => ({
  id: crypto.randomUUID(),
  type: 'wayfinder',
  timestamp: Date.now(),
  mode: params.mode,
  message: params.message,
  tabs: params.tabs,
})
