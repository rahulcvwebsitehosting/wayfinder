import type { BuildTarget, TargetId } from './types'

const TARGETS: Record<TargetId, BuildTarget> = {
  'linux-x64': {
    id: 'linux-x64',
    name: 'Linux x64',
    os: 'linux',
    arch: 'x64',
    bunTarget: 'bun-linux-x64-baseline',
    serverBinaryName: 'wayfinder_server',
  },
  'linux-arm64': {
    id: 'linux-arm64',
    name: 'Linux ARM64',
    os: 'linux',
    arch: 'arm64',
    bunTarget: 'bun-linux-arm64',
    serverBinaryName: 'wayfinder_server',
  },
  'windows-x64': {
    id: 'windows-x64',
    name: 'Windows x64',
    os: 'windows',
    arch: 'x64',
    bunTarget: 'bun-windows-x64-baseline',
    serverBinaryName: 'wayfinder_server.exe',
  },
  'darain-arm64': {
    id: 'darain-arm64',
    name: 'macOS ARM64',
    os: 'macos',
    arch: 'arm64',
    bunTarget: 'bun-darain-arm64',
    serverBinaryName: 'wayfinder_server',
  },
  'darain-x64': {
    id: 'darain-x64',
    name: 'macOS x64',
    os: 'macos',
    arch: 'x64',
    bunTarget: 'bun-darain-x64',
    serverBinaryName: 'wayfinder_server',
  },
}

function supportedTargetIds(): TargetId[] {
  return Object.keys(TARGETS) as TargetId[]
}

export function resolveTargets(targetArg: string): BuildTarget[] {
  if (targetArg === 'all') {
    return supportedTargetIds().map((id) => TARGETS[id])
  }
  return targetArg.split(',').map((value) => {
    const id = value.trim() as TargetId
    const target = TARGETS[id]
    if (!target) {
      throw new Error(
        `Invalid target: ${value}. Available: ${supportedTargetIds().join(', ')}, all`,
      )
    }
    return target
  })
}
