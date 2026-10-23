// 景色と線路のメッシュ（チャンク単位で生成・破棄）
import * as THREE from 'three';

const CHUNK = 200;
const tmp = { x: 0, z: 0, h: 0, k: 0 };

// ---------- テクスチャ ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  t.anisotropy = 4;
  return t;
}

function grassTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#5f9a3e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) {
      const l = 30 + Math.random() * 25;
      g.fillStyle = `hsl(${85 + Math.random() * 30},45%,${l}%)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2 + Math.random() * 3);
    }
  }, 120);
}

function ballastTex() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#7d7468'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      const l = 30 + Math.random() * 40;
      g.fillStyle = `hsl(30,8%,${l}%)`;
      g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
  });
}

export function signTexture(text, sub, bg = '#fff', fg = '#111', ring = '#d11') {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = bg; g.beginPath(); g.arc(w / 2, h / 2, 120, 0, Math.PI * 2); g.fill();
    g.lineWidth = 22; g.strokeStyle = ring; g.beginPath(); g.arc(w / 2, h / 2, 108, 0, Math.PI * 2); g.stroke();
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold ${text.length > 2 ? 92 : 120}px sans-serif`; g.fillText(text, w / 2, h / 2 + (sub ? -10 : 0));
    if (sub) { g.font = 'bold 30px sans-serif'; g.fillText(sub, w / 2, h / 2 + 62); }
  });
}

function stationBoardTex(name, prev, next) {
  return canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1f8f4e'; g.fillRect(0, 110, w, 50);
    g.fillStyle = '#111'; g.textAlign = 'center'; g.font = 'bold 70px sans-serif';
    g.fillText(name, w / 2, 82);
    g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif';
    g.textAlign = 'left'; g.fillText('◀ ' + prev, 14, 145);
    g.textAlign = 'right'; g.fillText(next + ' ▶', w - 14, 145);
  });
}

