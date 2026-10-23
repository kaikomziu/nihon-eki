// 電車の3Dモデル（ローカル +X が進行方向、+Y が上）
import * as THREE from 'three';

export const CAR_LEN = { commuter: 20, express: 21, shinkansen: 25, maglev: 24, steam: 17 };
const GAP = 0.8;

const box = new THREE.BoxGeometry(1, 1, 1);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 14);
const glass = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
const dark = new THREE.MeshLambertMaterial({ color: 0x222428 });
const wheelMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6d0 });
const roofMat = new THREE.MeshLambertMaterial({ color: 0x9aa1aa });

function part(geo, mat, sx, sy, sz, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(sx, sy, sz); m.position.set(x, y, z);
  return m;
}

function bogie(g, x, wide) {
  g.add(part(box, dark, 3, 0.5, wide ? 2.4 : 2.2, x, 0.9, 0));
  for (const dx of [-0.9, 0.9]) {
    const w = part(cyl, wheelMat, 0.45, 2.2, 0.45, x + dx, 0.8, 0);
    w.rotation.x = Math.PI / 2;
    g.add(w);
  }
}

// 通勤・快速・特急・新幹線・リニア 共通の箱型車体
function carBody(t, len, isHead, isTail, style) {
  const g = new THREE.Group();
  const body = new THREE.MeshLambertMaterial({ color: t.body });
  const stripe = new THREE.MeshLambertMaterial({ color: t.stripe });
  const stripe2 = new THREE.MeshLambertMaterial({ color: t.stripe2 });
  const W = style === 'shinkansen' || style === 'maglev' ? 3.35 : 2.9;
  const H = style === 'commuter' ? 3.0 : 2.85;
  const y0 = style === 'maglev' ? 1.0 : 1.3;
  const nose = style === 'shinkansen' ? 9 : style === 'maglev' ? 11 : style === 'express' ? 3.2 : 0;
  const front = isHead ? nose : 0, rear = isTail ? nose : 0;
  const L = len - front - rear;
  const cx = (rear - front) / 2;

  g.add(part(box, body, L, H, W, cx, y0 + H / 2, 0));
  g.add(part(box, glass, L - 1.5, 0.9, W + 0.02, cx, y0 + H * 0.62, 0));
  g.add(part(box, stripe, L, 0.32, W + 0.03, cx, y0 + H * 0.3, 0));
  if (style !== 'commuter') g.add(part(box, stripe2, L, 0.12, W + 0.03, cx, y0 + H * 0.42, 0));
  g.add(part(box, roofMat, L, 0.25, W - 0.3, cx, y0 + H + 0.12, 0));
  if (style === 'commuter') {
    // ドア
    for (const dx of [-0.36, -0.12, 0.12, 0.36]) {
      g.add(part(box, glass, 1.3, H * 0.85, W + 0.04, cx + dx * L, y0 + H * 0.47, 0));
    }
    g.add(part(box, dark, 2, 0.5, 1.4, cx, y0 + H + 0.5, 0)); // パンタ台
  }

  const capEnd = (dir) => {
    const ex = cx + dir * L / 2;
    const nose = dir > 0 ? front : rear;
    const lit = dir > 0 ? isHead : isTail;
    if (nose === 0) {
      g.add(part(box, glass, 0.06, 1.1, W - 0.6, ex + dir * 0.02, y0 + H * 0.65, 0));
      g.add(part(box, stripe, 0.08, 0.5, W, ex + dir * 0.02, y0 + H * 0.3, 0));
      if (lit) for (const z of [-1, 1]) g.add(part(box, lightMat, 0.08, 0.2, 0.35, ex + dir * 0.03, y0 + 0.6, z * (W / 2 - 0.4)));
      return;
    }
    // 流線形の先頭（楕円体を引き伸ばす）
    const n = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), body);
    n.rotation.z = -dir * Math.PI / 2;
    n.scale.set(H / 2, nose, W / 2);
    n.position.set(ex, y0 + H / 2, 0);
    g.add(n);
    const n2 = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), stripe);
    n2.rotation.z = -dir * Math.PI / 2;
    n2.scale.set(H * 0.12, nose * 0.97, W / 2 + 0.03);
    n2.position.set(ex, y0 + H * 0.3, 0);
    g.add(n2);
    const win = part(box, glass, nose * 0.35, 0.6, W * 0.55, ex + dir * nose * 0.32, y0 + H * 0.78, 0);
    win.rotation.z = -dir * 0.35;
    g.add(win);
    if (lit) for (const z of [-1, 1]) g.add(part(box, lightMat, 0.5, 0.15, 0.4, ex + dir * nose * 0.6, y0 + H * 0.35, z * 0.9));
  };
  capEnd(1);
  capEnd(-1);

  if (style === 'maglev') {
    g.add(part(box, dark, len * 0.85, 0.7, W - 0.4, 0, 0.75, 0));
  } else {
    bogie(g, len / 2 - 3.5, style === 'shinkansen');
    bogie(g, -len / 2 + 3.5, style === 'shinkansen');
    g.add(part(box, dark, len - 2, 0.5, W - 0.2, 0, y0 - 0.15, 0));
  }
  return g;
}

