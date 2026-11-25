#!/usr/bin/env python3
"""Worker de TTS persistente (Kokoro ONNX). Modelo carrega UMA vez; recebe pedidos JSON por linha no stdin.

Pedido : {"id": "...", "text": "...", "voice": "pf_dora", "lang": "pt-br", "speed": 1.0, "out": "/path/x.wav"}
Resposta: {"id": "...", "dur": 3.21, "env": [0..1 @60Hz], "ms": 812}   (uma linha JSON por pedido)
Pedido especial {"cmd":"ping"} -> {"ready":true}
"""
import sys, json, time, os
import numpy as np
import soundfile as sf

MODELS = os.environ.get("SF_MODELS", os.path.join(os.path.dirname(__file__), "..", "..", "models"))
t0 = time.time()
import onnxruntime as ort
from kokoro_onnx import Kokoro
so = ort.SessionOptions()
so.intra_op_num_threads = int(os.environ.get("SF_TTS_THREADS", "1"))
so.inter_op_num_threads = 1
so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
# fp32 é MAIS RÁPIDO que int8 em CPUs modernos (medido: RTF 0.75 vs 1.72) e soa melhor; int8 só como fallback.
_fp32, _int8 = os.path.join(MODELS, "kokoro-v1.0.onnx"), os.path.join(MODELS, "kokoro-v1.0.int8.onnx")
model_path = os.environ.get("SF_TTS_MODEL") or (_fp32 if os.path.exists(_fp32) else _int8)
sess = ort.InferenceSession(model_path, sess_options=so, providers=["CPUExecutionProvider"])
kokoro = Kokoro.from_session(sess, os.path.join(MODELS, "voices-v1.0.bin"))
print(json.dumps({"ready": True, "load_ms": int((time.time() - t0) * 1000)}), flush=True)

ENV_HZ = 60


def trim(x, sr, thr=0.012, keep=0.04):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(keep * sr))
    b = min(len(x), idx[-1] + int(keep * 2 * sr))
    return x[a:b]


def envelope(x, sr):
    win = int(sr / ENV_HZ)
    n = len(x) // win
    if n == 0:
        return [0.0]
    r = np.sqrt(np.mean(x[: n * win].reshape(n, win) ** 2, axis=1))
    ref = np.percentile(r, 95) + 1e-6
    e = np.clip(r / ref, 0, 1) ** 0.8
    # suavização leve para a boca não tremer
    k = np.array([0.25, 0.5, 0.25])
    e = np.convolve(e, k, mode="same")
    return [round(float(v), 3) for v in e]


for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        req = json.loads(line)
        if req.get("cmd") == "ping":
            print(json.dumps({"ready": True}), flush=True)
            continue
        ts = time.time()
        samples, sr = kokoro.create(req["text"], voice=req.get("voice", "af_heart"), speed=float(req.get("speed", 1.0)), lang=req.get("lang", "en-us"))
        samples = trim(samples.astype(np.float32), sr)
        sf.write(req["out"], samples, sr, subtype="PCM_16")
        print(json.dumps({"id": req["id"], "dur": round(len(samples) / sr, 3), "env": envelope(samples, sr), "sr": sr, "ms": int((time.time() - ts) * 1000)}), flush=True)
    except Exception as ex:  # noqa
        print(json.dumps({"id": req.get("id") if isinstance(req, dict) else None, "error": str(ex)}), flush=True)
