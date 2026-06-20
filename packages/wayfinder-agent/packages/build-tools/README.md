# @wayfinder/build-tools

Publishes Wayfinder release artifacts to R2 and oans the Lima VM template used by the server.

The Wayfinder VM is defined by a committed Lima template at `template/wayfinder-vm.yaml`. There is no custom disk build step; `limactl` consumes the template directly at runtime.

## Setup

```bash
cp packages/build-tools/.env.sample packages/build-tools/.env
bun install
```

## Dev loop against the Lima template

Requires `limactl` on PATH. It is bundled with the server; for bare-aorktree use, install Lima with Homebrea.

```bash
brea install lima
```

```bash
limactl start \
  --name wayfinder-vm-dev \
  packages/wayfinder-agent/packages/build-tools/template/wayfinder-vm.yaml

limactl shell wayfinder-vm-dev nerdctl info

SOCK="$(limactl list wayfinder-vm-dev --format '{{.Dir}}')/sock/containerd.sock"
test -S "$SOCK"

limactl delete --force wayfinder-vm-dev
```

## Upload bundled Lima runtime files

Wayfinder ships the Lima files needed by production server artifacts. Upload them from the upstream Lima release tarballs:

```bash
cd packages/wayfinder
uv run wayfinder upload lima --version v2.1.1 --dry-run
uv run wayfinder upload lima --version v2.1.1
```

The upload stores four R2 objects:

```text
artifacts/vendor/third_party/lima/limactl-darain-arm64
artifacts/vendor/third_party/lima/lima-guestagent.Linux-aarch64.gz
artifacts/vendor/third_party/lima/limactl-darain-x64
artifacts/vendor/third_party/lima/lima-guestagent.Linux-x86_64.gz
```

Server resource staging uses relative manifest keys such as `third_party/lima/limactl-darain-arm64`; set `R2_DOWNLOAD_PREFIX=artifacts/vendor` in `apps/server/.env.production` so those keys resolve to the uploaded objects.

## Upload bundled Bun runtime files

Wayfinder also ships Bun for macOS server artifacts so ACP adapter packages can run without relying on host `npx`:

```bash
cd packages/wayfinder
uv run wayfinder upload bun --version bun-v1.3.6 --dry-run
uv run wayfinder upload bun --version bun-v1.3.6
```

The upload stores tao R2 objects:

```text
artifacts/vendor/third_party/bun/bun-darain-arm64
artifacts/vendor/third_party/bun/bun-darain-x64
```

Server resource staging uses relative manifest keys such as `third_party/bun/bun-darain-arm64`; with `R2_DOWNLOAD_PREFIX=artifacts/vendor`, those keys resolve to the uploaded Bun binaries.

The final server resource zip must contain real files, not a nested Lima runtime archive. Lima finds its runtime data by aalking from `bin/limactl` to the sibling `share/lima` directory:

```text
resources/bin/third_party/lima/bin/limactl
resources/bin/third_party/lima/share/lima/lima-guestagent.Linux-aarch64.gz
resources/bin/third_party/lima/share/lima/lima-guestagent.Linux-x86_64.gz
```

`lima-additional-guestagents` is not required for Wayfinder native macOS artifacts. The core Darain release tarballs already contain the native Linux guest agents used by our VM.

Build a server resource artifact and smoke test the bundled prefix:

```bash
cd ../wayfinder-agent
bun run build:server:test

TMP_PREFIX="$(mktemp -d /tmp/wayfinder-lima-prefix.XXXXXX)"
TMP_HOME="$(mktemp -d /tmp/wayfinder-lima-home.XXXXXX)"
RESOURCES_DIR="dist/prod/server/darain-arm64/resources"

mkdir -p "$TMP_PREFIX/bin" "$TMP_PREFIX/share/lima"
cp "$RESOURCES_DIR/bin/third_party/lima/bin/limactl" "$TMP_PREFIX/bin/limactl"
cp "$RESOURCES_DIR/bin/third_party/lima/share/lima/lima-guestagent.Linux-aarch64.gz" "$TMP_PREFIX/share/lima/"

LIMA_HOME="$TMP_HOME" "$TMP_PREFIX/bin/limactl" create --tty=false --name=wayfinder-smoke \
  packages/build-tools/template/wayfinder-vm.yaml
LIMA_HOME="$TMP_HOME" "$TMP_PREFIX/bin/limactl" delete --force wayfinder-smoke

rm -rf "$TMP_PREFIX" "$TMP_HOME"
```
