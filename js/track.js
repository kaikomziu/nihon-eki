// 線路の経路を 1m 刻みで生成する（直線・緩和曲線・円曲線・駅）
import { STATION_NAMES } from './data.js';

export const A_SIGN = 1.0; // 制限速度の基準となる横加速度 (m/s^2)

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export class Path {
  constructor({ vmax, seed = Date.now(), stationGap = 2600, tutorial = false }) {
    this.vmax = vmax;             // m/s
    this.rand = rng(seed);
    this.stationGap = stationGap;
    this.x = [0]; this.z = [0]; this.h = [0]; this.k = [0];
    this.curves = [];
    this.signals = [];
    this.stations = [];
    this.lastStation = 0;
    this.nameIdx = Math.floor(this.rand() * STATION_NAMES.length);
    this.nextIsCurve = false;
    // 出発駅
    this.stations.push({ stop: 160, name: '日本駅', start: true });
    if (tutorial) {
      // 練習コース：長い直線 → 制限45km/hのカーブ → 駅
      this.addPiece(1300, 0, 0);
      this.addCurve(160, 40 * Math.PI / 180, 1);
      const stop = this.length + 900;
      this.stations.push({ stop, name: '見習い' });
      this.lastStation = stop;
      this.addPiece(2500, 0, 0);
      return;
    }
    this.addPiece(900, 0, 0);
  }

  get length() { return this.x.length - 1; }

  // len[m] の区間で曲率を k0→k1 に線形変化させる
  addPiece(len, k0, k1) {
    const n = Math.max(1, Math.round(len));
    for (let i = 1; i <= n; i++) {
      const i0 = this.x.length - 1;
      const k = k0 + (k1 - k0) * (i / n);
      const h = this.h[i0] + k;
      const hm = (this.h[i0] + h) / 2;
      this.x.push(this.x[i0] + Math.cos(hm));
      this.z.push(this.z[i0] + Math.sin(hm));
      this.h.push(h);
      this.k.push(k);
    }
  }

  ensure(s) { while (this.length < s) this.generate(); }

  generate() {
    const r = this.rand, s0 = this.length;
    if (s0 - this.lastStation > this.stationGap) {
      // 駅：長い直線の途中に停止位置
      const stop = s0 + 650;
      this.stations.push({ stop, name: STATION_NAMES[this.nameIdx++ % STATION_NAMES.length] });
      this.lastStation = stop;
      this.addPiece(1000, 0, 0);
      this.nextIsCurve = true;
      return;
    }
    if (!this.nextIsCurve) {
      const len = 150 + r() * 550;
      // 長めの直線にはときどき停止信号を置く
      if (len > 350 && s0 > 2500 && r() < 0.28) this.signals.push({ s: Math.round(s0 + len * 0.75), state: 'red' });
      this.addPiece(len, 0, 0);
      this.nextIsCurve = true;
      return;
    }
    this.nextIsCurve = r() < 0.25; // たまにS字

    // 距離が伸びるほどきついカーブが増える
    const diff = Math.min(1, s0 / 15000);
    const fMin = 0.75 - 0.4 * diff, fMax = 1.05 - 0.15 * diff;
    const f = fMin + (fMax - fMin) * r();
    const v = Math.max(15, this.vmax * f);
    const R = Math.max(160, (v * v) / A_SIGN);
    // 最大でも ±0.5+60° ≒ 89° なので x は常に増え、線路は交差しない
    const theta = (15 + r() * 45) * Math.PI / 180;

    // 進行方向が東から大きくそれないように向きを選ぶ
    const hNow = this.h[this.length];
    let dir = r() < 0.5 ? -1 : 1;
    if (hNow > 0.5) dir = -1; else if (hNow < -0.5) dir = 1;
    this.addCurve(R, theta, dir);
  }

  // 緩和曲線つきのカーブ（半径R, 角度theta）
  addCurve(R, theta, dir) {
    const s0 = this.length;
    const arc = R * theta;
    const lt = Math.min(220, Math.max(40, R * 0.06));
    const k = dir / R;
    const limitKmh = Math.max(15, Math.floor(Math.sqrt(A_SIGN * R) * 3.6 / 5) * 5);
    this.curves.push({ start: s0, end: s0 + lt * 2 + arc, R, limit: limitKmh, dir });
    this.addPiece(lt, 0, k);
    this.addPiece(arc, k, k);
    this.addPiece(lt, k, 0);
  }

  // s 位置の座標と向きを out に書き込む
  sample(s, out) {
    s = Math.max(0, s);
    this.ensure(s + 2);
    const i = Math.floor(s), t = s - i;
    out.x = this.x[i] + (this.x[i + 1] - this.x[i]) * t;
    out.z = this.z[i] + (this.z[i + 1] - this.z[i]) * t;
    out.h = this.h[i] + (this.h[i + 1] - this.h[i]) * t;
    out.k = this.k[i] + (this.k[i + 1] - this.k[i]) * t;
    return out;
  }

  // s 以降で最初に来るカーブ（走行中のものを含む）
  curveAt(s) { return this.curves.find(c => c.end > s); }
  stationAfter(s) { return this.stations.find(st => st.stop > s - 30 && !st.start); }
}
