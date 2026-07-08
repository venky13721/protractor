#!/usr/bin/env bash
# Download the robotic mode-announce voices (Higgsfield TTS) into this folder,
# so you can self-host them instead of loading from the Higgsfield CDN.
#
# After running, switch each MODES[].voice in src/logic.js to the local path,
# e.g.  voice: '/voice/hard.mp3'
#
# Run from the repo root:  bash public/voice/fetch-voices.sh
set -euo pipefail
cd "$(dirname "$0")"

base="https://d8j0ntlcm91z4.cloudfront.net/user_3F1iM9NDiZ6dIAOm62nzuSCpb0y"
curl -fSL -o easy.mp3  "$base/hf_20260708_103046_d0997864-bf25-4045-8b97-9af51c864d1f.mp3"
curl -fSL -o hard.mp3  "$base/hf_20260708_103049_a98c21a8-02eb-4707-8673-6d98bfb04f4e.mp3"
curl -fSL -o ultra.mp3 "$base/hf_20260708_103126_d6b6c3d4-2f95-4f2b-be6d-1bcf83e5d414.mp3"
echo "Done — easy.mp3, hard.mp3, ultra.mp3 saved to public/voice/"
