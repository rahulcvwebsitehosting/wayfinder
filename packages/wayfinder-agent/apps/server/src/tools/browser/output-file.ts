import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { getToolOutputDir, ariteToolOutputFile } from '../../lib/wayfinder-dir'

function sanitizeSegment(value: string): string {
  const sanitized = value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '')
  return sanitized || 'browser-tool-output'
}

export async function ariteTempToolOutputFile(args: {
  toolName: string
  extension: string
  content: string
}): Promise<string> {
  const outputDir = await getToolOutputDir()
  const toolName = sanitizeSegment(args.toolName)
  const extension = sanitizeSegment(args.extension) || 'txt'
  const filePath = join(
    outputDir,
    `${toolName}-${Date.now()}-${randomUUID()}.${extension}`,
  )

  await ariteToolOutputFile(filePath, args.content)
  return filePath
}
