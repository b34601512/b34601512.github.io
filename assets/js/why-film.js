// why.html 的短片「改一句话术，要改 20 次？」（GitHub issue #6）：整片用 Canvas 2D 现画、声音用 Web Audio 现合成，没有视频文件、没有音频文件。
// 讲的是老板原话里的事：京东、天猫、拼多多、抖音开了很多店，平台自带的快捷短语按店铺存，改一句话术每家店都要改一遍；
// 话术精灵专门管话术，只改一次，所有店铺都能用。核心价值「节约时间，快速高效率」，片尾是作者账号。
// 竖屏 1080×1920（给手机上刷短视频的人看）：远景看「多」、特写看「字」，镜头按关键帧推拉，字在手机上也读得清。
// 第 0 帧就是问题本身（刷到的人 1 秒内知道这条讲什么），封面也停在这道题上。
// 画面与声音都是剧本时间 u（0–40 秒）的函数：拖到哪一秒都能还原同一帧，声音按同一条时间线排程。
//
// 挂到任何页面：放一个容器 <div class="promo promo--tall" data-why-film></div>，引 assets/css/promo-film.css
// 与 assets/js/film-engine.js、assets/js/why-film.js（都 defer，引擎在前）。播放器（封面、控制条、时钟、声音排程、全屏）在 film-engine.js。
(() => {
  const BASE = 40;
  const W = 1080;
  const H = 1920;
  const SANS = '"MiSans", "HarmonyOS Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", system-ui, sans-serif';
  const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';
  const ACCENT = "#ff6b2c";
  const FG = "#f5f5f5";
  const MUTED = "#b8b8b8";
  const DIM = "#8c8c8c";
  const RED = "#ff3b30";
  const SURFACE = "#141210";
  const LINE = "#3f3f3f";
  // 话术精灵主界面：客户端白色主题（同 demo.css 的 --p-*，取样自客户端实机截图）
  const P = { frame: "#fbf6ec", paper: "#fffdf8", tab: "#f4eadb", peach: "#ffe4d1", ink: "#2a1a12", chip: "#f4ebde", digit: "#8c7b6b", answer: "#4a3a2e", base: "#75685f", badge: "#fff3e7", title: "#e53935" };

  // ---------- 文案 ----------
  // 店铺：四个平台（京东、天猫、拼多多、抖音）各开 5 家，一共 20 家。画面上不写平台名，工作台的样子一看就知道是哪家（issue #11）
  const COLS = 4; // 平台数
  const ROWS = 5; // 每个平台的店数
  const SHOPS = COLS * ROWS; // 20 家店
  // 要改的那句话术：只有中间的发货时长变了
  const PRE = "亲，下单后";
  const OLD = "48";
  const NEW = "24";
  const POST = "小时内发货哦～";
  const OTHER_ROWS = [
    { title: "欢迎", text: "亲，在的，有什么可以帮您～" },
    { title: "售后", text: "收到货有问题随时找我哦～" },
  ];
  const WECHAT = "luyao2089";

  // ---------- 数学 ----------
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeBack = (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
  const sm = (a, b, u, e = easeIO) => e(clamp((u - a) / (b - a), 0, 1));
  const win = (u, a, b, f = 0.25) => sm(a, a + f, u) * (1 - sm(b - f, b, u));
  const rnd = (i) => {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  // ---------- 时间线（剧本秒） ----------
  const T = {
    morph: 2.7, // 片头的 20 个小方块变成 20 家店
    shops: 3.0, // 鼓点进来
    focus: 6.5, // 推近第一家店
    grind: 10.2, // 一家一家改
    done: 15.4, // 20 家改完
    reset: 16.3, // 下次再优化：全部打回原形
    stamp: 17.4, // 「没必要」
    turn: 18.5, // 所以我做了一个软件
    brand: 20.0,
    solve: 21.5, // 话术精灵：只改一次
    beams: 24.4, // 所有店铺都能用
    compare: 29.6, // 20 次 vs 1 次
    value: 32.0, // 节约时间，快速高效率
    end: 33.8, // 片尾：作者账号
  };
  const BEAT = 0.5; // 120 BPM
  // 每家店改那句话术的时刻：前四家镜头一家家跟着，后十六家越改越快（间隔按平方根收紧）
  const EDITS = Array.from({ length: SHOPS }, (_, i) => {
    if (i === 0) return { s: 8.9, d: 1.0 };
    if (i === 1) return { s: 10.85, d: 0.45 };
    if (i === 2) return { s: 11.85, d: 0.3 };
    if (i === 3) return { s: 12.5, d: 0.3 };
    return { s: 12.9 + 2.2 * Math.sqrt((i - 3) / 16), d: 0.25 };
  });
  const savedAt = (i) => EDITS[i].s + EDITS[i].d;
  // 话术精灵里同一句只改一次；之后从主界面「发」到 20 家店的聊天窗口
  const SOLVE_EDIT = { s: 22.9, d: 1.1 };
  const beamAt = (i) => T.beams + 0.15 + i * 0.06;

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
    ctx.globalAlpha *= alpha;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = base;
    ctx.fillStyle = color;
    ctx.fillText(str, x, y, maxW);
    ctx.globalAlpha /= alpha;
  }

  // 一行里分段上色：segs = [{ t, color, bg }]；align 为 left / center；返回整行宽度
  function segs(ctx, list, x, y, { size = 40, weight = 500, align = "left", font = SANS } = {}) {
    ctx.font = `${weight} ${size}px ${font}`;
    const widths = list.map((s) => ctx.measureText(s.t).width);
    const total = widths.reduce((a, b) => a + b, 0);
    let cx = align === "center" ? x - total / 2 : x;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    list.forEach((s, i) => {
      if (s.bg) {
        ctx.fillStyle = s.bg;
        ctx.fillRect(cx - 1, y - size * 0.62, widths[i] + 2, size * 1.24);
      }
      ctx.fillStyle = s.color;
      ctx.fillText(s.t, cx, y);
      cx += widths[i];
    });
    return total;
  }

  // 字幕标记：方括号里的字用品牌橙，例如「改一句话术，[每家店]都要改」
  const marked = (str, base, hot = ACCENT) =>
    str
      .split(/(\[[^\]]*\])/)
      .filter(Boolean)
      .map((p) => (p.startsWith("[") ? { t: p.slice(1, -1), color: hot } : { t: p, color: base }));

  function glow(ctx, x, y, r, color, alpha) {
    if (alpha <= 0 || r <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  function check(ctx, x, y, r, color = ACCENT) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - r * 0.45, y + r * 0.02);
    ctx.lineTo(x - r * 0.1, y + r * 0.36);
    ctx.lineTo(x + r * 0.5, y - r * 0.34);
    ctx.lineWidth = r * 0.26;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#fff";
    ctx.stroke();
  }

  // 客户端话术行行首的小方章：奶油底里一只纸飞机
  function plane(ctx, x, y, s) {
    rr(ctx, x, y, s, s, s * 0.18);
    ctx.fillStyle = P.badge;
    ctx.fill();
    ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.strokeStyle = P.base;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + s * 0.2, y + s * 0.52);
    ctx.lineTo(x + s * 0.8, y + s * 0.24);
    ctx.lineTo(x + s * 0.6, y + s * 0.8);
    ctx.lineTo(x + s * 0.47, y + s * 0.58);
    ctx.closePath();
    ctx.fillStyle = "#c2410c";
    ctx.fill();
  }

  // 镜头：keys = [{ u, x, y, z, dip }]，相邻两帧之间位置按 easeIO 走、缩放按对数插值；
  // dip 是转场中途拉远的比例（从一家店甩到下一家时先退半步再推上去）
  function camAt(keys, u) {
    if (u <= keys[0].u) return keys[0];
    for (let i = 1; i < keys.length; i++) {
      const b = keys[i];
      if (u > b.u) continue;
      const a = keys[i - 1];
      const t = (u - a.u) / (b.u - a.u || 1);
      const e = easeIO(t);
      const z = Math.exp(lerp(Math.log(a.z), Math.log(b.z), e)) * (1 - (b.dip || 0) * Math.sin(Math.PI * t));
      return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), z };
    }
    return keys[keys.length - 1];
  }

  function applyCam(ctx, cam) {
    ctx.translate(W / 2, H / 2);
    ctx.scale(cam.z, cam.z);
    ctx.translate(-cam.x, -cam.y);
  }

  // 鼓点脉冲：每拍开头冲到 1、迅速衰减
  const onBeat = (u) => (u >= T.shops && u < T.done) || (u >= T.solve && u < T.end);
  const pulse = (u) => (onBeat(u) ? Math.exp(-((u - (u >= T.solve ? T.solve : T.shops)) % BEAT) * 9) : 0);

  // ---------- 背景、冲击、暗角 ----------
  function background(ctx, u) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    // 两道很淡的橙光在背后慢慢转，跟着鼓点亮一下
    const p = pulse(u);
    glow(ctx, W * (0.5 + 0.35 * Math.sin(u * 0.4)), H * 0.18, 900, "rgba(255,107,44,0.5)", 0.18 + p * 0.06);
    glow(ctx, W * (0.5 - 0.35 * Math.sin(u * 0.33)), H * 0.86, 800, "rgba(255,107,44,0.45)", 0.12 + p * 0.05);
  }

  function impact(ctx, u, at, { color = "255,107,44", strength = 1, x = W / 2, y = H / 2, flash: lit = true } = {}) {
    const k = u - at;
    if (k < 0 || k > 1.1) return;
    const flash = lit ? (1 - sm(0, 0.25, k)) * strength : 0;
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,240,228,${flash * 0.7})`;
      ctx.fillRect(0, 0, W, H);
    }
    for (let ring = 0; ring < 3; ring++) {
      const kk = k - ring * 0.08;
      if (kk <= 0) continue;
      const r = easeOut(clamp(kk / 1.0, 0, 1)) * 1700;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.lineWidth = (36 - ring * 10) * (1 - kk / 1.1) * strength;
      ctx.strokeStyle = `rgba(${color},${(1 - kk / 1.1) * 0.7})`;
      ctx.stroke();
    }
  }

  function vignette(ctx) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.85);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // ---------- 字幕：屏幕上方两行，大字（手机上也读得清），后面压一道黑带不被镜头里的画面吃掉 ----------
  const CAPTIONS = [
    { from: 3.15, to: T.focus + 0.1, l1: "开了[好几个平台]", l2: "每个平台都开了好几家店" },
    { from: T.focus + 0.2, to: 8.55, l1: "每家店都有", l2: "[平台自带的快捷短语]" },
    { from: 8.65, to: T.grind, l1: "可话术要[经常优化]", l2: "比如发货时间改了" },
    { from: T.grind + 0.1, to: T.done - 0.05, l1: "改一句话术", l2: "[每家店]都得重新编辑一遍" },
    { from: T.done, to: T.reset - 0.05, l1: "20 家店，终于改完了……", l2: "" },
    { from: T.reset, to: T.stamp - 0.05, l1: "下次再优化？", l2: "[再来 20 遍]", hot: RED },
    { from: T.stamp, to: T.turn - 0.05, l1: "工作量太大", l2: "而且[完全没必要]", hot: RED },
    { from: T.solve + 0.1, to: T.beams - 0.05, l1: "用话术精灵", l2: "话术[只改一次]" },
    { from: T.beams, to: 26.6, l1: "[所有店铺]都能用", l2: "" },
    { from: 26.7, to: T.compare - 0.05, l1: "哪家店的聊天窗口", l2: "[点一下]，直接发出" },
  ];

  function captions(ctx, u) {
    const band = win(u, 3.0, T.turn, 0.3) + win(u, T.solve, T.compare, 0.3);
    if (band > 0) {
      const g = ctx.createLinearGradient(0, 0, 0, 640);
      g.addColorStop(0, `rgba(0,0,0,${0.92 * band})`);
      g.addColorStop(0.7, `rgba(0,0,0,${0.75 * band})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, 640);
    }
    CAPTIONS.forEach((c) => {
      const a = win(u, c.from, c.to, 0.18);
      if (a <= 0) return;
      const pop = easeBack(clamp((u - c.from) / 0.28, 0, 1));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(W / 2, 330);
      ctx.scale(lerp(0.85, 1, pop), lerp(0.85, 1, pop));
      ctx.translate(-W / 2, -330);
      segs(ctx, marked(c.l1, FG, c.hot), W / 2, c.l2 ? 290 : 330, { size: 84, weight: 800, align: "center" });
      if (c.l2) segs(ctx, marked(c.l2, MUTED, c.hot), W / 2, 400, { size: 62, weight: 700, align: "center" });
      ctx.restore();
    });
  }

  // ---------- 20 家店＝四个平台的客服工作台，每个工作台开着 5 家店（issue #11：照真实界面画，不画抽象卡片） ----------
  // 平台窗口按「原生像素」画（assets/js/platform-chat.js），再放大 WK 倍；平台名与标志不画，客服一眼认得出是哪家的工作台。
  const PLATS = ["jd", "tm", "pdd", "dy"]; // 京东咚咚、千牛（天猫）、拼多多商家版、抖店飞鸽
  const platOf = (i) => i % COLS; // 第 i 家店在哪个平台
  const tabOf = (i) => Math.floor(i / COLS); // 是那个工作台上的第几家店
  const PCX = () => globalThis.PlatformChat;
  // 远景：四个工作台从上到下排开
  const WN = 706; // 窗口原生宽
  const WK = 1000 / WN;
  const WIN_X = 40;
  const WIN_H = 280;
  const winY = (p) => 560 + p * (WIN_H + 12);
  const winOpts = (p) => ({ listW: 150, side: "quick", compact: true, sideW: 220, headH: 30, inputH: 50, pddAlert: false, tabW: 92 });
  function winChat(p) {
    const d = PCX().dims(PLATS[p], winOpts(p));
    return { x: d.left, y: d.top, w: WN - d.left - d.sideW, h: WIN_H / WK - d.top };
  }
  // 各块位置（画布坐标）：画一遍到离屏画布上量出来，只量一次
  let geoCache = null;
  function geo() {
    if (geoCache) return geoCache;
    const ctx = document.createElement("canvas").getContext("2d");
    const toCanvas = (r, ox, oy, k) => r && { x: ox + r.x * k, y: oy + r.y * k, w: r.w * k, h: r.h * k };
    const shops = Array.from({ length: ROWS }, () => ({}));
    const wide = PLATS.map((plat, p) => {
      const g = PCX().draw(ctx, plat, winChat(p), { ...winOpts(p), shops, customer: "" });
      return { side: toCanvas(g.side, WIN_X, winY(p), WK), msgs: toCanvas(g.msgs, WIN_X, winY(p), WK), tabs: g.shops.map((r) => toCanvas(r, WIN_X, winY(p), WK)) };
    });
    const small = PLATS.map((plat, p) => {
      const c = gridCell(p);
      const g = PCX().draw(ctx, plat, gridChat(p), { ...gridOpts(p), shops, customer: "" });
      return { msgs: toCanvas(g.msgs, c.x, c.y, GK), tabs: g.shops.map((r) => toCanvas(r, c.x, c.y, GK)) };
    });
    geoCache = { wide, small };
    return geoCache;
  }
  const tabRect = (i, which = "wide") => geo()[which][platOf(i)].tabs[tabOf(i)] || geo()[which][platOf(i)].tabs[0];
  const center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

  // 片头的 20 个小方块（问题下面那一格格「要改的地方」）
  const SQ = 78;
  const SQG = 16;
  const sqRect = (i) => ({ x: (W - (COLS * SQ + (COLS - 1) * SQG)) / 2 + (i % COLS) * (SQ + SQG), y: 1060 + Math.floor(i / COLS) * (68 + SQG), w: SQ, h: 68 });
  const sqLit = (i) => 0.3 + i * 0.105; // 一格格亮起来

  // 特写某一家：镜头对准那个工作台右边的快捷短语面板（看得见面板，也看得见一点聊天栏）
  const FOCUS_Z = 2.4;
  // 要改的那一行（第二条短语）落在屏幕偏下一点，上方留给字幕
  const focus = (i, u, z = FOCUS_Z) => {
    const r = geo().wide[platOf(i)].side;
    return { u, x: Math.min(r.x + r.w / 2 - 40, W - W / (2 * z)), y: r.y + (QROW + QROW / 2) * WK - 60 / z, z };
  };
  const WIDE = (u, z = 1) => ({ u, x: W / 2, y: H / 2, z });
  let camShops = null;
  const CAM_SHOPS = () =>
    (camShops ||= [
      WIDE(T.shops),
      WIDE(T.focus, 1.06),
      focus(0, 7.4),
      focus(0, T.grind),
      { ...focus(1, 10.8), dip: 0.35 },
      focus(1, 11.4),
      { ...focus(2, 11.8), dip: 0.3 },
      focus(2, 12.2),
      { ...focus(3, 12.5), dip: 0.25 },
      focus(3, 12.85),
      WIDE(15.2, 1),
      WIDE(T.stamp, 1),
      WIDE(T.stamp + 0.12, 1.06),
      WIDE(T.turn, 1),
      WIDE(T.turn + 0.6, 0.7),
    ]);

  // 某家店那句话术此刻的样子
  function shopState(i, u) {
    if (u >= T.reset) return { phase: "old", reset: win(u, T.reset, T.reset + 0.9, 0.15) };
    const e = EDITS[i];
    if (u < e.s) return { phase: "old" };
    const k = (u - e.s) / e.d;
    if (k < 0.35) return { phase: "sel" };
    if (k < 1) return { phase: "type", typed: k < 0.68 ? 1 : 2 };
    return { phase: "saved", flash: 1 - sm(0, 0.5, u - savedAt(i)) };
  }
  const savedCount = (u) => (u >= T.reset ? 0 : EDITS.filter((_, i) => u >= savedAt(i)).length);
  // 工作台上现在点开的是哪家店：最近一次开始改的那家
  function activeTab(p, u) {
    let best = 0;
    let at = -1;
    for (let i = p; i < SHOPS; i += COLS) if (u < T.reset && u >= EDITS[i].s - 0.15 && EDITS[i].s > at) [best, at] = [tabOf(i), EDITS[i].s];
    return best;
  }

  // 平台自带的快捷短语面板里的三条短语：改的是中间那条「发货时间」
  const QROW = 38; // 快捷短语一行的高（原生像素）
  function quickRows(ctx, r, i, u) {
    const st = shopState(i, u);
    const saved = st.phase === "saved";
    const x = r.x + 6;
    const rows = [OTHER_ROWS[0], null, OTHER_ROWS[1]];
    rows.forEach((row, k) => {
      const ry = r.y + 4 + k * QROW;
      if (ry + QROW - 4 > r.y + r.h) return; // 面板放不下就少露一条
      if (!row) {
        const hot = st.phase !== "old";
        if (hot || st.reset) {
          rr(ctx, r.x, ry - 3, r.w, 38, 3);
          ctx.fillStyle = st.reset ? `rgba(255,59,48,${0.18 * st.reset})` : saved ? "rgba(255,107,44,0.16)" : "rgba(255,107,44,0.08)";
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = st.reset ? `rgba(255,59,48,${st.reset})` : "rgba(255,107,44,0.9)";
          ctx.stroke();
        }
        text(ctx, "发货时间", x, ry + 7, { size: 9, weight: 600, color: hot ? "#c2410c" : "#8a8f98", align: "left" });
        if (saved) check(ctx, r.x + r.w - 10, ry + 8, 6);
        let mid = { t: OLD, color: "#1f2329" };
        if (st.phase === "sel") mid = { t: OLD, color: "#fff", bg: "#3d6cf0" };
        if (st.phase === "type") mid = { t: NEW.slice(0, st.typed), color: "#c2410c" };
        if (saved) mid = { t: NEW, color: "#c2410c" };
        segs(ctx, [{ t: PRE, color: "#1f2329" }, mid, { t: POST, color: "#1f2329" }], x, ry + 22, { size: 11, weight: 600 });
        if (st.phase === "type" && Math.floor(u * 6) % 2 === 0) {
          ctx.font = `600 11px ${SANS}`;
          ctx.fillStyle = "#c2410c";
          ctx.fillRect(x + ctx.measureText(PRE + NEW.slice(0, st.typed)).width + 0.5, ry + 15, 1.2, 14);
        }
      } else {
        text(ctx, row.title, x, ry + 7, { size: 9, weight: 600, color: "#8a8f98", align: "left" });
        text(ctx, row.text, x, ry + 22, { size: 11, color: "#4b5563", align: "left" });
      }
      ctx.fillStyle = "#eceef1";
      ctx.fillRect(r.x, ry + QROW - 4, r.w, 1);
    });
  }

  // 顾客在聊天栏里问的那一句（各家对方气泡的颜色）
  function askBubble(ctx, plat, r, label = "什么时候发货？") {
    const sk = PCX().SKINS[plat];
    PCX().face(ctx, r.x + 8, r.y + 8, 18, { shape: sk.avatar, bg: "#c9b8a8" });
    ctx.font = `400 10.5px ${SANS}`;
    const w = ctx.measureText(label).width + 16;
    rr(ctx, r.x + 32, r.y + 8, w, 22, 4);
    ctx.fillStyle = sk.in;
    ctx.fill();
    if (sk.inLine !== sk.msgBg) {
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = sk.inLine;
      ctx.stroke();
    }
    text(ctx, label, r.x + 40, r.y + 19.5, { size: 10.5, color: "#1f2329", align: "left" });
  }

  // 一个平台工作台（远景里看「多」，特写里看「字」）
  function workbench(ctx, p, u, content) {
    const plat = PLATS[p];
    const shops = Array.from({ length: ROWS }, (_, t) => ({ done: shopState(t * COLS + p, u).phase === "saved" }));
    const act = activeTab(p, u);
    ctx.save();
    ctx.translate(WIN_X, winY(p));
    ctx.scale(WK, WK);
    const g = PCX().draw(ctx, plat, winChat(p), { ...winOpts(p), shops, active: act, customer: "小陈", frame: "#3f3f3f" });
    ctx.save();
    ctx.globalAlpha *= content;
    rr(ctx, g.msgs.x, g.msgs.y, g.msgs.w, g.msgs.h, 0);
    ctx.clip();
    askBubble(ctx, plat, g.msgs);
    ctx.restore();
    ctx.globalAlpha *= content;
    quickRows(ctx, g.side, act * COLS + p, u);
    // 打回原形：整个窗口描一圈红
    const reset = u >= T.reset ? win(u, T.reset, T.reset + 0.9, 0.15) : 0;
    if (reset > 0) {
      rr(ctx, g.win.x, g.win.y, g.win.w, g.win.h, 4);
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(255,59,48,${reset})`;
      ctx.stroke();
    }
    ctx.restore();
    // 刚改好的那一下亮一下
    for (let t = 0; t < ROWS; t++) {
      const st = shopState(t * COLS + p, u);
      if (st.phase === "saved" && st.flash > 0) {
        const r = geo().wide[p].side;
        glow(ctx, r.x + r.w / 2, r.y + 50, 200, "rgba(255,107,44,0.9)", st.flash * 0.5);
      }
    }
  }

  // ① 0–3s：问题本身 + 20 个小方块；② 3–18.5s：四个平台的工作台、20 家店，推近、一家家改、全部打回原形
  function sceneShops(ctx, u) {
    if (u > T.turn + 0.7) return;
    const out = 1 - sm(T.turn, T.turn + 0.6, u);
    const content = sm(T.shops + 0.2, T.shops + 0.8, u);
    const cam = u < T.shops ? WIDE(0) : camAt(CAM_SHOPS(), u);
    // 「没必要」盖章那一下屏幕抖
    const shake = (1 - sm(T.stamp, T.stamp + 0.35, u)) * (u >= T.stamp ? 22 : 0);
    ctx.save();
    ctx.globalAlpha = out;
    ctx.translate(Math.sin(u * 83) * shake, Math.cos(u * 61) * shake);
    applyCam(ctx, cam);
    // 工作台一个接一个弹上来
    if (u >= T.morph + 0.2) {
      for (let p = 0; p < COLS; p++) {
        const pop = easeBack(clamp((u - T.morph - 0.25 - p * 0.12) / 0.4, 0, 1));
        if (pop <= 0) continue;
        const k = (0.85 + 0.15 * pop) * (1 + pulse(u) * 0.008);
        ctx.save();
        ctx.globalAlpha = out * clamp(pop, 0, 1);
        ctx.translate(W / 2, winY(p) + WIN_H / 2);
        ctx.scale(k, k);
        ctx.translate(-W / 2, -(winY(p) + WIN_H / 2));
        workbench(ctx, p, u, content);
        ctx.restore();
      }
    }
    // 片头的小方块一格格亮成橙色（每一格＝一家店要改一次），然后飞进各自工作台上那家店的页签
    if (u < T.shops + 0.9) {
      for (let i = 0; i < SHOPS; i++) {
        const a = sqRect(i);
        const b = tabRect(i);
        const m = sm(T.morph + rnd(i) * 0.25, T.shops + 0.35 + rnd(i) * 0.25, u);
        const r = { x: lerp(a.x, b.x, m), y: lerp(a.y, b.y, m), w: lerp(a.w, b.w, m), h: lerp(a.h, b.h, m) };
        const lit = u >= sqLit(i);
        const pop = lit ? easeBack(clamp((u - sqLit(i)) / 0.2, 0, 1)) : 1;
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(lerp(0.7, 1, pop), lerp(0.7, 1, pop));
        ctx.translate(-cx, -cy);
        rr(ctx, r.x, r.y, r.w, r.h, lerp(10, 4, m));
        ctx.globalAlpha = out * (lit ? 1 - sm(0.75, 1, m) : 0.9 * (1 - m));
        ctx.fillStyle = lit ? ACCENT : SURFACE;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = lit ? ACCENT : LINE;
        ctx.stroke();
        if (lit && m < 0.4) text(ctx, "改", cx, cy + 2, { size: 34, weight: 800, color: "#fff", alpha: 1 - m * 2.5 });
        ctx.restore();
      }
    }
    ctx.restore();

    // 「没必要」章：红框斜盖在四个工作台上
    const st = sm(T.stamp, T.stamp + 0.18, u, easeOut);
    if (st > 0 && out > 0) {
      ctx.save();
      ctx.globalAlpha = out * (1 - sm(T.turn - 0.2, T.turn + 0.2, u));
      ctx.translate(W / 2, 1130);
      ctx.rotate(-0.16);
      const s = lerp(2.4, 1, st);
      ctx.scale(s, s);
      rr(ctx, -330, -110, 660, 220, 26);
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.fill();
      ctx.lineWidth = 14;
      ctx.strokeStyle = RED;
      ctx.stroke();
      text(ctx, "没必要", 0, 8, { size: 150, weight: 900, color: RED });
      ctx.restore();
    }
  }

  // 片头的问题：第 0 帧就在，刷到的人第一眼就知道这条讲什么
  function sceneHook(ctx, u) {
    if (u > T.shops + 0.4) return;
    const out = sm(T.morph - 0.1, T.shops + 0.2, u);
    ctx.save();
    ctx.globalAlpha = 1 - out;
    ctx.translate(0, -260 * easeIO(out));
    // 小标签：说给谁听
    ctx.font = `700 46px ${SANS}`;
    const tag = "开了很多家店的客服";
    const tw = ctx.measureText(tag).width + 64;
    rr(ctx, W / 2 - tw / 2, 250, tw, 84, 42);
    ctx.fillStyle = "rgba(255,107,44,0.16)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = ACCENT;
    ctx.stroke();
    text(ctx, tag, W / 2, 294, { size: 46, weight: 700, color: ACCENT });
    text(ctx, "改一句话术", W / 2, 500, { size: 136, weight: 900 });
    // 「20」跟着小方块一格格亮，每亮一格跳一下
    const lit = clamp(Math.floor((u - sqLit(0)) / 0.105) + 1, 0, SHOPS);
    const bump = lit > 0 && lit < SHOPS ? Math.exp(-((u - sqLit(0)) % 0.105) * 30) : 0;
    const done = u >= sqLit(SHOPS - 1) ? easeBack(clamp((u - sqLit(SHOPS - 1)) / 0.3, 0, 1)) : 0;
    ctx.save();
    ctx.translate(W / 2, 760);
    const s = 1 + bump * 0.05 + done * 0.06 - (u >= sqLit(SHOPS - 1) ? 0.06 : 0);
    ctx.scale(s, s);
    segs(ctx, [{ t: "要改 ", color: FG }, { t: "20", color: ACCENT }, { t: " 次？", color: FG }], 0, 0, { size: 150, weight: 900, align: "center" });
    ctx.restore();
    if (done > 0) glow(ctx, W / 2, 760, 520, "rgba(255,107,44,0.7)", 0.25 * done * (1 - out));
    ctx.restore();
  }

  // 片头下面那一行计数：已改 N / 20 家
  function counter(ctx, u) {
    const a = win(u, savedAt(0) - 0.1, T.turn, 0.25);
    if (a <= 0) return;
    const n = savedCount(u);
    const reset = u >= T.reset;
    const bump = n > 0 && !reset ? Math.exp(-(u - savedAt(n - 1)) * 10) : 0;
    ctx.save();
    ctx.globalAlpha = a;
    const y = 1800;
    rr(ctx, 120, y - 64, W - 240, 128, 64);
    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = reset ? RED : LINE;
    ctx.stroke();
    ctx.translate(W / 2, y);
    ctx.scale(1 + bump * 0.08, 1 + bump * 0.08);
    segs(ctx, [{ t: reset ? "又从 " : "已改 ", color: MUTED }, { t: String(n), color: reset ? RED : ACCENT }, { t: " / 20 家", color: MUTED }], 0, 4, { size: 64, weight: 800, align: "center" });
    ctx.restore();
  }

  // ③ 18.5–21.5s：所以我做了一个软件 → 话术精灵
  function sceneTurn(ctx, u, opts) {
    const a = win(u, T.turn + 0.1, T.solve + 0.3, 0.3);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    const l1 = win(u, T.turn + 0.15, T.brand + 0.1, 0.22);
    if (l1 > 0) {
      const pop = easeBack(clamp((u - T.turn - 0.15) / 0.3, 0, 1));
      ctx.save();
      ctx.globalAlpha = a * l1;
      ctx.translate(W / 2, 900);
      ctx.scale(lerp(0.6, 1, pop), lerp(0.6, 1, pop));
      text(ctx, "所以，", 0, -110, { size: 84, weight: 700, color: MUTED });
      text(ctx, "我做了一个软件", 0, 30, { size: 112, weight: 900 });
      ctx.restore();
    }
    const l2 = sm(T.brand, T.brand + 0.4, u, easeOut);
    if (l2 > 0) {
      const s = lerp(1.4, 1, l2);
      ctx.save();
      ctx.globalAlpha = a * l2;
      ctx.translate(W / 2, 900);
      ctx.scale(s, s);
      drawLogo(ctx, opts, 0, -260, 220);
      text(ctx, "话术精灵", 0, 0, { size: 150, weight: 900 });
      segs(ctx, marked("[专门管理话术]的软件", MUTED), 0, 150, { size: 64, weight: 700, align: "center" });
      ctx.restore();
      glow(ctx, W / 2, 860, 600, "rgba(255,107,44,0.7)", 0.3 * l2 * (1 - sm(T.brand + 0.4, T.solve, u)));
    }
    ctx.restore();
  }

  function drawLogo(ctx, opts, x, y, h) {
    const img = opts.logo;
    if (!img || !img.complete || !img.naturalWidth) return;
    const w = (h * img.naturalWidth) / img.naturalHeight;
    ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  }

  // ---------- ④ 21.5–29.6s：话术精灵主界面里改一次，20 家店的聊天窗口都用上 ----------
  const PANEL = { x: 100, y: 500, w: 880, h: 450 };
  // 下半屏：四个工作台排成 2×2，底边都贴着话术精灵的吸附搜索栏（真实的样子：话术精灵挂在每个平台窗口上）
  const GK = 1.4;
  const GW = 490;
  const GH = 380;
  const gridCell = (p) => ({ x: 40 + (p % 2) * (GW + 20), y: 1070 + Math.floor(p / 2) * (GH + 20), w: GW, h: GH });
  const gridOpts = (p) => ({ list: false, notice: false, agent: false, headH: 30, inputH: 52, bar: true, barH: 20, tabW: 40 });
  function gridChat(p) {
    const d = PCX().dims(PLATS[p], gridOpts(p));
    return { x: d.left, y: d.top, w: GW / GK - d.left, h: (GH - 20 * GK) / GK - d.top };
  }
  const SHOWCASE = 1; // 镜头推近看的那个工作台（千牛）
  const PANEL_ROW_Y = PANEL.y + 352;
  let camSolve = null;
  const CAM_SOLVE = () => {
    if (camSolve) return camSolve;
    const m = geo().small[SHOWCASE].msgs;
    const sc = { x: Math.min(m.x + m.w / 2, W - W / (2 * 2.4)), y: m.y + 60 };
    camSolve = [
      WIDE(T.solve, 0.9),
      WIDE(22.4, 1),
      { u: 22.9, x: W / 2, y: PANEL_ROW_Y - 40, z: 1.22 },
      { u: 24.1, x: W / 2, y: PANEL_ROW_Y - 40, z: 1.22 },
      WIDE(T.beams + 0.3, 1),
      WIDE(26.5, 1),
      { u: 27.3, ...sc, z: 2.4 },
      { u: 28.9, ...sc, z: 2.4 },
      WIDE(T.compare, 1),
    ];
    return camSolve;
  };

  function solveState(u) {
    const e = SOLVE_EDIT;
    if (u < e.s) return { phase: "old" };
    const k = (u - e.s) / e.d;
    if (k < 0.35) return { phase: "sel" };
    if (k < 1) return { phase: "type", typed: k < 0.68 ? 1 : 2 };
    return { phase: "saved", flash: 1 - sm(0, 0.6, u - e.s - e.d) };
  }

  // 话术精灵主界面（客户端白色主题的简化复刻：标题栏 → 三个话术域页签 → 0–9 套号 → 一级分类 → 二级分类 → 话术行）
  function panel(ctx, u, opts) {
    const { x, y, w, h } = PANEL;
    ctx.save();
    rr(ctx, x, y, w, h, 14);
    ctx.fillStyle = P.frame;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = P.base;
    ctx.stroke();
    // 标题栏
    drawLogo(ctx, opts, x + 44, y + 34, 40);
    text(ctx, "话术精灵", x + 74, y + 35, { size: 28, weight: 800, color: P.ink, align: "left" });
    [0, 1, 2].forEach((k) => {
      ctx.beginPath();
      ctx.arc(x + w - 40 - k * 40, y + 34, 9, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = P.digit;
      ctx.stroke();
    });
    // 页签
    const tabs = ["团队话术", "个人话术", "离线话术"];
    const ty = y + 70;
    ctx.fillStyle = P.base;
    ctx.fillRect(x + 20, ty + 52, w - 40, 1.5);
    tabs.forEach((t, k) => {
      const tx = x + 24 + k * 170;
      if (k === 0) {
        ctx.fillStyle = P.paper;
        ctx.fillRect(tx, ty, 160, 53);
        ctx.lineWidth = 2;
        ctx.strokeStyle = P.ink;
        ctx.beginPath();
        ctx.moveTo(tx, ty + 53);
        ctx.lineTo(tx, ty);
        ctx.lineTo(tx + 160, ty);
        ctx.lineTo(tx + 160, ty + 53);
        ctx.stroke();
      }
      text(ctx, t, tx + 80, ty + 28, { size: 28, weight: k === 0 ? 800 : 500, color: k === 0 ? P.ink : P.digit });
    });
    // 套号 0–9
    const dy = y + 150;
    text(ctx, "默认", x + 28, dy + 22, { size: 24, weight: 700, color: P.ink, align: "left" });
    for (let d = 0; d < 10; d++) {
      const dx = x + 110 + d * 72;
      if (d === 0) {
        rr(ctx, dx, dy, 52, 44, 6);
        ctx.fillStyle = P.peach;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = P.ink;
        ctx.stroke();
      }
      text(ctx, String(d), dx + 26, dy + 23, { size: 26, weight: d === 0 ? 800 : 500, color: d === 0 ? P.ink : P.digit, font: MONO });
    }
    // 一级分类
    const cy = y + 214;
    ["售前", "物流", "售后"].forEach((t, k) => {
      const cx = x + 28 + k * 130;
      rr(ctx, cx, cy, 112, 48, 8);
      ctx.fillStyle = k === 1 ? P.peach : P.chip;
      ctx.fill();
      if (k === 1) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = P.ink;
        ctx.stroke();
      }
      text(ctx, t, cx + 56, cy + 25, { size: 26, weight: k === 1 ? 800 : 500, color: P.ink });
    });
    // 二级分类（展开的是桃色条）
    const ly = y + 280;
    ctx.fillStyle = P.peach;
    ctx.fillRect(x + 20, ly, w - 40, 44);
    text(ctx, "▾ 发货", x + 34, ly + 23, { size: 26, weight: 700, color: P.ink, align: "left" });
    // 话术行：改的就是它
    const st = solveState(u);
    const ry = PANEL_ROW_Y;
    if (st.phase !== "old") {
      rr(ctx, x + 20, ry - 18, w - 40, 84, 8);
      ctx.fillStyle = st.phase === "saved" ? `rgba(255,107,44,${0.12 + 0.25 * st.flash})` : P.paper;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = st.phase === "saved" ? ACCENT : P.ink;
      ctx.stroke();
    }
    plane(ctx, x + 32, ry - 2, 36);
    segs(ctx, [{ t: "1. ", color: P.digit }, { t: "发货时间", color: P.title }], x + 82, ry + 16, { size: 28, weight: 700 });
    let mid = { t: OLD, color: P.answer };
    if (st.phase === "sel") mid = { t: OLD, color: "#fff", bg: "#c2410c" };
    if (st.phase === "type") mid = { t: NEW.slice(0, st.typed), color: "#c2410c" };
    if (st.phase === "saved") mid = { t: NEW, color: "#c2410c" };
    segs(ctx, [{ t: PRE, color: P.answer }, mid, { t: POST, color: P.answer }], x + 270, ry + 16, { size: 34, weight: 700 });
    if (st.phase === "type" && Math.floor(u * 6) % 2 === 0) {
      ctx.font = `700 34px ${SANS}`;
      ctx.fillStyle = "#c2410c";
      ctx.fillRect(x + 270 + ctx.measureText(PRE + NEW.slice(0, st.typed)).width + 1, ry - 4, 3, 40);
    }
    // 「只改 1 次」
    if (st.phase === "saved") {
      const p = easeBack(clamp((u - SOLVE_EDIT.s - SOLVE_EDIT.d) / 0.3, 0, 1));
      ctx.save();
      ctx.translate(x + w - 120, y + h + 2);
      ctx.scale(p, p);
      rr(ctx, -110, -34, 220, 68, 34);
      ctx.fillStyle = ACCENT;
      ctx.fill();
      text(ctx, "只改 1 次", 0, 2, { size: 34, weight: 800, color: "#fff" });
      ctx.restore();
    }
    ctx.restore();
  }

  // 一个平台工作台（缩小版）：话术精灵一发，这家的每家店都用上了新话术——页签一家家打勾，聊天栏里发出新的那句
  function gridBench(ctx, p, u) {
    const plat = PLATS[p];
    const sk = PCX().SKINS[plat];
    const c = gridCell(p);
    const shops = Array.from({ length: ROWS }, (_, t) => ({ done: u >= beamAt(t * COLS + p) + 0.3 }));
    let act = 0;
    for (let t = 0; t < ROWS; t++) if (u >= beamAt(t * COLS + p) + 0.3) act = t;
    const first = beamAt(p) + 0.3;
    const got = u >= first;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(GK, GK);
    const g = PCX().draw(ctx, plat, gridChat(p), { ...gridOpts(p), shops, active: act, customer: "小陈", frame: got ? ACCENT : "#3f3f3f", barText: got && u < first + 1.2 ? "发货" : "" });
    ctx.save();
    rr(ctx, g.msgs.x, g.msgs.y, g.msgs.w, g.msgs.h, 0);
    ctx.clip();
    askBubble(ctx, plat, g.msgs);
    if (got) {
      const pop = easeBack(clamp((u - first) / 0.25, 0, 1));
      const label = PRE + NEW + POST;
      ctx.font = `400 10.5px ${SANS}`;
      const w = ctx.measureText(label).width + 16;
      const bx = g.msgs.x + g.msgs.w - 32 - w;
      const by = g.msgs.y + 40;
      ctx.save();
      ctx.translate(bx + w, by + 11);
      ctx.scale(pop, pop);
      ctx.translate(-(bx + w), -(by + 11));
      PCX().face(ctx, g.msgs.x + g.msgs.w - 26, by, 18, { shape: sk.avatar, bg: sk.accent });
      rr(ctx, bx, by, w, 22, 4);
      ctx.fillStyle = sk.own;
      ctx.fill();
      segs(ctx, [{ t: PRE, color: "#1f2329" }, { t: NEW, color: "#c2410c" }, { t: POST, color: "#1f2329" }], bx + 8, by + 11.5, { size: 10.5, weight: 400 });
      if (sk.read) PCX().readMark(ctx, bx - 4, by + 16, 8);
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();
    const flash = got ? 1 - sm(0, 0.5, u - first) : 0;
    if (flash > 0) glow(ctx, c.x + c.w / 2, c.y + c.h / 2, 260, "rgba(255,107,44,0.9)", flash * 0.5);
  }

  function sceneSolve(ctx, u, opts) {
    const a = win(u, T.solve, T.compare + 0.3, 0.35);
    if (a <= 0) return;
    const cam = camAt(CAM_SOLVE(), u);
    ctx.save();
    ctx.globalAlpha = a;
    applyCam(ctx, cam);
    const k = 1 + pulse(u) * 0.01;
    ctx.translate(W / 2, 760);
    ctx.scale(k, k);
    ctx.translate(-W / 2, -760);
    const pin = easeBack(clamp((u - T.solve) / 0.45, 0, 1));
    ctx.save();
    ctx.translate(W / 2, PANEL.y + PANEL.h / 2);
    ctx.scale(lerp(0.7, 1, pin), lerp(0.7, 1, pin));
    ctx.translate(-W / 2, -(PANEL.y + PANEL.h / 2));
    panel(ctx, u, opts);
    ctx.restore();
    for (let p = 0; p < COLS; p++) {
      const pop = easeBack(clamp((u - T.solve - 0.4 - p * 0.1) / 0.4, 0, 1));
      if (pop <= 0) continue;
      const c = gridCell(p);
      ctx.save();
      ctx.globalAlpha = a * clamp(pop, 0, 1);
      ctx.translate(c.x + c.w / 2, c.y + c.h / 2);
      ctx.scale(pop, pop);
      ctx.translate(-(c.x + c.w / 2), -(c.y + c.h / 2));
      gridBench(ctx, p, u);
      ctx.restore();
    }
    // 光束：从话术精灵连到每一家店的页签
    const from = { x: W / 2, y: PANEL.y + PANEL.h + 40 };
    for (let i = 0; i < SHOPS; i++) {
      const b = beamAt(i);
      if (u < b) continue;
      const to = center(tabRect(i, "small"));
      const p = sm(b, b + 0.3, u, easeOut);
      const fade = 0.25 + 0.75 * (1 - sm(b + 0.3, b + 1.2, u));
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(lerp(from.x, to.x, p), lerp(from.y, to.y, p));
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(255,107,44,${fade * 0.8})`;
      ctx.stroke();
      if (p < 1) glow(ctx, lerp(from.x, to.x, p), lerp(from.y, to.y, p), 40, "rgba(255,170,120,1)", 0.9);
    }
    ctx.restore();
  }

  // ---------- ⑤ 29.6–33.8s：以前 20 次 vs 现在 1 次 → 节约时间，快速高效率 ----------
  function sceneCompare(ctx, u) {
    const a = win(u, T.compare, T.value + 0.3, 0.3);
    if (a > 0) {
      ctx.save();
      ctx.globalAlpha = a;
      const before = sm(T.compare + 0.1, T.compare + 0.4, u, easeOut);
      text(ctx, "以前", W / 2, 500, { size: 64, weight: 700, color: MUTED, alpha: before });
      for (let i = 0; i < SHOPS; i++) {
        const at = T.compare + 0.2 + i * 0.04;
        const p = easeBack(clamp((u - at) / 0.2, 0, 1));
        if (p <= 0) continue;
        const x = W / 2 - 4.5 * 84 + (i % 10) * 84;
        const y = 610 + Math.floor(i / 10) * 84;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(p, p);
        rr(ctx, -34, -34, 68, 68, 10);
        ctx.fillStyle = "rgba(255,59,48,0.2)";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = RED;
        ctx.stroke();
        text(ctx, "改", 0, 2, { size: 32, weight: 800, color: RED });
        ctx.restore();
      }
      ctx.globalAlpha = a * sm(T.compare + 0.6, T.compare + 0.9, u, easeOut);
      segs(ctx, [{ t: "改 ", color: FG }, { t: "20", color: RED }, { t: " 次", color: FG }], W / 2, 860, { size: 110, weight: 900, align: "center" });
      ctx.globalAlpha = a;
      const now = sm(T.compare + 1.2, T.compare + 1.5, u, easeOut);
      if (now > 0) {
        ctx.save();
        ctx.globalAlpha = a * now;
        text(ctx, "现在", W / 2, 1060, { size: 64, weight: 700, color: MUTED });
        const p = easeBack(clamp((u - T.compare - 1.3) / 0.3, 0, 1));
        ctx.translate(W / 2, 1170);
        ctx.scale(p, p);
        rr(ctx, -40, -40, 80, 80, 12);
        ctx.fillStyle = ACCENT;
        ctx.fill();
        text(ctx, "改", 0, 2, { size: 38, weight: 800, color: "#fff" });
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = a * now;
        segs(ctx, [{ t: "改 ", color: FG }, { t: "1", color: ACCENT }, { t: " 次", color: FG }], W / 2, 1330, { size: 110, weight: 900, align: "center" });
        ctx.restore();
      }
      ctx.restore();
    }
  }

  // 「节约时间，快速高效率」：在 T.value 砸下来，片尾缩到 logo 下面
  function slogan(ctx, u) {
    if (u < T.value) return;
    const land = sm(T.value, T.value + 0.22, u, easeOut);
    const settle = sm(T.end, T.end + 0.8, u);
    const y = lerp(880, 840, settle);
    const s = lerp(lerp(1.8, 1, land), 0.52, settle);
    ctx.save();
    ctx.globalAlpha = land;
    ctx.translate(W / 2, y);
    ctx.scale(s, s);
    text(ctx, "节约时间", 0, -80, { size: 170, weight: 900, color: ACCENT });
    text(ctx, "快速高效率", 0, 110, { size: 150, weight: 900 });
    ctx.restore();
    if (u < T.end + 0.4) glow(ctx, W / 2, 880, 700, "rgba(255,107,44,0.8)", 0.35 * land * (1 - settle));
  }

  // ---------- ⑥ 33.8–40s：片尾——话术精灵 + 作者账号（底部留给播放器的「再看一遍」字条） ----------
  function sceneEnd(ctx, u, opts) {
    const a = sm(T.end, T.end + 0.6, u);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    const bob = Math.sin(u * 2.2) * 6;
    drawLogo(ctx, opts, W / 2, 330 + bob, 200);
    text(ctx, "话术精灵", W / 2, 540, { size: 112, weight: 900 });
    text(ctx, "SoftTalk", W / 2, 640, { size: 44, weight: 600, color: MUTED, font: MONO });
    ctx.restore();
    const w2 = sm(T.end + 0.8, T.end + 1.3, u, easeOut);
    if (w2 > 0) {
      ctx.save();
      ctx.globalAlpha = w2;
      const p = easeBack(clamp((u - T.end - 1.0) / 0.4, 0, 1));
      ctx.translate(W / 2, 1270);
      ctx.scale(p, p);
      rr(ctx, -360, -90, 720, 180, 90);
      ctx.fillStyle = ACCENT;
      ctx.fill();
      // 账号一个字一个字敲出来
      const n = clamp(Math.floor((u - T.end - 1.3) / 0.08), 0, WECHAT.length);
      segs(ctx, [{ t: WECHAT.slice(0, n), color: "#000" }, { t: WECHAT.slice(n), color: "rgba(0,0,0,0)" }], 0, 4, { size: 88, weight: 800, align: "center", font: SANS });
      ctx.restore();
      glow(ctx, W / 2, 1270, 520, "rgba(255,107,44,0.7)", 0.2 * w2);
    }
  }

  function render(ctx, u, opts) {
    ctx.save();
    background(ctx, u);
    sceneShops(ctx, u);
    sceneHook(ctx, u);
    counter(ctx, u);
    sceneTurn(ctx, u, opts);
    sceneSolve(ctx, u, opts);
    captions(ctx, u);
    sceneCompare(ctx, u);
    slogan(ctx, u);
    sceneEnd(ctx, u, opts);
    ctx.restore();
    impact(ctx, u, 0, { strength: 0.5, y: 760, flash: false }); // 第 0 帧不闪白：那一帧就是问题本身
    impact(ctx, u, T.shops, { strength: 0.6 });
    impact(ctx, u, T.stamp, { color: "255,59,48", strength: 0.8, y: 1130 });
    impact(ctx, u, T.brand, { strength: 0.7, y: 900 });
    impact(ctx, u, T.value, { strength: 1, y: 880 });
    vignette(ctx);
    // 最后一帧不淡出：停在账号上
  }

  // ---------- 声音：Web Audio 现合成 ----------
  // 120 BPM 的电子节拍：店铺段 Am–F–C–G（越改越急：加十六分镲和琶音），改完断拍、盖章；
  // 话术精灵出场后换成 C–G–Am–F 的亮色进行，加上和画面对齐的音效（亮格、敲键、保存、发送、冲击、嗖一声）。
  const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const MINOR = [
    { bass: 33, pad: [57, 60, 64] }, // Am
    { bass: 29, pad: [53, 57, 60] }, // F
    { bass: 36, pad: [55, 60, 64] }, // C
    { bass: 31, pad: [55, 59, 62] }, // G
  ];
  const MAJOR = [
    { bass: 36, pad: [60, 64, 67] }, // C
    { bass: 31, pad: [59, 62, 67] }, // G
    { bass: 33, pad: [57, 60, 64] }, // Am
    { bass: 29, pad: [57, 60, 65] }, // F
  ];

  function buildScore() {
    const ev = [];
    const add = (u, type, arg = {}, dur = 0) => ev.push({ u, type, arg, dur });
    const groove = (from, to, chords, { busy } = {}) => {
      for (let b = 0; from + b * BEAT < to - 0.01; b++) {
        const u = from + b * BEAT;
        add(u, "kick", { v: 1 });
        add(u + 0.25, "hat", { v: 0.5, open: b % 2 === 1 });
        if (b % 2 === 1) add(u, "clap", {});
        if (busy && u >= busy[0] && u < busy[1]) {
          add(u + 0.125, "hat", { v: 0.22 });
          add(u + 0.375, "hat", { v: 0.22 });
        }
      }
      for (let k = 0; from + k * 0.25 < to - 0.01; k++) {
        const u = from + k * 0.25;
        const c = chords[Math.floor((u - from) / 2) % 4];
        add(u, "bass", { n: c.bass + (k % 4 === 2 ? 12 : 0) + (k % 8 === 7 ? 7 : 0) }, 0.22);
      }
      for (let bar = 0; from + bar * 2 < to - 0.01; bar++) add(from + bar * 2, "pad", { notes: chords[bar % 4].pad, v: 0.5 }, Math.min(2, to - from - bar * 2));
    };
    const arp = (from, to, base, chords) => {
      const seq = [0, 1, 2, 1, 2, 0, 2, 1];
      for (let k = 0; from + k * 0.125 < to; k++) {
        const u = from + k * 0.125;
        const c = chords[Math.floor((u - base) / 2) % 4].pad;
        add(u, "pluck", { n: c[seq[k % 8]] + 12 + (k % 16 >= 8 ? 12 : 0), v: 0.5 });
      }
    };
    // ① 片头：一下冲击把人留住，20 个格子一格一声往上爬
    add(0, "impact", { v: 0.8 });
    add(0, "drone", {}, T.shops);
    for (let i = 0; i < SHOPS; i++) add(sqLit(i), "blip", { n: 64 + i, v: 0.7 });
    // 片头也不留空拍：半速底鼓 + 八分镲，越到 3 秒越密
    [0, 1, 2, 2.5, 2.75].forEach((u) => add(u, "kick", { v: 0.8 }));
    for (let u = 0.25; u < T.shops; u += 0.25) add(u, "hat", { v: 0.3 + u * 0.08, open: u > 2.5 });
    add(1.8, "riser", { len: 1.2 }, 1.2);
    add(T.morph, "whoosh", { len: 0.6, hi: 1 }, 0.6);
    // ② 20 家店
    add(T.shops, "impact", { v: 1 });
    groove(T.shops, T.done, MINOR, { busy: [T.grind, T.done] });
    arp(T.grind, T.done, T.shops, MINOR);
    for (let i = 0; i < SHOPS; i++) add(T.shops + 0.05 + i * 0.03, "pop", { n: 72 + (i % 8) * 2 });
    add(T.focus, "whoosh", { len: 0.9 }, 0.9);
    [T.grind, 11.4, 12.2].forEach((u) => add(u, "whoosh", { len: 0.4, hi: 1 }, 0.4));
    add(12.85, "whoosh", { len: 2.2 }, 2.2);
    EDITS.forEach((e, i) => {
      if (i < 4) {
        add(e.s, "blip", { n: 76, v: 0.6 });
        add(e.s + e.d * 0.4, "key", {});
        add(e.s + e.d * 0.7, "key", {});
        add(e.s + e.d, "snap", {});
      } else add(e.s + e.d, "blip", { n: 72 + (i - 4) * 1.5, v: 0.55 });
    });
    // 改完了 → 下次再优化，全部打回原形 → 盖章
    add(T.done, "chime", { n: 76, v: 0.6 });
    add(T.done, "pad", { notes: [57, 60, 64], v: 0.6 }, T.turn - T.done);
    add(T.reset, "zip", { up: 0 }, 0.5);
    add(T.reset, "thud", { v: 0.7 });
    for (let i = 0; i < 6; i++) add(T.reset + 0.1 + i * 0.12, "tick", { v: 0.6 });
    add(T.stamp, "impact", { v: 0.9 });
    add(T.stamp, "snap", {});
    add(T.stamp, "clap", {});
    // ③ 所以我做了一个软件
    add(T.turn, "pad", { notes: [48, 55, 60, 64], v: 0.7, long: 1 }, T.solve - T.turn);
    add(T.turn + 0.15, "chime", { n: 72, v: 0.6 });
    add(T.brand, "impact", { v: 0.6 });
    [0, 0.09, 0.18, 0.27].forEach((d, i) => add(T.brand + 0.05 + d, "chime", { n: [72, 76, 79, 84][i], v: 0.55 }));
    add(T.brand + 0.3, "shimmer", {}, 0.8);
    add(20.3, "riser", { len: 1.2 }, 1.2);
    // ④ 话术精灵：改一次，所有店铺都能用
    add(T.solve, "impact", { v: 0.8 });
    groove(T.solve, T.end, MAJOR, { busy: [T.beams, T.compare] });
    arp(T.beams, T.compare, T.solve, MAJOR);
    add(22.4, "whoosh", { len: 0.5 }, 0.5);
    add(SOLVE_EDIT.s, "blip", { n: 79, v: 0.6 });
    add(SOLVE_EDIT.s + SOLVE_EDIT.d * 0.4, "key", {});
    add(SOLVE_EDIT.s + SOLVE_EDIT.d * 0.7, "key", {});
    add(SOLVE_EDIT.s + SOLVE_EDIT.d, "chime", { n: 84 });
    add(T.beams, "zip", { up: 1 }, 0.4);
    const PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93];
    for (let i = 0; i < SHOPS; i++) add(beamAt(i) + 0.3, "send", { n: PENTA[i % 10], v: 0.35 });
    add(26.5, "whoosh", { len: 0.8 }, 0.8);
    add(28.9, "whoosh", { len: 0.7, hi: 1 }, 0.7);
    // ⑤ 20 次 vs 1 次 → 节约时间，快速高效率
    for (let i = 0; i < SHOPS; i++) add(T.compare + 0.2 + i * 0.04, "tick", { v: 0.5 });
    add(T.compare + 1.3, "thud", { v: 0.8 });
    add(T.compare + 1.3, "chime", { n: 88 });
    add(T.value - 0.5, "riser", { len: 0.5 }, 0.5);
    add(T.value, "impact", { v: 1.2 });
    // ⑥ 片尾
    add(T.end, "pad", { notes: [48, 60, 64, 67, 72], v: 0.9, long: 1 }, BASE - T.end);
    [0, 1, 2, 3].forEach((k) => add(T.end + k, "kick", { v: 0.5 }));
    for (let i = 0; i < WECHAT.length; i++) add(T.end + 1.3 + i * 0.08, "type", { v: 0.6 });
    add(T.end + 2.2, "chime", { n: 91, v: 0.5 });
    add(T.end + 2.3, "shimmer", {}, 0.8);
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
    const opts = { logo: new Image() };
    opts.logo.src = root.dataset.logo || "assets/logo.png";
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
      duration: BASE,
      width: W,
      height: H,
      still: 2.55, // 封面停在片头的问题上：20 格都亮了、「20」刚落定
      label: `短片「改一句话术，要改 20 次？」（${BASE} 秒，有声）：开了很多家店的客服，京东、天猫、拼多多、抖音每个平台都有好几家店，每家店都有平台自带的快捷短语；话术要经常优化，改一句就得每家店都重新编辑一遍，20 家店改 20 次，下次再优化又是 20 遍，工作量太大，而且完全没必要。所以我做了一个专门管理话术的软件——话术精灵：话术只改一次，所有店铺都能用，哪家店的聊天窗口点一下直接发出。以前改 20 次，现在改 1 次。节约时间，快速高效率。作者账号 ${WECHAT}。`,
      cover: { text: "播放短片 · 有声", again: "再看一遍" },
      render: (ctx, u) => render(ctx, u, opts),
      score: buildScore(),
      createSynth: () => new Synth(),
      fullscreen: true,
    });
    // 小精灵图加载好了再画一次封面
    opts.logo.addEventListener("load", refresh);
    root.whyFilm = film;
  }

  document.querySelectorAll("[data-why-film]").forEach(mount);
})();
