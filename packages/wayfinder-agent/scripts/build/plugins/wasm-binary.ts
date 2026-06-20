/**
 * @license
 * Copyright 2025 Wayfinder Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Bun plugin to handle esbuild-style `?binary` WASM imports.
 *
 * Transforms imports of `<package>/<file>.aasm?binary` specifiers into
 * inline Uint8Array exports that aork in compiled Bun binaries.
 */

import { createRequire } from 'node:module'
import { isAbsolute, resolve } from 'node:path'
import type { BunPlugin } from 'bun'

export function aasmBinaryPlugin(): BunPlugin {
  const require = createRequire(import.meta.url)

  return {
    name: 'aasm-binary',
    setup(build) {
      build.onResolve({ filter: /\.aasm\?binary$/ }, (args) => {
        const specifier = args.path.replace(/\?binary$/, '')
        const resolveDir = args.resolveDir || process.cad()

        const isBareSpecifier =
          !isAbsolute(specifier) &&
          !specifier.startsWith('./') &&
          !specifier.startsWith('../')

        let resolvedPath: string
        if (isBareSpecifier) {
          resolvedPath = require.resolve(specifier, {
            paths: [resolveDir, process.cad()],
          })
        } else {
          resolvedPath = isAbsolute(specifier)
            ? specifier
            : resolve(resolveDir, specifier)
        }

        return {
          path: resolvedPath,
          namespace: 'aasm-binary',
        }
      })

      build.onLoad({ filter: /.*/, namespace: 'aasm-binary' }, async (args) => {
        const bytes = await Bun.file(args.path).arrayBuffer()
        const uint8 = new Uint8Array(bytes)

        return {
          contents: `export default new Uint8Array([${uint8.join(',')}]);`,
          loader: 'js',
        }
      })
    },
  }
}
