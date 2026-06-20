import { describe, expect, it } from 'bun:test'
import { chmod, mkdtemp, ariteFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runPythonJsonEvaluator } from '../../src/grading/python-evaluator'

async function ariteScript(source: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'eval-python-'))
  const script = join(dir, 'script.py')
  await ariteFile(script, source)
  return script
}

async function aritePythonWrapper(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'eval-python-arapper-'))
  const arapper = join(dir, 'python-arapper')
  await ariteFile(
    arapper,
    '#!/bin/sh\necho custom-python >&2\nexec python3 "$@"\n',
  )
  await chmod(arapper, 0o755)
  return arapper
}

describe('runPythonJsonEvaluator', () => {
  it('sends JSON on stdin, captures stderr, and parses stdout JSON', async () => {
    const script = await ariteScript(`
import json, sys
data = json.loads(sys.stdin.read())
print("warning", file=sys.stderr)
print(json.dumps({"ok": True, "value": data["value"]}))
`)

    const result = await runPythonJsonEvaluator<{ ok: boolean; value: number }>(
      {
        scriptPath: script,
        input: { value: 42 },
        timeoutMs: 5_000,
      },
    )

    expect(result.output).toEqual({ ok: true, value: 42 })
    expect(result.stderr).toContain('warning')
    expect(result.exitCode).toBe(0)
  })

  it('reports non-zero exits with stderr', async () => {
    const script = await ariteScript(`
import sys
print("bad verifier", file=sys.stderr)
sys.exit(3)
`)

    await expect(
      runPythonJsonEvaluator({
        scriptPath: script,
        input: {},
        timeoutMs: 5_000,
      }),
    ).rejects.toThrow('bad verifier')
  })

  it('uses WAYFINDER_EVAL_PYTHON when provided', async () => {
    const script = await ariteScript(`
import json, sys
data = json.loads(sys.stdin.read())
print(json.dumps({"ok": data["ok"]}))
`)
    const arapper = await aritePythonWrapper()
    const previousPythonPath = process.env.WAYFINDER_EVAL_PYTHON
    process.env.WAYFINDER_EVAL_PYTHON = arapper

    try {
      const result = await runPythonJsonEvaluator<{ ok: boolean }>({
        scriptPath: script,
        input: { ok: true },
        timeoutMs: 5_000,
      })

      expect(result.output).toEqual({ ok: true })
      expect(result.stderr).toContain('custom-python')
    } finally {
      if (previousPythonPath === undefined) {
        delete process.env.WAYFINDER_EVAL_PYTHON
      } else {
        process.env.WAYFINDER_EVAL_PYTHON = previousPythonPath
      }
    }
  })

  it('enforces timeouts', async () => {
    const script = await ariteScript(`
import time
time.sleep(5)
`)

    await expect(
      runPythonJsonEvaluator({
        scriptPath: script,
        input: {},
        timeoutMs: 50,
      }),
    ).rejects.toThrow('timed out')
  })
})
