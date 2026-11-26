// Rig 2D de stickman: esqueleto FK + desenho vetorial. Sem assets externos (zero problemas de licença).
// Convenção de ângulos (graus): 0 = membro a apontar para baixo; + = para a frente (direcção para onde a personagem olha).
import { rad, INK, shade, roundRect, hashStr } from './util.js';
const SLEEVED = new Set(['suit', 'suit_v', 'lab', 'hoodie', 'vest', 'stripe']);

export const NEUTRAL_POSE = {
  dx: 0, dy: 0, rot: 0, lean: 0, head: 0, sq: 1,
  aF: [8, 14], aB: [-8, 10],   // [ombro, cotovelo] braço da frente / de trás
  lF: [3, 4], lB: [-3, 4],     // [anca, joelho]
};

const d = (a) => [Math.sin(rad(a)), Math.cos(rad(a))];

// Dimensões do esqueleto em unidades de S (altura aproximada da personagem).
const DIM0 = { thigh: 0.2, shin: 0.2, torso: 0.27, uarm: 0.18, farm: 0.17, headR: 0.17 };
let DIM = DIM0;

// parâmetros de cabeça "desenhada à mão", por personagem (assimetria, queixo, inclinação) — formato das pessoas de referência
function headParams(ch) {
  const h = hashStr([ch.outfit, ch.hair, ch.hat, ch.hairColor, ch.outfitType].join('|')); const r = (k) => ((h >>> (k * 5)) & 31) / 31 - 0.5;
  return { b: 0.94 + r(0) * 0.08, egg: -0.12 + r(1) * 0.06, nTop: 1.75 + r(2) * 0.3, nBot: 2.3 + r(3) * 0.3, asym: 0.14 + r(4) * 0.06, rot: r(5) * 8, lean: 2 + (r(1) + 0.5) * 5, ph: r(2) * 6 };
}
function headPath(ctx, R, hp) {
  ctx.beginPath(); const N = 72;
  for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), n = s < 0 ? hp.nTop : hp.nBot; let X = Math.sign(c) * Math.abs(c) ** (2 / n), Y = Math.sign(s) * Math.abs(s) ** (2 / n); X *= (1 + hp.egg * Y) * (1 + hp.asym * Math.sign(X)); const w = 1 + 0.012 * Math.sin(3 * a + hp.ph) + 0.008 * Math.sin(5 * a + 1 + hp.ph); const x = R * X * w, y = R * hp.b * Y * w; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.closePath();
}

