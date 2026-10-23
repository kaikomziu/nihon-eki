import * as THREE from 'three';
import { save, persist, trainById, effectiveStats, TRAINS } from './data.js';
import { Path, A_SIGN } from './track.js';
import { World } from './world.js';
import { buildTrain } from './train.js';
import { initAudio, setRunning, sfx } from './audio.js';
import { $, show, overlay, refreshCoins } from './ui.js';

// ---------- レンダラー ----------
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 3200);
const world = new World(scene);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const NOSE = { shinkansen: 9, maglev: 11, express: 3.2 };
const tmpA = { x: 0, z: 0, h: 0, k: 0 }, tmpB = { x: 0, z: 0, h: 0, k: 0 };
const v3 = new THREE.Vector3(), look = new THREE.Vector3();

// ---------- 編成 ----------
let path, train, trainDef, trainGroup;

function setupTrack(def, vmaxMs, seed, tutorial = false) {
  if (trainGroup) {
    scene.remove(trainGroup);
    trainGroup.traverse(n => { n.geometry?.dispose?.(); });
  }
  trainDef = def;
  path = new Path({ vmax: vmaxMs, seed, tutorial });
  world.setPath(path, def.style);
  train = buildTrain(def);
  trainGroup = new THREE.Group();
  train.cars.forEach(c => trainGroup.add(c.obj));
  scene.add(trainGroup);
}

const baseY = () => (trainDef.style === 'maglev' ? 0.55 : 0);

function placeCars(sFront, roll, shake) {
  for (const c of train.cars) {
    const sc = sFront - c.offset;
    const half = c.len / 2 - 3.5;
    path.sample(sc + half, tmpA);
    path.sample(sc - half, tmpB);
    c.obj.position.set((tmpA.x + tmpB.x) / 2, baseY(), (tmpA.z + tmpB.z) / 2);
    c.obj.rotation.set(0, -Math.atan2(tmpA.z - tmpB.z, tmpA.x - tmpB.x), 0);
    c.inner.rotation.x = roll * (tmpA.k + tmpB.k) / 2 * 200;
    c.inner.position.y = shake ? (Math.random() - 0.5) * shake : 0;
  }
}

// ---------- タイトル／メニューの背景 ----------
let mode = 'title'; // title | drive
let orbit = 0;

function setupShowcase() {
  setupTrack(trainById(save.selected), 30, 12345);
  placeCars(160, 0, 0);
}

function updateShowcase(dt) {
  orbit += dt * 0.12;
  // ホームの外側から編成を眺める（左右にゆっくり振る）
  path.sample(160 - train.len * 0.8, tmpA);
  const a = tmpA.h + 0.75 + Math.sin(orbit) * 0.45;
  const r = (26 + Math.sin(orbit * 0.6) * 5) * Math.max(1, 1.1 / camera.aspect); // 縦画面は引きで
  camera.position.set(tmpA.x + Math.cos(a) * r, 3.2 + Math.sin(orbit * 0.8) * 1.2, tmpA.z + Math.sin(a) * r);
  camera.lookAt(tmpA.x, 2.6, tmpA.z);
  world.update(160, camera.position);
}

// ---------- 走行 ----------
const NOTCH_LABELS = ['EB', 'B8', 'B7', 'B6', 'B5', 'B4', 'B3', 'B2', 'B1', 'N', 'P1', 'P2', 'P3', 'P4', 'P5'];
const notchName = n => NOTCH_LABELS[n + 9];
let G = null;

function startDrive(tutorial = false) {
  // チュートリアルは強化なしの通勤電車で固定
  const def = tutorial ? TRAINS[0] : trainById(save.selected);
  const st = tutorial
    ? { vmax: def.vmax, accel: def.accel, brake: def.brake, stab: def.stab, coinMul: 1, ats: 0 }
    : effectiveStats(def);
  setupTrack(def, st.vmax / 3.6, (Math.random() * 1e9) | 0, tutorial);
  G = {
    st, s: 160, v: 0, notch: -8, bonus: 0, ats: st.ats, phase: 'run', t: 0,
    cam: 0, lastJoint: 160, msgT: 0, alarmT: 0, derailT: 0, reason: '',
    camPos: new THREE.Vector3(), camLook: new THREE.Vector3(), first: true,
    reached: '日本駅', stationT: 0, tut: null,
  };
  mode = 'drive';
  buildNotchScale();
  setNotch(-8, true);
  placeCars(G.s, 0, 0);
  $('hud').classList.toggle('tut', tutorial);
  if (tutorial) tutStart();
}

