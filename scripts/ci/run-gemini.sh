#!/usr/bin/env bash
# Optional Gemini automation also runs on events where GitHub withholds secrets.
set -euo pipefail

if [ -n "${GEMINI_API_KEY:-}" ]; then
  :
elif [ -n "${GOOGLE_API_KEY:-}" ]; then
  export GEMINI_API_KEY="$GOOGLE_API_KEY"
elif [ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]; then
  export GOOGLE_GENAI_USE_VERTEXAI=true
  export GOOGLE_CLOUD_PROJECT="${GOOGLE_CLOUD_PROJECT:-${GCP_PROJECT_ID:-}}"
  export GOOGLE_CLOUD_LOCATION="${GOOGLE_CLOUD_LOCATION:-${GCP_LOCATION:-global}}"
elif [ "${GOOGLE_GENAI_USE_VERTEXAI:-false}" != true ] && [ "${GOOGLE_GENAI_USE_GCA:-false}" != true ]; then
  echo '::notice::Gemini skipped: no authentication configured for this event.'
  exit 0
fi

mkdir -p .gemini
printf '%s\n' "$SETTINGS" > .gemini/settings.json
exec npx "@google/gemini-cli@${GEMINI_CLI_VERSION:-latest}" --prompt "$PROMPT"