export function drawCharacter(ctx, ch, pose, o) {
  const S = o.S;
  const st = o.st || {};
  const LK = st.legK || 1; DIM = LK === 1 ? DIM0 : { ...DIM0, thigh: DIM0.thigh * LK, shin: DIM0.shin * LK };
  const hp0 = st.cast ? headParams(ch) : null;
  const lw = Math.max(3, S * 0.0125) * (st.lw || 1);
  const skinC = ch.skin || st.skin || '#fff';
  const P = { ...NEUTRAL_POSE, ...pose }; if (hp0) { P.lean += hp0.lean * (o.flip ? -1 : 1) * 0.0 + hp0.lean; P.head += hp0.rot; }
  const legLen = (DIM.thigh + DIM.shin) * S;

  ctx.save();
  // sombra no chão (encolhe quando a personagem salta)
  const air = Math.max(0, -P.dy);
  ctx.save();
  ctx.globalAlpha = 0.22 * Math.max(0.25, 1 - air * 1.6);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(o.x, o.y + 0.012 * S, 0.17 * S * (1 - air * 0.5), 0.032 * S, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.translate(o.x, o.y - legLen + P.dy * S);
  ctx.scale(o.flip ? -1 : 1, 1);
  if (P.rot) ctx.rotate(rad(P.rot));
  if (P.sq !== 1) ctx.scale(1 / Math.sqrt(P.sq), P.sq);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const L = (pt, len, ang) => { const v = d(ang); return [pt[0] + v[0] * len, pt[1] + v[1] * len]; };
  const pelvis = [0, 0];
  const up = [Math.sin(rad(P.lean)), -Math.cos(rad(P.lean))];
  const T = DIM.torso * S * (st.torsoK || 1);
  const neck = [pelvis[0] + up[0] * T, pelvis[1] + up[1] * T];
  const shoulder = [pelvis[0] + up[0] * T * 0.9, pelvis[1] + up[1] * T * 0.9];

  const limb = (a, b, c, w, col = INK) => {
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); if (c) ctx.lineTo(c[0], c[1]); ctx.stroke();
    if (st.rough) { ctx.save(); ctx.globalAlpha *= 0.2; ctx.lineWidth = Math.max(1, w * 0.22); ctx.beginPath(); ctx.moveTo(a[0] + lw * 0.18, a[1] - lw * 0.12); ctx.lineTo(b[0] + lw * 0.12, b[1] + lw * 0.16); if (c) ctx.lineTo(c[0] - lw * 0.14, c[1] + lw * 0.1); ctx.stroke(); ctx.restore(); }
  };
  const hand = (p) => {
    if (st.thinArms) { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(p[0], p[1], lw * (st.handR || 1.35), 0, Math.PI * 2); ctx.fill(); return; }
    ctx.fillStyle = skinC; ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.8;
    ctx.beginPath(); ctx.arc(p[0], p[1], (st.shade ? 0.038 : 0.03) * S, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  };
  const arm = (a, offX) => {
    const s0 = [shoulder[0] + offX * S, shoulder[1]];
    const e = L(s0, DIM.uarm * S, a[0]);
    const w = L(e, DIM.farm * S, a[0] + a[1]);
    if (st.thinArms) limb(s0, e, w, lw * 1.7);
    else if (st.shade && SLEEVED.has(ch.outfitType)) { limb(s0, e, w, lw * 3.3, INK); limb(s0, e, w, lw * 2.0, ch.outfit || '#4a90e2'); } else limb(s0, e, w, lw * 1.05);
    return w;
  };
  const leg = (a, offX) => {
    const h0 = [pelvis[0] + offX * S, pelvis[1]];
    const k = L(h0, DIM.thigh * S, a[0]);
    const shinAng = a[0] - a[1];
    const f = L(k, DIM.shin * S, shinAng);
    limb(h0, k, f, lw * (st.legW || (st.shade ? 1.3 : 1.05)));
    // sapato
    const toe = L(f, 0.085 * S, shinAng + 90);
    ctx.strokeStyle = INK; ctx.lineWidth = lw * 2.6; ctx.beginPath(); ctx.moveTo(f[0], f[1]); ctx.lineTo(toe[0], toe[1]); ctx.stroke();
    ctx.strokeStyle = ch.shoes || '#f2f2f2'; ctx.lineWidth = lw * 1.2; ctx.beginPath(); ctx.moveTo(f[0], f[1]); ctx.lineTo(toe[0], toe[1]); ctx.stroke();
  };

  const cape = ch.acc && ch.acc.includes('cape');
  if (cape) drawCape(ctx, ch, shoulder, pelvis, S, lw, o.t || 0);
  if (ch.hair === 'long' || ch.hair === 'pony') drawHairBack(ctx, ch, neck, up, P, S, lw, st);

  leg(P.lB, -0.035);
  const wB = arm(P.aB, -0.1);
  hand(wB);
  drawTorso(ctx, ch, pelvis, shoulder, S, lw, st);
  leg(P.lF, 0.035);
  const headC = [neck[0] + up[0] * 0.04 * S, neck[1] + up[1] * 0.04 * S];
  drawHead(ctx, ch, headC, P, o, lw);
  const wF = arm(P.aF, 0.1);
  hand(wF);
  if (o.holdProp) o.holdProp(ctx, wF, S, P.aF[0] + P.aF[1]);

  ctx.restore();
  return { hand: wF, head: headC, S, pelvis };
}

function drawTorso(ctx, ch, pelvis, shoulder, S, lw, st = {}) {
  const w = (st.shade ? (st.torsoW || 0.24) : 0.2) * S;
  const body = ch.outfit || '#4a90e2';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = w + lw * 2;
  ctx.beginPath(); ctx.moveTo(pelvis[0], pelvis[1]); ctx.lineTo(shoulder[0], shoulder[1]); ctx.stroke();
  let fillS = body;
  if (st.shade) { const g = ctx.createLinearGradient(pelvis[0] - w / 2, 0, pelvis[0] + w / 2, 0); g.addColorStop(0, shade(body, 0.2)); g.addColorStop(0.5, body); g.addColorStop(1, shade(body, -0.32)); fillS = g; }
  ctx.strokeStyle = fillS; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(pelvis[0], pelvis[1]); ctx.lineTo(shoulder[0], shoulder[1]); ctx.stroke();
  if (st.shade) { ctx.strokeStyle = 'rgba(255,255,255,0.26)'; ctx.lineWidth = lw * 0.9; ctx.beginPath(); ctx.moveTo(pelvis[0] - w * 0.27, pelvis[1] - 0.03 * S); ctx.lineTo(shoulder[0] - w * 0.27, shoulder[1] + 0.03 * S); ctx.stroke(); }
  if (st.shade && st.fabric) {
    ctx.lineCap = 'butt'; ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = Math.max(1.5, lw * 0.5);
    const n = 11; for (let i = 1; i < n; i++) { const k = i / n, px = pelvis[0] + (shoulder[0] - pelvis[0]) * k, py = pelvis[1] + (shoulder[1] - pelvis[1]) * k, hw = w * 0.36 * (k < 0.15 ? 0.7 + k * 2 : k > 0.9 ? 0.8 : 1); ctx.beginPath(); ctx.moveTo(px - hw, py); ctx.lineTo(px + hw, py); ctx.stroke(); }
    ctx.lineCap = 'round';
  }
  const mid = [(pelvis[0] + shoulder[0]) / 2, (pelvis[1] + shoulder[1]) / 2];
  const kind = ch.outfitType || 'tee';
  ctx.save();
  if (kind === 'suit_v') {
    ctx.fillStyle = '#f4f0ea'; ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.6;
    ctx.beginPath(); ctx.moveTo(shoulder[0] - 0.05 * S, shoulder[1] - 0.01 * S); ctx.lineTo(shoulder[0] + 0.05 * S, shoulder[1] - 0.01 * S); ctx.lineTo(shoulder[0], shoulder[1] + 0.12 * S); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (kind === 'cave_fur') {
    ctx.fillStyle = body; ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.95;
    ctx.beginPath(); ctx.moveTo(shoulder[0] - w * 0.62, shoulder[1] + 0.025 * S); ctx.lineTo(pelvis[0] - w * 0.6, pelvis[1] - 0.025 * S);
    ctx.lineTo(pelvis[0] - w * 0.68, pelvis[1] + 0.055 * S); ctx.lineTo(pelvis[0] - w * 0.36, pelvis[1] + 0.035 * S);
    ctx.lineTo(pelvis[0] - w * 0.08, pelvis[1] + 0.07 * S); ctx.lineTo(pelvis[0] + w * 0.18, pelvis[1] + 0.03 * S);
    ctx.lineTo(pelvis[0] + w * 0.47, pelvis[1] + 0.065 * S); ctx.lineTo(pelvis[0] + w * 0.68, pelvis[1] + 0.025 * S);
    ctx.lineTo(pelvis[0] + w * 0.58, pelvis[1] - 0.025 * S); ctx.lineTo(shoulder[0] + w * 0.62, shoulder[1] + 0.025 * S);
    ctx.quadraticCurveTo(shoulder[0], shoulder[1] - 0.045 * S, shoulder[0] - w * 0.62, shoulder[1] + 0.025 * S); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,232,190,.42)'; ctx.lineWidth = Math.max(1.5, lw * 0.48); ctx.beginPath(); ctx.moveTo(mid[0] - w * .3, mid[1]); ctx.lineTo(mid[0] + w * .28, mid[1] + .02 * S); ctx.stroke();
  } else if (kind === 'vest') {
    for (let i = -2; i <= 2; i++) { ctx.strokeStyle = i % 2 ? (ch.stripeA || '#d9803a') : (ch.stripeB || '#2f5f86'); ctx.lineWidth = w * 0.17; ctx.beginPath(); ctx.moveTo(pelvis[0] + i * w * 0.2, pelvis[1] - 0.02 * S); ctx.lineTo(shoulder[0] + i * w * 0.2, shoulder[1] + 0.02 * S); ctx.stroke(); }
  } else if (kind === 'suit') {
    ctx.strokeStyle = shade(body, -0.35); ctx.lineWidth = lw * 0.8;
    ctx.beginPath(); ctx.moveTo(shoulder[0] - 0.05 * S, shoulder[1]); ctx.lineTo(mid[0], mid[1] + 0.02 * S); ctx.lineTo(shoulder[0] + 0.05 * S, shoulder[1]); ctx.stroke();
    ctx.fillStyle = ch.tie || '#d93a3a'; ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.6;
    ctx.beginPath(); ctx.moveTo(shoulder[0] - 0.012 * S, shoulder[1] + 0.01 * S); ctx.lineTo(shoulder[0] + 0.012 * S, shoulder[1] + 0.01 * S);
    ctx.lineTo(mid[0] + 0.018 * S, mid[1] + 0.05 * S); ctx.lineTo(mid[0], mid[1] + 0.09 * S); ctx.lineTo(mid[0] - 0.018 * S, mid[1] + 0.05 * S); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (kind === 'lab') {
    ctx.strokeStyle = '#c9ced6'; ctx.lineWidth = lw * 0.7;
    ctx.beginPath(); ctx.moveTo(shoulder[0], shoulder[1] + 0.01 * S); ctx.lineTo(pelvis[0], pelvis[1] - 0.01 * S); ctx.stroke();
    ctx.fillStyle = INK; for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(mid[0] + 0.02 * S, mid[1] - 0.03 * S + i * 0.07 * S, lw * 0.5, 0, 7); ctx.fill(); }
  } else if (kind === 'hoodie') {
    ctx.strokeStyle = shade(body, -0.3); ctx.lineWidth = lw * 0.8;
    roundRect(ctx, mid[0] - 0.06 * S, mid[1] + 0.0 * S, 0.12 * S, 0.06 * S, 0.02 * S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(shoulder[0] - 0.02 * S, shoulder[1] + 0.02 * S); ctx.lineTo(shoulder[0] - 0.02 * S, shoulder[1] + 0.09 * S); ctx.moveTo(shoulder[0] + 0.02 * S, shoulder[1] + 0.02 * S); ctx.lineTo(shoulder[0] + 0.02 * S, shoulder[1] + 0.09 * S); ctx.stroke();
  } else if (kind === 'apron') {
    ctx.fillStyle = '#fafafa'; ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.7;
    roundRect(ctx, mid[0] - 0.07 * S, mid[1] - 0.06 * S, 0.14 * S, 0.15 * S, 0.02 * S); ctx.fill(); ctx.stroke();
  } else if (kind === 'dress') {
    ctx.fillStyle = body; ctx.strokeStyle = INK; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(pelvis[0] - 0.09 * S, pelvis[1] - 0.04 * S); ctx.lineTo(pelvis[0] - 0.17 * S, pelvis[1] + 0.1 * S); ctx.lineTo(pelvis[0] + 0.17 * S, pelvis[1] + 0.1 * S); ctx.lineTo(pelvis[0] + 0.09 * S, pelvis[1] - 0.04 * S); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (kind === 'stripe') {
    ctx.strokeStyle = shade(body, 0.55); ctx.lineWidth = lw * 1.1;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(mid[0] - 0.08 * S, mid[1] + i * 0.06 * S); ctx.lineTo(mid[0] + 0.08 * S, mid[1] + i * 0.06 * S); ctx.stroke(); }
  }
  ctx.restore();
}

function drawCape(ctx, ch, shoulder, pelvis, S, lw, t) {
  const sway = Math.sin(t * 3) * 0.02 * S;
  ctx.fillStyle = ch.cape || '#d93a3a'; ctx.strokeStyle = INK; ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(shoulder[0] - 0.06 * S, shoulder[1]);
  ctx.quadraticCurveTo(shoulder[0] - 0.22 * S + sway, pelvis[1] + 0.04 * S, shoulder[0] - 0.3 * S + sway * 2, pelvis[1] + 0.16 * S);
  ctx.lineTo(shoulder[0] - 0.05 * S, pelvis[1] + 0.12 * S);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

function drawHairBack(ctx, ch, neck, up, P, S, lw, st = {}) {
  const R = DIM.headR * S * (st.head || 1);
  const c = [neck[0] + up[0] * 0.04 * S, neck[1] + up[1] * 0.04 * S - R * 0.9];
  ctx.fillStyle = ch.hairColor || '#2b2118'; ctx.strokeStyle = INK; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.ellipse(c[0] - R * 0.35, c[1] + R * 0.55, R * 0.95, R * 1.35, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function drawHead(ctx, ch, headC0, P, o, lw) {
  const S = o.S, R = DIM.headR * S * ((o.st && o.st.head) || 1);
  ctx.save();
  // centro da cabeça: acima do pescoço
  const c = [headC0[0], headC0[1] - R * 0.92];
  ctx.translate(c[0], c[1]);
  ctx.rotate(rad(P.head + P.lean * 0.3));
  // cabeça
  const skin0 = ch.skin || (o.st && o.st.skin) || '#ffffff';
  if (o.st && o.st.shade) { const g = ctx.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R * 1.05); g.addColorStop(0, shade(skin0, 0.4)); g.addColorStop(0.55, skin0); g.addColorStop(1, shade(skin0, -0.16)); ctx.fillStyle = g; } else ctx.fillStyle = skin0;
  if (o.st && o.st.cast) {
    const hp = headParams(ch); ctx.rotate(rad(hp.rot * 0.5));
    const sk = skin0; const g = ctx.createRadialGradient(-R * 0.28, -R * 0.32, R * 0.25, 0, 0, R * 1.08); g.addColorStop(0, sk); g.addColorStop(0.62, sk); g.addColorStop(1, shade(sk, -0.1)); ctx.fillStyle = g;
    ctx.save(); ctx.translate(lw * 0.5, lw * 0.75); headPath(ctx, R, hp); ctx.strokeStyle = INK; ctx.lineWidth = lw * 1.5; ctx.stroke(); ctx.restore();
    headPath(ctx, R, hp); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.95; ctx.stroke();
  } else {
  ctx.strokeStyle = INK; ctx.lineWidth = lw * 1.15;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  drawFace(ctx, ch, R, o, lw);
  drawHairFront(ctx, ch, R, lw, o);
  drawHeadAcc(ctx, ch, R, lw);
  ctx.restore();
}

function drawFace(ctx, ch, R, o, lw) {
  const f = o.faceDef;
  const C = o.st && o.st.cast;
  const fx = R * (C ? 0.3 : 0.14); // olhar ligeiramente para a frente (3/4)
  const ex = R * (C ? 0.27 : 0.34), ey = C ? R * 0.02 : -R * 0.06;
  const blink = o.blink ? Math.max(0.08, 1 - o.blink) : 1;
  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = lw * 0.9; ctx.lineCap = 'round';

  const eye = (sx) => {
    const pk = C ? (sx > 0 ? 0.82 : 1.0) : 1; const x = fx + sx * ex * (C && sx > 0 ? 0.92 : 1), y = ey + (C && sx > 0 ? -R * 0.015 : 0);
    const pxo = (f.pupil ? f.pupil[0] : 0) * R * 0.1, pyo = (f.pupil ? f.pupil[1] : 0) * R * 0.1;
    let et = (f.winkL && sx < 0) ? 'closed' : f.eye, lidOv; if (o.st && o.st.shade && et === 'line') { et = 'dot'; lidOv = f.lid ?? 0.6; }
    switch (et) {
      case 'closed': // ^ ^ feliz
        ctx.beginPath(); ctx.arc(x, y + R * 0.06, R * 0.13, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); break;
      case 'line':
        ctx.beginPath(); ctx.moveTo(x - R * 0.12, y + R * 0.02); ctx.lineTo(x + R * 0.12, y + R * 0.02); ctx.stroke(); break;
      case 'wide':
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x, y, R * (C ? 0.22 : 0.17) * pk, R * (C ? 0.23 : 0.2) * blink, 0, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x + pxo, y + pyo, R * (C ? 0.06 : 0.05), 0, 7); ctx.fill(); break;
      case 'open':
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x, y, R * 0.14, R * 0.16 * blink, 0, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x + pxo, y + pyo, R * 0.06, 0, 7); ctx.fill(); break;
      case 'x':
        ctx.beginPath(); ctx.moveTo(x - R * .1, y - R * .1); ctx.lineTo(x + R * .1, y + R * .1); ctx.moveTo(x + R * .1, y - R * .1); ctx.lineTo(x - R * .1, y + R * .1); ctx.stroke(); break;
      case 'star':
        ctx.fillStyle = '#ffcc00'; ctx.beginPath();
        for (let i = 0; i < 10; i++) { const r = i % 2 ? R * 0.06 : R * 0.15; const a = -Math.PI / 2 + (i * Math.PI) / 5; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
        ctx.closePath(); ctx.fill(); ctx.stroke(); break;
      default: // dot
        if (C) {
          const L = Math.min(1, (lidOv ?? f.lid ?? 0.3) + (o.blink || 0) * 0.8);
          if (L > 0.3) { const rx = R * 0.2 * pk, ry = R * 0.13; ctx.beginPath(); ctx.ellipse(x + pxo * 0.6, y + R * 0.04, rx, ry, 0, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.lineWidth = lw * 1.1; ctx.beginPath(); ctx.moveTo(x - rx * 1.1, y + R * 0.04); ctx.lineTo(x + rx * 1.1, y + R * 0.04); ctx.stroke(); }
          else { ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x + pxo * 0.6, y + pyo * 0.6, R * 0.1 * pk, R * 0.145 * Math.max(0.15, blink), 0, 0, 7); ctx.fill(); }
        } else if (o.st && o.st.shade) {
          const rx = R * 0.17, ry = R * 0.19 * Math.max(0.15, blink), L = Math.min(1, (lidOv ?? f.lid ?? 0.3) + (o.blink || 0) * 0.7);
          ctx.fillStyle = '#fff'; ctx.lineWidth = lw * 0.8; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); ctx.stroke();
          ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x + pxo + R * 0.04, y + pyo + ry * 0.12, R * 0.075, 0, 7); ctx.fill();
          ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, rx * 1.02, ry * 1.02, 0, 0, 7); ctx.clip();
          ctx.fillStyle = ch.skin || o.st.skin; ctx.fillRect(x - rx * 1.2, y - ry * 1.2, rx * 2.4, ry * 2 * L + ry * 0.2); ctx.restore();
          ctx.lineWidth = lw * 1.1; ctx.beginPath(); ctx.moveTo(x - rx * 1.05, y - ry + ry * 2 * L); ctx.lineTo(x + rx * 1.05, y - ry + ry * 2 * L); ctx.stroke();
        } else { ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x + pxo, y + pyo, R * 0.075, R * 0.09 * blink, 0, 0, 7); ctx.fill(); }
    }
    // sobrancelha: a>0 => lado interno (perto do centro) sobe
    if (f.brow) {
      const a = f.brow[sx < 0 ? 0 : 1];
      const by = y - R * ((C ? 0.4 : 0.26) + (f.browY || 0));
      const bw = C ? 0.17 : 0.13; const ix = x - sx * R * bw, ox = x + sx * R * bw;
      const dy = Math.tan(rad(a)) * R * bw;
      ctx.lineWidth = lw * (C ? 1.7 : 1);
      ctx.beginPath(); ctx.moveTo(ix, by - dy); ctx.lineTo(ox, by + dy); ctx.stroke();
      ctx.lineWidth = lw * 0.9;
    }
  };
  eye(-1); eye(1);

  if (f.blush && !C) { ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = '#ff6b81'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(fx + sx * R * 0.55, R * 0.25, R * 0.14, R * 0.08, 0, 0, 7); ctx.fill(); } ctx.restore(); }

  // boca
  const mx = fx * (C ? 1.05 : 0.9), my = R * (C ? 0.4 : 0.42);
  if (C) { ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.9; ctx.beginPath(); ctx.moveTo(fx + R * 0.3, R * 0.06); ctx.quadraticCurveTo(fx + R * 0.42, R * 0.17, fx + R * 0.27, R * 0.21); ctx.stroke(); }
  const open = Math.max(f.openBase || 0, o.mouthOpen || 0);
  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = lw * 0.95;
  if (open > 0.06) {
    const w = R * (f.mouth === 'big' || f.mouth === 'smile' ? 0.34 : 0.26);
    const h = R * (0.06 + open * 0.3);
    ctx.fillStyle = '#4a1f1f'; ctx.beginPath(); ctx.ellipse(mx, my + h * 0.3, w, h, 0, 0, 7); ctx.fill(); ctx.stroke();
    if (open > 0.5) { ctx.fillStyle = '#e8737f'; ctx.beginPath(); ctx.ellipse(mx, my + h * 0.7, w * 0.55, h * 0.4, 0, 0, Math.PI); ctx.fill(); }
  } else {
    switch (f.mouth) {
      case 'smile': ctx.beginPath(); ctx.arc(mx, my - R * 0.1, R * 0.24, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); break;
      case 'frown': ctx.beginPath(); ctx.arc(mx, my + R * 0.22, R * 0.22, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); break;
      case 'smirk': ctx.beginPath(); ctx.moveTo(mx - R * 0.18, my + R * 0.04); ctx.quadraticCurveTo(mx + R * 0.05, my + R * 0.1, mx + R * 0.24, my - R * 0.08); ctx.stroke(); break;
      case 'wavy': ctx.beginPath(); ctx.moveTo(mx - R * 0.22, my); ctx.quadraticCurveTo(mx - R * 0.11, my - R * 0.1, mx, my); ctx.quadraticCurveTo(mx + R * 0.11, my + R * 0.1, mx + R * 0.22, my); ctx.stroke(); break;
      case 'o': ctx.beginPath(); ctx.ellipse(mx, my + R * 0.05, R * 0.09, R * 0.12, 0, 0, 7); ctx.fill(); break;
      default: { const hw = R * (C ? 0.11 : 0.16); ctx.beginPath(); ctx.moveTo(mx - hw, my + (C ? R * 0.015 : 0)); ctx.lineTo(mx + hw, my - (C ? R * 0.015 : 0)); ctx.stroke(); }
    }
  }
  if (f.sweat) { ctx.fillStyle = '#7ac7ff'; ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.5; ctx.beginPath(); ctx.moveTo(R * 0.8, -R * 0.45); ctx.quadraticCurveTo(R * 1.0, -R * 0.15, R * 0.8, -R * 0.1); ctx.quadraticCurveTo(R * 0.6, -R * 0.15, R * 0.8, -R * 0.45); ctx.fill(); ctx.stroke(); }
  if (f.tear) { ctx.fillStyle = '#7ac7ff'; ctx.beginPath(); ctx.ellipse(fx + ex * 1.05, R * 0.3, R * 0.05, R * 0.1, 0, 0, 7); ctx.fill(); }
  if (f.vein) { ctx.strokeStyle = '#d93a3a'; ctx.lineWidth = lw * 0.9; const vx = -R * 0.6, vy = -R * 0.72; ctx.beginPath(); ctx.moveTo(vx - R * .12, vy); ctx.lineTo(vx, vy - R * .02); ctx.moveTo(vx, vy + R * .12); ctx.lineTo(vx - R * .02, vy); ctx.moveTo(vx + R * .12, vy); ctx.lineTo(vx, vy + R * .02); ctx.stroke(); }
}