// ---------- 経路に沿った帯ジオメトリ ----------
function strip(path, a, b, step, profile) {
  const pos = [], uv = [];
  const pts = [];
  for (let s = a; s <= b + 0.001; s += step) {
    path.sample(s, tmp);
    pts.push({ x: tmp.x, z: tmp.z, nx: -Math.sin(tmp.h), nz: Math.cos(tmp.h), s });
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1];
    for (let j = 0; j < profile.length - 1; j++) {
      const [o0, y0] = profile[j], [o1, y1] = profile[j + 1];
      const A = [p.x + p.nx * o0, y0, p.z + p.nz * o0], B = [p.x + p.nx * o1, y1, p.z + p.nz * o1];
      const C = [q.x + q.nx * o0, y0, q.z + q.nz * o0], D = [q.x + q.nx * o1, y1, q.z + q.nz * o1];
      pos.push(...A, ...C, ...B, ...B, ...C, ...D);
      const u0 = j / (profile.length - 1), u1 = (j + 1) / (profile.length - 1);
      const v0 = p.s / 4, v1 = q.s / 4;
      uv.push(u0, v0, u0, v1, u1, v0, u1, v0, u0, v1, u1, v1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

function railProfile(o) {
  return [[o - 0.05, 0.4], [o - 0.05, 0.56], [o + 0.05, 0.56], [o + 0.05, 0.4]];
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    scene.background = new THREE.Color(0x9fd3f5);
    scene.fog = new THREE.Fog(0x9fd3f5, 300, 1800);
    const hemi = new THREE.HemisphereLight(0xdff2ff, 0x5a7a3a, 1.1);
    const sun = new THREE.DirectionalLight(0xfff3dd, 1.6);
    sun.position.set(300, 500, 200);
    scene.add(hemi, sun);

    // 地面（カメラに追従、テクスチャ単位でスナップ）
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(4800, 4800),
      new THREE.MeshLambertMaterial({ map: grassTex() }));
    this.ground.rotation.x = -Math.PI / 2;
    scene.add(this.ground);

    // 遠景の山（カメラに追従）
    this.mountains = new THREE.Group();
    const mMat = new THREE.MeshLambertMaterial({ color: 0x7f9fb8, flatShading: true, fog: false });
    const snow = new THREE.MeshLambertMaterial({ color: 0xf2f6fa, flatShading: true, fog: false });
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + Math.random() * 0.2;
      const r = 1500 + Math.random() * 200, hgt = 160 + Math.random() * 260;
      const m = new THREE.Mesh(new THREE.ConeGeometry(hgt * 1.6, hgt, 7), mMat);
      m.position.set(Math.cos(a) * r, hgt / 2 - 10, Math.sin(a) * r);
      this.mountains.add(m);
      if (hgt > 300) {
        const cap = new THREE.Mesh(new THREE.ConeGeometry(hgt * 0.4, hgt * 0.25, 7), snow);
        cap.position.set(m.position.x, hgt - hgt * 0.125 - 10, m.position.z);
        this.mountains.add(cap);
      }
    }
    // 富士山
    const fuji = new THREE.Mesh(new THREE.ConeGeometry(700, 520, 24, 1, true), mMat);
    fuji.position.set(400, 250, -1650);
    const fujiCap = new THREE.Mesh(new THREE.ConeGeometry(190, 140, 24), snow);
    fujiCap.position.set(400, 450, -1650);
    this.mountains.add(fuji, fujiCap);
    scene.add(this.mountains);

    this.mat = {
      ballast: new THREE.MeshLambertMaterial({ map: ballastTex() }),
      rail: new THREE.MeshLambertMaterial({ color: 0xc8ccd2, emissive: 0x303236 }),
      sleeper: new THREE.MeshLambertMaterial({ color: 0x8c8278 }),
      concrete: new THREE.MeshLambertMaterial({ color: 0xc5c8cc }),
      guide: new THREE.MeshLambertMaterial({ color: 0xa9b0b8 }),
      pole: new THREE.MeshLambertMaterial({ color: 0x7a8088 }),
      wire: new THREE.LineBasicMaterial({ color: 0x333333 }),
      leaf: new THREE.MeshLambertMaterial({ color: 0x2f6b2a, flatShading: true }),
      leaf2: new THREE.MeshLambertMaterial({ color: 0x4f8f2c, flatShading: true }),
      trunk: new THREE.MeshLambertMaterial({ color: 0x6b4a2b }),
      roof: new THREE.MeshLambertMaterial({ color: 0x2a3f63 }),
      platform: new THREE.MeshLambertMaterial({ color: 0xbfb8aa }),
      yellow: new THREE.MeshLambertMaterial({ color: 0xffd23f }),
      house: [0xe9dfcf, 0xd8c8b0, 0xf2efe8, 0xcfd8e0].map(c => new THREE.MeshLambertMaterial({ color: c })),
      houseRoof: [0x8a2f2f, 0x2f4f7a, 0x4a4a4a, 0x6b4a2b].map(c => new THREE.MeshLambertMaterial({ color: c })),
    };
    this.geo = {
      sleeper: new THREE.BoxGeometry(0.24, 0.12, 2.3),
      cone: new THREE.ConeGeometry(2.4, 7, 6),
      ball: new THREE.IcosahedronGeometry(3, 0),
      trunk: new THREE.CylinderGeometry(0.3, 0.4, 2.4, 5),
      pole: new THREE.CylinderGeometry(0.15, 0.18, 7, 6),
      arm: new THREE.BoxGeometry(0.12, 0.12, 3.6),
      box: new THREE.BoxGeometry(1, 1, 1),
      roof: new THREE.ConeGeometry(1, 1, 4),
    };
    this.chunks = new Map();
    this.extras = new Map();
  }

  // 新しい走行用に線路を差し替える
  setPath(path, style) {
    this.clear();
    this.path = path;
    this.style = style;
  }

  clear() {
    for (const c of this.chunks.values()) this.disposeObj(c);
    for (const e of this.extras.values()) this.disposeObj(e);
    this.chunks.clear(); this.extras.clear();
  }

  disposeObj(o) {
    this.group.remove(o);
    o.traverse(n => {
      if (n.geometry && !Object.values(this.geo).includes(n.geometry)) n.geometry.dispose();
      if (n.userData.ownMat) { n.material.map?.dispose(); n.material.dispose(); }
    });
  }

  update(sFront, camPos) {
    const g = 40; // 草テクスチャ1枚分 (4800/120)
    this.ground.position.set(Math.round(camPos.x / g) * g, 0, Math.round(camPos.z / g) * g);
    this.mountains.position.set(camPos.x, 0, camPos.z);

    if (!this.path) return;
    const first = Math.max(0, Math.floor((sFront - 400) / CHUNK));
    const last = Math.floor((sFront + 1600) / CHUNK);
    for (let i = first; i <= last; i++) {
      if (!this.chunks.has(i)) {
        const c = this.buildChunk(i);
        this.chunks.set(i, c); this.group.add(c);
      }
    }
    for (const [i, c] of this.chunks) {
      if (i < first - 1 || i > last + 1) { this.disposeObj(c); this.chunks.delete(i); }
    }
    // 標識と駅
    const lo = sFront - 500, hi = sFront + 1600;
    for (const cv of this.path.curves) {
      if (cv.start - 60 > hi) break;
      const key = 'c' + cv.start;
      if (cv.end > lo && !this.extras.has(key)) this.addExtra(key, this.buildSign(cv));
    }
    for (const st of this.path.stations) {
      if (st.stop - 200 > hi) break;
      const key = 's' + st.stop;
      if (st.stop + 100 > lo && !this.extras.has(key)) this.addExtra(key, this.buildStation(st));
    }
    for (const [k, o] of this.extras) {
      if (o.userData.s < lo - 300) { this.disposeObj(o); this.extras.delete(k); }
    }
  }

  addExtra(key, obj) { this.extras.set(key, obj); this.group.add(obj); }

  place(obj, s, off, y = 0, rotY = 0) {
    this.path.sample(s, tmp);
    obj.position.set(tmp.x - Math.sin(tmp.h) * off, y, tmp.z + Math.cos(tmp.h) * off);
    obj.rotation.y = -tmp.h + rotY;
    return obj;
  }

  buildChunk(i) {
    const p = this.path, a = i * CHUNK, b = a + CHUNK;
    p.ensure(b + 5);
    const grp = new THREE.Group();
    const style = this.style;
    const mesh = (geo, mat) => new THREE.Mesh(geo, mat);

    if (style === 'maglev') {
      // 高架のガイドウェイ
      grp.add(mesh(strip(p, a, b, 4, [[-2.6, 0], [-2.6, 0.5], [2.6, 0.5], [2.6, 0]]), this.mat.concrete));
      grp.add(mesh(strip(p, a, b, 4, [[-2.2, 0.5], [-2.2, 1.6], [-1.8, 1.6], [-1.8, 0.5]]), this.mat.guide));
      grp.add(mesh(strip(p, a, b, 4, [[1.8, 0.5], [1.8, 1.6], [2.2, 1.6], [2.2, 0.5]]), this.mat.guide));
    } else {
      grp.add(mesh(strip(p, a, b, 4, [[-2.4, 0.02], [-1.5, 0.4], [1.5, 0.4], [2.4, 0.02]]), this.mat.ballast));
      for (const o of [-0.72, 0.72]) grp.add(mesh(strip(p, a, b, 2, railProfile(o)), this.mat.rail));
      const n = Math.floor(CHUNK / 0.7);
      const sl = new THREE.InstancedMesh(this.geo.sleeper, this.mat.sleeper, n);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      const one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
      for (let j = 0; j < n; j++) {
        p.sample(a + j * 0.7, tmp);
        q.setFromAxisAngle(up, -tmp.h);
        m4.compose(v.set(tmp.x, 0.43, tmp.z), q, one);
        sl.setMatrixAt(j, m4);
      }
      grp.add(sl);
    }

    // 架線柱
    if (style !== 'steam' && style !== 'maglev') {
      const wire = [];
      for (let s = a; s < b; s += 50) {
        const pole = mesh(this.geo.pole, this.mat.pole);
        grp.add(this.place(pole, s, -3.2, 3.5));
        const arm = mesh(this.geo.arm, this.mat.pole);
        this.place(arm, s, -1.5, 6.4);
        grp.add(arm);
      }
      for (let s = a; s <= b; s += 10) { p.sample(s, tmp); wire.push(new THREE.Vector3(tmp.x, 5.9, tmp.z)); }
      grp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(wire), this.mat.wire));
    }

    // 木と家
    const rnd = mulberry(i * 7919 + 13);
    const isStation = p.stations.some(st => st.stop > a - 200 && st.stop < b + 200);
    const trees = 34;
    const coneM = new THREE.InstancedMesh(this.geo.cone, this.mat.leaf, trees);
    const ballM = new THREE.InstancedMesh(this.geo.ball, this.mat.leaf2, trees);
    const trunkM = new THREE.InstancedMesh(this.geo.trunk, this.mat.trunk, trees * 2);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), v = new THREE.Vector3();
    let nc = 0, nb = 0, nt = 0;
    for (let j = 0; j < trees; j++) {
      const s = a + rnd() * CHUNK;
      const side = rnd() < 0.5 ? -1 : 1;
      const off = side * (12 + rnd() * 140);
      p.sample(s, tmp);
      const x = tmp.x - Math.sin(tmp.h) * off, z = tmp.z + Math.cos(tmp.h) * off;
      const k = 0.7 + rnd() * 0.8;
      sc.set(k, k, k);
      if (rnd() < 0.55) { m4.compose(v.set(x, 1.2 * k + 3.5 * k, z), q, sc); coneM.setMatrixAt(nc++, m4); }
      else { m4.compose(v.set(x, 1.2 * k + 2.6 * k, z), q, sc); ballM.setMatrixAt(nb++, m4); }
      m4.compose(v.set(x, 1.2 * k, z), q, sc); trunkM.setMatrixAt(nt++, m4);
    }
    coneM.count = nc; ballM.count = nb; trunkM.count = nt;
    grp.add(coneM, ballM, trunkM);

    const houses = isStation ? 10 : (rnd() < 0.4 ? 3 : 0);
    for (let j = 0; j < houses; j++) {
      const s = a + rnd() * CHUNK;
      const side = rnd() < 0.5 ? -1 : 1;
      const off = side * (16 + rnd() * 50);
      const w = 6 + rnd() * 5, d = 6 + rnd() * 4, hh = 4 + rnd() * 4;
      const hb = mesh(this.geo.box, this.mat.house[Math.floor(rnd() * 4)]);
      hb.scale.set(w, hh, d);
      this.place(hb, s, off, hh / 2, rnd() * 0.3);
      const rf = mesh(this.geo.roof, this.mat.houseRoof[Math.floor(rnd() * 4)]);
      rf.scale.set(Math.max(w, d) * 0.78, 2.5, Math.max(w, d) * 0.78);
      rf.position.copy(hb.position); rf.position.y = hh + 1.25;
      rf.rotation.y = hb.rotation.y + Math.PI / 4;
      grp.add(hb, rf);
    }
    return grp;
  }

  buildSign(cv) {
    const grp = new THREE.Group();
    grp.userData.s = cv.end;
    const s = Math.max(5, cv.start - 40);
    const tex = signTexture(String(cv.limit), 'km/h');
    const plate = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24), new THREE.MeshBasicMaterial({ map: tex }));
    plate.userData.ownMat = true;
    const pole = new THREE.Mesh(this.geo.box, this.mat.pole);
    pole.scale.set(0.12, 3.2, 0.12);
    const holder = new THREE.Group();
    pole.position.y = 1.6; plate.position.y = 3.6; plate.rotation.y = -Math.PI / 2;
    holder.add(pole, plate);
    this.place(holder, s, -2.9);
    grp.add(holder);
    // カーブ終わりの解除標識
    const endTex = signTexture('解除', '', '#fff', '#111', '#2a6');
    const p2 = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), new THREE.MeshBasicMaterial({ map: endTex }));
    p2.userData.ownMat = true;
    const pole2 = pole.clone();
    const h2 = new THREE.Group();
    p2.position.y = 3.4; p2.rotation.y = -Math.PI / 2;
    h2.add(pole2, p2);
    this.place(h2, cv.end, -2.9);
    grp.add(h2);
    return grp;
  }

  buildStation(st) {
    const grp = new THREE.Group();
    grp.userData.s = st.stop + 60;
    const p = this.path;
    const elev = this.style === 'maglev' ? 0.5 : 0;
    // ホーム（両側）
    for (const side of [-1, 1]) {
      const off0 = side * 1.75, off1 = side * 5.2;
      const prof = side < 0 ? [[off1, 0], [off1, 1.15 + elev], [off0, 1.15 + elev], [off0, 0]]
                             : [[off0, 0], [off0, 1.15 + elev], [off1, 1.15 + elev], [off1, 0]];
      grp.add(new THREE.Mesh(strip(p, st.stop - 190, st.stop + 25, 5, prof), this.mat.platform));
      const lineProf = side < 0 ? [[-2.15, 1.16 + elev], [-1.95, 1.16 + elev]] : [[1.95, 1.16 + elev], [2.15, 1.16 + elev]];
      grp.add(new THREE.Mesh(strip(p, st.stop - 190, st.stop + 25, 5, lineProf), this.mat.yellow));
      // 屋根と柱
      for (let s = st.stop - 150; s <= st.stop; s += 15) {
        const col = new THREE.Mesh(this.geo.box, this.mat.pole);
        col.scale.set(0.2, 3.4, 0.2);
        grp.add(this.place(col, s, side * 4, 2.85 + elev));
      }
      grp.add(new THREE.Mesh(strip(p, st.stop - 158, st.stop + 8, 5,
        side < 0 ? [[-5.6, 4.7 + elev], [-2.6, 4.4 + elev]] : [[2.6, 4.4 + elev], [5.6, 4.7 + elev]]), this.mat.roof));
    }
    // 駅舎
    const bld = new THREE.Mesh(this.geo.box, this.mat.house[2]);
    bld.scale.set(26, 7, 10);
    grp.add(this.place(bld, st.stop - 70, -11.5, 3.5));
    const bRoof = new THREE.Mesh(this.geo.box, this.mat.roof);
    bRoof.scale.set(28, 0.8, 12);
    grp.add(this.place(bRoof, st.stop - 70, -11.5, 7.4));
    const bSign = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.2),
      new THREE.MeshBasicMaterial({ map: stationBoardTex(st.name + '駅', 'STATION', 'NIHON RAIL') }));
    bSign.userData.ownMat = true;
    grp.add(this.place(bSign, st.stop - 70, -6.4, 5.4));
    // 駅名標
    const idx = p.stations.indexOf(st);
    const prev = idx > 0 ? p.stations[idx - 1].name : 'はじまり';
    const next = p.stations[idx + 1]?.name || 'どこまでも';
    for (const s of [st.stop - 120, st.stop - 40]) {
      const board = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.25),
        new THREE.MeshBasicMaterial({ map: stationBoardTex(st.name, prev, next), side: THREE.DoubleSide }));
      board.userData.ownMat = true;
      this.place(board, s, -4.2, 3 + elev);
      grp.add(board);
    }
    // 停止位置目標
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8),
      new THREE.MeshBasicMaterial({ map: signTexture('停', '', '#ffd23f', '#111', '#111'), side: THREE.DoubleSide }));
    mark.userData.ownMat = true;
    this.place(mark, st.stop, -2.3, 2.3 + elev, -Math.PI / 2);
    grp.add(mark);
    return grp;
  }
}

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
