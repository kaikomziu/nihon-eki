// 電車・アップグレード・セーブデータ

// real: true は実在車両の形式名＋色を再現したもの（愛称・ロゴは使わない）
export const TRAINS = [
  // ---- オリジナル ----
  { id: 'local', name: '通勤電車 E200', style: 'commuter', price: 0,
    desc: 'どこにでもいる銀色の通勤電車。扱いやすい。',
    vmax: 110, accel: 3.0, brake: 4.2, stab: 1.0, cars: 4, coinMul: 1.0,
    body: 0xd9dde3, stripe: 0x1f9e4a, stripe2: 0x1f9e4a },
  { id: 'rapid', name: '快速ライナー', style: 'commuter', price: 3000,
    desc: 'オレンジ帯の快速。加速と最高速がアップ。',
    vmax: 130, accel: 3.2, brake: 4.4, stab: 1.08, cars: 5, coinMul: 1.1,
    body: 0xe8eaee, stripe: 0xff7a1a, stripe2: 0x2a3f63 },
  { id: 'ltd', name: '特急 なないろ', style: 'express', price: 15000,
    desc: '流線形の在来線特急。カーブに強い。',
    vmax: 170, accel: 2.8, brake: 4.8, stab: 1.2, cars: 6, coinMul: 1.25,
    body: 0xf4f4f0, stripe: 0xd3202a, stripe2: 0x222222 },
  { id: 'shinkansen', name: '新幹線 ほしかぜ', style: 'shinkansen', price: 45000,
    desc: '最高速度300km/h。日本が誇る超特急。',
    vmax: 300, accel: 3.0, brake: 5.4, stab: 1.4, cars: 8, coinMul: 1.5,
    body: 0xf8f8f8, stripe: 0x1d4fb3, stripe2: 0x1d4fb3 },
  { id: 'maglev', name: 'リニア ゆめぎんが', style: 'maglev', price: 150000,
    desc: '浮上走行する夢の超電導リニア。500km/h。',
    vmax: 500, accel: 3.6, brake: 6.5, stab: 1.6, cars: 6, coinMul: 2.0,
    body: 0xeef2f6, stripe: 0x2b6cd6, stripe2: 0x8899aa },

  // ---- 実在モデル ----
  { id: 'e235', real: true, name: 'E235系', style: 'commuter', price: 2000,
    desc: 'ウグイス色の帯をまとった最新型の通勤電車。ドア横の帯がトレードマーク。',
    vmax: 120, accel: 3.1, brake: 4.3, stab: 1.05, cars: 5, coinMul: 1.05,
    body: 0xdfe3e8, stripe: 0x7ec242, stripe2: 0x7ec242 },
  { id: 'e233', real: true, name: 'E233系', style: 'commuter', price: 4000,
    desc: 'オレンジ帯でおなじみの通勤電車。快速運転もこなす。',
    vmax: 130, accel: 3.3, brake: 4.5, stab: 1.1, cars: 5, coinMul: 1.15,
    body: 0xe3e6ea, stripe: 0xf26a1b, stripe2: 0xf26a1b },
  { id: 'steam', real: true, name: 'C62形 蒸気機関車', style: 'steam', price: 6000,
    desc: '国内最大級の旅客用蒸気機関車。遅いが獲得コイン1.6倍！',
    vmax: 90, accel: 1.8, brake: 3.2, stab: 0.95, cars: 4, coinMul: 1.6,
    body: 0x1c1c1f, stripe: 0x8a1c1c, stripe2: 0xc9a227 },
  { id: 'd51', real: true, name: 'D51形 蒸気機関車', style: 'steam', price: 9000,
    desc: '日本で最も多く造られた蒸気機関車。さらに遅いが獲得コイン1.8倍！',
    vmax: 80, accel: 1.7, brake: 3.0, stab: 1.0, cars: 4, coinMul: 1.8,
    body: 0x141416, stripe: 0x9b1b1b, stripe2: 0x9a9da3 },
  { id: 'e259', real: true, name: 'E259系', style: 'express', price: 12000,
    desc: '白い車体に赤と黒の空港アクセス特急。',
    vmax: 135, accel: 3.0, brake: 4.7, stab: 1.18, cars: 6, coinMul: 1.25,
    body: 0xf6f6f6, stripe: 0xc8102e, stripe2: 0x1a1a1a, top: 0x1a1a1a },
  { id: 'zero', real: true, name: '0系 新幹線', style: 'shinkansen', price: 30000,
    desc: '1964年に走り出した初代新幹線。丸い鼻の白と青。',
    vmax: 220, accel: 2.6, brake: 5.0, stab: 1.3, cars: 8, coinMul: 1.45, nose: 6,
    body: 0xf2efe6, stripe: 0x1f3f9a, stripe2: 0x1f3f9a, band: 0x1f3f9a },
  { id: 'n700s', real: true, name: 'N700S', style: 'shinkansen', price: 55000,
    desc: '東海道を走る最新の新幹線。青い2本ラインが特徴。',
    vmax: 300, accel: 3.2, brake: 5.6, stab: 1.45, cars: 8, coinMul: 1.55, nose: 10,
    body: 0xfafafa, stripe: 0x0b4ea2, stripe2: 0x0b4ea2 },
  { id: 'e5', real: true, name: 'E5系', style: 'shinkansen', price: 70000,
    desc: '緑の屋根とピンクの帯。長い鼻で320km/hを出す東北の新幹線。',
    vmax: 320, accel: 3.3, brake: 5.8, stab: 1.5, cars: 8, coinMul: 1.6, nose: 15,
    body: 0xf4f6f5, stripe: 0xf08bb4, stripe2: 0xf08bb4, top: 0x00825a },
  { id: 'l0', real: true, name: 'L0系', style: 'maglev', price: 200000,
    desc: '超電導リニアの試験車。最高505km/h、獲得コイン2.2倍。',
    vmax: 505, accel: 3.8, brake: 6.8, stab: 1.65, cars: 6, coinMul: 2.2, nose: 15,
    body: 0xf4f6f9, stripe: 0x1e4fa8, stripe2: 0x1e4fa8 },
  { id: '103', real: true, name: '103系', style: 'commuter', price: 1500,
    desc: '車体全体を塗った昔ながらの通勤電車。遅めだけどコインが少し多い。',
    vmax: 100, accel: 2.6, brake: 4.0, stab: 1.0, cars: 5, coinMul: 1.12,
    body: 0xf26522, stripe: 0xf26522, stripe2: 0xf26522 },
  { id: 'e231', real: true, name: 'E231系', style: 'commuter', price: 3000,
    desc: 'オレンジと緑の2本帯。郊外へ長く走る近郊形電車。',
    vmax: 120, accel: 3.0, brake: 4.4, stab: 1.08, cars: 5, coinMul: 1.1,
    body: 0xdde1e6, stripe: 0xf26a1b, stripe2: 0x2f8f3a },
  { id: 'c57', real: true, name: 'C57形 蒸気機関車', style: 'steam', price: 5000,
    desc: '細いボイラーのすらりとした蒸気機関車。蒸気にしては速い。',
    vmax: 95, accel: 1.9, brake: 3.3, stab: 0.98, cars: 4, coinMul: 1.5,
    body: 0x1a1a1d, stripe: 0x7a1a1a, stripe2: 0xb0b3b8 },
  { id: '787', real: true, name: '787系', style: 'express', price: 14000,
    desc: '黒に近いメタリックグレーの特急。重厚なデザイン。',
    vmax: 130, accel: 2.9, brake: 4.6, stab: 1.22, cars: 6, coinMul: 1.3,
    body: 0x3a3f45, stripe: 0xc8302c, stripe2: 0x9aa1aa },
  { id: '885', real: true, name: '885系', style: 'express', price: 16000,
    desc: '白い車体に黄色い顔。車体をかたむけて走る振り子式でカーブに強い。',
    vmax: 130, accel: 3.0, brake: 4.7, stab: 1.4, cars: 6, coinMul: 1.3,
    body: 0xf8f8f8, stripe: 0xf5c400, stripe2: 0x1e1e1e, face: 0xf5c400 },
  { id: '285', real: true, name: '285系', style: 'express', price: 18000,
    desc: '夜を走る寝台特急用の電車。ベージュと赤茶の2色。',
    vmax: 130, accel: 2.7, brake: 4.5, stab: 1.2, cars: 7, coinMul: 1.38,
    body: 0xe9dcc2, stripe: 0x8a2f2f, stripe2: 0xc9a227, band: 0x8a2f2f },
  { id: 'ef65', real: true, name: 'EF65形 ＋ 24系客車', style: 'eloco', price: 20000,
    desc: '青い電気機関車が青い寝台客車を引っぱる。のんびり走ってコイン1.4倍。',
    vmax: 110, accel: 2.2, brake: 3.8, stab: 1.15, cars: 6, coinMul: 1.4,
    body: 0x2b56a5, stripe: 0xf2f2f2, stripe2: 0xe9dcb5, coach: 0x1d3478 },
  { id: 'e7', real: true, name: 'E7系', style: 'shinkansen', price: 40000,
    desc: '空色の屋根と銅色の帯。和の雰囲気の新幹線。',
    vmax: 260, accel: 3.0, brake: 5.4, stab: 1.4, cars: 8, coinMul: 1.5, nose: 9,
    body: 0xf6f4ee, stripe: 0xb87333, stripe2: 0x5aa9e6, top: 0x5aa9e6 },
  { id: '500', real: true, name: '500系', style: 'shinkansen', price: 60000,
    desc: '戦闘機のような長く尖った鼻。青みがかったグレーの車体。',
    vmax: 300, accel: 3.2, brake: 5.6, stab: 1.45, cars: 8, coinMul: 1.58, nose: 15,
    body: 0x9aa6b4, stripe: 0x1f3f9a, stripe2: 0x1f3f9a, top: 0x6b7a8c },
  { id: 'e6', real: true, name: 'E6系', style: 'shinkansen', price: 75000,
    desc: '真っ赤な屋根の新幹線。在来線にも乗り入れるのでカーブに強い。',
    vmax: 320, accel: 3.3, brake: 5.8, stab: 1.6, cars: 7, coinMul: 1.6, nose: 13,
    body: 0xf4f4f4, stripe: 0xb0b6be, stripe2: 0xb0b6be, top: 0xc8102e },
  { id: '923', real: true, name: '923形', style: 'shinkansen', price: 90000,
    desc: '線路を点検する黄色い新幹線の検測車。見かけたら幸せになれるかも？ コイン1.75倍。',
    vmax: 270, accel: 3.0, brake: 5.4, stab: 1.45, cars: 7, coinMul: 1.75, nose: 9,
    body: 0xf6d000, stripe: 0x1f3f9a, stripe2: 0x1f3f9a },
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
const DEFAULT = { coins: 0, owned: ['local'], selected: 'local', up: {}, best: 0, stats: {}, ach: {} };

export const save = load();

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && typeof d === 'object') return { ...DEFAULT, ...d, up: { ...(d.up || {}) }, stats: { ...(d.stats || {}) }, ach: { ...(d.ach || {}) } };
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