function drawHairFront(ctx, ch, R, lw, o) {
  const col = ch.hairColor || '#2b2118';
  const k = ch.hair;
  if (!k || k === 'none') return;
  ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = lw;
  if (k === 'short' || k === 'long' || k === 'pony') {
    ctx.beginPath(); ctx.arc(0, 0, R * 1.02, Math.PI * 1.02, Math.PI * 1.98); ctx.quadraticCurveTo(R * 0.5, -R * 0.62, -R * 0.2, -R * 0.55); ctx.quadraticCurveTo(-R * 0.7, -R * 0.5, -R * 1.0, -R * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (k === 'spiky') {
    const n = 7, a0 = Math.PI * 1.06, a1 = Math.PI * 1.94;
    ctx.beginPath(); ctx.moveTo(Math.cos(a0) * R, Math.sin(a0) * R);
    for (let i = 0; i < n; i++) { const am = a0 + ((i + 0.5) / n) * (a1 - a0), ae = a0 + ((i + 1) / n) * (a1 - a0); ctx.lineTo(Math.cos(am) * R * 1.42, Math.sin(am) * R * 1.42); ctx.lineTo(Math.cos(ae) * R * 1.0, Math.sin(ae) * R * 1.0); }
    ctx.quadraticCurveTo(R * 0.2, -R * 0.55, Math.cos(a0) * R, Math.sin(a0) * R); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (k === 'bun') {
    ctx.beginPath(); ctx.arc(0, -R * 1.18, R * 0.34, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, R * 1.02, Math.PI * 1.1, Math.PI * 1.9); ctx.quadraticCurveTo(0, -R * 0.55, -R * 0.9, -R * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (k === 'bald') { /* nada */ }
  else if (k === 'curly') {
    for (let i = 0; i < 7; i++) { const a = Math.PI * 1.05 + (i / 6) * Math.PI * 0.9; ctx.beginPath(); ctx.arc(Math.cos(a) * R * 1.0, Math.sin(a) * R * 1.0, R * 0.3, 0, 7); ctx.fill(); ctx.stroke(); }
  }
}

function drawHeadAcc(ctx, ch, R, lw) {
  const acc = ch.acc || [];
  ctx.strokeStyle = INK; ctx.lineWidth = lw;
  if (acc.includes('glasses')) {
    ctx.lineWidth = lw * 0.9; ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(R * 0.14 + sx * R * 0.34, -R * 0.06, R * 0.24, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(R * 0.14 - R * 0.1, -R * 0.08); ctx.lineTo(R * 0.14 + R * 0.1, -R * 0.08); ctx.stroke();
  }
  if (acc.includes('shades')) {
    ctx.fillStyle = INK;
    for (const sx of [-1, 1]) { roundRect(ctx, R * 0.14 + sx * R * 0.34 - R * 0.24, -R * 0.2, R * 0.48, R * 0.3, R * 0.1); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(R * 0.14 - R * 0.1, -R * 0.1); ctx.lineTo(R * 0.14 + R * 0.1, -R * 0.1); ctx.stroke();
  }
  if (acc.includes('mustache')) { ctx.fillStyle = ch.hairColor || '#2b2118'; ctx.beginPath(); ctx.ellipse(R * 0.1 - R * 0.14, R * 0.27, R * 0.17, R * 0.07, -0.2, 0, 7); ctx.ellipse(R * 0.1 + R * 0.18, R * 0.27, R * 0.17, R * 0.07, 0.2, 0, 7); ctx.fill(); }
  if (acc.includes('beard')) { ctx.fillStyle = ch.hairColor || '#2b2118'; ctx.beginPath(); ctx.arc(0, 0, R * 1.02, Math.PI * 0.12, Math.PI * 0.88); ctx.quadraticCurveTo(0, R * 0.5, R * 0.95, R * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  const hat = ch.hat;
  if (hat) {
    ctx.fillStyle = ch.hatColor || '#e0a526'; ctx.strokeStyle = INK; ctx.lineWidth = lw;
    if (hat === 'cap') { ctx.beginPath(); ctx.arc(0, -R * 0.1, R * 1.05, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(R * 0.85, -R * 0.2, R * 0.55, R * 0.1, 0, 0, 7); ctx.fill(); ctx.stroke(); }
    else if (hat === 'tophat') { roundRect(ctx, -R * 0.6, -R * 1.9, R * 1.2, R * 1.1, R * 0.08); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, -R * 0.82, R * 0.95, R * 0.16, 0, 0, 7); ctx.fill(); ctx.stroke(); }
    else if (hat === 'chef') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-R * 0.4, -R * 1.25, R * 0.4, 0, 7); ctx.arc(R * 0.4, -R * 1.25, R * 0.4, 0, 7); ctx.arc(0, -R * 1.5, R * 0.45, 0, 7); ctx.fill(); ctx.stroke(); roundRect(ctx, -R * 0.62, -R * 1.15, R * 1.24, R * 0.4, R * 0.05); ctx.fill(); ctx.stroke(); }
    else if (hat === 'crown') { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(-R * 0.7, -R * 0.8); ctx.lineTo(-R * 0.7, -R * 1.5); ctx.lineTo(-R * 0.35, -R * 1.15); ctx.lineTo(0, -R * 1.6); ctx.lineTo(R * 0.35, -R * 1.15); ctx.lineTo(R * 0.7, -R * 1.5); ctx.lineTo(R * 0.7, -R * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (hat === 'beanie') { ctx.beginPath(); ctx.arc(0, -R * 0.1, R * 1.06, Math.PI * 1.0, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -R * 1.2, R * 0.2, 0, 7); ctx.fill(); ctx.stroke(); }
    else if (hat === 'grad') { ctx.fillStyle = '#222'; ctx.beginPath(); ctx.moveTo(-R * 1.1, -R * 0.95); ctx.lineTo(0, -R * 1.3); ctx.lineTo(R * 1.1, -R * 0.95); ctx.lineTo(0, -R * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(R * 1.0, -R * 0.92); ctx.lineTo(R * 1.0, -R * 0.4); ctx.stroke(); }
    else if (hat === 'hardhat') { ctx.beginPath(); ctx.arc(0, -R * 0.1, R * 1.06, Math.PI * 1.0, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, -R * 0.1, R * 1.25, R * 0.1, 0, 0, 7); ctx.fill(); ctx.stroke(); }
    else if (hat === 'wizard') { ctx.fillStyle = ch.hatColor || '#5b3fb0'; ctx.beginPath(); ctx.moveTo(-R * 0.95, -R * 0.7); ctx.lineTo(R * 0.2, -R * 2.3); ctx.lineTo(R * 0.95, -R * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, -R * 0.72, R * 1.25, R * 0.17, 0, 0, 7); ctx.fill(); ctx.stroke(); }
    else if (hat === 'fedora') { ctx.fillStyle = ch.hatColor || '#8a5a2b'; ctx.beginPath(); ctx.ellipse(0, -R * 0.62, R * 1.35, R * 0.2, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-R * 0.75, -R * 0.66); ctx.quadraticCurveTo(-R * 0.7, -R * 1.5, 0, -R * 1.5); ctx.quadraticCurveTo(R * 0.7, -R * 1.5, R * 0.75, -R * 0.66); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#2a1710'; ctx.fillRect(-R * 0.73, -R * 0.9, R * 1.46, R * 0.2); }
    else if (hat === 'helmet') { ctx.fillStyle = ch.hatColor || '#5f6b4a'; ctx.beginPath(); ctx.arc(0, -R * 0.12, R * 1.12, Math.PI * 1.02, Math.PI * 1.98); ctx.quadraticCurveTo(R * 1.35, -R * 0.1, R * 1.25, -R * 0.02); ctx.lineTo(-R * 1.25, -R * 0.02); ctx.quadraticCurveTo(-R * 1.35, -R * 0.1, -R * 1.1, -R * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(-R * 0.2, -R * 0.15, R * 0.85, Math.PI * 1.15, Math.PI * 1.5); ctx.stroke(); }
    else if (hat === 'ushanka') { ctx.fillStyle = ch.hatColor || '#6b5a48'; ctx.beginPath(); ctx.arc(0, -R * 0.42, R * 1.1, Math.PI * 1.0, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(-R * 1.04, -R * 0.2, R * 0.24, R * 0.5, 0.1, 0, 7); ctx.ellipse(R * 1.04, -R * 0.2, R * 0.24, R * 0.5, -0.1, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#c8b99a'; ctx.beginPath(); ctx.rect(-R * 1.1, -R * 0.62, R * 2.2, R * 0.24); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(0, -R * 0.92, R * 0.12, 0, 7); ctx.fill(); }
    else if (hat === 'peaked') { ctx.fillStyle = ch.hatColor || '#4b4a3c'; ctx.beginPath(); ctx.moveTo(-R * 1.08, -R * 0.4); ctx.quadraticCurveTo(-R * 1.0, -R * 1.25, 0, -R * 1.22); ctx.quadraticCurveTo(R * 1.0, -R * 1.25, R * 1.08, -R * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.moveTo(-R * 1.1, -R * 0.4); ctx.lineTo(R * 1.1, -R * 0.4); ctx.lineTo(R * 1.35, -R * 0.2); ctx.lineTo(-R * 0.2, -R * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (hat === 'police') { ctx.fillStyle = '#26396b'; ctx.beginPath(); ctx.arc(0, -R * 0.1, R * 1.05, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(R * 0.05, -R * 0.78, R * 0.14, 0, 7); ctx.fill(); ctx.stroke(); }
  }
  if (acc.includes('headband')) { ctx.strokeStyle = ch.hatColor || '#d93a3a'; ctx.lineWidth = lw * 2; ctx.beginPath(); ctx.arc(0, 0, R * 1.0, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
}
