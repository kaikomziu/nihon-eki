// 実績：累計の記録(save.stats)と1回の走行の記録(run)から判定する
import { save, persist, TRAINS, UPGRADES } from './data.js';

const S = k => save.stats[k] || 0;
const km = m => Math.floor(m / 1000);

// run: { dist, stops, signals, night, rain, steam, derailed, redRun }
export const ACH = [
  // ---- 走行 ----
  { id: 'first', icon: '🚃', name: 'はじめの一歩', desc: 'はじめて走行を終える', reward: 100, test: () => S('runs') >= 1 },
  { id: 'tut', icon: '🔰', name: '見習い卒業', desc: 'チュートリアルを完了する', reward: 200, test: () => save.tutorialDone },
  { id: 'd1', icon: '📏', name: '1キロの旅', desc: '1回の走行で 1,000m 走る', reward: 200, test: r => r.dist >= 1000 },
  { id: 'd5', icon: '🛤️', name: '隣町まで', desc: '1回の走行で 5,000m 走る', reward: 500, test: r => r.dist >= 5000 },
  { id: 'd10', icon: '🗾', name: '10キロの壁', desc: '1回の走行で 10,000m 走る', reward: 1500, test: r => r.dist >= 10000 },
  { id: 'd20', icon: '🏔️', name: '山を越えて', desc: '1回の走行で 20,000m 走る', reward: 4000, test: r => r.dist >= 20000 },
  { id: 'd50', icon: '🌏', name: '終点はどこ？', desc: '1回の走行で 50,000m 走る', reward: 15000, test: r => r.dist >= 50000 },
  { id: 't100', icon: '🧭', name: '旅慣れた運転士', desc: '累計 100km 走る', reward: 5000,
    test: () => S('dist') >= 100000, prog: () => [km(S('dist')), 100, 'km'] },
  { id: 't500', icon: '🎖️', name: '日本一周', desc: '累計 500km 走る', reward: 20000,
    test: () => S('dist') >= 500000, prog: () => [km(S('dist')), 500, 'km'] },

  // ---- 駅 ----
  { id: 'stop1', icon: '🚉', name: '初停車', desc: '駅の停止位置に止まる', reward: 200, test: () => S('stops') >= 1 },
  { id: 'perfect', icon: '🎯', name: 'ピタ停め', desc: '誤差 0.5m 以内で停車する', reward: 1000, test: () => S('perfect') >= 1 },
  { id: 'stop50', icon: '🏅', name: '停車マスター', desc: '累計 50 回停車する', reward: 3000,
    test: () => S('stops') >= 50, prog: () => [S('stops'), 50, '回'] },
  { id: 'combo3', icon: '🔗', name: '3連続停車', desc: '駅を3つ連続で止まる', reward: 1000, test: () => S('comboMax') >= 3 },
  { id: 'combo10', icon: '⛓️', name: '各駅停車の鬼', desc: '駅を10個連続で止まる', reward: 6000,
    test: () => S('comboMax') >= 10, prog: () => [S('comboMax'), 10, '連続'] },

  // ---- テクニック ----
  { id: 'giri1', icon: '🔥', name: 'ギリギリ通過', desc: 'カーブを制限速度の1.1倍以上で抜ける', reward: 300, test: () => S('giri') >= 1 },
  { id: 'giri50', icon: '🌋', name: '攻めの運転士', desc: '「ギリギリ通過」を累計 30 回', reward: 4000,
    test: () => S('giri') >= 30, prog: () => [S('giri'), 30, '回'] },
  { id: 'sig1', icon: '🚦', name: '信号よし！', desc: '赤信号で止まって、青になるのを待つ', reward: 300, test: () => S('signals') >= 1 },
  { id: 'sig5', icon: '👮', name: '安全第一', desc: '1回の走行で信号を5回守る', reward: 2500, test: r => r.signals >= 5 },
  { id: 'ats', icon: '🛡️', name: 'ATSに救われた', desc: 'ATSで脱線をまぬがれる', reward: 500, test: () => S('atsSaves') >= 1 },

  // ---- スピード ----
  { id: 'v200', icon: '💨', name: '風になる', desc: '200km/h を出す', reward: 800, test: () => S('maxKmh') >= 200 },
  { id: 'v300', icon: '⚡', name: '新幹線の世界', desc: '300km/h を出す', reward: 2000, test: () => S('maxKmh') >= 300 },
  { id: 'v500', icon: '🚀', name: '地上最速', desc: '500km/h を出す', reward: 10000, test: () => S('maxKmh') >= 500 },

  // ---- 天気 ----
  { id: 'night', icon: '🌙', name: '夜行列車', desc: '夜の運行で 5,000m 走る', reward: 1500, test: r => r.night && r.dist >= 5000 },
  { id: 'rain', icon: '☔', name: '雨にも負けず', desc: '雨の日に駅に停車する', reward: 800, test: r => r.rain && r.stops >= 1 },
  { id: 'steam', icon: '♨️', name: '汽笛一声', desc: '蒸気機関車で 10,000m 走る', reward: 2500, test: r => r.steam && r.dist >= 10000 },

  // ---- コレクション ----
  { id: 'own5', icon: '🛒', name: 'コレクター', desc: '電車を5両持つ', reward: 1000,
    test: () => save.owned.length >= 5, prog: () => [save.owned.length, 5, '両'] },
  { id: 'own15', icon: '🏛️', name: '鉄道博物館', desc: '電車を15両持つ', reward: 8000,
    test: () => save.owned.length >= 15, prog: () => [save.owned.length, 15, '両'] },
  { id: 'ownAll', icon: '👑', name: '全車両コンプリート', desc: 'すべての電車を持つ', reward: 50000,
    test: () => TRAINS.every(t => save.owned.includes(t.id)), prog: () => [save.owned.length, TRAINS.length, '両'] },
  { id: 'up1', icon: '🔧', name: '整備はじめ', desc: 'アップグレードを1回する', reward: 200,
    test: () => Object.values(save.up).some(v => v > 0) },
  { id: 'upMax', icon: '⚙️', name: 'フル改造', desc: 'どれか1つのアップグレードをMAXにする', reward: 3000,
    test: () => UPGRADES.some(u => (save.up[u.id] || 0) >= u.max) },
  { id: 'rich', icon: '💰', name: '大富豪', desc: 'コインを 100,000 枚持つ', reward: 3000, test: () => save.coins >= 100000 },

  // ---- 失敗・おまけ（解除まで内容が隠れる） ----
  { id: 'der1', icon: '💥', name: '脱線デビュー', desc: 'はじめて脱線する', reward: 100, hidden: true, test: () => S('derails') >= 1 },
  { id: 'der30', icon: '🤕', name: '脱線のプロ', desc: '累計 30 回脱線する', reward: 2000, hidden: true,
    test: () => S('derails') >= 30, prog: () => [S('derails'), 30, '回'] },
  { id: 'quick', icon: '🙈', name: '秒で終わった', desc: '100m 走る前に脱線する', reward: 300, hidden: true, test: r => r.derailed && r.dist < 100 },
  { id: 'red', icon: '🚨', name: '信号無視', desc: '赤信号を突っ切る', reward: 100, hidden: true, test: r => r.redRun },
  { id: 'horn', icon: '📯', name: '警笛マニア', desc: '警笛を 100 回鳴らす', reward: 500, hidden: true,
    test: () => S('horn') >= 100, prog: () => [S('horn'), 100, '回'] },
  { id: 'all', icon: '🌟', name: '日本駅の伝説', desc: 'ほかの実績をすべて解除する', reward: 30000, hidden: true,
    test: () => ACH.every(a => a.id === 'all' || save.ach[a.id]) },
];

export function stat(k, add = 1) { save.stats[k] = (save.stats[k] || 0) + add; }
export function statMax(k, v) { if (v > (save.stats[k] || 0)) save.stats[k] = v; }

let onUnlock = () => {};
export function setUnlockHandler(fn) { onUnlock = fn; }

// 新しく達成したものを解除して報酬を渡す
export function checkAch(run = {}) {
  let got = false;
  for (const a of ACH) {
    if (save.ach[a.id] || !a.test(run)) continue;
    save.ach[a.id] = Date.now();
    save.coins += a.reward;
    got = true;
    onUnlock(a);
  }
  persist();
  return got;
}

export const achCount = () => ACH.filter(a => save.ach[a.id]).length;
