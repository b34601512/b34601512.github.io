// 话术精灵宣传片：整片用 Canvas 2D 现画、声音用 Web Audio 现合成，没有视频文件、没有音频文件。
// 画面与声音都是时间 u（0–32 秒的剧本时间）的函数：拖到哪一秒都能还原同一帧，声音按同一条时间线排程。
//
// 挂到任何页面：放一个容器 <div class="promo" data-promo-film></div>，引 assets/css/promo-film.css
// 与 assets/js/film-engine.js、assets/js/promo-film.js（都 defer，引擎在前）。播放器（封面、控制条、时钟、声音排程、全屏）在 film-engine.js。
// 可选属性：data-duration（整片秒数，默认 32，画面与音乐一起按比例伸缩）、
// data-tagline（片尾标语）、data-logo（片尾小精灵图，默认 assets/logo.png）。
(() => {
  const BASE = 32; // 剧本时长（秒）；data-duration 只做整体缩放
  const W = 1920;
  const H = 1080;
  const SANS = '"MiSans", "HarmonyOS Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", system-ui, sans-serif';
  const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';
  const ACCENT = "#ff6b2c";
  const ACCENT_HOT = "#ff9a5c";
  const FG = "#f5f5f5";
  const MUTED = "#b8b8b8";
  const DIM = "#8c8c8c";
  const BPM_BEAT = 0.5; // 120 BPM
  const DROP = 3; // Alt+Q 落下、鼓点进来的那一拍

  // ---------- 数学 ----------
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeIn = (t) => t * t * t;
  const easeBack = (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
  const sm = (a, b, u, e = easeIO) => e(clamp((u - a) / (b - a), 0, 1));
  const win = (u, a, b, f = 0.3) => sm(a, a + f, u) * (1 - sm(b - f, b, u));
  const rnd = (i) => {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  // 鼓点脉冲：每拍开头冲到 1、迅速衰减，画面跟着音乐跳
  const pulse = (u, from = DROP, to = 24.5) => (u < from || u > to ? 0 : Math.exp(-((u - from) % BPM_BEAT) * 9));

  // ---------- 文案 ----------
  const NOTES = [
    "发货时间：一般48小时内……", "退款流程（新版）见下面", "优惠券怎么领→", "尺码表 S/M/L/XL", "活动价不叠加！！",
    "顺丰加5元", "【重要】换货地址改了", "售后话术v3最终版", "7天无理由……", "预售款 15 天内发",
    "亲，您好～", "催单统一回复：", "赠品说明（旧）", "开票请备注抬头", "质保一年",
    "话术大全(最终版)(2).txt", "运费险说明", "库存以页面为准", "加急件 → 找仓库", "Ctrl+F 发货",
  ];
  const ASKS = ["在吗？", "什么时候发货？", "能便宜点吗", "怎么退货？", "有赠品吗", "还在吗？？", "包邮吗", "多久能到", "人呢", "？？？", "急！", "可以开发票吗"];
  const HITS = [
    { title: "发货时间", text: "亲，今天 16 点前下单，当天就发货～", src: "团队·默认｜物流 > 发货" },
    { title: "催发货", text: "亲，已经帮您催仓库了，今天一定发出～", src: "团队·默认｜物流 > 催单" },
    { title: "发货地址", text: "亲，我们从杭州仓发货，一般 2 天到～", src: "团队·默认｜物流 > 地址" },
  ];
  const SETS = ["默认", "售前", "售后", "物流", "大促", "催付", "退换", "新品", "会员", "夜班"];
  const DOMAINS = ["团队话术", "个人话术", "离线话术"];
  const CHATS = [
    { who: "顾客·小陈", q: "这款有现货吗？", a: ["有的亲，现货当天发～", "颜色都齐，放心拍～"] },
    { who: "顾客·阿杰", q: "能开发票吗", a: ["可以的亲，下单备注抬头～", "电子发票 24 小时内到～"] },
    { who: "顾客·Lily", q: "尺码怎么选？", a: ["亲，平时穿 M 选 M 就好～", "不合适 7 天无理由退换～"] },
    { who: "顾客·老王", q: "还有优惠吗", a: ["亲，领券立减 20 元～", "满 49 元包邮哦～"] },
  ];
  const STAFF = ["工号 01", "工号 02", "工号 03", "工号 04", "工号 05", "工号 06", "工号 07", "工号 08"];

  // ---------- 画笔 ----------
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function text(ctx, str, x, y, { size = 40, weight = 500, color = FG, align = "center", font = SANS, alpha = 1, base = "middle", maxW } = {}) {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = base;
    ctx.fillStyle = color;
    ctx.fillText(str, x, y, maxW);
    ctx.globalAlpha = 1;
  }

  function glow(ctx, x, y, r, color, alpha) {
    if (alpha <= 0 || r <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  function keycap(ctx, x, y, label, { size = 1, press = 0, alpha = 1, hot = 0 } = {}) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(size, size);
    ctx.font = `600 64px ${SANS}`;
    const w = Math.max(150, ctx.measureText(label).width + 80);
    const h = 140;
    const depth = 18 * (1 - press);
    rr(ctx, -w / 2, -h / 2 + 18, w, h, 26);
    ctx.fillStyle = "#3a1a0b";
    ctx.fill();
    rr(ctx, -w / 2, -h / 2 + (18 - depth), w, h, 26);
    ctx.fillStyle = hot > 0 ? `rgba(255,${Math.round(lerp(236, 107, hot))},${Math.round(lerp(226, 44, hot))},1)` : "#f2ece6";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,.35)";
    ctx.stroke();
    text(ctx, label, 0, 18 - depth, { size: 64, weight: 700, color: hot > 0.5 ? "#fff" : "#1a1714" });
    ctx.restore();
    if (press > 0.5) glow(ctx, x, y + 30, 260 * size, ACCENT, 0.5 * alpha);
  }

  function bubble(ctx, x, y, str, { side = "in", scale = 1, alpha = 1, size = 34, maxW = 520 } = {}) {
    if (alpha <= 0 || scale <= 0) return 0;
    ctx.save();
    ctx.font = `500 ${size}px ${SANS}`;
    const tw = Math.min(maxW, ctx.measureText(str).width);
    const w = tw + size * 1.1;
    const h = size * 1.9;
    const bx = side === "out" ? x - w : x;
    ctx.globalAlpha = alpha;
    ctx.translate(x, y + h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-x, -(y + h / 2));
    rr(ctx, bx, y, w, h, size * 0.5);
    ctx.fillStyle = side === "out" ? ACCENT : "#f5f2ee";
    ctx.fill();
    ctx.fillStyle = side === "out" ? "#fff" : "#1a1714";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(str, bx + size * 0.55, y + h / 2, maxW);
    ctx.restore();
    return h;
  }

  // 通用简化聊天窗（标题只写顾客名），自己发的气泡是品牌橙；不写平台名、不画标志、不含真实用户信息
  function chatWindow(ctx, x, y, w, h, who, { alpha = 1, scale = 1, lit = 0 } = {}) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-(x + w / 2), -(y + h / 2));
    rr(ctx, x, y, w, h, 22);
    ctx.fillStyle = "#121110";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = lit > 0 ? `rgba(255,107,44,${0.35 + lit * 0.65})` : "#3f3f3f";
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + 70);
    ctx.lineTo(x + w, y + 70);
    ctx.strokeStyle = "#262626";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 44, y + 35, 20, 0, Math.PI * 2);
    ctx.fillStyle = "#2b2622";
    ctx.fill();
    text(ctx, who.slice(3, 4), x + 44, y + 36, { size: 20, weight: 600, color: MUTED });
    text(ctx, who, x + 78, y + 35, { size: 26, weight: 600, align: "left", color: FG, alpha });
    ctx.restore();
  }

  // ---------- 场景 ----------
  // 背景：纯黑 + 远处慢慢后退的点阵地面 + 随拍子呼吸的橙色暗光
  function background(ctx, u) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    const p = pulse(u);
    const horizon = H * 0.58;
    const speed = u < DROP ? 0.4 : u < 25.5 ? 1.6 : 0.5;
    ctx.save();
    for (let row = 0; row < 18; row++) {
      const z = ((row + u * speed) % 18) / 18; // 0 远 → 1 近
      const yy = horizon + Math.pow(z, 2.2) * (H - horizon + 120);
      const spread = lerp(0.15, 2.4, Math.pow(z, 1.6));
      const a = 0.05 + z * 0.22 + p * z * 0.25;
      ctx.fillStyle = `rgba(255,107,44,${a})`;
      for (let col = -12; col <= 12; col++) {
        const xx = W / 2 + col * 90 * spread;
        if (xx < -10 || xx > W + 10) continue;
        const s = 1 + z * 3;
        ctx.fillRect(xx - s / 2, yy - s / 2, s, s);
      }
    }
    ctx.restore();
    glow(ctx, W * 0.5, H * 0.58, 900, "rgba(255,107,44,0.35)", 0.25 + p * 0.25);
  }

  function vignette(ctx) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.55, W / 2, H / 2, H * 1.15);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // ① 0–3s：一团乱——记事本里翻话术、顾客消息刷屏、等待计时一路往上跳
  function sceneChaos(ctx, u) {
    const blast = sm(DROP, DROP + 0.8, u, easeOut); // Alt+Q 落下后整团乱麻被炸开
    const fade = 1 - sm(DROP, DROP + 0.7, u);
    if (fade <= 0) return;
    const shake = sm(1.2, 2.9, u) * 16 * (1 - blast);
    ctx.save();
    ctx.translate(Math.sin(u * 71) * shake, Math.cos(u * 53) * shake);

    // 漂浮的记事本碎片
    for (let i = 0; i < 46; i++) {
      const born = rnd(i) * 2.2;
      if (u < born) continue;
      const age = u - born;
      const z = 0.45 + rnd(i + 99) * 0.9;
      const ang = rnd(i + 7) * Math.PI * 2;
      let x = rnd(i + 3) * W + Math.cos(ang) * age * 40 * z;
      let y = rnd(i + 5) * H + Math.sin(ang) * age * 30 * z;
      const dx = x - W / 2;
      const dy = y - H / 2;
      x += dx * blast * 3;
      y += dy * blast * 3;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rnd(i + 11) - 0.5) * 0.5 + age * (rnd(i + 13) - 0.5) * 0.4);
      text(ctx, NOTES[i % NOTES.length], 0, 0, {
        size: 30 * z,
        font: MONO,
        color: i % 7 === 0 ? ACCENT : "#9b958f",
        alpha: Math.min(1, age * 3) * (0.25 + z * 0.4) * fade,
      });
      ctx.restore();
    }

    // 记事本窗口：一屏一屏往上滚，查找框一直「未找到」
    const nx = 230 - blast * 900;
    const ny = 250;
    const nw = 640;
    const nh = 560;
    ctx.save();
    ctx.globalAlpha = sm(0, 0.4, u) * fade;
    ctx.translate(nx + nw / 2, ny + nh / 2);
    ctx.rotate(-0.04 - blast * 0.5);
    ctx.translate(-(nx + nw / 2), -(ny + nh / 2));
    rr(ctx, nx, ny, nw, nh, 14);
    ctx.fillStyle = "#151413";
    ctx.fill();
    ctx.strokeStyle = "#3f3f3f";
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, "话术大全(最终版)(2).txt", nx + 24, ny + 34, { size: 24, align: "left", color: MUTED, font: MONO });
    ctx.save();
    rr(ctx, nx + 2, ny + 66, nw - 4, nh - 140, 4);
    ctx.clip();
    const scroll = (u * u * 260) % 50;
    const first = Math.floor((u * u * 260) / 50);
    for (let k = 0; k < 11; k++) {
      const line = NOTES[(first + k) % NOTES.length];
      text(ctx, `${String(first + k + 1).padStart(4, "0")}  ${line}`, nx + 24, ny + 90 + k * 50 - scroll, {
        size: 26,
        align: "left",
        color: "#7d7770",
        font: MONO,
      });
    }
    ctx.restore();
    const flash = Math.floor(u * 6) % 2 === 0;
    rr(ctx, nx + 20, ny + nh - 62, nw - 40, 44, 8);
    ctx.fillStyle = "#211715";
    ctx.fill();
    text(ctx, "查找：发货", nx + 40, ny + nh - 40, { size: 24, align: "left", color: MUTED });
    text(ctx, "未找到", nx + nw - 40, ny + nh - 40, { size: 24, align: "right", weight: 700, color: flash ? "#ff4d4f" : "#7a2e2e" });
    ctx.restore();

    // 顾客的消息一条接一条砸进来
    for (let i = 0; i < 14; i++) {
      const born = 0.15 + i * 0.18 - (i > 8 ? (i - 8) * 0.05 : 0);
      if (u < born) continue;
      const age = u - born;
      let x = 1060 + rnd(i + 40) * 560;
      let y = 140 + ((i * 131) % 760);
      x += (x - W / 2) * blast * 2.6;
      y += (y - H / 2) * blast * 2.6;
      const s = easeBack(clamp(age / 0.25, 0, 1));
      bubble(ctx, x, y, ASKS[i % ASKS.length], { scale: s, alpha: fade, size: 34 });
      // 红色未读角标
      const badge = Math.min(99, i + 1);
      ctx.globalAlpha = fade * s;
      ctx.beginPath();
      ctx.arc(x - 6, y + 4, 20, 0, Math.PI * 2);
      ctx.fillStyle = "#ff3b30";
      ctx.fill();
      ctx.globalAlpha = 1;
      text(ctx, String(badge), x - 6, y + 5, { size: 20, weight: 700, color: "#fff", alpha: fade * s });
    }

    // 等待计时：越跳越快
    const waited = Math.floor(u * u * 6 + u * 4);
    const mm = String(Math.floor(waited / 60)).padStart(2, "0");
    const ss = String(waited % 60).padStart(2, "0");
    const red = 0.6 + 0.4 * Math.sin(u * 18);
    text(ctx, "顾客已等待", W / 2, 70 - blast * 300, { size: 30, color: MUTED, alpha: fade });
    text(ctx, `${mm}:${ss}`, W / 2, 130 - blast * 300, { size: 72, weight: 700, font: MONO, color: `rgba(255,77,79,${red})`, alpha: fade });
    ctx.restore();

    // 2.4s 起画面压暗，Alt 和 Q 两个键帽从天而降
    const dark = sm(2.3, 2.85, u) * (1 - sm(DROP, DROP + 0.15, u));
    if (dark > 0) {
      ctx.fillStyle = `rgba(0,0,0,${dark * 0.78})`;
      ctx.fillRect(0, 0, W, H);
    }
    const fall = sm(2.35, 2.75, u, easeBack);
    const press = sm(2.82, 2.95, u) * (1 - sm(3.3, 3.5, u));
    const capAlpha = sm(2.35, 2.45, u) * (1 - sm(3.25, 3.55, u));
    const capY = lerp(-200, H / 2, fall) - sm(DROP, 3.5, u) * 120;
    const capScale = 1.25 + sm(DROP, 3.5, u, easeOut) * 0.6;
    keycap(ctx, W / 2 - 150 * capScale, capY, "Alt", { size: capScale, press, alpha: capAlpha, hot: press });
    text(ctx, "+", W / 2, capY + 18, { size: 70 * capScale, weight: 300, color: FG, alpha: capAlpha });
    keycap(ctx, W / 2 + 140 * capScale, capY, "Q", { size: capScale, press, alpha: capAlpha, hot: press });
  }

  // 冲击波 + 白闪：Alt+Q（3s）、换场（15s）、片尾（25.5s）都用它
  function impact(ctx, u, at, { color = "255,107,44", strength = 1 } = {}) {
    const k = u - at;
    if (k < 0 || k > 1.2) return;
    const flash = (1 - sm(0, 0.28, k)) * strength;
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,240,228,${flash * 0.85})`;
      ctx.fillRect(0, 0, W, H);
    }
    for (let ring = 0; ring < 3; ring++) {
      const kk = k - ring * 0.08;
      if (kk <= 0) continue;
      const r = easeOut(clamp(kk / 1.1, 0, 1)) * 1500;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2);
      ctx.lineWidth = (40 - ring * 12) * (1 - kk / 1.2);
      ctx.strokeStyle = `rgba(${color},${(1 - kk / 1.2) * 0.8})`;
      ctx.stroke();
    }
    // 火花
    for (let i = 0; i < 70; i++) {
      const a = rnd(i + at * 13) * Math.PI * 2;
      const v = 500 + rnd(i + 3 + at) * 1500;
      const d = easeOut(clamp(k / 1.0, 0, 1)) * v;
      const x = W / 2 + Math.cos(a) * d;
      const y = H / 2 + Math.sin(a) * d;
      const s = (1 - k / 1.2) * (3 + rnd(i + 9) * 6);
      ctx.fillStyle = i % 3 ? `rgba(${color},${1 - k / 1.2})` : `rgba(255,255,255,${1 - k / 1.2})`;
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
  }

  // ② 3–9s：一个键——搜索、Tab、按 1，话术化成一道光飞进聊天窗
  function sceneSearch(ctx, u) {
    const vis = sm(3.1, 3.45, u) * (1 - sm(8.55, 9.05, u));
    if (vis <= 0) return;
    const out = sm(8.5, 9.05, u, easeIn);
    ctx.save();
    ctx.globalAlpha = vis;
    ctx.translate(W / 2, H / 2);
    ctx.scale(1 + out * 0.8, 1 + out * 0.8);
    ctx.translate(-W / 2, -H / 2);

    const shift = sm(4.95, 5.55, u); // 搜索组往左让位，聊天窗从右边滑进来
    const gw = lerp(980, 860, shift);
    const gx = lerp(W / 2 - 490, 130, shift);
    const gy = 200;

    // 搜索栏
    const pop = sm(3.1, 3.55, u, easeBack);
    ctx.save();
    ctx.translate(gx + gw / 2, gy + 55);
    ctx.scale(lerp(0.6, 1, pop), lerp(0.6, 1, pop));
    ctx.translate(-(gx + gw / 2), -(gy + 55));
    glow(ctx, gx + gw / 2, gy + 55, gw * 0.7, "rgba(255,107,44,0.5)", 0.35 + pulse(u) * 0.3);
    rr(ctx, gx, gy, gw, 110, 55);
    ctx.fillStyle = "#121110";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = ACCENT;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(gx + 70, gy + 50, 20, 0, Math.PI * 2);
    ctx.moveTo(gx + 85, gy + 65);
    ctx.lineTo(gx + 102, gy + 82);
    ctx.lineWidth = 6;
    ctx.strokeStyle = FG;
    ctx.stroke();
    const typed = u < 3.62 ? "" : u < 3.82 ? "发" : "发货";
    if (typed) {
      text(ctx, typed, gx + 130, gy + 56, { size: 50, weight: 600, align: "left" });
    } else {
      text(ctx, "Alt+Q 定位搜索栏", gx + 130, gy + 56, { size: 40, align: "left", color: DIM });
    }
    ctx.font = `600 50px ${SANS}`;
    const caretX = gx + 136 + (typed ? ctx.measureText(typed).width : 0);
    if (Math.floor(u * 3) % 2 === 0 && u < 5.6) {
      ctx.fillStyle = ACCENT;
      ctx.fillRect(caretX, gy + 28, 4, 56);
    }
    ctx.restore();

    // 三条命中
    const send = sm(5.55, 5.7, u);
    for (let i = 0; i < 3; i++) {
      const at = 3.95 + i * 0.1;
      const s = sm(at, at + 0.35, u, easeBack);
      if (s <= 0) continue;
      const cy = gy + 150 + i * 150 + (1 - s) * 80;
      const hit = HITS[i];
      const chosen = i === 0 ? sm(5.5, 5.62, u) : 0;
      ctx.save();
      ctx.globalAlpha = vis * clamp(s, 0, 1) * (i === 0 ? 1 : 1 - send * 0.6);
      rr(ctx, gx, cy, gw, 128, 22);
      ctx.fillStyle = chosen ? "#2a170d" : "#0f0e0d";
      ctx.fill();
      ctx.lineWidth = chosen ? 4 : 2;
      ctx.strokeStyle = chosen ? ACCENT : "#2f2c29";
      ctx.stroke();
      // Tab 之后才出现的临时序号
      const num = sm(4.8 + i * 0.1, 4.95 + i * 0.1, u, easeBack);
      if (num > 0) {
        ctx.save();
        ctx.translate(gx + 56, cy + 64);
        ctx.scale(num, num);
        rr(ctx, -30, -30, 60, 60, 14);
        ctx.fillStyle = ACCENT;
        ctx.fill();
        text(ctx, String(i + 1), 0, 2, { size: 38, weight: 800, color: "#fff", font: MONO });
        ctx.restore();
      }
      const tx = gx + 56 + num * 56;
      text(ctx, hit.title, tx, cy + 40, { size: 30, weight: 700, align: "left", color: "#ff5a4d" });
      text(ctx, hit.text, tx + 140, cy + 40, { size: 30, align: "left", color: FG, maxW: gx + gw - tx - 170 });
      text(ctx, hit.src, tx, cy + 92, { size: 24, align: "left", color: DIM });
      ctx.restore();
    }

    // 聊天窗
    const cx = lerp(W + 40, 1080, shift);
    const cw = 700;
    const chy = 200;
    const chh = 640;
    chatWindow(ctx, cx, chy, cw, chh, "顾客·小陈", { alpha: shift, lit: sm(6.15, 6.3, u) * (1 - sm(6.6, 7.2, u)) });
    if (shift > 0) {
      bubble(ctx, cx + 30, chy + 100, "今天拍的，什么时候发货？", { alpha: shift, size: 32 });
      const sent = sm(6.15, 6.4, u, easeBack);
      bubble(ctx, cx + cw - 30, chy + 200, HITS[0].text, { side: "out", scale: sent, alpha: shift * clamp(sent, 0, 1), size: 32 });
      // 对方正在输入 → 回复
      if (u > 6.5 && u < 7.0) {
        for (let d = 0; d < 3; d++) {
          ctx.globalAlpha = 0.4 + 0.6 * Math.max(0, Math.sin(u * 14 - d));
          ctx.beginPath();
          ctx.arc(cx + 60 + d * 26, chy + 330, 8, 0, Math.PI * 2);
          ctx.fillStyle = MUTED;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      const reply = sm(7.0, 7.25, u, easeBack);
      bubble(ctx, cx + 30, chy + 300, "好嘞，谢谢亲！", { scale: reply, alpha: clamp(reply, 0, 1), size: 32 });
      // 回复带一圈小火花
      const k = u - 7.0;
      if (k > 0 && k < 0.9) {
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const d = easeOut(k / 0.9) * 140;
          ctx.fillStyle = `rgba(255,154,92,${1 - k / 0.9})`;
          ctx.fillRect(cx + 140 + Math.cos(a) * d - 4, chy + 330 + Math.sin(a) * d - 4, 8, 8);
        }
      }
      // 输入框
      rr(ctx, cx + 24, chy + chh - 90, cw - 48, 64, 16);
      ctx.fillStyle = "#1a1815";
      ctx.fill();
      rr(ctx, cx + cw - 150, chy + chh - 82, 110, 48, 12);
      ctx.fillStyle = sm(6.0, 6.15, u) * (1 - sm(6.3, 6.6, u)) > 0.5 ? ACCENT : "#2b2622";
      ctx.fill();
      text(ctx, "发送", cx + cw - 95, chy + chh - 57, { size: 24, weight: 600, color: FG, alpha: shift });
    }

    // 话术化成一道光：从第 1 条命中飞进聊天窗
    const fly = sm(5.6, 6.18, u, easeIO);
    if (fly > 0 && fly < 1) {
      const sx = gx + gw / 2;
      const sy = gy + 150 + 64;
      const ex = cx + cw - 260;
      const ey = chy + 230;
      for (let k = 10; k >= 0; k--) {
        const f = clamp(fly - k * 0.025, 0, 1);
        const px = lerp(sx, ex, f);
        const py = lerp(sy, ey, f) - Math.sin(f * Math.PI) * 220;
        const s = lerp(1, 0.45, f) * (1 - k * 0.07);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = k === 0 ? 1 : 0.18 * (1 - k / 11);
        rr(ctx, px - 240 * s, py - 40 * s, 480 * s, 80 * s, 40 * s);
        ctx.fillStyle = k === 0 ? ACCENT : ACCENT_HOT;
        ctx.fill();
        ctx.restore();
        if (k === 0) glow(ctx, px, py, 240, "rgba(255,154,92,0.9)", 0.6);
      }
    }

    ctx.restore();

    // Tab、1 两个键帽
    const tabA = win(u, 4.5, 5.15, 0.15);
    keycap(ctx, W - 300, 150, "Tab", { size: 0.8, press: sm(4.7, 4.78, u) * (1 - sm(4.95, 5.05, u)), alpha: tabA, hot: sm(4.7, 4.78, u) });
    const oneA = win(u, 5.2, 6.0, 0.15);
    keycap(ctx, W / 2 + 150, 120, "1", { size: 0.8, press: sm(5.5, 5.58, u) * (1 - sm(5.8, 5.9, u)), alpha: oneA, hot: sm(5.5, 5.58, u) });

    // 收尾一句：三个键
    const line = win(u, 7.35, 8.75, 0.3);
    if (line > 0) {
      const y = 960;
      const keys = ["Alt+Q", "Tab", "1"];
      keys.forEach((k, i) => {
        const a = sm(7.35 + i * 0.12, 7.6 + i * 0.12, u, easeBack);
        keycap(ctx, W / 2 - 520 + i * 270, y, k, { size: 0.5 * a, alpha: line * clamp(a, 0, 1), hot: 1 });
        if (i < 2) text(ctx, "→", W / 2 - 385 + i * 270, y + 6, { size: 48, color: ACCENT, alpha: line });
      });
      text(ctx, "回答已经发出去了", W / 2 + 330, y + 4, { size: 58, weight: 700, color: FG, alpha: line });
    }
  }

  // ③ 9–15s：0–9 十套话术排成一个转动的环，再分成团队 / 个人 / 离线三层
  function sceneSets(ctx, u) {
    const vis = sm(8.9, 9.3, u) * (1 - sm(14.75, 15.0, u));
    if (vis <= 0) return;
    const enter = sm(9.0, 9.9, u, easeOut);
    const split = sm(11.9, 12.7, u, easeIO);
    const warp = sm(14.2, 15.0, u, easeIn);
    const spin = u * 0.55 + (1 - enter) * 3 + warp * 6;
    const rings = split > 0 ? 3 : 1;
    const items = [];
    for (let r = 0; r < rings; r++) {
      const ringY = lerp(H / 2 + 40, H / 2 + 60 + (r - 1) * 270, split);
      const R = lerp(lerp(0, 720, enter), 470, split) * (1 + warp * 1.6);
      const dir = r === 1 ? -1 : 1;
      for (let i = 0; i < 10; i++) {
        const a = dir * spin + (i / 10) * Math.PI * 2 + r * 0.3;
        const z = Math.cos(a);
        items.push({ r, i, x: W / 2 + Math.sin(a) * R, y: ringY + z * lerp(110, 50, split), z, ringAlpha: r === 0 ? 1 : split });
      }
    }
    items.sort((a, b) => a.z - b.z);
    const p = pulse(u);
    for (const it of items) {
      const depth = (it.z + 1) / 2; // 0 后 → 1 前
      const s = lerp(0.45, 1.05, depth) * lerp(1, 0.62, split);
      const front = depth > 0.93 ? p : 0;
      ctx.save();
      ctx.globalAlpha = vis * it.ringAlpha * lerp(0.25, 1, depth) * enter;
      ctx.translate(it.x, it.y);
      ctx.scale(s, s);
      rr(ctx, -115, -85, 230, 170, 26);
      ctx.fillStyle = depth > 0.93 ? "#2a170d" : "#121110";
      ctx.fill();
      ctx.lineWidth = 3 + front * 4;
      ctx.strokeStyle = depth > 0.75 ? ACCENT : "#3f3f3f";
      ctx.stroke();
      text(ctx, String(it.i), 0, -16, { size: 88, weight: 800, font: MONO, color: depth > 0.75 ? ACCENT : MUTED });
      text(ctx, SETS[it.i], 0, 52, { size: 30, weight: 600, color: FG });
      ctx.restore();
      if (front > 0.2) glow(ctx, it.x, it.y, 260 * s, "rgba(255,107,44,0.6)", front * 0.5 * vis);
    }
    // 中间的标题：先「一套话术，拆成 10 套」，再「团队 · 个人 · 离线」
    const t1 = win(u, 9.5, 12.0, 0.35);
    ctx.save();
    const s1 = sm(9.5, 9.85, u, easeBack);
    ctx.translate(W / 2, 175);
    ctx.scale(s1 || 0.001, s1 || 0.001);
    text(ctx, "一套话术，拆成", 130, 0, { size: 84, weight: 700, color: FG, alpha: t1 * vis, align: "right" });
    text(ctx, "10", 235, -6, { size: 150, weight: 800, color: ACCENT, alpha: t1 * vis, font: MONO });
    text(ctx, "套", 345, 0, { size: 84, weight: 700, color: FG, alpha: t1 * vis, align: "left" });
    ctx.restore();
    const t2 = sm(12.3, 12.7, u) * (1 - sm(14.3, 14.6, u));
    for (let r = 0; r < 3; r++) {
      const a = sm(12.4 + r * 0.15, 12.75 + r * 0.15, u, easeOut) * t2;
      text(ctx, DOMAINS[r], 120 + (1 - a) * -200, H / 2 + 60 + (r - 1) * 270, { size: 50, weight: 700, color: r === 0 ? ACCENT : FG, align: "left", alpha: a * vis });
    }
    text(ctx, "三个话术域 × 0–9 十套，想定位哪条就锁哪一套", W / 2, 110, { size: 46, weight: 600, color: FG, alpha: t2 * vis });
    // 穿越时的速度线
    if (warp > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 90; i++) {
        const a = rnd(i + 500) * Math.PI * 2;
        const d0 = 100 + rnd(i + 600) * 400 + warp * 900;
        const len = warp * (200 + rnd(i + 700) * 600);
        ctx.strokeStyle = `rgba(255,${120 + Math.floor(rnd(i) * 100)},60,${warp * 0.7})`;
        ctx.lineWidth = 2 + rnd(i + 800) * 3;
        ctx.beginPath();
        ctx.moveTo(W / 2 + Math.cos(a) * d0, H / 2 + Math.sin(a) * d0);
        ctx.lineTo(W / 2 + Math.cos(a) * (d0 + len), H / 2 + Math.sin(a) * (d0 + len));
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ④ 15–21s：四个聊天窗，吸附搜索栏「啪」地贴到每一个下面，回复踩着鼓点飞出去
  const MONTAGE = (() => {
    const order = [0, 2, 1, 3, 1, 0, 3, 2];
    return order.map((w, i) => ({ w, at: 16.6 + i * 0.5 }));
  })();
  function sceneMontage(ctx, u) {
    const vis = sm(15.0, 15.2, u) * (1 - sm(20.6, 21.1, u));
    if (vis <= 0) return;
    const zoom = 1 + sm(15, 21, u, (t) => t) * 0.06 + pulse(u) * 0.012;
    const out = sm(20.6, 21.1, u, easeIn);
    ctx.save();
    ctx.globalAlpha = vis;
    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom * (1 - out * 0.7), zoom * (1 - out * 0.7));
    ctx.rotate(Math.sin(u * 0.8) * 0.01 + out * 0.4);
    ctx.translate(-W / 2, -H / 2);
    const cw = 760;
    const chh = 300;
    const pos = [
      [150, 170],
      [1010, 170],
      [150, 600],
      [1010, 600],
    ];
    for (let k = 0; k < 4; k++) {
      const [x, y] = pos[k];
      const s = sm(15.0 + k * 0.15, 15.4 + k * 0.15, u, easeBack);
      const evs = MONTAGE.filter((e) => e.w === k && u >= e.at);
      const last = evs.length ? u - evs[evs.length - 1].at : 9;
      chatWindow(ctx, x, y, cw, chh, CHATS[k].who, { alpha: clamp(s, 0, 1), scale: s, lit: last < 0.4 ? 1 - last / 0.4 : 0 });
      if (s <= 0) continue;
      ctx.save();
      rr(ctx, x, y + 72, cw, chh - 74, 0);
      ctx.clip();
      // 气泡流：问题 + 已发出的回答，新的一条把旧的往上顶
      const msgs = [{ side: "in", str: CHATS[k].q, at: 15.3 + k * 0.15 }];
      evs.forEach((e, j) => msgs.push({ side: "out", str: CHATS[k].a[j % 2], at: e.at }));
      let y0 = y + chh - 40;
      for (let m = msgs.length - 1; m >= 0 && y0 > y + 40; m--) {
        const msg = msgs[m];
        const pop = sm(msg.at, msg.at + 0.22, u, easeBack);
        const h = 58;
        y0 -= (h + 14) * clamp(pop, 0, 1);
        bubble(ctx, msg.side === "out" ? x + cw - 28 : x + 28, y0, msg.str, { side: msg.side, size: 28, scale: pop, alpha: clamp(pop, 0, 1) });
      }
      ctx.restore();
      // 吸附栏：从画面中间飞来，贴住聊天窗底边，弹一下
      const snapAt = 15.8 + k * 0.2;
      const f = sm(snapAt - 0.35, snapAt, u, easeIn);
      if (f > 0) {
        const bx = lerp(W / 2 - cw / 2, x, f);
        const by = lerp(H / 2 - 30, y + chh + 6, f);
        const bounce = u > snapAt ? Math.exp(-(u - snapAt) * 10) * Math.sin((u - snapAt) * 40) * 8 : 0;
        rr(ctx, bx, by + bounce, cw, 58, 14);
        ctx.fillStyle = "#1a1815";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = ACCENT;
        ctx.stroke();
        text(ctx, "Alt+Q 定位搜索栏", bx + 28, by + bounce + 30, { size: 26, align: "left", color: DIM });
        text(ctx, "›", bx + cw - 30, by + bounce + 28, { size: 36, color: MUTED });
        if (u > snapAt && u < snapAt + 0.35) {
          const k2 = (u - snapAt) / 0.35;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = 1 - k2;
          ctx.fillStyle = ACCENT;
          ctx.fillRect(x - 20 * k2, y + chh + 2, cw + 40 * k2, 6);
          ctx.restore();
        }
      }
    }
    ctx.restore();
    const head = win(u, 15.6, 20.7, 0.3) * vis;
    text(ctx, "吸附在聊天窗口下面，不用切回主界面", W / 2, 90, { size: 54, weight: 700, color: FG, alpha: head });
    const foot = win(u, 16.8, 20.7, 0.3) * vis;
    text(ctx, "回车发送  ·  Tab 再按数字直接发送  ·  双击只贴不发", W / 2, H - 50, { size: 34, color: MUTED, alpha: foot });
  }

  // ⑤ 21–25.5s：改一次，所有工号同步
  function sceneSync(ctx, u) {
    const vis = sm(21.0, 21.3, u) * (1 - sm(25.2, 25.5, u));
    if (vis <= 0) return;
    const collapse = sm(24.6, 25.45, u, easeIn);
    const cx = W / 2;
    const cy = H / 2 + 40;
    const nodes = STAFF.map((name, i) => {
      const a = (i / STAFF.length) * Math.PI * 2 - Math.PI / 2 + collapse * 3;
      const R = (1 - collapse);
      return { name, x: cx + Math.cos(a) * 620 * R, y: cy + Math.sin(a) * 300 * R, born: 21.1 + i * 0.08 };
    });
    // 两轮同步：工号 01 改一条 → 云端 → 所有人
    const waves = [22.1, 23.6];
    ctx.save();
    ctx.globalAlpha = vis;
    for (const n of nodes) {
      const a = sm(n.born, n.born + 0.3, u);
      ctx.strokeStyle = `rgba(255,107,44,${0.25 * a})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(lerp(cx, n.x, a), lerp(cy, n.y, a));
      ctx.stroke();
    }
    for (const w of waves) {
      const up = sm(w, w + 0.4, u, easeIn);
      if (up > 0 && up < 1) {
        const n = nodes[0];
        glow(ctx, lerp(n.x, cx, up), lerp(n.y, cy, up), 70, "rgba(255,154,92,1)", 0.9);
      }
      const down = sm(w + 0.45, w + 0.95, u, easeOut);
      if (down > 0 && down < 1) {
        for (const n of nodes.slice(1)) glow(ctx, lerp(cx, n.x, down), lerp(cy, n.y, down), 60, "rgba(255,154,92,1)", 0.9);
      }
    }
    // 云端
    const core = sm(21.0, 21.4, u, easeBack) * (1 + pulse(u) * 0.08);
    glow(ctx, cx, cy, 300 * core, "rgba(255,107,44,0.7)", 0.5);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(core * (1 - collapse * 0.6), core * (1 - collapse * 0.6));
    ctx.beginPath();
    ctx.arc(0, 0, 110, 0, Math.PI * 2);
    ctx.fillStyle = "#1a0f08";
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = ACCENT;
    ctx.stroke();
    ctx.rotate(u * 1.5);
    ctx.setLineDash([18, 22]);
    ctx.beginPath();
    ctx.arc(0, 0, 140, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,107,44,.6)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    text(ctx, "云同步", cx, cy + 2, { size: 44, weight: 700, color: FG, alpha: core > 0.3 ? 1 - collapse : 0 });
    // 工号
    for (const [i, n] of nodes.entries()) {
      const a = sm(n.born, n.born + 0.35, u, easeBack);
      if (a <= 0) continue;
      const hitAt = waves.map((w) => (i === 0 ? w : w + 0.95)).filter((t) => u >= t);
      const lit = hitAt.length ? Math.exp(-(u - hitAt[hitAt.length - 1]) * 4) : 0;
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.scale(a * (1 + lit * 0.12), a * (1 + lit * 0.12));
      rr(ctx, -110, -46, 220, 92, 20);
      ctx.fillStyle = lit > 0.1 ? "#2a170d" : "#121110";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = lit > 0.1 ? ACCENT : "#3f3f3f";
      ctx.stroke();
      text(ctx, n.name, -14, 2, { size: 32, weight: 600, color: FG });
      if (hitAt.length) {
        ctx.beginPath();
        ctx.arc(76, 0, 18, 0, Math.PI * 2);
        ctx.fillStyle = ACCENT;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(67, 0);
        ctx.lineTo(74, 8);
        ctx.lineTo(86, -8);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      ctx.restore();
      if (lit > 0.05) glow(ctx, n.x, n.y, 200, "rgba(255,107,44,0.7)", lit * 0.6);
    }
    // 工号 01 头上冒出「已更新」
    for (const w of waves) {
      const tag = win(u, w - 0.3, w + 0.6, 0.15);
      text(ctx, "发货时间 · 已更新", nodes[0].x, nodes[0].y - 90 - (1 - tag) * 20, { size: 30, weight: 600, color: ACCENT_HOT, alpha: tag });
    }
    ctx.restore();
    const t1 = win(u, 21.5, 25.0, 0.3) * vis;
    text(ctx, "改一次，全团队同步", W / 2, 105, { size: 74, weight: 800, color: FG, alpha: t1 });
    const t2 = win(u, 22.6, 25.0, 0.3) * vis;
    text(ctx, "本地永久免费  ·  云端按工号开通", W / 2, H - 70, { size: 38, color: MUTED, alpha: t2 });
  }

  // ⑥ 25.5–32s：片尾——小精灵、名字、一句话
  function sceneLogo(ctx, u, opts) {
    if (u < 25.4) return;
    const a = sm(25.5, 25.8, u);
    // 上升的光点
    for (let i = 0; i < 60; i++) {
      const sp = 40 + rnd(i + 900) * 120;
      const y = H + 40 - (((u - 25.5) * sp + rnd(i + 901) * H) % (H + 80));
      const x = rnd(i + 902) * W + Math.sin(u + i) * 20;
      const s = 2 + rnd(i + 903) * 4;
      ctx.fillStyle = `rgba(255,107,44,${a * (0.2 + rnd(i + 904) * 0.5)})`;
      ctx.fillRect(x, y, s, s);
    }
    const lx = W / 2;
    const ly = 360;
    const pop = sm(25.55, 26.2, u, easeBack);
    glow(ctx, lx, ly, 420, "rgba(255,107,44,0.8)", 0.45 * a);
    // 转动的弧段
    ctx.save();
    ctx.translate(lx, ly);
    ctx.globalAlpha = a;
    for (let k = 0; k < 3; k++) {
      ctx.rotate(u * (0.6 + k * 0.35) * (k % 2 ? -1 : 1));
      ctx.beginPath();
      const r = (190 + k * 34) * pop;
      ctx.arc(0, 0, Math.max(1, r), 0, Math.PI * (0.5 + k * 0.25));
      ctx.lineWidth = 6 - k * 1.5;
      ctx.strokeStyle = k === 0 ? ACCENT : `rgba(255,154,92,${0.6 - k * 0.15})`;
      ctx.stroke();
    }
    ctx.restore();
    if (opts.logo && opts.logo.complete && opts.logo.naturalWidth) {
      const lw = 224 * pop;
      const lh = 252 * pop;
      const bob = Math.sin(u * 2.4) * 8;
      ctx.save();
      ctx.globalAlpha = clamp(pop, 0, 1);
      ctx.drawImage(opts.logo, lx - lw / 2, ly - lh / 2 + bob, lw, lh);
      ctx.restore();
    }
    // 名字逐字落下
    const name = "话术精灵";
    for (let i = 0; i < name.length; i++) {
      const d = sm(25.95 + i * 0.09, 26.35 + i * 0.09, u, easeBack);
      text(ctx, name[i], W / 2 + (i - 1.5) * 170, 665 - (1 - d) * 80, { size: 160, weight: 800, color: FG, alpha: clamp(d, 0, 1) });
    }
    // 一道光扫过名字
    const sweep = sm(26.9, 27.7, u);
    if (sweep > 0 && sweep < 1) {
      ctx.save();
      ctx.beginPath();
      const sx = lerp(W / 2 - 500, W / 2 + 500, sweep);
      ctx.moveTo(sx - 60, 560);
      ctx.lineTo(sx + 20, 560);
      ctx.lineTo(sx - 20, 770);
      ctx.lineTo(sx - 100, 770);
      ctx.closePath();
      ctx.clip();
      for (let i = 0; i < name.length; i++) text(ctx, name[i], W / 2 + (i - 1.5) * 170, 665, { size: 160, weight: 800, color: ACCENT_HOT });
      ctx.restore();
    }
    ctx.save();
    if ("letterSpacing" in ctx) ctx.letterSpacing = "18px";
    text(ctx, "SOFTTALK", W / 2 + 9, 790, { size: 40, weight: 600, font: MONO, color: DIM, alpha: sm(26.5, 26.9, u) });
    ctx.restore();
    // 标语逐字打出
    const tag = [...opts.tagline];
    const shown = Math.floor(clamp((u - 27.3) / 0.11, 0, tag.length));
    if (shown > 0) {
      const str = tag.slice(0, shown).join("");
      text(ctx, str, W / 2, 890, { size: 68, weight: 700, color: ACCENT });
      if (shown < tag.length || Math.floor(u * 2.5) % 2 === 0) {
        ctx.font = `700 68px ${SANS}`;
        const full = ctx.measureText(tag.join("")).width;
        const part = ctx.measureText(str).width;
        ctx.fillStyle = ACCENT;
        ctx.fillRect(W / 2 - full / 2 + part + 10, 855, 5, 70);
      }
    }
    text(ctx, "luyao2089   ·   Windows 本地永久免费", W / 2, 1000, { size: 34, color: MUTED, alpha: sm(28.6, 29.1, u) });
  }

  function render(ctx, u, opts) {
    ctx.save();
    background(ctx, u);
    // 每段结束跟下一段之间留一拍的镜头推拉
    const kick = pulse(u) * 0.008;
    ctx.translate(W / 2, H / 2);
    ctx.scale(1 + kick, 1 + kick);
    ctx.translate(-W / 2, -H / 2);
    sceneChaos(ctx, u);
    sceneSearch(ctx, u);
    sceneSets(ctx, u);
    sceneMontage(ctx, u);
    sceneSync(ctx, u);
    sceneLogo(ctx, u, opts);
    ctx.restore();
    impact(ctx, u, DROP);
    impact(ctx, u, 15.0, { strength: 0.5 });
    impact(ctx, u, 25.5);
    vignette(ctx);
    // 结尾 0.6 秒以外不淡出：最后一帧就是海报
  }

  // ---------- 声音：Web Audio 现合成 ----------
  // 120 BPM 的电子节拍：Am–F–C–G 循环，底鼓四踩、反拍镲、二四拍拍手、八分音符贝斯、
  // 铺底和弦、琶音，加上和画面对齐的音效（通知提示音、键帽按下、冲击、嗖一声、发送叮）。
  const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const CHORDS = [
    { bass: 33, pad: [57, 60, 64] }, // Am
    { bass: 29, pad: [53, 57, 60] }, // F
    { bass: 36, pad: [55, 60, 64] }, // C
    { bass: 31, pad: [55, 59, 62] }, // G
  ];
  const chordAt = (u) => CHORDS[Math.floor(Math.max(0, u - DROP) / 2) % 4];

  function buildScore() {
    const ev = [];
    const add = (u, type, arg = {}, dur = 0) => ev.push({ u, type, arg, dur });
    // ① 乱：低鸣、越来越快的嘀嗒、顾客消息提示音、上升音
    add(0, "drone", {}, DROP);
    for (let u = 0; u < DROP; u += 0.25 - u * 0.04) add(u, "tick", { v: 0.3 + u * 0.15 });
    for (let i = 0; i < 14; i++) add(0.15 + i * 0.18 - (i > 8 ? (i - 8) * 0.05 : 0), "ping", { n: 84 + (i % 4) * 3 });
    add(1.6, "riser", { len: 1.4 }, 1.4);
    add(2.72, "thud", { v: 0.5 });
    add(2.86, "key", {});
    add(DROP, "impact", { v: 1 });
    // 鼓与贝斯：3–24.5，片尾 26 起放慢
    for (let b = 0; DROP + b * BPM_BEAT < 24.5; b++) {
      const u = DROP + b * BPM_BEAT;
      add(u, "kick", { v: 1 });
      add(u + 0.25, "hat", { v: 0.5, open: b % 2 === 1 });
      if (b % 2 === 1) add(u, "clap", {});
      if (u >= 9 && u < 21) {
        add(u + 0.125, "hat", { v: 0.22 });
        add(u + 0.375, "hat", { v: 0.22 });
      }
    }
    for (let k = 0; DROP + k * 0.25 < 24.5; k++) {
      const u = DROP + k * 0.25;
      const c = chordAt(u);
      add(u, "bass", { n: c.bass + (k % 4 === 2 ? 12 : 0) + (k % 8 === 7 ? 7 : 0) }, 0.22);
    }
    for (let bar = 0; DROP + bar * 2 < 24.5; bar++) {
      const u = DROP + bar * 2;
      add(u, "pad", { notes: chordAt(u).pad, v: 0.5 }, 2);
    }
    // 琶音：③④ 段
    for (let k = 0; 9 + k * 0.125 < 20.9; k++) {
      const u = 9 + k * 0.125;
      const c = chordAt(u).pad;
      const seq = [0, 1, 2, 1, 2, 0, 2, 1];
      add(u, "pluck", { n: c[seq[k % 8]] + 12 + (k % 16 >= 8 ? 12 : 0), v: 0.5 });
    }
    // ② 搜索段音效
    add(3.62, "type", {});
    add(3.82, "type", {});
    [3.95, 4.05, 4.15].forEach((u) => add(u, "whoosh", { len: 0.25, hi: 1 }, 0.25));
    add(4.72, "key", {});
    [4.8, 4.9, 5.0].forEach((u, i) => add(u, "blip", { n: 76 + i * 4 }));
    add(5.0, "whoosh", { len: 0.6 }, 0.6);
    add(5.52, "key", {});
    add(5.6, "whoosh", { len: 0.6, hi: 1 }, 0.6);
    add(6.15, "send", {});
    add(7.0, "pop", {});
    [7.35, 7.47, 7.59].forEach((u, i) => add(u, "blip", { n: 81 + i * 5 }));
    add(8.5, "riser", { len: 0.5 }, 0.5);
    // ③ 十套
    add(9.0, "whoosh", { len: 0.9 }, 0.9);
    add(9.5, "chime", { n: 81 });
    add(11.9, "whoosh", { len: 0.8 }, 0.8);
    add(14.0, "riser", { len: 1.0 }, 1.0);
    add(15.0, "impact", { v: 0.6 });
    // ④ 吸附
    for (let k = 0; k < 4; k++) add(15.0 + k * 0.15, "pop", { n: 72 + k * 2 });
    for (let k = 0; k < 4; k++) add(15.8 + k * 0.2, "snap", {});
    MONTAGE.forEach((e, i) => add(e.at, "send", { n: 88 + (i % 4) * 2, v: 0.6 }));
    // ⑤ 同步
    for (let i = 0; i < 8; i++) add(21.1 + i * 0.08, "blip", { n: 72 + i * 2, v: 0.4 });
    [22.1, 23.6].forEach((w) => {
      add(w, "zip", { up: 1 }, 0.4);
      add(w + 0.45, "zip", { up: 0 }, 0.5);
      add(w + 0.95, "chime", { n: 84, v: 0.6 });
    });
    add(24.3, "riser", { len: 1.2 }, 1.2);
    // ⑥ 片尾
    add(25.5, "impact", { v: 1.1 });
    add(25.5, "pad", { notes: [45, 57, 60, 64, 69], v: 0.9, long: 1 }, 6.5);
    [25.95, 26.04, 26.13, 26.22].forEach((u, i) => add(u, "chime", { n: [76, 79, 84, 88][i], v: 0.6 }));
    add(26.9, "shimmer", {}, 0.8);
    for (let i = 0; i < 9; i++) add(27.3 + i * 0.11, "type", { v: 0.5 });
    [26, 27, 28, 29].forEach((u) => add(u, "kick", { v: 0.55 }));
    add(28.6, "chime", { n: 93, v: 0.5 });
    return ev.sort((a, b) => a.u - b.u);
  }

  class Synth {
    constructor() {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.comp = this.ctx.createDynamicsCompressor();
      this.comp.threshold.value = -14;
      this.comp.ratio.value = 4;
      this.master.connect(this.comp);
      this.comp.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      let seed = 1;
      for (let i = 0; i < len; i++) {
        seed = (seed * 16807) % 2147483647;
        d[i] = (seed / 2147483647) * 2 - 1;
      }
      // 简单混响：两路延迟反馈
      this.verb = this.ctx.createGain();
      this.verb.gain.value = 0.25;
      const d1 = this.ctx.createDelay(1);
      d1.delayTime.value = 0.19;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.35;
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 3000;
      this.verb.connect(d1);
      d1.connect(lp);
      lp.connect(fb);
      fb.connect(d1);
      lp.connect(this.master);
    }
    bus() {
      const g = this.ctx.createGain();
      g.connect(this.master);
      const v = this.ctx.createGain();
      v.connect(this.verb);
      g.connect(v);
      return g;
    }
    env(g, t, a, peak, d) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    }
    osc(type, f, t, end, out) {
      const o = this.ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      o.connect(out);
      o.start(t);
      o.stop(end);
      return o;
    }
    noiseSrc(t, end, out) {
      const s = this.ctx.createBufferSource();
      s.buffer = this.noise;
      s.loop = true;
      s.connect(out);
      s.start(t, Math.random() * 1.5);
      s.stop(end);
      return s;
    }
    filter(type, f, q, out) {
      const b = this.ctx.createBiquadFilter();
      b.type = type;
      b.frequency.value = f;
      b.Q.value = q;
      b.connect(out);
      return b;
    }
    gain(out) {
      const g = this.ctx.createGain();
      g.connect(out);
      return g;
    }
    // t：开始时刻；k：时间缩放（data-duration / 32）；skip：从中间开始时已经过去的秒数
    play(e, t, k, out, skip = 0) {
      const a = e.arg;
      const v = a.v ?? 1;
      switch (e.type) {
        case "kick": {
          const g = this.gain(out);
          this.env(g, t, 0.003, 0.9 * v, 0.35);
          const o = this.osc("sine", 150, t, t + 0.45, g);
          o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
          break;
        }
        case "hat": {
          const g = this.gain(out);
          this.env(g, t, 0.002, 0.18 * v, a.open ? 0.18 : 0.05);
          this.noiseSrc(t, t + 0.25, this.filter("highpass", 8000, 0.7, g));
          break;
        }
        case "clap": {
          const g = this.gain(out);
          g.gain.setValueAtTime(0.0001, t);
          [0, 0.012, 0.024].forEach((d) => {
            g.gain.setValueAtTime(0.5, t + d);
            g.gain.exponentialRampToValueAtTime(0.05, t + d + 0.01);
          });
          g.gain.setValueAtTime(0.45, t + 0.03);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
          this.noiseSrc(t, t + 0.25, this.filter("bandpass", 1500, 1.2, g));
          break;
        }
        case "bass": {
          const g = this.gain(out);
          this.env(g, t, 0.005, 0.32, 0.2 * k);
          const f = this.filter("lowpass", 900, 6, g);
          f.frequency.setValueAtTime(1400, t);
          f.frequency.exponentialRampToValueAtTime(220, t + 0.18);
          this.osc("sawtooth", NOTE(a.n), t, t + 0.3 * k, f);
          this.osc("square", NOTE(a.n) / 2, t, t + 0.3 * k, this.filter("lowpass", 200, 1, g));
          break;
        }
        case "pad": {
          const len = e.dur * k - skip;
          if (len <= 0.05) break;
          const g = this.gain(out);
          const peak = 0.05 * v;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.4, len / 3));
          g.gain.setValueAtTime(peak, t + len * 0.7);
          g.gain.exponentialRampToValueAtTime(0.0001, t + len);
          const f = this.filter("lowpass", a.long ? 2200 : 1300, 1, g);
          a.notes.forEach((n) => {
            [-7, 7].forEach((det) => {
              const o = this.osc("sawtooth", NOTE(n), t, t + len + 0.05, f);
              o.detune.value = det;
            });
          });
          break;
        }
        case "pluck": {
          const g = this.gain(out);
          this.env(g, t, 0.003, 0.09 * v, 0.16);
          const f = this.filter("lowpass", 3200, 4, g);
          f.frequency.exponentialRampToValueAtTime(600, t + 0.15);
          this.osc("square", NOTE(a.n), t, t + 0.2, f);
          break;
        }
        case "drone": {
          const len = e.dur * k - skip;
          if (len <= 0.05) break;
          const g = this.gain(out);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.22, t + len * 0.9);
          g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.05);
          const f = this.filter("lowpass", 260, 3, g);
          f.frequency.linearRampToValueAtTime(900, t + len);
          [55, 55.6, 82.4].forEach((hz) => this.osc("sawtooth", hz, t, t + len + 0.1, f));
          break;
        }
        case "tick": {
          const g = this.gain(out);
          this.env(g, t, 0.001, 0.15 * v, 0.03);
          this.osc("square", 2400, t, t + 0.05, this.filter("highpass", 1500, 1, g));
          break;
        }
        case "ping": {
          const g = this.gain(out);
          this.env(g, t, 0.004, 0.12, 0.18);
          this.osc("sine", NOTE(a.n), t, t + 0.08, g);
          this.osc("sine", NOTE(a.n - 5), t + 0.07, t + 0.25, g);
          break;
        }
        case "riser": {
          const len = a.len * k - skip;
          if (len <= 0.05) break;
          const g = this.gain(out);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.35, t + len);
          g.gain.setValueAtTime(0.0001, t + len + 0.01);
          const f = this.filter("bandpass", 400, 4, g);
          f.frequency.exponentialRampToValueAtTime(7000, t + len);
          this.noiseSrc(t, t + len + 0.02, f);
          const o = this.osc("sawtooth", 110, t, t + len + 0.02, this.filter("lowpass", 3000, 1, g));
          o.frequency.exponentialRampToValueAtTime(880, t + len);
          break;
        }
        case "impact": {
          const g = this.gain(out);
          this.env(g, t, 0.004, 1.0 * v, 1.6);
          const o = this.osc("sine", 110, t, t + 1.8, g);
          o.frequency.exponentialRampToValueAtTime(28, t + 1.4);
          const n = this.gain(out);
          this.env(n, t, 0.002, 0.7 * v, 0.9);
          const f = this.filter("lowpass", 6000, 0.7, n);
          f.frequency.exponentialRampToValueAtTime(300, t + 0.8);
          this.noiseSrc(t, t + 1.0, f);
          break;
        }
        case "thud": {
          const g = this.gain(out);
          this.env(g, t, 0.003, 0.6 * v, 0.25);
          const o = this.osc("sine", 90, t, t + 0.3, g);
          o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
          break;
        }
        case "key":
        case "type": {
          const g = this.gain(out);
          this.env(g, t, 0.001, (e.type === "key" ? 0.5 : 0.3) * v, 0.05);
          this.noiseSrc(t, t + 0.08, this.filter("bandpass", e.type === "key" ? 2500 : 4000, 2, g));
          const o = this.osc("square", e.type === "key" ? 180 : 320, t, t + 0.04, this.filter("lowpass", 800, 1, g));
          o.frequency.exponentialRampToValueAtTime(80, t + 0.04);
          break;
        }
        case "whoosh": {
          const len = a.len * k - skip;
          if (len <= 0.05) break;
          const g = this.gain(out);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.32, t + len * 0.6);
          g.gain.exponentialRampToValueAtTime(0.0001, t + len);
          const f = this.filter("bandpass", a.hi ? 1200 : 500, 1.5, g);
          f.frequency.exponentialRampToValueAtTime(a.hi ? 6000 : 2500, t + len * 0.6);
          f.frequency.exponentialRampToValueAtTime(800, t + len);
          this.noiseSrc(t, t + len + 0.02, f);
          break;
        }
        case "blip": {
          const g = this.gain(out);
          this.env(g, t, 0.003, 0.16 * v, 0.12);
          this.osc("triangle", NOTE(a.n), t, t + 0.16, g);
          break;
        }
        case "send": {
          const g = this.gain(out);
          this.env(g, t, 0.004, 0.22 * v, 0.35);
          const o = this.osc("sine", NOTE(a.n ?? 84), t, t + 0.4, g);
          o.frequency.exponentialRampToValueAtTime(NOTE((a.n ?? 84) + 7), t + 0.06);
          this.osc("sine", NOTE((a.n ?? 84) + 12), t + 0.05, t + 0.4, g);
          break;
        }
        case "pop": {
          const g = this.gain(out);
          this.env(g, t, 0.002, 0.3, 0.1);
          const o = this.osc("sine", NOTE(a.n ?? 79), t, t + 0.12, g);
          o.frequency.exponentialRampToValueAtTime(NOTE((a.n ?? 79) + 12), t + 0.05);
          break;
        }
        case "snap": {
          const g = this.gain(out);
          this.env(g, t, 0.001, 0.5, 0.12);
          this.osc("square", 1800, t, t + 0.03, this.filter("highpass", 1000, 1, g));
          const o = this.osc("sine", 140, t, t + 0.15, g);
          o.frequency.exponentialRampToValueAtTime(60, t + 0.12);
          break;
        }
        case "zip": {
          const len = (a.up ? 0.4 : 0.5) * k - skip;
          if (len <= 0.05) break;
          const g = this.gain(out);
          this.env(g, t, 0.01, 0.14, len);
          const o = this.osc("sawtooth", a.up ? 300 : 1600, t, t + len + 0.02, this.filter("lowpass", 3000, 2, g));
          o.frequency.exponentialRampToValueAtTime(a.up ? 1600 : 400, t + len);
          break;
        }
        case "chime": {
          const g = this.gain(out);
          this.env(g, t, 0.003, 0.2 * v, 1.2);
          [1, 2.01, 3.03].forEach((m, i) => {
            const gi = this.gain(g);
            gi.gain.value = [1, 0.4, 0.2][i];
            this.osc("sine", NOTE(a.n) * m, t, t + 1.3, gi);
          });
          break;
        }
        case "shimmer": {
          const g = this.gain(out);
          this.env(g, t, 0.2, 0.08, 0.8);
          this.noiseSrc(t, t + 1.1, this.filter("highpass", 9000, 1, g));
          break;
        }
        default:
          break;
      }
    }
  }

  // ---------- 播放器：assets/js/film-engine.js ----------
  function mount(root) {
    const duration = clamp(Number(root.dataset.duration) || BASE, 5, 600);
    const opts = { tagline: root.dataset.tagline || "一句话，就在手边", logo: new Image() };
    opts.logo.src = root.dataset.logo || "assets/logo.png";
    const score = buildScore();
    const { refresh, ...film } = window.mountFilm(root, {
      classes: {
        screen: "promo-screen",
        canvas: "promo-canvas",
        cover: "promo-cover",
        coverIcon: "promo-cover-icon",
        coverText: "promo-cover-text",
        bar: "promo-bar",
        track: "promo-track",
        fill: "promo-fill",
        time: "promo-time",
      },
      base: BASE,
      duration,
      width: W,
      height: H,
      still: 27.6, // 封面停在片尾的标题帧上
      label: `话术精灵宣传片（${Math.round(duration)} 秒，有声）：客服在记事本里翻话术、顾客消息刷屏，按下 Alt+Q 一切归位——搜索、Tab、按数字，回答一键发出；0–9 十套话术、吸附在聊天窗口下面的搜索栏、全团队云同步；片尾：话术精灵，${opts.tagline}`,
      cover: { text: "播放宣传片 · 有声", again: "再看一遍" },
      render: (ctx, u) => render(ctx, u, opts),
      score,
      createSynth: () => new Synth(),
      fullscreen: true,
    });
    // 片尾小精灵图加载好了再画一次封面
    opts.logo.addEventListener("load", refresh);
    root.promoFilm = film;
  }

  document.querySelectorAll("[data-promo-film]").forEach(mount);
})();