function buildNotchScale() {
  const el = $('notchScale');
  el.innerHTML = NOTCH_LABELS.slice().reverse().map(l => {
    const c = l[0] === 'P' ? 'p' : l[0] === 'B' ? 'b' : l === 'EB' ? 'e' : '';
    return `<span class="${c}" data-n="${l}">${l}</span>`;
  }).join('');
}

function setNotch(n, silent) {
  if (!G || G.phase !== 'run') return;
  n = Math.max(-9, Math.min(5, n));
  if (n === G.notch && !silent) return;
  G.notch = n;
  if (!silent) sfx.notch();
  const lbl = notchName(n);
  $('hNotch').textContent = lbl;
  $('hNotch').style.color = n > 0 ? '#7fb8ff' : n < 0 ? (n === -9 ? '#ff6b6b' : '#ffb36b') : '#fff';
  document.querySelectorAll('#notchScale span').forEach(s => s.classList.toggle('on', s.dataset.n === lbl));
}

function message(text, dur = 2) {
  const el = $('hMsg');
  el.innerHTML = text;
  el.classList.add('show');
  G.msgT = dur;
}

// 駅に着いた／通過したときの駅名標
function stationBanner(sta, note) {
  const i = path.stations.indexOf(sta);
  path.ensure(sta.stop + path.stationGap + 2000);
  $('sbName').textContent = sta.name;
  $('sbKana').textContent = note;
  $('sbPrev').textContent = '◀ ' + path.stations[i - 1].name;
  $('sbNext').textContent = path.stations[i + 1] ? path.stations[i + 1].name + ' ▶' : '';
  $('stationBoard').classList.add('show');
  G.stationT = 3.5;
  G.reached = sta.name;
}

function maxCurvature(sFront) {
  let k = 0;
  for (const off of [0, train.total * 0.5, train.total]) {
    path.sample(sFront - off, tmpA);
    if (Math.abs(tmpA.k) > Math.abs(k)) k = tmpA.k;
  }
  return k;
}

