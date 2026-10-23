// 画面切り替えとメニュー・ショップ・アップグレードの描画
import { TRAINS, UPGRADES, save, persist, lv, upgradeCost, trainById, effectiveStats } from './data.js';
import { sfx } from './audio.js';

export const $ = id => document.getElementById(id);
const ICON = { commuter: '🚃', steam: '🚂', express: '🚆', shinkansen: '🚅', maglev: '🚄' };
const hex = n => '#' + n.toString(16).padStart(6, '0');

export function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  if (id === 'menu') renderMenu();
  if (id === 'shop') renderShop();
  if (id === 'upgrade') renderUpgrade();
  refreshCoins();
}

export function overlay(id, on) { $(id).classList.toggle('active', on); }

export function refreshCoins() {
  document.querySelectorAll('.coinVal').forEach(e => { e.textContent = save.coins.toLocaleString(); });
}

function renderMenu() {
  const t = trainById(save.selected);
  const e = effectiveStats(t);
  $('menuCurrent').innerHTML = `使用車両: <b>${ICON[t.style]} ${t.name}</b>　最高 ${Math.round(e.vmax)}km/h ・ コイン x${e.coinMul.toFixed(2)}`;
  $('bestDist').textContent = Math.floor(save.best).toLocaleString();
}

function statBars(t) {
  const rows = [['最高速度', t.vmax / 500, `${t.vmax}km/h`], ['加速', t.accel / 3.6, ''], ['ブレーキ', t.brake / 6.5, ''],
    ['安定性', t.stab / 1.6, ''], ['コイン', t.coinMul / 2, `x${t.coinMul}`]];
  return rows.map(([n, v, txt]) => `<span>${n}</span><div class="bar" title="${txt}"><i style="width:${Math.min(100, v * 100)}%"></i></div>`).join('');
}

function renderShop() {
  const list = $('shopList');
  list.innerHTML = '';
  for (const t of TRAINS) {
    const owned = save.owned.includes(t.id);
    const cur = save.selected === t.id;
    const c = document.createElement('div');
    c.className = 'card';
    c.style.setProperty('--c', hex(t.stripe));
    let btn;
    if (cur) btn = '<button class="cur" disabled>使用中</button>';
    else if (owned) btn = '<button class="sel">この電車にする</button>';
    else btn = `<button ${save.coins < t.price ? 'disabled' : ''}>🪙 ${t.price.toLocaleString()} で購入</button>`;
    c.innerHTML = `<h3>${ICON[t.style]} ${t.name}</h3><div class="desc">${t.desc}<br>${t.cars}両編成 ・ 最高 ${t.vmax}km/h</div>
      <div class="stats">${statBars(t)}</div>${btn}`;
    const b = c.querySelector('button');
    b.onclick = () => {
      if (cur) return;
      if (!owned) {
        if (save.coins < t.price) return;
        save.coins -= t.price;
        save.owned.push(t.id);
        sfx.coin();
      } else sfx.click();
      save.selected = t.id;
      persist();
      renderShop(); refreshCoins();
    };
    list.appendChild(c);
  }
}

function renderUpgrade() {
  const list = $('upList');
  list.innerHTML = '';
  for (const u of UPGRADES) {
    const l = lv(u.id), maxed = l >= u.max, cost = upgradeCost(u, l);
    const c = document.createElement('div');
    c.className = 'card';
    c.style.setProperty('--c', u.color);
    const pips = Array.from({ length: u.max }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('');
    c.innerHTML = `<h3>${u.icon} ${u.name} <small>Lv ${l}/${u.max}</small></h3><div class="desc">${u.desc}</div>
      <div class="lv-pips">${pips}</div>
      <button ${maxed || save.coins < cost ? 'disabled' : ''}>${maxed ? 'MAX' : `🪙 ${cost.toLocaleString()} で強化`}</button>`;
    c.querySelector('button').onclick = () => {
      if (maxed || save.coins < cost) return;
      save.coins -= cost;
      save.up[u.id] = l + 1;
      persist(); sfx.coin();
      renderUpgrade(); refreshCoins();
    };
    list.appendChild(c);
  }
}
