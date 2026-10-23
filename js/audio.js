// WebAudio で作る簡単な効果音
let ctx, master, motor, motorGain, motor2, noise, noiseGain, squealGain, squeal;

export function initAudio() {
  if (ctx) { ctx.resume(); return; }
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);

  // モーター音（VVVF風）
  motor = ctx.createOscillator(); motor.type = 'sawtooth';
  motor2 = ctx.createOscillator(); motor2.type = 'square';
  motorGain = ctx.createGain(); motorGain.gain.value = 0;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
  motor.connect(lp); motor2.connect(lp); lp.connect(motorGain); motorGain.connect(master);
  motor.start(); motor2.start();

  // 走行音（ノイズ）
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 500;
  noiseGain = ctx.createGain(); noiseGain.gain.value = 0;
  noise.connect(bp); bp.connect(noiseGain); noiseGain.connect(master);
  noise.start();

  // カーブのきしみ
  squeal = ctx.createOscillator(); squeal.type = 'sine'; squeal.frequency.value = 2900;
  squealGain = ctx.createGain(); squealGain.gain.value = 0;
  squeal.connect(squealGain); squealGain.connect(master); squeal.start();
}

export function setRunning(speedKmh, powerRatio, squealAmt, active) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const on = active ? 1 : 0;
  const f = 180 + speedKmh * 9;
  motor.frequency.setTargetAtTime(f, t, 0.05);
  motor2.frequency.setTargetAtTime(f * 0.5 + 40, t, 0.05);
  motorGain.gain.setTargetAtTime(on * (0.012 + 0.05 * Math.abs(powerRatio)) * Math.min(1, speedKmh / 8 + 0.2), t, 0.08);
  noiseGain.gain.setTargetAtTime(on * Math.min(0.25, speedKmh / 500), t, 0.1);
  squealGain.gain.setTargetAtTime(on * squealAmt * 0.05, t, 0.05);
}

function tone(freq, dur, type = 'sine', vol = 0.3, delay = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

export const sfx = {
  joint(speed) { // ガタンゴトン
    const v = Math.min(0.25, 0.05 + speed / 600);
    tone(90, 0.08, 'triangle', v); tone(80, 0.08, 'triangle', v, 0.09);
  },
  horn() { tone(440, 0.7, 'sawtooth', 0.12); tone(554, 0.7, 'sawtooth', 0.1); },
  notch() { tone(1200, 0.04, 'square', 0.06); },
  chime() { [659, 523, 587, 392].forEach((f, i) => tone(f, 0.45, 'sine', 0.2, i * 0.32)); },
  alarm() { tone(1800, 0.12, 'square', 0.08); },
  coin() { tone(988, 0.1, 'square', 0.12); tone(1319, 0.25, 'square', 0.12, 0.08); },
  crash() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = noise.buffer;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    src.connect(lp); lp.connect(g); g.connect(master); src.start(t); src.stop(t + 2.3);
    tone(60, 1.5, 'sawtooth', 0.4);
  },
  click() { tone(700, 0.05, 'triangle', 0.12); },
};