function updateDrive(dt) {
  const st = G.st;
  G.t += dt;
  if (G.msgT > 0 && (G.msgT -= dt) <= 0) $('hMsg').classList.remove('show');
  if (G.stationT > 0 && (G.stationT -= dt) <= 0) $('stationBoard').classList.remove('show');
  if (G.tut?.hold) dt = 0; // 説明中は時間を止める

  if (G.phase === 'run') {
    const vmax = st.vmax / 3.6;
    let a;
    if (G.notch > 0) {
      const f = Math.max(0, Math.min(1, (vmax - G.v) / (0.3 * vmax)));
      a = st.accel / 3.6 * (G.notch / 5) * f;
    } else if (G.notch < 0) {
      a = G.notch === -9 ? -st.brake / 3.6 * 1.3 : -st.brake / 3.6 * (-G.notch / 8);
    } else a = 0;
    a -= 0.012 + 0.00002 * G.v * G.v;
    G.v = Math.max(0, G.v + a * dt);
    G.s += G.v * dt;

    // カーブの横加速度判定
    const k = maxCurvature(G.s);
    const lat = G.v * G.v * Math.abs(k);
    const derailA = A_SIGN * 1.4 * st.stab;
    const over = lat > A_SIGN * 1.03;
    $('hWarn').style.display = over ? 'block' : 'none';
    if (over) {
      $('hWarn').textContent = lat > derailA * 0.85 ? '⚠ 脱線の危険！' : '⚠ 速度超過';
      if ((G.alarmT -= dt) <= 0) { sfx.alarm(); G.alarmT = 0.35; }
    }
    if (lat > derailA) {
      if (G.tut) {
        // チュートリアルでは脱線させずに減速させる
        G.v = Math.sqrt(A_SIGN / Math.abs(k)) * 0.9;
        setNotch(-4, true);
        message('⚠ 速すぎ！<br><small>本番なら脱線です。カーブは制限速度以下で</small>', 2.5);
        sfx.alarm();
      } else if (G.ats > 0) {
        G.ats--;
        G.v = Math.sqrt(A_SIGN / Math.abs(k)) * 0.95;
        setNotch(-8, true);
        message(`🛡️ ATS作動！ 残り${G.ats}回`, 2);
        sfx.alarm();
      } else {
        const cv = path.curves.find(c => c.end > G.s - train.total && c.start < G.s);
        derail(k, `カーブに ${Math.round(G.v * 3.6)}km/h で進入（制限 ${cv ? cv.limit : '-'}km/h）`);
      }
    }

    // 駅
    const sta = path.stationAfter(G.s);
    if (sta && !sta.done) {
      const err = G.s - sta.stop;
      if (!sta.announced && err > -700) {
        sta.announced = true;
        message(`まもなく <b>${sta.name}</b> 駅`, 2.5);
      }
      if (G.v === 0 && Math.abs(err) <= 10) {
        sta.done = true;
        const b = 300 + Math.floor(700 * (1 - Math.abs(err) / 10));
        G.bonus += b;
        sfx.chime();
        stationBanner(sta, `停車！ 誤差 ${Math.abs(err).toFixed(1)}m　ボーナス +${b}`);
        if (G.tut) G.tut.station = 'stop';
      } else if (err > 10) {
        sta.done = true;
        stationBanner(sta, '通過');
        if (G.tut) G.tut.station = 'pass';
      }
    }
    if (G.tut) tutUpdate();

    // ガタンゴトン
    if (trainDef.style !== 'maglev' && G.s - G.lastJoint > 25) { G.lastJoint = G.s; if (G.v > 1) sfx.joint(G.v * 3.6); }
    setRunning(G.v * 3.6, G.notch > 0 ? G.notch / 5 : 0, over ? Math.min(1, lat / derailA) : 0, true);

    const shake = over ? 0.04 + 0.12 * (lat / derailA) : Math.min(0.02, G.v / 4000);
    placeCars(G.s, 0.0015 * G.v * G.v / 60, shake);
    updateHud(lat, k);
  } else if (G.phase === 'derail') {
    G.derailT += dt;
    for (const c of train.cars) {
      c.vel.y -= 9.8 * dt;
      c.obj.position.addScaledVector(c.vel, dt);
      c.obj.rotation.x += c.spin.x * dt; c.obj.rotation.y += c.spin.y * dt; c.obj.rotation.z += c.spin.z * dt;
      if (c.obj.position.y < 0) {
        c.obj.position.y = 0;
        c.vel.y = Math.abs(c.vel.y) * 0.3;
        c.vel.x *= 0.9; c.vel.z *= 0.9; c.spin.multiplyScalar(0.85);
      }
    }
    if (G.derailT > 3.2 && G.phase === 'derail') finish();
  }
  updateCamera(dt);
  world.update(G.s, camera.position);
}

function derail(k, reason) {
  G.phase = 'derail';
  G.reason = reason;
  sfx.crash();
  setRunning(0, 0, 0, false);
  $('hWarn').style.display = 'none';
  message('💥 脱線！', 3);
  const outward = -Math.sign(k) || 1;
  train.cars.forEach((c, i) => {
    path.sample(G.s - c.offset, tmpA);
    const fx = Math.cos(tmpA.h), fz = Math.sin(tmpA.h);
    const nx = -Math.sin(tmpA.h), nz = Math.cos(tmpA.h);
    const sp = G.v * (1 - i * 0.06);
    const side = sp * (0.25 + Math.random() * 0.2) * outward;
    c.vel.set(fx * sp + nx * side, 3 + Math.random() * 4, fz * sp + nz * side);
    c.spin.set((Math.random() - 0.5) * 3 + outward * 1.5, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 2);
  });
  G.cam = 1;
}

