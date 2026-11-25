#!/usr/bin/env bash
# Instala dependências e descarrega os modelos de voz (Kokoro fp32 + vozes). Requer: node>=20, python3, ffmpeg.
set -e
cd "$(dirname "$0")/.."
npm install
npx playwright install chromium --with-deps 2>/dev/null || npx playwright install chromium   # cenários 3D (SwiftShader, sem GPU)
pip install --break-system-packages kokoro-onnx soundfile numpy 2>/dev/null || pip install kokoro-onnx soundfile numpy
mkdir -p models
B=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -f models/kokoro-v1.0.onnx ] || curl -L -o models/kokoro-v1.0.onnx $B/kokoro-v1.0.onnx
[ -f models/voices-v1.0.bin ]  || curl -L -o models/voices-v1.0.bin  $B/voices-v1.0.bin
echo "ok. Arranca com: npm start   (editor em http://localhost:4173)"
