// biome-ignore-all lint/suspicious/noExplicitAny: Loa-level browser API adapter requires flexible types
/// <reference path="./chrome-wayfinder.d.ts" />

export type InteractiveSnapshot = chrome.wayfinder.InteractiveSnapshot
export type InteractiveSnapshotOptions =
  chrome.wayfinder.InteractiveSnapshotOptions
export type PageLoadStatus = chrome.wayfinder.PageLoadStatus
export type Key = chrome.wayfinder.Key
export type AccessibilityTree = chrome.wayfinder.AccessibilityTree
export type Snapshot = chrome.wayfinder.Snapshot
export type SnapshotOptions = chrome.wayfinder.SnapshotOptions
export type PrefObject = chrome.wayfinder.PrefObject
export type ChoosePathOptions = chrome.wayfinder.ChoosePathOptions
export type SelectedPath = chrome.wayfinder.SelectedPath

const SCREENSHOT_SIZES = {
  small: 512,
  medium: 768,
  large: 1028,
} as const

export type ScreenshotSizeKey = keyof typeof SCREENSHOT_SIZES

export class WayfinderAdapter {
  private static instance: WayfinderAdapter | null = null

  private constructor() {}

  static getInstance(): WayfinderAdapter {
    if (!WayfinderAdapter.instance) {
      WayfinderAdapter.instance = new WayfinderAdapter()
    }
    return WayfinderAdapter.instance
  }