function finish(quit) {
  G.phase = 'done';
  setRunning(0, 0, 0, false);
  const dist = Math.max(0, Math.floor(G.s - 160));
  const mul = G.st.coinMul;
  const coins = Math.floor((dist + G.bonus) * mul);
  const isBest = dist > save.best;
  save.coins += coins;
  if (isBest) { save.best = dist; save.bestStation = G.reached; }
  persist();
  $('rTitle').textContent = quit ? '運転終了' : '脱線！';
  $('rReason').textContent = quit ? 'おつかれさまでした。' : G.reason;
  $('rDist').textContent = dist.toLocaleString() + ' m';
  $('rStation').textContent = G.reached + ' 駅';
  $('btnRetry').textContent = 'もう一度';
  $('rBonus').textContent = '+' + G.bonus.toLocaleString();
  $('rMul').textContent = 'x' + mul.toFixed(2);
  $('rCoin').textContent = '🪙 ' + coins.toLocaleString();
  $('rBest').textContent = isBest ? '🏆 最長記録更新！' : `最長記録 ${Math.floor(save.best).toLocaleString()} m`;
  overlay('result', true);
  sfx.coin();
  refreshCoins();
}

function updateHud(lat, k) {
  const kmh = G.v * 3.6;
  $('hDist').textContent = Math.floor(G.s - 160).toLocaleString();
  $('hCoin').textContent = Math.floor((G.s - 160 + G.bonus) * G.st.coinMul).toLocaleString();
  $('hSpeed').textContent = Math.floor(kmh);
  $('hGauge').style.width = Math.min(100, kmh / G.st.vmax * 100) + '%';

  // 現在の制限：編成がカーブ内ならそのカーブ、なければ最高速度
  const cv = path.curveAt(G.s - train.total);
  const inCurve = cv && cv.start < G.s;
  const limit = inCurve ? cv.limit : Math.round(G.st.vmax);
  const lim = $('hLimit');
  lim.textContent = inCurve ? `制限 ${limit} km/h` : '制限なし';
  lim.classList.toggle('over', inCurve && kmh > limit);
  $('hGaugeLimit').style.left = Math.min(100, limit / G.st.vmax * 100) + '%';

  // 次のイベント
  const nc = path.curves.find(c => c.start > G.s);
  const ns = path.stationAfter(G.s);
  const items = [];
  if (nc) items.push({ d: nc.start - G.s, t: `↪制限${nc.limit}` });
  if (ns && !ns.done) items.push({ d: ns.stop - G.s, t: `🚉${ns.name}` });
  items.sort((a, b) => a.d - b.d);
  const it = items[0];
  $('hNext').textContent = it ? `${it.t} ${Math.max(0, Math.round(it.d))}m` : '-';
  $('hNextLabel').textContent = '次';
}

function updateCamera(dt) {
  const style = trainDef.style;
  const by = baseY();
  if (G.phase === 'derail' || G.phase === 'done') {
    train.cars[0].obj.visible = true;
    const c0 = train.cars[Math.min(1, train.cars.length - 1)].obj.position;
    G.camLook.lerp(c0, 1 - Math.exp(-dt * 3));
    camera.position.lerp(v3.set(c0.x - 30, 18, c0.z + 30), 1 - Math.exp(-dt * 1.5));
    camera.lookAt(G.camLook);
    return;
  }
  let eye, tgt;
  train.cars[0].obj.visible = G.cam !== 0; // 運転席視点では先頭車を隠す
  if (G.cam === 0) {
    const back = (NOSE[style] || 0) * 0.5 + 1;
    path.sample(G.s - back, tmpA);
    eye = v3.set(tmpA.x, 3.5 + by, tmpA.z);
    path.sample(G.s + 70, tmpB);
    tgt = look.set(tmpB.x, 2.2 + by, tmpB.z);
    camera.position.copy(eye);
    camera.lookAt(tgt);
    G.first = true;
    return;
  }
  if (G.cam === 1) {
    path.sample(G.s - train.len * 1.2 - 14, tmpA);
    eye = v3.set(tmpA.x - Math.sin(tmpA.h) * 6, 9 + by, tmpA.z + Math.cos(tmpA.h) * 6);
    path.sample(G.s + 40, tmpB);
    tgt = look.set(tmpB.x, 2 + by, tmpB.z);
  } else {
    path.sample(G.s + 25, tmpA);
    eye = v3.set(tmpA.x - Math.sin(tmpA.h) * 16, 4 + by, tmpA.z + Math.cos(tmpA.h) * 16);
    path.sample(G.s - 15, tmpB);
    tgt = look.set(tmpB.x, 2.5 + by, tmpB.z);
  }
  if (G.first) { G.camPos.copy(eye); G.camLook.copy(tgt); G.first = false; }
  const f = 1 - Math.exp(-dt * 6);
  G.camPos.lerp(eye, f); G.camLook.lerp(tgt, f);
  camera.position.copy(G.camPos);
  camera.lookAt(G.camLook);
}

