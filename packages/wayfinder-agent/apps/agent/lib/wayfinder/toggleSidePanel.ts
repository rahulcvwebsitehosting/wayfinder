/**
 * @public
 */
export async function openSidePanel(
  tabId: number,
): Promise<{ opened: boolean }> {
  // @ts-expect-error wayfinderIsOpen is a Wayfinder-specific API
  const isAlreadyOpen = await chrome.sidePanel.wayfinderIsOpen({ tabId })
  if (isAlreadyOpen) {
    return { opened: true }
  }
  // @ts-expect-error wayfinderToggle is a Wayfinder-specific API
  return await chrome.sidePanel.wayfinderToggle({ tabId })
}

/**
 * @public
 */
export async function toggleSidePanel(
  tabId: number,
): Promise<{ opened: boolean }> {
  // @ts-expect-error wayfinderToggle is a Wayfinder-specific API
  return await chrome.sidePanel.wayfinderToggle({ tabId })
}
