'use strict';

/* ────────────────────────────────────────────────────────────
   Arcaea v7.0 单曲潜力值
   基础值：
     score >= 10,000,000        → 定数 + 2
     9,800,000 <= score < 1e7   → 定数 + 1 + (score − 9,800,000) / 200,000
     score < 9,800,000          → 定数 + (score − 9,500,000) / 300,000
   通关奖励：TC / FR / PM → +0.200，TL → 0
   最终：max(0, 基础值 + 奖励)   （下限在加完奖励后取）
   ──────────────────────────────────────────────────────────── */

const MAX_SCORE = 10002200;   // 全 Pure + 全大 Pure 的理论值上限（物量 2200）
const CLEAR_BONUS = 0.2;

function basePtt(score, diff) {
  if (score >= 10000000) return diff + 2;
  if (score >= 9800000) return diff + 1 + (score - 9800000) / 200000;
  return diff + (score - 9500000) / 300000;
}

function calc(score, diff, clear) {
  const base = basePtt(score, diff);
  const bonus = clear ? CLEAR_BONUS : 0;
  const raw = base + bonus;
  const ptt = Math.max(0, raw);
  return { base, bonus, raw, ptt, floored: raw < 0 };
}

function gradeOf(score) {
  if (score >= 10000000) return 'PM / MAX';
  if (score >= 9900000) return 'EX+';
  if (score >= 9800000) return 'EX';
  if (score >= 9500000) return 'AA';
  if (score >= 9200000) return 'A';
  if (score >= 8900000) return 'B';
  if (score >= 8600000) return 'C';
  return 'D';
}

// 三位小数展示：先补 1e-7 抵消二进制误差，再按半数进位（负零显示为 0.000）
function n3(v) {
  const scaled = Math.abs(v) * 1000;
  const rounded = Math.round(scaled + 1e-7) / 1000;
  const text = rounded.toFixed(3);
  return v < 0 && rounded !== 0 ? '-' + text : text;
}

/* ── DOM ── */
const $score = document.getElementById('score');
const $diff = document.getElementById('diff');
const $clear = document.getElementById('clear');
const $ptt = document.getElementById('ptt');
const $summary = document.getElementById('summary');
const $grade = document.getElementById('grade');
const $rowBase = document.getElementById('row-base');
const $rowBonus = document.getElementById('row-bonus');
const $rowFloor = document.getElementById('row-floor');
const $rowTotal = document.getElementById('row-total');
const $compare = document.getElementById('compare');
const $warn = document.getElementById('warn');
const $chart = document.getElementById('chart');

const num = (v) => v.toLocaleString('en-US');
// 定数通常是一位小数；这里保留输入值本身，避免摘要/URL 与计算值不一致
const fmtDiff = (v) => String(v);

/* ── 分享链接：?score=9950000&diff=10.5&clear=1 ── */
(function initFromUrl() {
  const q = new URLSearchParams(location.search);
  if (q.has('score')) $score.value = q.get('score');
  if (q.has('diff')) $diff.value = q.get('diff');
  if (q.has('clear')) $clear.checked = q.get('clear') === '1';
})();

function syncUrl(score, diff, clear) {
  const q = new URLSearchParams({ score: String(score), diff: fmtDiff(diff), clear: clear ? '1' : '0' });
  try { history.replaceState(null, '', '?' + q.toString()); } catch (e) { /* file:// 下受限，忽略 */ }
}

/* ── 渲染 ── */
function render() {
  const scoreRaw = parseFloat($score.value);
  const diffRaw = parseFloat($diff.value);
  const clear = $clear.checked;

  let score = Number.isFinite(scoreRaw) ? Math.round(scoreRaw) : 0;
  let diff = Number.isFinite(diffRaw) ? diffRaw : 0;

  const warns = [];
  if (score < 0) { score = 0; warns.push('分数不能为负，已按 0 计算。'); }
  if (score > MAX_SCORE) { score = MAX_SCORE; warns.push('分数超过理论值上限 ' + num(MAX_SCORE) + '，已按上限计算。'); }
  if (diff < 0) { diff = 0; warns.push('定数不能为负，已按 0 计算。'); }
  if (diff > 20) { diff = 20; warns.push('定数超过 20，已按 20 计算。'); }

  const r = calc(score, diff, clear);
  const other = calc(score, diff, !clear);

  $ptt.textContent = n3(r.ptt);
  $summary.textContent = '定数 ' + fmtDiff(diff) + ' · ' + num(score) + ' 分 · ' + (clear ? '通关' : 'Track Lost');

  const g = gradeOf(score);
  $grade.textContent = g;
  $grade.dataset.grade = g;

  $rowBase.textContent = n3(r.base);
  $rowBonus.textContent = clear ? '+0.200' : '+0.000';
  $rowBonus.className = clear ? 'plus' : 'dim';
  if (!r.floored) {
    $rowFloor.textContent = '—';
  } else {
    const rawTxt = n3(r.raw);
    $rowFloor.textContent = rawTxt === '0.000' ? '已截到 0' : '已截到 0（原始 ' + rawTxt + '）';
  }
  $rowFloor.parentElement.classList.toggle('zero', r.floored);
  $rowTotal.textContent = n3(r.ptt);

  const gap = Math.abs(other.ptt - r.ptt);
  $compare.innerHTML = clear
    ? '若本次 Track Lost：<b>' + n3(other.ptt) + '</b>（少 ' + n3(gap) + '）'
    : '若本次通关：<b>' + n3(other.ptt) + '</b>（多 ' + n3(gap) + '）';

  if (warns.length) { $warn.hidden = false; $warn.textContent = warns.join(' '); }
  else { $warn.hidden = true; $warn.textContent = ''; }

  drawChart(score, diff, clear, r.ptt);
  syncUrl(score, diff, clear);
}