// ---------- チュートリアル ----------
const TUT_CURVE_LIMIT = 45;
const kmh = () => G.v * 3.6;
const TUT_STEPS = [
  { text: 'ようこそ、日本駅へ！🚃<br>運転士見習いのあなたに、電車の動かし方を教えます。' },
  { focus: '.meter', text: '左下は<b>スピードメーター</b>。<br>今の速さ(km/h)と、守るべき<b>制限速度</b>が表示されます。' },
  { focus: '.lever', text: '右下は<b>マスコン</b>（運転レバー）。<br><b>▲</b>で加速(P1〜P5)、<b>▼</b>でブレーキ(B1〜B8)。<b>N</b>は何もしない状態です。<small>PCは ↑↓ キー（W / S キー）</small>' },
  { focus: '#btnUp', goal: 'P5 にする', text: '<b>▲</b>を何回か押して、いちばん強い <b>P5</b> にしよう！<small>押しっぱなしでもOK</small>',
    done: () => G.notch === 5 },
  { focus: '.meter', goal: '60km/h まで加速', text: 'ぐんぐん加速中…！<br>スピードメーターが <b>60km/h</b> になるまで待とう。',
    done: () => kmh() >= 60 },
  { focus: '#btnDown', goal: 'N にする', text: '<b>▼</b>を押して <b>N</b> に戻そう。<br>加速が止まり、ほぼ同じ速さで走り続けます（惰行）。<small>PCは N キーで一発で戻せます</small>',
    done: () => G.notch === 0 },
  { focus: '.hud-box.next', text: '画面上の<b>「次」</b>には、この先のカーブや駅までの距離が出ます。<br>この先に<b>制限45km/h</b>のカーブ！ 速すぎると<b>脱線</b>してしまいます。' },
  { focus: '#btnDown', goal: '45km/h 以下にする', text: '<b>▼</b>でブレーキ！ カーブの前に <b>45km/h 以下</b>まで落とそう。<small>B4〜B6くらいがおすすめ</small>',
    done: () => kmh() <= TUT_CURVE_LIMIT },
  { focus: '.meter', goal: 'カーブを抜ける', text: 'いいね！ ▲でブレーキを緩めて <b>N</b> にし、<b>45km/h 以下</b>のままカーブを抜けよう。<small>止まってしまったら▲で少し加速。表示が「制限なし」に戻ればクリア</small>',
    done: () => G.s - train.total > path.curves[0].end },
  { text: 'カーブ通過！🎉<br>次は<b>駅に止まる</b>練習。ホームの先の黄色い<b>「停」マーク</b>の前後10m以内で止めると、<b>停車ボーナス</b>がもらえます。' },
  { focus: '.hud-box.next', goal: '見習い駅に止まる', text: '▲で加速して駅へ。「次」の残りが <b>300m</b> くらいになったらブレーキ！<br>残り <b>0m</b> でピタッと止まれば完璧。',
    done: () => !!G.tut.station },
  { text: () => (G.tut.station === 'stop' ? 'ナイス停車！🚉' : '通過しちゃった…本番では止まるとボーナスがもらえるよ。')
      + '<br>ほかのボタンも覚えておこう。<small>非常（スペース）…いちばん強いブレーキ ／ 📷（C）…カメラ切替 ／ ⏸（Esc）…一時停止 ／ 📯（H）…警笛</small>' },
  { next: '完了 ✔', text: '本番は<b>脱線するまで</b>走り続けるモード。走った距離(m)がそのまま<b>コイン</b>になります。<br>一定の距離ごとに駅があるので、どこの駅まで行けるか挑戦しよう！' },
];

