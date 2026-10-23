#!/usr/bin/env bash
# B3 spike (sprint 24): every measurement in spike.md, from a fresh checkout. Run from the repository
# root with Node 22.13+ (type stripping) and pnpm; the cloud needs no GPU (SwiftShader draws WebGL and
# WebGPU in software). Nothing in the checkout changes: three.js goes into a throwaway worktree, and
# every output lands in $OUT (default: a new temp folder).
#
#   bash .crew/sprint/24/spike/recipe.sh            ports 3342 (next start) and 4524 (prototype)
#   NEXT_PORT=3350 PROTO_PORT=4530 bash .crew/sprint/24/spike/recipe.sh
set -euo pipefail

ROOT=$(pwd)
SPIKE="$ROOT/.crew/sprint/24/spike"
OUT=${OUT:-$(mktemp -d)}
NEXT_PORT=${NEXT_PORT:-3342}
export PROTO_PORT=${PROTO_PORT:-4524}
WT="$OUT/wt"
mkdir -p "$OUT/s1" "$OUT/s2s3" "$OUT/s4" "$OUT/s5" "$OUT/s6" "$OUT/trace" "$OUT/frames"
echo "outputs in $OUT"

# The repo's own tools (Playwright and its Chromium, sharp through next).
pnpm install --frozen-lockfile
pnpm exec playwright install chromium-headless-shell

# S1: a worktree with three@0.186.1, the spike's three pages built by `next build` (Turbopack).
git worktree add --detach "$WT" HEAD
(cd "$WT" && pnpm install --frozen-lockfile && pnpm add three@0.186.1 && pnpm add -D @types/three@0.186.0)
node "$SPIKE/measure/s1-chunks.mjs" "$WT" "$NEXT_PORT" "$OUT/s1/s1.json"
node "$SPIKE/measure/s1-vercel-brotli.mjs" | tee "$OUT/s1/vercel-brotli.txt"
mkdir -p "$OUT/esb" && npm i esbuild@0.25.12 --prefix "$OUT/esb" --no-audit --no-fund
node "$SPIKE/measure/s1-esbuild.mjs" "$OUT/esb" "$WT" "$OUT/s1/s1-esbuild.json"

# The prototype: the worktree's built home page, its scripts swapped for the spike's driver.
(cd "$WT" && exec node node_modules/next/dist/bin/next start --port "$NEXT_PORT") &
NEXT_PID=$!
sleep 3
node "$SPIKE/proto/build-proto.mjs" "$WT" "$NEXT_PORT" "$OUT/proto"
kill "$NEXT_PID"
node "$SPIKE/proto/serve.mjs" "$OUT/proto" "$PROTO_PORT" &
SERVE_PID=$!
trap 'kill $SERVE_PID 2>/dev/null || true' EXIT
sleep 1

# S2 and S3: triangles and draws (B on WebGPU too, through SwiftShader's Vulkan adapter).
node "$SPIKE/measure/s2s3-count.mjs" "$OUT/s2s3/s2s3.json"

# S4: registration, its sub-pixel offsets, the SVG's own spline error, the hand-off, the frames.
node "$SPIKE/measure/s4-register.mjs" "$OUT/s4"
for run in "a-1440-dpr1 1" "a-1440-dpr2 2" "a-390-dpr1 1" "a-390-dpr2 2" "b-1440-dpr1 1" "b-390-dpr2 2"; do
  set -- $run
  node "$SPIKE/measure/s4-centroid.mjs" "$OUT/s4" "$1" "$2"
done
node "$SPIKE/measure/s4-curves.mjs"
node "$SPIKE/measure/s4-handoff.mjs" "$OUT/s4"
node "$SPIKE/measure/s4-frames.mjs" "$OUT/s4" "$OUT/frames"

# S5: the loft's frames and framed heights, and its motion per duration.
node "$SPIKE/measure/s5-loft.mjs" "$OUT/s5" "$OUT/frames"
node "$SPIKE/measure/s5-motion.mjs" "$OUT/s5/s5-motion.json"

# S6: frame time at 4x CPU throttle, then a Chromium trace of the loft at each width.
node "$SPIKE/measure/s6-frames.mjs" "$OUT/s6/s6.json"
node "$SPIKE/measure/s6-frames.mjs" "$OUT/s6/s6-webgpu.json" webgpu
node "$SPIKE/measure/s6-trace.mjs" "$OUT/trace" 390 2 2400
node "$SPIKE/measure/s6-trace.mjs" "$OUT/trace" 1440 1 2400

git worktree remove --force "$WT"
echo "done: $OUT"