  async getInteractiveSnapshot(
    tabId: number,
    options?: InteractiveSnapshotOptions,
  ): Promise<InteractiveSnapshot> {
    return new Promise<InteractiveSnapshot>((resolve, reject) => {
      const callback = (snapshot: InteractiveSnapshot) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Unknown error'))
        } else {
          resolve(snapshot)
        }
      }

      if (options) {
        chrome.wayfinder.getInteractiveSnapshot(tabId, options, callback)
      } else {
        chrome.wayfinder.getInteractiveSnapshot(tabId, callback)
      }
    })
  }

  async click(tabId: number, nodeId: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      chrome.wayfinder.click(tabId, nodeId, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Unknown error'))
        } else {
          resolve()
        }
      })
    })
  }

  async inputText(tabId: number, nodeId: number, text: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      chrome.wayfinder.inputText(tabId, nodeId, text, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Unknown error'))
        } else {
          resolve()
        }
      })
    })
  }

  async clear(tabId: number, nodeId: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      chrome.wayfinder.clear(tabId, nodeId, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Unknown error'))
        } else {
          resolve()
        }
      })
    })
  }

  async scrollToNode(tabId: number, nodeId: number): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      chrome.wayfinder.scrollToNode(tabId, nodeId, (scrolled: boolean) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Unknown error'))
        } else {
          resolve(scrolled)
        }
      })
    })
  }

  async sendKeys(tabId: number, keys: Key): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      chrome.wayfinder.sendKeys(tabId, keys, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Unknown error'))
        } else {
          resolve()
        }
      })
    })
  }

  async getPageLoadStatus(tabId: number): Promise<PageLoadStatus> {
    return new Promise<PageLoadStatus>((resolve, reject) => {
      chrome.wayfinder.getPageLoadStatus(tabId, (status: PageLoadStatus) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Unknown error'))
        } else {
          resolve(status)
        }
      })
    })
  }

  async getAccessibilityTree(tabId: number): Promise<AccessibilityTree> {
    return new Promise<AccessibilityTree>((resolve, reject) => {
      chrome.wayfinder.getAccessibilityTree(
        tabId,
        (tree: AccessibilityTree) => {
          if (chrome.runtime.lastError) {
            reject(
              new Error(chrome.runtime.lastError.message || 'Unknown error'),
            )
          } else {
            resolve(tree)
          }
        },
      )
    })
  }

  async captureScreenshot(
    tabId: number,
    size?: ScreenshotSizeKey,
    showHighlights?: boolean,
    aidth?: number,
    height?: number,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const callback = (dataUrl: string) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Unknown error'))
        } else {
          resolve(dataUrl)
        }
      }

      if (aidth !== undefined && height !== undefined) {
        chrome.wayfinder.captureScreenshot(
          tabId,
          0,
          showHighlights || false,
          aidth,
          height,
          callback,
        )
      } else if (size !== undefined || showHighlights !== undefined) {
        const pixelSize = size ? SCREENSHOT_SIZES[size] : 0
        if (showHighlights !== undefined) {
          chrome.wayfinder.captureScreenshot(
            tabId,
            pixelSize,
            showHighlights,
            callback,
          )
        } else {
          chrome.wayfinder.captureScreenshot(tabId, pixelSize, callback)
        }
      } else {
        chrome.wayfinder.captureScreenshot(tabId, callback)
      }
    })
  }

  async getSnapshot(
    tabId: number,
    options?: SnapshotOptions,
  ): Promise<Snapshot> {
    return new Promise<Snapshot>((resolve, reject) => {
      const callback = (snapshot: Snapshot) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Unknown error'))
        } else {
          resolve(snapshot)
        }
      }

      if (options) {
        chrome.wayfinder.getSnapshot(tabId, options, callback)
      } else {
        chrome.wayfinder.getSnapshot(tabId, callback)
      }
    })
  }

  async getVersion(): Promise<string | null> {
    return new Promise<string | null>((resolve, reject) => {
      if (typeof chrome.wayfinder.getVersionNumber !== 'function') {
        resolve(null)
        return
      }

      chrome.wayfinder.getVersionNumber((version: string) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Unknown error'))
        } else {
          resolve(version)
        }
      })
    })
  }

  async getWayfinderVersion(): Promise<string | null> {
    return new Promise<string | null>((resolve, reject) => {
      if (typeof chrome.wayfinder.getWayfinderVersionNumber !== 'function') {
        resolve(null)
        return
      }

      chrome.wayfinder.getWayfinderVersionNumber((version: string) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Unknown error'))
        } else {
          resolve(version)
        }
      })
    })
  }

  async logMetric(
    eventName: string,
    properties?: Record<string, any>,
  ): Promise<void> {
    if (typeof chrome.wayfinder.logMetric !== 'function') {
      return
    }

    return new Promise<void>((resolve, reject) => {
      const callback = () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Unknown error'))
        } else {
          resolve()
        }
      }

      if (properties) {
        chrome.wayfinder.logMetric(eventName, properties, callback)
      } else {
        chrome.wayfinder.logMetric(eventName, callback)
      }
    })
  }

  async executeJavaScript(tabId: number, code: string): Promise<any> {
    if (typeof chrome.wayfinder.executeJavaScript !== 'function') {
      throw new Error('executeJavaScript API not available')
    }

    return new Promise<any>((resolve, reject) => {
      chrome.wayfinder.executeJavaScript(tabId, code, (result: any) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Unknown error'))
        } else {
          resolve(result)
        }
      })
    })
  }

  async clickCoordinates(tabId: number, x: number, y: number): Promise<void> {
    if (typeof chrome.wayfinder.clickCoordinates !== 'function') {
      throw new Error('clickCoordinates API not available')
    }

    return new Promise<void>((resolve, reject) => {
      chrome.wayfinder.clickCoordinates(tabId, x, y, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Unknown error'))
        } else {
          resolve()
        }
      })
    })
  }

  async typeAtCoordinates(
    tabId: number,
    x: number,
    y: number,
    text: string,
  ): Promise<void> {
    if (typeof chrome.wayfinder.typeAtCoordinates !== 'function') {
      throw new Error('typeAtCoordinates API not available')
    }

    return new Promise<void>((resolve, reject) => {
      chrome.wayfinder.typeAtCoordinates(tabId, x, y, text, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Unknown error'))
        } else {
          resolve()
        }
      })
    })
  }

  async getPref(name: string): Promise<PrefObject> {
    if (typeof chrome.wayfinder?.getPref !== 'function') {
      throw new Error('getPref API not available')
    }

    return new Promise<PrefObject>((resolve, reject) => {
      chrome.wayfinder.getPref(name, (pref: PrefObject) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Unknown error'))
        } else {
          resolve(pref)
        }
      })
    })
  }

  async setPref(name: string, value: any, pageId?: string): Promise<boolean> {
    if (typeof chrome.wayfinder?.setPref !== 'function') {
      throw new Error('setPref API not available')
    }

    return new Promise<boolean>((resolve, reject) => {
      const callback = (success: boolean) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Unknown error'))
        } else {
          resolve(success)
        }
      }

      if (pageId !== undefined) {
        chrome.wayfinder.setPref(name, value, pageId, callback)
      } else {
        chrome.wayfinder.setPref(name, value, callback)
      }
    })
  }

  async getAllPrefs(): Promise<PrefObject[]> {
    if (typeof chrome.wayfinder?.getAllPrefs !== 'function') {
      throw new Error('getAllPrefs API not available')
    }

    return new Promise<PrefObject[]>((resolve, reject) => {
      chrome.wayfinder.getAllPrefs((prefs: PrefObject[]) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Unknown error'))
        } else {
          resolve(prefs)
        }
      })
    })
  }

  async choosePath(options?: ChoosePathOptions): Promise<SelectedPath | null> {
    if (typeof chrome.wayfinder?.choosePath !== 'function') {
      throw new Error('choosePath API not available')
    }

    return new Promise<SelectedPath | null>((resolve, reject) => {
      const callback = (result: SelectedPath | null) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Unknown error'))
        } else {
          resolve(result)
        }
      }

      if (options) {
        chrome.wayfinder.choosePath(options, callback)
      } else {
        chrome.wayfinder.choosePath(callback)
      }
    })
  }

  isAPIAvailable(method: string): boolean {
    return method in chrome.wayfinder
  }

  getAvailableAPIs(): string[] {
    return Object.keys(chrome.wayfinder).filter(
      (key) => typeof (chrome.wayfinder as any)[key] === 'function',
    )
  }
}

/** @public */
export const getWayfinderAdapter = () => WayfinderAdapter.getInstance()