function tutStart() {
  G.tut = { i: 0, hold: true, station: null };
}

function tutRender() {
  const step = TUT_STEPS[G.tut.i];
  const info = !step.done;
  G.tut.hold = info;
  const text = typeof step.text === 'function' ? step.text() : step.text;
  $('tutText').innerHTML = text + (step.goal ? `<br><span class="tut-goal">🎯 ${step.goal}</span>` : '');
  $('tutStep').textContent = `${G.tut.i + 1} / ${TUT_STEPS.length}`;
  $('tutNext').hidden = !info;
  $('tutNext').textContent = step.next || '次へ ▶';
  document.querySelectorAll('.tut-focus').forEach(e => e.classList.remove('tut-focus'));
  if (step.focus) document.querySelectorAll(step.focus).forEach(e => e.classList.add('tut-focus'));
}

function tutAdvance() {
  if (!G?.tut || G.phase !== 'run' || paused) return;
  if (G.tut.i >= TUT_STEPS.length - 1) { tutComplete(); return; }
  G.tut.i++;
  tutRender();
}

function tutUpdate() {
  const step = TUT_STEPS[G.tut.i];
  if (step.done && step.done()) { sfx.coin(); tutAdvance(); }
}

function tutComplete() {
  G.phase = 'done';
  G.tut.hold = false;
  setRunning(0, 0, 0, false);
  document.querySelectorAll('.tut-focus').forEach(e => e.classList.remove('tut-focus'));
  const first = !save.tutorialDone;
  const reward = first ? 500 : 0;
  save.coins += reward;
  save.tutorialDone = true;
  persist();
  $('hud').classList.remove('tut');
  $('rTitle').textContent = 'チュートリアル完了！';
  $('rReason').textContent = '運転士見習い、卒業です。';
  $('rDist').textContent = Math.floor(G.s - 160).toLocaleString() + ' m';
  $('rStation').textContent = G.reached + ' 駅';
  $('rBonus').textContent = '+' + G.bonus.toLocaleString();
  $('rMul').textContent = 'x1.00';
  $('rCoin').textContent = '🪙 ' + reward.toLocaleString();
  $('rBest').textContent = first ? '🎁 初回クリア報酬 🪙500' : '（報酬は初回のみ）';
  $('btnRetry').textContent = '本番に出発 🚄';
  overlay('result', true);
  sfx.chime();
  refreshCoins();
}

$('tutNext').onclick = () => { sfx.click(); tutAdvance(); };
$('tutSkip').onclick = () => { sfx.click(); goMenu(false); };

// ---------- ロード演出 ----------
const TIPS = [
  'カーブの手前で制限速度まで落とそう。速すぎると脱線！',
  '駅の「停」マーク付近（±10m）で止まると停車ボーナス。',
  'ATS保安装置を買うと脱線を防いでくれる。',
  '蒸気機関車は遅いけどコインがたくさんもらえる。',
  'PC: ↑↓でノッチ、スペースで非常ブレーキ、Cでカメラ切替。',
];

async function loading(steps) {
  show('loading');
  $('loadTip').textContent = '💡 ' + TIPS[Math.floor(Math.random() * TIPS.length)];
  const fill = $('loadFill');
  fill.style.width = '0%';
  for (let i = 0; i < steps.length; i++) {
    const [text, fn] = steps[i];
    $('loadText').textContent = text;
    await new Promise(r => setTimeout(r, 260 + Math.random() * 220));
    fn?.();
    fill.style.width = ((i + 1) / steps.length * 100) + '%';
  }
  await new Promise(r => setTimeout(r, 200));
}

