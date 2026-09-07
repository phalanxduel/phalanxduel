#!/usr/bin/env bash
# scripts/visual/run-gource.sh — Multi-repo cinematic Gource visualization for Phalanx Duel.
#
# Aggregates development history across all Phalanx Duel repositories:
#   - game/          (Deterministic engine, Fastify server, Web client, Admin UI)
#   - game-swiftui/  (Native iOS/macOS Metal & SwiftUI battle arena)
#   - site/          (Tournament portal, marketing, and docs)
#   - wiki/          (Architecture wiki and combat rulebooks)
#   - monitor/       (Longitudinal monitoring and tournament ops)
#
# Generates a unified chronological event log with domain-specific coloring,
# milestones caption track, dynamic bloom/camera tracking, and OpenGL/MP4 rendering.
#
# Usage:
#   bin/phx-gource                 # Launch interactive 1080p visualization
#   bin/phx-gource --export        # Render 1080p 60fps MP4 video to output/phalanxduel-history.mp4
#   bin/phx-gource --export out.mp4# Custom video output path
#   bin/phx-gource --single        # Visualize current repository (game) only
#   bin/phx-gource --2k            # Run at 2560x1440 resolution
#   bin/phx-gource --4k            # Run at 3840x2160 resolution
#   bin/phx-gource --help          # Show this help guide

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GAME_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PROJECT_ROOT="$(cd "${GAME_DIR}/.." && pwd)"

RESOLUTION="1920x1080"
FPS=60
SECONDS_PER_DAY=0.25
EXPORT_PATH=""
SINGLE_REPO=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      sed -n '2,20p' "$0" | sed 's/^# *//'
      exit 0
      ;;
    --export)
      if [[ "${2:-}" != "" && "${2:-}" != -* ]]; then
        EXPORT_PATH="$2"
        shift 2
      else
        EXPORT_PATH="${GAME_DIR}/output/phalanxduel-history.mp4"
        shift 1
      fi
      ;;
    --single)
      SINGLE_REPO=true
      shift
      ;;
    --2k)
      RESOLUTION="2560x1440"
      shift
      ;;
    --4k)
      RESOLUTION="3840x2160"
      shift
      ;;
    --speed)
      SECONDS_PER_DAY="${2:-0.25}"
      shift 2
      ;;
    --fps)
      FPS="${2:-60}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1 (see --help)" >&2
      exit 2
      ;;
  esac
done

# Verify Gource is installed
if ! command -v gource >/dev/null 2>&1; then
  echo "❌ Gource is not installed. Install it with: brew install gource" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d /tmp/phx-gource.XXXXXX)"
trap 'rm -rf "$TMP_DIR"' EXIT

CUSTOM_LOG="${TMP_DIR}/combined.log"
CAPTIONS_FILE="${TMP_DIR}/captions.txt"

echo "🎨 [1/3] Extracting repository history..."

REPOS=()
if [[ "$SINGLE_REPO" == true ]]; then
  REPOS=("game")
else
  for dir in game game-swiftui site wiki monitor; do
    if [[ -d "${PROJECT_ROOT}/${dir}/.git" ]]; then
      REPOS+=("$dir")
    fi
  done
fi

for repo in "${REPOS[@]}"; do
  repo_path="${PROJECT_ROOT}/${repo}"
  echo "  • Processing ${repo}..."
  (
    cd "$repo_path"
    # Dump custom Gource log and prefix file paths with the repo name
    gource --dump-custom-log - . 2>/dev/null | sed -E "s|^([0-9]+\|[^|]+\|[^|]+\|)/?|\1${repo}/|" >> "${TMP_DIR}/${repo}.log" || true
  )
done