/* ── 刻度 ── */
function niceStep(span, count) {
  const rough = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const mult = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return mult * mag;
}

/* ── 曲线 ── */
function drawChart(score, diff, clear, pttNow) {
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const cssW = $chart.clientWidth || 520;
  const cssH = 240;
  $chart.width = Math.round(cssW * dpr);
  $chart.height = Math.round(cssH * dpr);
  $chart.style.height = cssH + 'px';

  const ctx = $chart.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const padL = 48, padR = 16, padT = 18, padB = 34;
  const w = cssW - padL - padR;
  const h = cssH - padT - padB;

  // x 轴从「ptt 归零处」再往左留一段；但必须包含当前分数，避免低分时当前点画到图外
  const zeroAt = 9500000 - (diff + (clear ? CLEAR_BONUS : 0)) * 300000;
  let xMin = Math.min(score - 100000, Math.max(0, zeroAt - 300000));
  xMin = Math.max(0, Math.floor(xMin / 500000) * 500000);
  const xMax = MAX_SCORE;

  const yMin = 0;
  const yMax = diff + 2 + CLEAR_BONUS;

  const X = (s) => padL + (s - xMin) / (xMax - xMin) * w;
  const Y = (v) => padT + (yMax - v) / (yMax - yMin) * h;

  ctx.font = '10px ui-monospace, "Cascadia Code", Consolas, monospace';
  ctx.lineWidth = 1;

  // y 网格
  const yStep = niceStep(yMax - yMin, 4);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let v = yMin; v <= yMax + 1e-9; v += yStep) {
    const y = Y(v);
    ctx.strokeStyle = 'rgba(140,150,220,0.12)';
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + w, y); ctx.stroke();
    ctx.fillStyle = 'rgba(150,160,200,0.62)';
    ctx.fillText(v.toFixed(0), padL - 9, y);
  }

  // x 网格
  const xStep = niceStep(xMax - xMin, 5);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let s = Math.ceil(xMin / xStep) * xStep; s <= xMax + 1e-9; s += xStep) {
    const x = X(s);
    ctx.strokeStyle = 'rgba(140,150,220,0.1)';
    ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + h); ctx.stroke();
    ctx.fillStyle = 'rgba(150,160,200,0.55)';
    ctx.fillText((s / 1000000).toFixed(1) + 'M', x, padT + h + 8);
  }

  // 曲线
  const curve = (on) => {
    ctx.beginPath();
    for (let px = 0; px <= w; px += 1) {
      const s = xMin + (xMax - xMin) * px / w;
      const v = Math.max(0, basePtt(s, diff) + (on ? CLEAR_BONUS : 0));
      const x = padL + px, y = Y(v);
      px === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
  };

  ctx.lineJoin = 'round';

  // 通关奖励区间（两条曲线之间的 0.2 带）
  ctx.beginPath();
  for (let px = 0; px <= w; px += 1) {
    const s = xMin + (xMax - xMin) * px / w;
    const v = Math.max(0, basePtt(s, diff) + CLEAR_BONUS);
    px === 0 ? ctx.moveTo(padL + px, Y(v)) : ctx.lineTo(padL + px, Y(v));
  }
  for (let px = w; px >= 0; px -= 1) {
    const s = xMin + (xMax - xMin) * px / w;
    ctx.lineTo(padL + px, Y(Math.max(0, basePtt(s, diff))));
  }
  ctx.closePath();
  ctx.fillStyle = clear ? 'rgba(124,231,255,0.13)' : 'rgba(255,110,199,0.13)';
  ctx.fill();

  // 两条曲线都画，但把当前状态那条放在最上层并加亮：TL 时不会被通关线盖住
  const drawTl = (active) => {
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = active ? 'rgba(255,110,199,0.95)' : 'rgba(255,110,199,0.28)';
    ctx.lineWidth = active ? 2.2 : 1.2;
    if (active) { ctx.shadowColor = 'rgba(255,110,199,0.5)'; ctx.shadowBlur = 10; }
    curve(false); ctx.stroke();
    ctx.shadowBlur = 0;
  };
  const drawTc = (active) => {
    ctx.setLineDash([]);
    if (active) {
      const grad = ctx.createLinearGradient(padL, 0, padL + w, 0);
      grad.addColorStop(0, 'rgba(124,231,255,0.45)');
      grad.addColorStop(0.7, 'rgba(124,231,255,1)');
      grad.addColorStop(1, '#ffffff');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.4;
      ctx.shadowColor = 'rgba(124,231,255,0.5)';
      ctx.shadowBlur = 12;
      curve(true); ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = 'rgba(124,231,255,0.30)';
      ctx.lineWidth = 1.2;
      curve(true); ctx.stroke();
    }
  };

  if (clear) { drawTl(false); drawTc(true); }
  else { drawTc(false); drawTl(true); }

  // 当前点
  const cx = X(score), cy = Y(pttNow);
  ctx.beginPath(); ctx.setLineDash([3, 4]);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
  ctx.moveTo(cx, padT); ctx.lineTo(cx, padT + h); ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath(); ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = clear ? '#7ce7ff' : '#ff6ec7';
  ctx.fill();
  ctx.strokeStyle = 'rgba(5,6,15,0.7)'; ctx.lineWidth = 2; ctx.stroke();
}

/* ── 事件 ── */
[$score, $diff, $clear].forEach((el) => {
  el.addEventListener('input', render);
  el.addEventListener('change', render);
});

document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    $score.value = chip.dataset.score;
    $diff.value = chip.dataset.diff;
    $clear.checked = chip.dataset.clear === '1';
    render();
  });
});

let t = 0;
window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(render, 120); });

render();
