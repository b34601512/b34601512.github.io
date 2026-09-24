// 「怎么用」页的手绘教程动画：Canvas 2D 逐帧画出来，不用视频文件。
// 手绘做法取自 alesha-pro/tools 的 hand-drawn-canvas-animation（MIT）：线条沿长度缓慢游走而不是逐点抖动、
// 两遍描线像粉笔/蜡笔、画面按二拍（每秒 12 张）换、描边轻微 boil、用排线代替平涂、随机数全部带种子。
// 这里只实现本片用到的那一小部分。白天是纸上墨线，黑夜是黑板粉笔，跟着网站主题换。
(() => {
  const canvas = document.getElementById("guide-film");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const playButton = document.getElementById("guide-play");
  const track = document.getElementById("guide-track");
  const fill = document.getElementById("guide-fill");
  const timeLabel = document.getElementById("guide-time");
  const stepButtons = [...document.querySelectorAll("[data-chapter]")];

  const W = 960;
  const H = 540;
  const TAU = Math.PI * 2;
  const DURATION = 45;
  const FONT = '"KaiTi", "STKaiti", "Kaiti SC", "楷体", serif';

  const PALETTES = {
    light: {
      bg: "#f3ede1", card: "#fbf8f1", ink: "#2b2723", soft: "rgba(43, 39, 35, 0.42)",
      accent: "#d4521c", green: "#4f9a3a", blue: "#3767cf", grain: "#6b5e4c", vignette: 0.07, chalk: false,
    },
    dark: {
      bg: "#1c201e", card: "#222826", ink: "#eeeae0", soft: "rgba(238, 234, 224, 0.42)",
      accent: "#ff8a4c", green: "#8fd46d", blue: "#8fb4ff", grain: "#ffffff", vignette: 0.28, chalk: true,
    },
  };
  let P = PALETTES.dark;

  // ---------- 数学与随机 ----------
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOutBack = (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
  const linear = (t) => t;
  const sm = (a, b, t, e = easeIO) => e(clamp((t - a) / (b - a), 0, 1));
  const inWindow = (t, a, b, fade = 0.2) => sm(a, a + fade, t) * (1 - sm(b - fade, b, t));

  function rng(seed) {
    let a = (seed * 1000003) >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(k, seed = 0) {
    let a = (Math.imul(k | 0, 0x9e3779b1) + Math.imul((seed * 4096) | 0, 0x85ebca77)) | 0;
    a ^= a >>> 15;
    a = Math.imul(a, 0x2c1b3c6d);
    a ^= a >>> 12;
    a = Math.imul(a, 0x297a2d39);
    a ^= a >>> 15;
    return (a >>> 0) / 4294967296;
  }
  function noise1(x, seed) {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    return lerp(hash(i, seed) * 2 - 1, hash(i + 1, seed) * 2 - 1, u);
  }
  function seedOf(text) {
    let h = 2166136261;
    for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return (h >>> 0) % 100000;
  }
  const quad = (p0, c, p1, t) => [
    (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0],
    (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1],
  ];

  // ---------- 形状（都是点列，交给 line() 画成手绘线） ----------
  function rrect(x, y, w, h, r = 10) {
    const pts = [];
    const corner = (cx, cy, a0) => {
      for (let k = 0; k <= 4; k++) pts.push([cx + Math.cos(a0 + (k / 4) * (Math.PI / 2)) * r, cy + Math.sin(a0 + (k / 4) * (Math.PI / 2)) * r]);
    };
    corner(x + w - r, y + r, -Math.PI / 2);
    corner(x + w - r, y + h - r, 0);
    corner(x + r, y + h - r, Math.PI / 2);
    corner(x + r, y + r, Math.PI);
    return pts;
  }
  function circle(cx, cy, rx, ry = rx, n = 28) {
    return Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * TAU) * rx, cy + Math.sin((i / n) * TAU) * ry]);
  }
  const CURSOR = [[0, 0], [0, 27], [7, 21], [12, 32], [17, 30], [12, 19], [21, 19]];
  const PLANE = [[-12, 0], [12, -9], [5, 0], [12, 9]];
  const MAGNET = (() => {
    const pts = [[-9, -12], [-9, 2]];
    for (let k = 1; k < 8; k++) pts.push([Math.cos(Math.PI - (k / 8) * Math.PI) * 9, 2 + Math.sin(Math.PI - (k / 8) * Math.PI) * 9]);
    pts.push([9, 2], [9, -12]);
    return pts;
  })();

  // ---------- 笔触 ----------
  // 同一张画在不同帧里保持同一组笔迹（按 id + boil 变体缓存），只有 boil 才换笔迹。
  const PATHS = new Map();
  let T = 0;
  let BOIL = 0;

  function densify(pts, close, step = 6) {
    const out = [];
    const n = pts.length;
    const segs = close ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      const m = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
      for (let k = 0; k < m; k++) out.push([lerp(a[0], b[0], k / m), lerp(a[1], b[1], k / m)]);
    }
    if (!close) out.push(pts[n - 1].slice());
    return out;
  }

  // 手不是逐点抖，而是沿着线慢慢游走：闭合形状用首尾相接的正弦和，开放线用平滑噪声。
  function wobPath(pts, amp, seed, close) {
    const q = densify(pts, close);
    const n = q.length;
    const s = [0];
    for (let i = 1; i < n; i++) s.push(s[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
    const length = close ? s[n - 1] + Math.hypot(q[0][0] - q[n - 1][0], q[0][1] - q[n - 1][1]) : s[n - 1];
    const r = rng(seed);
    const ph = [r() * TAU, r() * TAU, r() * 100];
    const k1 = Math.max(2, Math.round(length / 140));
    const off = close
      ? (i) => amp * (0.6 * Math.sin((k1 * TAU * s[i]) / length + ph[0]) + 0.3 * Math.sin(((2 * k1 + 1) * TAU * s[i]) / length + ph[1]))
      : (i) => amp * (0.65 * noise1(s[i] / 90 + ph[2], seed) + 0.3 * noise1(s[i] / 34 + ph[2] * 3, seed + 7));
    const path = new Path2D();
    for (let i = 0; i < n; i++) {
      const a = q[i > 0 ? i - 1 : close ? n - 1 : 0];
      const b = q[i < n - 1 ? i + 1 : close ? 0 : n - 1];
      const nx = a[1] - b[1];
      const ny = b[0] - a[0];
      const l = Math.hypot(nx, ny) || 1;
      const d = off(i);
      const x = q[i][0] + (nx / l) * d;
      const y = q[i][1] + (ny / l) * d;
      if (i) path.lineTo(x, y);
      else path.moveTo(x, y);
    }
    if (close) path.closePath();
    return { path, length };
  }

  function line(id, pts, o = {}) {
    const { color = P.ink, width = 2, amp = 1.4, close = false, progress = 1, fillColor = null, alpha = 1, boil = true } = o;
    if (progress <= 0) return;
    const variant = boil ? BOIL : 0;
    const get = (pass) => {
      const key = `${id}|${variant}|${pass}`;
      let entry = PATHS.get(key);
      if (!entry) {
        entry = wobPath(pts, amp * (pass ? 1.7 : 1), seedOf(id) + variant * 101 + pass * 7, close);
        PATHS.set(key, entry);
      }
      return entry;
    };
    const base = ctx.globalAlpha;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    const main = get(0);
    if (fillColor && progress >= 1) {
      ctx.fillStyle = fillColor;
      ctx.fill(main.path);
    }
    const pass = (entry, w, a) => {
      ctx.globalAlpha = base * alpha * a;
      ctx.lineWidth = w;
      ctx.setLineDash(progress < 1 ? [entry.length * progress, entry.length * 2] : []);
      ctx.stroke(entry.path);
    };
    pass(main, width, P.chalk ? 0.88 : 0.94);
    if (width >= 1.5) pass(get(1), width * 0.55, P.chalk ? 0.45 : 0.32);
    ctx.restore();
  }

  // 排线代替平涂：一组平行短线裁在形状里，progress 控制画到第几根。
  function hatch(id, pts, o = {}) {
    const { color = P.accent, gap = 6, angle = -0.95, width = 1.3, alpha = 0.5, progress = 1 } = o;
    if (progress <= 0) return;
    const key = `${id}|h|${BOIL}`;
    let entry = PATHS.get(key);
    if (!entry) {
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const nx = -dy;
      const ny = dx;
      const proj = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => x * nx + y * ny);
      const along = ((x0 + x1) / 2) * dx + ((y0 + y1) / 2) * dy;
      const half = Math.hypot(x1 - x0, y1 - y0) / 2 + 6;
      const lines = [];
      for (let d = Math.min(...proj) + gap / 2; d < Math.max(...proj); d += gap) {
        const bx = nx * d + dx * along;
        const by = ny * d + dy * along;
        const seg = [[bx - dx * half, by - dy * half], [bx + dx * half, by + dy * half]];
        lines.push(wobPath(seg, 0.8, seedOf(id) + lines.length * 13 + BOIL * 101, false).path);
      }
      const clip = new Path2D();
      pts.forEach((p, i) => (i ? clip.lineTo(p[0], p[1]) : clip.moveTo(p[0], p[1])));
      clip.closePath();
      entry = { lines, clip };
      PATHS.set(key, entry);
    }
    ctx.save();
    ctx.clip(entry.clip);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.globalAlpha *= alpha;
    const count = Math.ceil(entry.lines.length * progress);
    for (let i = 0; i < count; i++) ctx.stroke(entry.lines[i]);
    ctx.restore();
  }

  // 手写字：楷体逐字写出，每个字带一点固定的歪斜和高低（同一张画里不变）。
  const WIDTHS = new Map();
  function charWidths(text, size) {
    const key = `${size}|${text}`;
    let widths = WIDTHS.get(key);
    if (!widths) {
      ctx.font = `${size}px ${FONT}`;
      widths = [...text].map((ch) => ctx.measureText(ch).width);
      WIDTHS.set(key, widths);
    }
    return widths;
  }
  function hand(text, x, y, o = {}) {
    const { size = 22, color = P.ink, progress = 1, align = "left" } = o;
    const chars = [...text];
    const widths = charWidths(text, size);
    const total = widths.reduce((a, b) => a + b, 0);
    if (progress <= 0) return total;
    const seed = seedOf(text);
    const base = ctx.globalAlpha;
    let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
    const shown = progress * chars.length;
    ctx.save();
    ctx.font = `${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    chars.forEach((ch, i) => {
      const vis = clamp(shown - i, 0, 1);
      if (vis > 0) {
        ctx.save();
        ctx.globalAlpha = base * vis;
        ctx.translate(cx + widths[i] / 2, y + (hash(i, seed) - 0.5) * 2.4 + (1 - vis) * 4);
        ctx.rotate((hash(i + 50, seed) - 0.5) * 0.09);
        ctx.fillText(ch, -widths[i] / 2, 0);
        ctx.restore();
      }
      cx += widths[i];
    });
    ctx.restore();
    return total;
  }

  // 看不清的手写行：话术答案只画成一串小拱形，让人知道这里有字就够了。
  function squiggle(id, x, y, w, progress = 1) {
    if (progress <= 0) return;
    const r = rng(seedOf(id));
    const words = [];
    let px = x;
    const end = x + w * (0.7 + r() * 0.3);
    while (px < end) {
      const wl = 16 + r() * 34;
      const f = 0.55 + r() * 0.4;
      const pts = [];
      for (let u = 0; u <= wl; u += 2) pts.push([px + u, y - Math.abs(Math.sin(u * f)) * 4]);
      words.push(pts);
      px += wl + 7 + r() * 5;
    }
    const count = Math.ceil(words.length * progress);
    for (let i = 0; i < count; i++) line(`${id}-${i}`, words[i], { color: P.soft, width: 1.3, amp: 0.5 });
  }

  function dots(p0, c, p1, f) {
    ctx.save();
    ctx.fillStyle = P.soft;
    for (let i = 0; i <= 20 * f; i++) {
      const [x, y] = quad(p0, c, p1, i / 20);
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 道具 ----------
  function plane(id, x, y, s = 1, rot = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    line(id, PLANE, { close: true, fillColor: P.card, width: 2 });
    line(`${id}-fold`, [[5, 0], [-12, 0]], { width: 1.3 });
    ctx.restore();
  }

  function sprite(x, y, o = {}) {
    const { progress = 1, blink = 0, look = 0 } = o;
    ctx.save();
    ctx.translate(x, y);
    const body = rrect(-46, -44, 92, 84, 28);
    if (progress >= 1) hatch("sp-body-h", body, { color: P.accent, alpha: 0.6, gap: 5 });
    line("sp-body", body, { close: true, color: P.accent, width: 3, progress });
    line("sp-leg-l", [[-16, 40], [-16, 54]], { color: P.accent, width: 3, progress });
    line("sp-leg-r", [[16, 40], [16, 54]], { color: P.accent, width: 3, progress });
    if (progress >= 0.7) {
      for (const sx of [-18, 18]) {
        ctx.save();
        ctx.translate(sx, -8);
        ctx.scale(1, 1 - blink * 0.9);
        line(`sp-eye${sx}`, circle(0, 0, 13), { close: true, fillColor: P.card, width: 2.2, color: P.ink });
        ctx.beginPath();
        ctx.arc(look * 4, 1, 5.5, 0, TAU);
        ctx.fillStyle = P.ink;
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }
  const blinkAt = (t, times) => Math.max(0, ...times.map((b) => 1 - Math.abs(t - b) / 0.12));

  function keycap(label, x, y, w, shownFrom, pressAt, goneAt) {
    const appear = sm(shownFrom, shownFrom + 0.3, T, linear) * (1 - sm(goneAt, goneAt + 0.3, T));
    if (appear <= 0) return;
    const press = T >= pressAt && T < pressAt + 0.25 ? 1 : 0;
    ctx.save();
    ctx.globalAlpha *= clamp(appear * 1.5, 0, 1);
    ctx.translate(x + w / 2, y + 20);
    const s = 0.6 + 0.4 * easeOutBack(appear);
    ctx.scale(s, s);
    ctx.translate(-w / 2, -20);
    line(`key-sh-${label}-${w}`, rrect(0, 5, w, 40, 8), { close: true, color: P.soft, width: 1.6 });
    ctx.translate(0, press * 4);
    line(`key-${label}-${w}`, rrect(0, 0, w, 40, 8), { close: true, fillColor: P.card, width: 2.2 });
    hand(label, w / 2, 20, { size: 19, align: "center" });
    ctx.restore();
  }

  function note(text, x, y, from, to, arrow) {
    const a = inWindow(T, from, to, 0.3);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    hand(text, x, y, { size: 19, color: P.accent, progress: sm(from, from + 0.6, T, linear) });
    if (arrow) line(`note-${text}`, arrow, { color: P.accent, width: 1.8, progress: sm(from + 0.4, from + 0.8, T) });
    ctx.restore();
  }

  // ---------- 剧本 ----------
  // 场景时间都是整片的绝对秒数；窗口、气泡、光标的状态都是 T 的纯函数，拖进度条到哪一秒都画得出来。
  const SCENES = [
    { start: 0, end: 4 },
    { start: 4, end: 11, caption: "① 分好类：团队 / 个人 / 离线，每类 0–9 十套" },
    { start: 11, end: 18, caption: "② 双击话术，贴进聊天输入框" },
    { start: 18, end: 26, caption: "③ 点左侧纸飞机，直接发送" },
    { start: 26, end: 35, caption: "④ Alt+Q 搜索，按 Tab 再按数字直接发送" },
    { start: 35, end: 41, caption: "⑤ 吸附搜索栏贴在聊天窗口下面" },
    { start: 41, end: DURATION },
  ];

  const TABS = ["团队话术", "个人话术", "离线话术"];
  const CHIPS = ["售前", "售后", "物流"];
  const ROWS = ["正品保证", "发货时间", "包邮说明"];
  const HITS = ["发货时间", "催发货", "发货地址"];
  const BUBBLES = [
    { id: "b-c1", side: "in", text: "老板，是正品吗？", y: 76, at: 12.0 },
    { id: "b-o1", side: "out", text: "亲，我们是品牌直营，保证正品～", y: 124, at: 17.1 },
    { id: "b-o2", side: "out", text: "亲，今天下单今天发货～", y: 172, at: 21.1 },
    { id: "b-c2", side: "in", text: "好的，那我拍了！", y: 220, at: 23.2 },
    { id: "b-o3", side: "out", text: "亲，已经帮您催仓库了，今天一定发出～", y: 268, at: 32.1 },
    { id: "b-o4", side: "out", text: "亲，全场满 49 元包邮～", y: 316, at: 39.1 },
  ];
  const CLICKS = [
    [6.2, 373, 98], [6.9, 473, 98], [7.6, 573, 98], [8.4, 429, 150], [9.1, 362, 184],
    [13.6, 670, 266], [13.85, 670, 266], [19.8, 616, 322],
  ];
  const CURSOR_KEYS = [
    [5.5, 540, 330], [6.1, 373, 98], [6.2, 373, 98], [6.8, 473, 98], [6.9, 473, 98], [7.5, 573, 98], [7.6, 573, 98],
    [8.3, 429, 150], [8.4, 429, 150], [9.0, 362, 184], [9.1, 362, 184], [9.8, 430, 300],
    [12.8, 520, 390], [13.5, 670, 266], [14.0, 670, 266], [15.0, 720, 340],
    [18.6, 720, 420], [19.6, 616, 322], [19.9, 616, 322], [20.8, 690, 390],
  ];
  const CURSOR_SHOWN = [[5.5, 9.9], [12.8, 15.2], [18.6, 20.9]];

  function panelState() {
    let x = 590;
    let alpha = 1;
    if (T < 9.8) x = 315;
    else if (T < 10.8) x = lerp(315, 590, sm(9.8, 10.8, T));
    if (T >= 35) {
      const k = sm(35, 35.6, T);
      x = 590 + 30 * k;
      alpha = 1 - k;
    }
    const tab = T < 6.2 ? 0 : T < 6.9 ? 1 : T < 7.6 ? 2 : 0;
    const searching = T >= 28.6 && T < 33.3;
    let hi = -1;
    if (T >= 13.6 && T < 17.2) hi = 0;
    if (T >= 19.8 && T < 21.5) hi = 1;
    if (T >= 31 && T < 33.3) hi = 1;
    return {
      x, alpha, tab, hi, searching,
      progress: sm(4, 5.6, T, linear),
      digit: T >= 8.4 ? 3 : 0,
      digitRing: sm(8.4, 8.8, T),
      chip: T >= 9.1 ? 0 : -1,
      rowsProgress: searching ? sm(28.6, 29.2, T, linear) : 1,
      numbers: searching ? sm(29.85, 30.2, T) : 0,
      search: T >= 27.8 && T < 33.3 ? sm(27.8, 28.4, T, linear) : 0,
      searchRing: sm(27.05, 27.5, T) * (1 - sm(28.2, 28.6, T)),
    };
  }

  function drawPanel() {
    if (T < 4 || T >= 35.6) return;
    const s = panelState();
    const q = (a, b) => clamp((s.progress - a) / (b - a), 0, 1);
    ctx.save();
    ctx.globalAlpha *= s.alpha;
    ctx.translate(s.x, 70);
    line("pn-frame", rrect(0, 0, 330, 400, 12), { close: true, fillColor: P.card, width: 2.2, progress: q(0, 0.5) });
    TABS.forEach((t, i) => hand(t, 20 + i * 100, 28, { size: 19, progress: q(0.3, 0.6), color: i === s.tab ? P.ink : P.soft }));
    line(`pn-tab-ul-${s.tab}`, [[18 + s.tab * 100, 46], [98 + s.tab * 100, 47]], { color: P.accent, width: 3, progress: q(0.5, 0.7) });
    line("pn-div", [[12, 56], [318, 56]], { color: P.soft, width: 1.2, progress: q(0.4, 0.7) });
    for (let i = 0; i < 10; i++) {
      hand(String(i), 24 + i * 30, 80, { size: 18, align: "center", progress: q(0.55, 0.8), color: i === s.digit ? P.accent : P.ink });
    }
    if (s.digit) line(`pn-dig-${s.digit}`, circle(24 + s.digit * 30, 80, 13), { close: true, color: P.accent, width: 2, progress: s.digitRing });
    CHIPS.forEach((c, i) => {
      ctx.save();
      ctx.translate(16 + i * 72, 100);
      const shape = rrect(0, 0, 62, 28, 8);
      if (i === s.chip) hatch("pn-chip-h", shape, { color: P.accent, alpha: 0.4, gap: 5 });
      line(`pn-chip-${i}`, shape, { close: true, width: 1.6, progress: q(0.6, 0.85) });
      hand(c, 31, 14, { size: 16, align: "center", progress: q(0.65, 0.9) });
      ctx.restore();
    });
    line("pn-lv2", rrect(12, 140, 306, 28, 6), { close: true, color: P.soft, width: 1.4, progress: q(0.7, 0.9) });
    hand(s.searching ? "搜索结果 · 3" : "价格问题", 24, 154, { size: 16, color: P.soft, progress: q(0.72, 0.92) });
    const rows = s.searching ? HITS : ROWS;
    const rowsProgress = q(0.8, 1) * s.rowsProgress;
    rows.forEach((title, i) => {
      ctx.save();
      ctx.translate(0, 180 + i * 54);
      if (s.hi === i) hatch(`pn-hi-${i}`, rrect(8, 0, 314, 48, 6), { color: P.blue, alpha: 0.35, gap: 6 });
      if (rowsProgress > 0) plane(`pn-plane-${i}`, 26, 16, 0.7);
      hand(title, 48, 14, { size: 18, color: P.accent, progress: rowsProgress });
      squiggle(`pn-sq-${s.searching ? "hit" : "row"}-${i}`, 48, 36, 220, rowsProgress);
      if (s.numbers > 0) {
        line(`pn-num-${i}`, circle(298, 16, 11), { close: true, color: P.accent, width: 1.6, progress: s.numbers });
        hand(String(i + 1), 298, 16, { size: 15, align: "center", color: P.accent, progress: s.numbers });
      }
      ctx.restore();
    });
    ctx.save();
    ctx.translate(12, 346);
    line("pn-search", rrect(0, 0, 306, 38, 8), { close: true, width: 1.8, progress: q(0.85, 1) });
    if (s.search > 0) hand("发货", 14, 19, { size: 18, progress: s.search });
    else hand("Alt+Q 定位搜索栏", 14, 19, { size: 16, color: P.soft, progress: q(0.9, 1) });
    if (s.searchRing > 0) line("pn-search-ring", circle(153, 19, 172, 30, 40), { close: true, color: P.accent, width: 2.2, progress: s.searchRing });
    ctx.restore();
    ctx.restore();
  }

  function bubble(b, shift) {
    const progress = clamp((T - b.at) / 0.8, 0, 1);
    if (progress <= 0) return;
    const size = 17;
    const w = charWidths(b.text, size).reduce((a, c) => a + c, 0) + 30;
    const h = 36;
    ctx.save();
    ctx.translate(b.side === "in" ? 16 : 480 - 16 - w, b.y - shift);
    const shape = rrect(0, 0, w, h, 10);
    if (b.side === "out") {
      hatch(`${b.id}-h`, shape, { color: P.green, alpha: 0.5, gap: 5, progress: clamp((progress - 0.35) / 0.4, 0, 1) });
      line(b.id, shape, { close: true, color: P.green, width: 2, progress: clamp(progress / 0.4, 0, 1) });
    } else {
      line(b.id, shape, { close: true, fillColor: P.card, width: 1.8, progress: clamp(progress / 0.4, 0, 1) });
    }
    hand(b.text, 15, h / 2, { size, progress: clamp((progress - 0.3) / 0.7, 0, 1) });
    ctx.restore();
  }

  function drawChat() {
    if (T < 11) return;
    const p = sm(11, 12.2, T, linear);
    const q = (a, b) => clamp((p - a) / (b - a), 0, 1);
    ctx.save();
    ctx.translate(50, 70);
    line("ch-frame", rrect(0, 0, 480, 400, 12), { close: true, fillColor: P.card, width: 2.2, progress: q(0, 0.5) });
    line("ch-avatar", circle(32, 30, 15), { close: true, width: 1.8, progress: q(0.3, 0.6) });
    hand("晓", 32, 30, { size: 16, align: "center", progress: q(0.4, 0.7) });
    hand("客户 晓明", 58, 30, { size: 18, progress: q(0.45, 0.75) });
    line("ch-head", [[0, 58], [480, 58]], { color: P.soft, width: 1.2, progress: q(0.3, 0.7) });
    line("ch-input", rrect(14, 344, 360, 40, 8), { close: true, width: 1.8, progress: q(0.6, 0.9) });
    const sendFlash = (T >= 17 && T < 17.3) || (T >= 38.8 && T < 39.1);
    if (sendFlash) hatch("ch-send-h", rrect(388, 344, 78, 40, 8), { color: P.green, alpha: 0.6, gap: 5 });
    line("ch-send", rrect(388, 344, 78, 40, 8), { close: true, width: 1.8, progress: q(0.65, 0.95) });
    hand("发送", 427, 364, { size: 17, align: "center", progress: q(0.7, 1) });
    if (T >= 15 && T < 17.1) hand("亲，我们是品牌直营，保证正品～", 28, 364, { size: 17, progress: sm(15, 15.4, T, linear) });

    const shift = 48 * sm(38.9, 39.3, T);
    ctx.save();
    ctx.beginPath();
    ctx.rect(2, 60, 476, 278);
    ctx.clip();
    BUBBLES.forEach((b) => bubble(b, shift));
    if (T >= 22.3 && T < 23.2) {
      ctx.fillStyle = P.soft;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(34 + i * 13, 238 - Math.max(0, Math.sin(T * 9 - i)) * 4, 3.2, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.restore();
  }

  function drawAttached() {
    if (T < 35.8) return;
    const k = easeOutBack(clamp((T - 35.8) / 0.7, 0, 1));
    const y = lerp(560, 474, k);
    ctx.save();
    ctx.translate(50, y);
    line("bar", rrect(0, 0, 480, 40, 8), { close: true, fillColor: P.card, width: 2.2 });
    if (T >= 37.2 && T < 39) hand("包邮", 14, 20, { size: 18, progress: sm(37.2, 37.8, T, linear) });
    else hand("搜索话术…", 14, 20, { size: 16, color: P.soft });
    hand("全部", 418, 20, { size: 16, color: P.soft });
    hand("›", 460, 20, { size: 20, color: P.soft });
    ctx.restore();

    ctx.save();
    ctx.translate(560, y + 24);
    line("magnet", MAGNET, { color: P.accent, width: 3 });
    line("magnet-l", [[-9, -12], [-9, -6]], { color: P.ink, width: 3.4 });
    line("magnet-r", [[9, -12], [9, -6]], { color: P.ink, width: 3.4 });
    if (T >= 36.4 && T < 37.2) {
      const a = 1 - sm(36.4, 37.2, T, linear);
      line("snap-1", [[-20, -22], [-14, -16]], { color: P.accent, width: 2, alpha: a });
      line("snap-2", [[0, -28], [0, -20]], { color: P.accent, width: 2, alpha: a });
      line("snap-3", [[20, -22], [14, -16]], { color: P.accent, width: 2, alpha: a });
    }
    ctx.restore();

    const pop = sm(37.9, 38.2, T) * (1 - sm(38.9, 39, T));
    if (pop > 0) {
      ctx.save();
      ctx.globalAlpha *= pop;
      ctx.translate(50, 384);
      line("pop", rrect(0, 0, 480, 86, 8), { close: true, fillColor: P.card, width: 2 });
      hand("搜索结果 · 1", 14, 18, { size: 15, color: P.soft });
      hatch("pop-hi", rrect(8, 34, 464, 42, 6), { color: P.blue, alpha: 0.35 });
      plane("pop-plane", 26, 55, 0.7);
      hand("包邮说明", 48, 55, { size: 18, color: P.accent });
      squiggle("pop-sq", 140, 60, 200);
      ctx.restore();
    }
  }

  function drawMotion() {
    if (T >= 14 && T < 15.1) {
      const f = sm(14, 15, T);
      const p0 = [640, 264];
      const c = [380, 170];
      const p1 = [80, 434];
      dots(p0, c, p1, f);
      const [x, y] = quad(p0, c, p1, f);
      hand("亲，我们是品牌直营…", x, y, { size: 15, color: P.accent });
    }
    const flights = [
      [19.9, 21.1, [616, 320], [560, 150], [405, 260]],
      [31.1, 32.1, [616, 320], [520, 200], [346, 356]],
    ];
    for (const [a, b, p0, c, p1] of flights) {
      if (T < a || T >= b + 0.1) continue;
      const f = sm(a, b, T);
      dots(p0, c, p1, f);
      const [x, y] = quad(p0, c, p1, f);
      const [nx, ny] = quad(p0, c, p1, Math.min(1, f + 0.02));
      plane(`fly-${a}`, x, y, 1.3, Math.atan2(ny - y, nx - x) + Math.PI);
    }
    keycap("Enter", 420, 356, 96, 16.2, 17.0, 17.5);
    keycap("Alt", 80, 356, 64, 26.3, 27.0, 27.8);
    keycap("Q", 170, 356, 48, 26.3, 27.0, 27.8);
    if (T >= 26.4 && T < 28.1) hand("+", 157, 376, { size: 22, align: "center", color: P.soft });
    keycap("Tab", 80, 356, 70, 29.3, 29.8, 30.2);
    keycap("2", 80, 356, 48, 30.5, 31.0, 31.5);
    keycap("Enter", 620, 420, 96, 38.1, 38.8, 39.4);
    note("只贴进来，还没发", 80, 392, 15.4, 17.9, [[96, 404], [102, 420]]);
    note("贴进去 + 回车，一步发出", 80, 392, 21.8, 25.6);
    note("不用切回主界面", 610, 240, 36.8, 40.8);
    note("也能搜、能发", 610, 274, 37.1, 40.8, [[640, 296], [610, 380], [548, 470]]);
  }

  function drawCursor() {
    const visible = Math.max(...CURSOR_SHOWN.map(([a, b]) => inWindow(T, a, b)));
    for (const [t, x, y] of CLICKS) {
      const d = T - t;
      if (d < 0 || d > 0.5) continue;
      const k = d / 0.5;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(6 + 28 * k, 6 + 28 * k);
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = 2.2 / (6 + 28 * k);
      ctx.strokeStyle = P.accent;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    if (visible <= 0) return;
    let i = CURSOR_KEYS.findIndex((key) => key[0] > T);
    if (i === -1) i = CURSOR_KEYS.length - 1;
    const b = CURSOR_KEYS[i];
    const a = CURSOR_KEYS[Math.max(0, i - 1)];
    const f = b[0] === a[0] ? 1 : easeIO(clamp((T - a[0]) / (b[0] - a[0]), 0, 1));
    const pressed = CLICKS.some(([t]) => T >= t && T < t + 0.12);
    ctx.save();
    ctx.globalAlpha *= visible;
    ctx.translate(lerp(a[1], b[1], f), lerp(a[2], b[2], f));
    if (pressed) ctx.scale(0.88, 0.88);
    line("cursor", CURSOR, { close: true, fillColor: P.card, width: 2 });
    ctx.restore();
  }

  function drawCaption() {
    const scene = SCENES.find((s) => s.caption && T >= s.start && T < s.end);
    if (!scene) return;
    const u = T - scene.start;
    ctx.save();
    ctx.globalAlpha = 1 - sm(scene.end - 0.35, scene.end, T);
    const w = hand(scene.caption, W / 2, 36, { size: 25, align: "center", progress: sm(0, 0.9, u, linear) });
    line(`cap-ul-${scene.start}`, [[W / 2 - w / 2, 57], [W / 2 + w / 2, 59]], { color: P.accent, width: 2.4, progress: sm(0.7, 1.2, u) });
    ctx.restore();
  }

  function drawIntro() {
    if (T >= 4) return;
    ctx.save();
    ctx.globalAlpha = 1 - sm(3.4, 4, T);
    sprite(W / 2, 200, { progress: sm(0, 1.1, T), blink: blinkAt(T, [2.3]), look: Math.sin(T * 1.3) * 0.6 });
    hand("话术精灵", W / 2, 318, { size: 58, align: "center", progress: sm(0.9, 1.8, T, linear) });
    const w = hand("45 秒看懂怎么用", W / 2, 378, { size: 26, align: "center", progress: sm(1.7, 2.5, T, linear) });
    line("intro-ul", [[W / 2 - w / 2, 402], [W / 2 + w / 2, 404]], { color: P.accent, width: 3, progress: sm(2.4, 2.9, T) });
    ctx.restore();
  }

  function drawOutro() {
    if (T < 41) return;
    const u = T - 41;
    const hop = u > 1.2 ? Math.exp(-4 * (u - 1.2)) * Math.sin(TAU * 2 * (u - 1.2)) * 10 : 0;
    sprite(W / 2, 190 - Math.abs(hop), { progress: sm(0.3, 1.1, u), blink: blinkAt(u, [2.7]), look: 0 });
    hand("装好就能用", W / 2, 310, { size: 48, align: "center", progress: sm(1, 1.8, u, linear) });
    const w = hand("本地永久免费 · luyao2089.cc", W / 2, 368, { size: 24, align: "center", progress: sm(1.8, 2.6, u, linear) });
    line("outro-ul", [[W / 2 - w / 2, 392], [W / 2 + w / 2, 394]], { color: P.accent, width: 3, progress: sm(2.5, 3, u) });
  }

  // ---------- 纸面 ----------
  // 纸纹属于纸，不属于画：只按画布尺寸与主题生成一次，每帧直接贴上。
  let paperLayer = null;
  function buildPaper() {
    const layer = document.createElement("canvas");
    layer.width = canvas.width;
    layer.height = canvas.height;
    const g = layer.getContext("2d");
    g.scale(layer.width / W, layer.height / H);
    g.fillStyle = P.bg;
    g.fillRect(0, 0, W, H);
    const r = rng(5);
    g.fillStyle = P.grain;
    for (let i = 0; i < 2600; i++) {
      g.globalAlpha = 0.025 + r() * (P.chalk ? 0.05 : 0.06);
      g.fillRect(r() * W, r() * H, 0.6 + r() * 1.4, 0.6 + r() * 1.4);
    }
    if (P.chalk) {
      for (let i = 0; i < 12; i++) {
        const x = r() * W;
        const y = r() * H;
        const rad = 80 + r() * 160;
        const smudge = g.createRadialGradient(x, y, 0, x, y, rad);
        smudge.addColorStop(0, "rgba(255,255,255,0.035)");
        smudge.addColorStop(1, "rgba(255,255,255,0)");
        g.globalAlpha = 1;
        g.fillStyle = smudge;
        g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    }
    const vignette = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.7);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, `rgba(0,0,0,${P.vignette})`);
    g.globalAlpha = 1;
    g.fillStyle = vignette;
    g.fillRect(0, 0, W, H);
    paperLayer = layer;
  }

  function render(time) {
    T = Math.floor(time * 12) / 12;
    BOIL = Math.floor(T * 6) % 3;
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(paperLayer, 0, 0, W, H);
    drawIntro();
    if (T >= 4 && T < 41.6) {
      ctx.save();
      ctx.globalAlpha = 1 - sm(41, 41.6, T);
      drawChat();
      drawAttached();
      drawPanel();
      drawMotion();
      drawCursor();
      ctx.restore();
    }
    drawCaption();
    drawOutro();
  }

  // ---------- 播放器 ----------
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STILL = 16.8;
  let time = calm ? STILL : 0;
  let playing = false;
  let userPaused = calm;
  let onScreen = false;
  let lastNow = 0;
  let lastFrame = -1;
  let raf = 0;

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  function syncUi() {
    const ratio = time / DURATION;
    if (fill) fill.style.width = `${(ratio * 100).toFixed(2)}%`;
    if (track) {
      track.setAttribute("aria-valuenow", String(Math.floor(time)));
      track.setAttribute("aria-valuetext", `${fmt(time)} / ${fmt(DURATION)}`);
    }
    if (timeLabel) timeLabel.textContent = `${fmt(time)} / ${fmt(DURATION)}`;
    let chapter = 0;
    SCENES.forEach((s, i) => {
      if (s.caption && time >= s.start) chapter = i;
    });
    if (time >= SCENES.at(-1).start) chapter = 0;
    stepButtons.forEach((button) => button.setAttribute("aria-current", String(Number(button.dataset.chapter) === chapter)));
  }

  function draw(force = false) {
    const frame = Math.floor(time * 12);
    if (!force && frame === lastFrame) return;
    lastFrame = frame;
    render(time);
    syncUi();
  }

  function tick(now) {
    raf = 0;
    if (!playing) return;
    time = (time + Math.min(0.1, (now - lastNow) / 1000)) % DURATION;
    lastNow = now;
    draw();
    raf = requestAnimationFrame(tick);
  }

  function setPlaying(next) {
    playing = next;
    if (playButton) {
      playButton.dataset.playing = String(next);
      playButton.setAttribute("aria-label", next ? "暂停" : "播放");
    }
    if (next && !raf) {
      lastNow = performance.now();
      raf = requestAnimationFrame(tick);
    }
  }

  function seek(t) {
    time = clamp(t, 0, DURATION - 0.01);
    draw(true);
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(320, Math.round(canvas.clientWidth * dpr));
    const height = Math.round((width * H) / W);
    if (canvas.width === width && canvas.height === height && paperLayer) return;
    canvas.width = width;
    canvas.height = height;
    buildPaper();
    draw(true);
  }

  function applyTheme() {
    P = document.documentElement.dataset.theme === "light" ? PALETTES.light : PALETTES.dark;
    buildPaper();
    draw(true);
  }

  playButton?.addEventListener("click", () => {
    userPaused = playing;
    setPlaying(!playing);
  });
  canvas.addEventListener("click", () => playButton?.click());

  track?.addEventListener("pointerdown", (event) => {
    const rect = track.getBoundingClientRect();
    const move = (e) => seek(((e.clientX - rect.left) / rect.width) * DURATION);
    move(event);
    track.setPointerCapture(event.pointerId);
    track.addEventListener("pointermove", move);
    track.addEventListener("pointerup", () => track.removeEventListener("pointermove", move), { once: true });
  });
  track?.addEventListener("keydown", (event) => {
    const step = { ArrowLeft: -5, ArrowRight: 5, Home: -DURATION, End: DURATION }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    seek(time + step);
  });

  stepButtons.forEach((button) => {
    button.addEventListener("click", () => {
      seek(SCENES[Number(button.dataset.chapter)].start);
      userPaused = false;
      setPlaying(true);
      canvas.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" });
    });
  });

  // 只在看得见的时候播：滚走或切到别的标签页就停，回来接着放（除非访客自己按了暂停）。
  new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      if (!userPaused) setPlaying(onScreen && !document.hidden);
    },
    { threshold: 0.35 },
  ).observe(canvas);
  document.addEventListener("visibilitychange", () => {
    if (!userPaused) setPlaying(onScreen && !document.hidden);
  });
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  new ResizeObserver(resize).observe(canvas);

  P = document.documentElement.dataset.theme === "light" ? PALETTES.light : PALETTES.dark;
  resize();
  // 楷体可能晚于首帧加载完，加载完再画一次，免得停在后备字体上。
  document.fonts?.ready.then(() => {
    WIDTHS.clear();
    draw(true);
  });
})();
