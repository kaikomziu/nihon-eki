// 電車・アップグレード・セーブデータ

export const TRAINS = [
  { id: 'local', name: '通勤電車 E200', style: 'commuter', price: 0,
    desc: 'どこにでもいる銀色の通勤電車。扱いやすい。',
    vmax: 110, accel: 3.0, brake: 4.2, stab: 1.0, cars: 4, coinMul: 1.0,
    body: 0xd9dde3, stripe: 0x1f9e4a, stripe2: 0x1f9e4a },
  { id: 'rapid', name: '快速ライナー', style: 'commuter', price: 3000,
    desc: 'オレンジ帯の快速。加速と最高速がアップ。',
    vmax: 130, accel: 3.2, brake: 4.4, stab: 1.08, cars: 5, coinMul: 1.1,
    body: 0xe8eaee, stripe: 0xff7a1a, stripe2: 0x2a3f63 },
  { id: 'steam', name: '蒸気機関車 C62', style: 'steam', price: 6000,
    desc: '遅いが味がある。獲得コイン1.6倍！',
    vmax: 90, accel: 1.8, brake: 3.2, stab: 0.95, cars: 4, coinMul: 1.6,
    body: 0x1c1c1f, stripe: 0x8a1c1c, stripe2: 0xc9a227 },
  { id: 'ltd', name: '特急 あさひ', style: 'express', price: 15000,
    desc: '流線形の在来線特急。カーブに強い。',
    vmax: 170, accel: 2.8, brake: 4.8, stab: 1.2, cars: 6, coinMul: 1.25,
    body: 0xf4f4f0, stripe: 0xd3202a, stripe2: 0x222222 },
  { id: 'shinkansen', name: '新幹線 はやて', style: 'shinkansen', price: 45000,
    desc: '最高速度300km/h。日本が誇る超特急。',
    vmax: 300, accel: 3.0, brake: 5.4, stab: 1.4, cars: 8, coinMul: 1.5,
    body: 0xf8f8f8, stripe: 0x1d4fb3, stripe2: 0x1d4fb3 },
  { id: 'maglev', name: 'リニア ひかり', style: 'maglev', price: 150000,
    desc: '浮上走行する夢の超電導リニア。500km/h。',
    vmax: 500, accel: 3.6, brake: 6.5, stab: 1.6, cars: 6, coinMul: 2.0,
    body: 0xeef2f6, stripe: 0x2b6cd6, stripe2: 0x8899aa },
];

export const UPGRADES = [
  { id: 'motor', name: 'モーター強化', icon: '⚡', max: 10, base: 400, desc: '加速力 +10% / Lv', color: '#3a8ee8' },
  { id: 'brake', name: 'ブレーキ強化', icon: '🛑', max: 10, base: 400, desc: 'ブレーキ力 +10% / Lv', color: '#f39b2b' },
  { id: 'stab', name: '台車安定化', icon: '🛤️', max: 10, base: 600, desc: '脱線しにくさ +6% / Lv', color: '#2fbf6a' },
  { id: 'top', name: '高速化改造', icon: '🚀', max: 10, base: 800, desc: '最高速度 +4% / Lv', color: '#a14de0' },
  { id: 'coin', name: '運賃アップ', icon: '🪙', max: 10, base: 1000, desc: 'コイン倍率 +0.15 / Lv', color: '#d9a400' },
  { id: 'ats', name: 'ATS 保安装置', icon: '🛡️', max: 3, base: 3000, desc: '脱線を1回防ぐ（1走行あたり Lv回）', color: '#e53935' },
];

export function upgradeCost(u, lv) {
  return Math.round(u.base * Math.pow(1.7, lv) / 50) * 50;
}

export const STATION_NAMES = [
  '桜ヶ丘', '青葉台', '緑町', '港南', '富士見', '月見野', '星川', '若葉', '梅田原', '松風',
  '竹ノ内', '湖畔', '白鷺', '高原', '霧ヶ峰', '朝日町', '夕陽丘', '城下', '大橋', '小川',
  '鶴見坂', '亀井', '花園', '紅葉台', '雪野', '海浜', '北山', '南浜', '東雲', '西ノ宮',
];

const KEY = 'nihoneki_save_v1';
const DEFAULT = { coins: 0, owned: ['local'], selected: 'local', up: {}, best: 0 };

export const save = load();

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && typeof d === 'object') return { ...DEFAULT, ...d, up: { ...(d.up || {}) } };
  } catch (e) { /* 読めないときは初期値 */ }
  return structuredClone(DEFAULT);
}

export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* 保存不可 */ }
}

export const lv = id => save.up[id] || 0;
export const trainById = id => TRAINS.find(t => t.id === id) || TRAINS[0];

// アップグレード込みの性能
export function effectiveStats(t) {
  return {
    vmax: t.vmax * (1 + 0.04 * lv('top')),
    accel: t.accel * (1 + 0.10 * lv('motor')),
    brake: t.brake * (1 + 0.10 * lv('brake')),
    stab: t.stab * (1 + 0.06 * lv('stab')),
    coinMul: t.coinMul + 0.15 * lv('coin'),
    ats: lv('ats'),
  };
}