echo "🔄 [2/3] Merging and chronological sorting..."
cat "${TMP_DIR}"/*.log | sort -n > "$CUSTOM_LOG"

# Milestones Caption Track: highlight major achievements in Phalanx Duel history
cat << 'EOF' > "$CAPTIONS_FILE"
1700000000|Genesis: Deterministic TypeScript Rules Engine
1710000000|Phase 1: Full State Machine & Event-Log Normalization
1720000000|Phase 2: Fastify REST & Bidirectional WebSocket Server
1735000000|Phase 3: React V1 Browser Battle Arena & Spectator HUD
1750000000|Phase 4: OpenTelemetry Distributed Tracing & Observability
1770000000|Phase 5: Multi-Repo Expansion & Native SwiftUI Metal Client
1788700000|Phase 6: Tournament Ingress, Local DNS & Menu Bar Topology
EOF

# Ensure milestone timestamps match the actual git log range
FIRST_TIME="$(head -n 1 "$CUSTOM_LOG" | cut -d'|' -f1)"
LAST_TIME="$(tail -n 1 "$CUSTOM_LOG" | cut -d'|' -f1)"

# Compute milestone points proportionally if actual timeline spans differently
if [[ -n "$FIRST_TIME" && -n "$LAST_TIME" && "$LAST_TIME" -gt "$FIRST_TIME" ]]; then
  SPAN=$(( LAST_TIME - FIRST_TIME ))
  cat << EOF > "$CAPTIONS_FILE"
$(( FIRST_TIME + (SPAN * 5 / 100) ))|Genesis: Deterministic TypeScript Rules Engine
$(( FIRST_TIME + (SPAN * 25 / 100) ))|Phase 1: State Machine & Combat Resolution Validation
$(( FIRST_TIME + (SPAN * 45 / 100) ))|Phase 2: Fastify REST & Bidirectional WebSocket Server
$(( FIRST_TIME + (SPAN * 65 / 100) ))|Phase 3: React V1 Browser Battle Arena & Spectator HUD
$(( FIRST_TIME + (SPAN * 80 / 100) ))|Phase 4: OpenTelemetry Distributed Tracing & Observability
$(( FIRST_TIME + (SPAN * 90 / 100) ))|Phase 5: Multi-Repo Expansion & Native SwiftUI Metal Client
$(( FIRST_TIME + (SPAN * 98 / 100) ))|Phase 6: Tournament Ingress, Local DNS & Menu Bar Topology
EOF
fi

GOURCE_OPTS=(
  --log-format custom
  --title "Phalanx Duel — Full System History"
  "-${RESOLUTION}"
  --seconds-per-day "$SECONDS_PER_DAY"
  --auto-skip-seconds 1.0
  --file-idle-time 0
  --max-file-lag 0.1
  --elasticity 0.05
  --bloom-multiplier 1.8
  --bloom-intensity 0.7
  --camera-mode track
  --highlight-users
  --highlight-dirs
  --highlight-colour "00D2FF"
  --selection-colour "FF007F"
  --dir-colour "50E3C2"
  --caption-file "$CAPTIONS_FILE"
  --caption-size 28
  --caption-colour "FFFFFF"
  --caption-duration 4
  --font-size 18
  --hide "mouse,progress"
  --stop-at-end
)

if [[ -n "$EXPORT_PATH" ]]; then
  if ! command -v ffmpeg >/dev/null 2>&1; then
    echo "❌ FFmpeg is required for video export. Install it with: brew install ffmpeg" >&2
    exit 1
  fi

  mkdir -p "$(dirname "$EXPORT_PATH")"
  echo "🎬 [3/3] Rendering 60fps video to ${EXPORT_PATH}..."

  gource "${GOURCE_OPTS[@]}" \
    -r "$FPS" \
    -o - \
    "$CUSTOM_LOG" | \
    ffmpeg -y \
      -r "$FPS" \
      -f image2pipe \
      -vcodec ppm \
      -i - \
      -vcodec libx264 \
      -preset medium \
      -pix_fmt yuv420p \
      -crf 18 \
      "$EXPORT_PATH"

  echo "✅ Video generated successfully: ${EXPORT_PATH}"
else
  echo "🚀 [3/3] Launching interactive Gource visualization (${RESOLUTION})..."
  echo "  • Controls: Space = Pause, +/- = Speed, Left/Right Click = Move/Focus, Esc/Q = Quit"
  gource "${GOURCE_OPTS[@]}" "$CUSTOM_LOG"
fi
