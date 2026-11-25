# StickForge como serviço independente (API + editor em :4173)
FROM node:20-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip curl fonts-dejavu && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install && npx playwright install --with-deps chromium
RUN pip install --break-system-packages kokoro-onnx soundfile numpy
COPY . .
RUN bash -c 'mkdir -p models && B=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0 && curl -L -o models/kokoro-v1.0.onnx $B/kokoro-v1.0.onnx && curl -L -o models/voices-v1.0.bin $B/voices-v1.0.bin'
ENV PORT=4173
EXPOSE 4173
VOLUME ["/app/cache", "/app/out"]
CMD ["node", "src/server/api.js"]