function steamLoco(t, len) {
  const g = new THREE.Group();
  const body = new THREE.MeshLambertMaterial({ color: t.body });
  const red = new THREE.MeshLambertMaterial({ color: t.stripe });
  const gold = new THREE.MeshLambertMaterial({ color: t.stripe2 });
  const boiler = part(cyl, body, 1.25, len * 0.62, 1.25, 1.2, 2.9, 0);
  boiler.rotation.z = Math.PI / 2;
  g.add(boiler);
  const smokeBox = part(cyl, dark, 1.3, 0.3, 1.3, 1.2 + len * 0.31, 2.9, 0);
  smokeBox.rotation.z = Math.PI / 2;
  g.add(smokeBox);
  g.add(part(cyl, body, 0.45, 1.4, 0.45, 5.6, 4.6, 0));                 // 煙突
  g.add(part(cyl, gold, 0.5, 0.8, 0.5, 2.4, 4.3, 0));                   // ドーム
  g.add(part(box, body, 4, 3.4, 3, -len / 2 + 2.4, 3.2, 0));            // 運転室
  g.add(part(box, glass, 1.2, 1, 3.04, -len / 2 + 2.6, 3.8, 0));
  g.add(part(box, dark, 4.4, 0.3, 3.3, -len / 2 + 2.4, 5.0, 0));
  g.add(part(box, red, len - 1, 0.5, 3, 0, 1.4, 0));                    // 台枠
  g.add(part(box, red, 0.3, 0.8, 2.8, len / 2 - 0.3, 1.2, 0));          // 前梁
  g.add(part(box, lightMat, 0.2, 0.5, 0.5, 1.2 + len * 0.31 + 0.2, 3.9, 0));
  for (const x of [-2.5, 0, 2.5]) {
    for (const z of [-1.3, 1.3]) {
      const w = part(cyl, red, 1.0, 0.2, 1.0, x - 0.5, 1.0, z);
      w.rotation.x = Math.PI / 2; g.add(w);
    }
  }
  g.add(part(box, gold, 6, 0.12, 0.1, -0.5, 1.0, 1.42));
  g.add(part(box, gold, 6, 0.12, 0.1, -0.5, 1.0, -1.42));
  return g;
}

function coach(t, len) {
  const g = new THREE.Group();
  const body = new THREE.MeshLambertMaterial({ color: 0x5a1f1a });
  g.add(part(box, body, len, 2.8, 2.8, 0, 2.7, 0));
  g.add(part(box, glass, len - 2, 0.8, 2.84, 0, 3.1, 0));
  const roof = part(cyl, dark, 1.45, len, 0.4, 0, 4.1, 0);
  roof.rotation.z = Math.PI / 2;
  g.add(roof);
  bogie(g, len / 2 - 3, false); bogie(g, -len / 2 + 3, false);
  return g;
}

export function buildTrain(t) {
  const style = t.style;
  const len = CAR_LEN[style];
  const cars = [];
  for (let i = 0; i < t.cars; i++) {
    let m;
    if (style === 'steam') m = i === 0 ? steamLoco(t, len) : coach(t, len);
    else m = carBody(t, len, i === 0, i === t.cars - 1, style);
    const holder = new THREE.Group();   // 位置・向きは holder、揺れは内側
    holder.add(m);
    cars.push({ obj: holder, inner: m, offset: i * (len + GAP) + len / 2, len,
      vel: new THREE.Vector3(), spin: new THREE.Vector3() });
  }
  // ヘッドライト
  const head = new THREE.SpotLight(0xfff2cc, 40, 160, 0.35, 0.5, 1.5);
  head.position.set(len / 2, 1.8, 0);
  head.target.position.set(len / 2 + 30, 0, 0);
  cars[0].inner.add(head, head.target);
  return { cars, len, total: t.cars * (len + GAP) };
}

// 小さなプレビュー用モデル（ショップのサムネイル）
export function previewTrain(t) {
  const len = CAR_LEN[t.style];
  return t.style === 'steam' ? steamLoco(t, len) : carBody(t, len, true, false, t.style);
}