let busy = false;
async function goMenu(withLoad) {
  if (busy) return;
  busy = true;
  overlay('result', false); overlay('pause', false);
  setRunning(0, 0, 0, false);
  if (withLoad) {
    await loading([
      ['線路を敷いています…', null],
      ['車両を点検中…', () => setupShowcase()],
      ['信号を確認中…', () => { world.update(160, camera.position); renderer.compile(scene, camera); }],
      ['駅を清掃中…', null],
    ]);
  } else setupShowcase();
  mode = 'title';
  G = null;
  show('menu');
  busy = false;
}

async function goDrive(tutorial = false) {
  if (busy) return;
  busy = true;
  overlay('result', false); overlay('pause', false);
  await loading([
    ['ダイヤを作成中…', null],
    ['出発準備中…', () => startDrive(tutorial)],
    ['信号よし！', () => { updateDrive(0.016); renderer.compile(scene, camera); }],
  ]);
  show('hud');
  if (tutorial) tutRender(); else message('出発進行！ ▲で力行', 2.5);
  busy = false;
}

// ---------- 入力 ----------
$('btnStart').onclick = () => { initAudio(); sfx.click(); goMenu(true); };
$('btnBackTitle').onclick = () => { sfx.click(); show('title'); };
document.querySelectorAll('[data-go]').forEach(b => {
  b.onclick = () => {
    sfx.click();
    const to = b.dataset.go;
    if (to === 'drive' || to === 'tutorial') goDrive(to === 'tutorial'); else show(to);
    if (to === 'menu' && trainDef.id !== save.selected) setupShowcase();
  };
});
$('btnRetry').onclick = () => { sfx.click(); goDrive(); };
$('btnToMenu').onclick = () => { sfx.click(); goMenu(false); };
$('btnPause').onclick = () => togglePause();
$('btnResume').onclick = () => togglePause(false);
$('btnQuit').onclick = () => {
  overlay('pause', false); paused = false;
  if (G?.tut) goMenu(false);
  else if (G && G.phase === 'run') finish(true);
};
$('btnCam').onclick = () => { if (G) { G.cam = (G.cam + 1) % 3; G.first = true; } };
$('btnHorn').onclick = () => sfx.horn();

let paused = false;
function togglePause(on = !paused) {
  if (!G || G.phase !== 'run') return;
  paused = on;
  overlay('pause', on);
  setRunning(G.v * 3.6, 0, 0, !on);
}

// 押しっぱなしで連続入力
function holdButton(el, fn) {
  let timer = null;
  const stop = () => { clearInterval(timer); timer = null; };
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    fn();
    stop();
    timer = setInterval(fn, 230);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => el.addEventListener(t, stop));
}
holdButton($('btnUp'), () => G && setNotch(G.notch === -9 ? -8 : G.notch + 1));
holdButton($('btnDown'), () => G && setNotch(Math.max(-8, G.notch - 1)));
$('btnEB').addEventListener('pointerdown', e => { e.preventDefault(); G && setNotch(-9); });

window.addEventListener('keydown', e => {
  if (mode !== 'drive' || !G) {
    if (e.key === 'Enter' && $('title').classList.contains('active')) $('btnStart').click();
    return;
  }
  const k = e.key.toLowerCase();
  if (k === 'escape' || k === 'p') { togglePause(); return; }
  if (paused || G.phase !== 'run') return;
  if (k === 'arrowup' || k === 'w') setNotch(G.notch === -9 ? -8 : G.notch + 1);
  else if (k === 'arrowdown' || k === 's') setNotch(Math.max(-8, G.notch - 1));
  else if (k === ' ') setNotch(-9);
  else if (k === 'h') sfx.horn();
  else if (k === 'c') $('btnCam').click();
  else if (k === 'n') setNotch(0);
  else return;
  e.preventDefault();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && G?.phase === 'run') togglePause(true); });

// ---------- メインループ ----------
setupShowcase();
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (mode === 'drive' && G) { if (!paused) updateDrive(dt); }
  else updateShowcase(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
// デバッグ用
window.__game = {
  get G() { return G; }, get path() { return path; },
  step(n = 60) { for (let i = 0; i < n; i++) updateDrive(1 / 60); renderer.render(scene, camera); },
};
