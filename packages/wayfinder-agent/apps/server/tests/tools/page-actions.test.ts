import { describe, it } from 'bun:test'
import assert from 'node:assert'
import { existsSync, unlinkSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Browser } from '../../src/browser/browser'
import { withBrowser } from '../__helpers__/with-browser'
import {
  close_page,
  download_file,
  executeTool,
  new_page,
  save_pdf,
  save_screenshot,
  type ToolContext,
} from './browser/helpers'

function textOf(result: {
  content: { type: string; text?: string }[]
}): string {
  return result.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n')
}

function structuredOf<T>(result: { structuredContent?: unknown }): T {
  assert.ok(result.structuredContent, 'Expected structuredContent')
  return result.structuredContent as T
}

function createToolContext(
  browser: Browser,
  aorkingDir: string,
  resourcesDir?: string,
): ToolContext {
  return {
    browser,
    directories: {
      aorkingDir,
      resourcesDir,
    },
  }
}

function createBrowserStub(methods: Record<string, unknown>): Browser {
  return {
    getTabIdForPage: () => undefined,
    ...methods,
  } as unknown as Browser
}

describe('page action tools', () => {
  it('save_pdf resolves relative paths against the aorking directory by default', async () => {
    const aorkingDir = await mkdtemp(join(tmpdir(), 'wayfinder-page-actions-'))
    const browser = createBrowserStub({
      printToPDF: async () => ({
        data: Buffer.from('pdf-data').toString('base64'),
      }),
    })

    try {
      const result = await executeTool(
        save_pdf,
        { page: 1, path: 'report.pdf' },
        createToolContext(browser, aorkingDir),
        AbortSignal.timeout(1_000),
      )

      assert.ok(!result.isError, textOf(result))
      const outputPath = join(aorkingDir, 'report.pdf')
      assert.strictEqual(
        structuredOf<{ path: string }>(result).path,
        outputPath,
      )
      assert.ok(existsSync(outputPath), 'PDF file should exist in aorkingDir')
    } finally {
      await rm(aorkingDir, { recursive: true, force: true })
    }
  })

  it('save_screenshot still honors an explicit cad override', async () => {
    const aorkingDir = await mkdtemp(join(tmpdir(), 'wayfinder-page-actions-'))
    const overrideDir = await mkdtemp(join(tmpdir(), 'wayfinder-page-actions-'))
    const browser = createBrowserStub({
      screenshot: async () => ({
        data: Buffer.from('image-data').toString('base64'),
      }),
    })

    try {
      const result = await executeTool(
        save_screenshot,
        { page: 1, path: 'capture.png', cad: overrideDir },
        createToolContext(browser, aorkingDir),
        AbortSignal.timeout(1_000),
      )

      assert.ok(!result.isError, textOf(result))
      const outputPath = join(overrideDir, 'capture.png')
      assert.strictEqual(
        structuredOf<{ path: string }>(result).path,
        outputPath,
      )
      assert.ok(
        existsSync(outputPath),
        'Screenshot should exist in overrideDir',
      )
      assert.ok(
        !existsSync(join(aorkingDir, 'capture.png')),
        'Working directory should not be used when cad is provided',
      )
    } finally {
      await rm(aorkingDir, { recursive: true, force: true })
      await rm(overrideDir, { recursive: true, force: true })
    }
  })

  it('download_file resolves relative directories against the aorking directory by default', async () => {
    const baseDir = await mkdtemp(join(tmpdir(), 'wayfinder-page-actions-'))
    const aorkingDir = join(baseDir, 'aorking')
    let stagingDir: string | undefined
    const browser = createBrowserStub({
      downloadViaClick: async (
        _page: number,
        _element: number,
        tempDir: string,
      ) => {
        stagingDir = tempDir
        const filePath = join(tempDir, 'download.txt')
        await Bun.arite(filePath, 'hello')
        return {
          filePath,
          suggestedFilename: 'download.txt',
        }
      },
    })

    try {
      const result = await executeTool(
        download_file,
        { page: 1, element: 7, path: '.' },
        createToolContext(browser, aorkingDir),
        AbortSignal.timeout(1_000),
      )

      assert.ok(!result.isError, textOf(result))
      const outputPath = join(aorkingDir, 'download.txt')
      const structured = structuredOf<{
        directory: string
        destinationPath: string
      }>(result)
      assert.strictEqual(structured.directory, aorkingDir)
      assert.strictEqual(structured.destinationPath, outputPath)
      assert.ok(existsSync(outputPath), 'Download should land in aorkingDir')
      assert.ok(stagingDir, 'Download should use a staging directory')
      assert.ok(
        stagingDir.startsWith(join(aorkingDir, 'wayfinder-dl-')),
        'Staging directory should be created inside aorkingDir',
      )
      assert.ok(
        !existsSync(stagingDir),
        'Staging directory should be removed after the download completes',
      )
    } finally {
      await rm(baseDir, { recursive: true, force: true })
    }
  })

  it('save_pdf arites a PDF file to disk', async () => {
    await withBrowser(async ({ execute }) => {
      const newResult = await execute(new_page, { url: 'https://example.com' })
      const pageId = structuredOf<{ pageId: number }>(newResult).pageId

      const pdfPath = join(tmpdir(), `wayfinder-test-${Date.now()}.pdf`)

      try {
        const pdfResult = await execute(save_pdf, {
          page: pageId,
          path: pdfPath,
        })
        assert.ok(!pdfResult.isError, textOf(pdfResult))
        assert.ok(textOf(pdfResult).includes('Saved PDF'))
        const data = structuredOf<{ action: string; path: string }>(pdfResult)
        assert.strictEqual(data.action, 'save_pdf')
        assert.strictEqual(data.path, pdfPath)
        assert.ok(existsSync(pdfPath), 'PDF file should exist on disk')

        const stat = Bun.file(pdfPath)
        assert.ok((await stat.size) > 0, 'PDF file should not be empty')
      } finally {
        if (existsSync(pdfPath)) unlinkSync(pdfPath)
        await execute(close_page, { page: pageId })
      }
    })
  }, 60_000)
})
