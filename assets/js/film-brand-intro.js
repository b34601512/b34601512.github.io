// 片头（issue #23）：2.8 秒、不配旁白，用真界面、真句子演一遍「以前 → 现在」，任何一条竖屏短片都能接在前面。
//   0.00–1.40  以前：千牛样子的商家聊天窗（和补运费正片第一帧同一块窗口、同一个取景、同一套气泡字号），第一帧就在画面上。
//              顾客问「运费怎么退？」→ 客服一个字一个字手打「截图？」→ 干等（钟飞转）→ 顾客「等下」→ 再问「姓名？」……
//              时间戳 10:02 一路跳到 17:40，气泡越来越快地往上堆
//   1.40–1.52  硬切：一下白闪
//   1.40–2.40  现在：同一位顾客、同一句问话；窗口底边吸着话术精灵吸附栏，结果向上展开一条话术。
//              鼠标点那一行左边的纸飞机（点一下 = 贴入 + 回车，不再按发送）→ 话术卡飞进输入框、输入框一闪 → 整句回复直接发出 →
//              顾客回「太省心了」和一颗跳动的心
//   2.40–2.80  片尾卡：小精灵（约 260 宽）+ 「话术精灵」四个字，2.55 秒起两样都完整，一直停到 2.8 秒
//
// 用法（不依赖任何一条片子；页面上 defer 引在 film-palette.js、platform-chat.js 之后）：
//   SoftTalkBrandIntro.DURATION                         片头秒数（≤ 3）
//   SoftTalkBrandIntro.draw(ctx, u, { width, height, logo? })
//     画第 u 秒（0 ≤ u ≤ DURATION，超出按两端算）的整帧。按 1080×1920 竖屏设计、满屏铺；别的比例把这块竖屏等比放进去、居中，
//     舞台底色和网点铺满整张画布（不留黑边）。
//     是 u 的纯函数：不读时钟、不用随机数（打字节奏用固定种子的整数哈希），同一个 u 永远画同一帧。
//     logo 可选：已加载好的小精灵图（assets/logo.png）；不给或没加载好就不画图，只画字。
// 颜色只从 FilmPalette（film-palette.js）与 PlatformChat.SKINS（platform-chat.js）取，不另立配色表。
// 片头的两声（0.05 秒起手、1.4 秒切点）由接片头的那条片子放进自己的声音表（freight-film.js 的 INTRO_CUES），这里只管画。
(() => {
  const DURATION = 2.8;
  const BW = 1080; // 设计画幅
  const BH = 1920;
  const SANS = '"MiSans", "HarmonyOS Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", system-ui, sans-serif';
  const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';
  const PLAT = "tm"; // 千牛：和补运费正片第一位顾客同一家，切进正片时窗口样子接得上

  // ---------- 文案（真句子；聊天里自己写的字共 23 个汉字，不算平台自带的「已读」与片尾品牌名「话术精灵」） ----------
  const ASK = "运费怎么退？"; // 顾客的问话（以前、现在同一句）
  const Q1 = "截图？"; // 以前：客服一次只问一样
  const Q2 = "姓名？";
  const WAIT_LINE = "等下"; // 以前：顾客一拖再拖
  const PHRASE = "截图、姓名、账号发我"; // 现在：一条话术一次问齐
  const REPLY = "太省心了";
  const WORDMARK = "话术精灵";

  // ---------- 节拍（秒） ----------
  const CUT = 1.4; // 以前 → 现在
  const FLASH = 0.12;
  const CLICK = 1.62; // 点纸飞机（这一下就发出去）
  const FOLD = [1.66, 1.76]; // 结果收起
  const FLY = [1.66, 1.88]; // 话术卡飞进输入框
  const SEND = 1.95; // 回车自动发出（纸飞机 = 贴入 + 回车）
  const THANKS = 2.05; // 顾客回话（留到 2.4 秒）
  const CARD = 2.4; // 片尾卡：窗口 0.1 秒退干净
  const CARD_IN = [2.42, 2.55]; // 小精灵、四个字弹出来；2.55 起完整

  // ---------- 取景：和正片第一帧同一块工作台、同一个镜头倍数 ----------
  // 正片（freight-film.js）：工作台 BENCH 620×1060（原生 ×2），第一帧镜头取景宽 650 → 放大 1080/650 倍，左边距 (24 − 9) × 倍数。
  // 片头用同一块窗口、同一个倍数，上下居中整块放进画面（正片第一帧顶上 250 留给钩子标题条，片头不要，窗口就整块露出来）。
  const PK = 2; // 原生 → 工作台坐标（同正片 PLAT_K）
  const Z = BW / 650; // 工作台坐标 → 画面
  const BENCH = { w: 620, h: 1060 };
  const BX = (24 - 9) * Z;
  const BY = (BH - BENCH.h * Z) / 2;
  const sk0 = () => globalThis.PlatformChat.SKINS[PLAT];
  const DIM = { rail: 40 * PK, top: 46 * PK }; // 千牛：左导航 40、顶上客服状态条 46（PlatformChat.dims("tm", { list: false })）
  const BAR = 24 * PK; // 底边吸附栏
  const CHAT = { x: DIM.rail, y: DIM.top, w: BENCH.w - DIM.rail, h: BENCH.h - DIM.top - BAR };
  const HEAD = 41 * PK;
  const IH = 216; // 输入区高（正片 inputHeight：两行以内）
  const MSG_TOP = CHAT.y + HEAD;
  const IY = CHAT.y + CHAT.h - IH;
  const TEXT = { x: CHAT.x + 28, y: IY + 58 + 18 }; // 输入框第一行字的中线（正片 inputTextY + 半行）
  const toX = (n) => BX + n * Z; // 工作台 → 画面
  const toY = (n) => BY + n * Z;

  // 气泡：正片 drawMsg 的尺寸（工作台坐标）
  const AV = 52;
  const BUB = 28;
  const BUB_H = 56;
  const PAD = 18;
  const GAP = 18;
  const TIME_H = 44;
  const EASE_IN = 0.12; // 一条消息冒出来用多久（正片 0.3，片头节奏快）

  // ---------- 数学 ----------
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeBack = (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
  const sm = (a, b, u, e = easeIO) => e(clamp((u - a) / (b - a), 0, 1));
  const win = (u, a, b, f) => sm(a, a + f, u) * (1 - sm(b - f, b, u));
  // 固定种子的整数哈希 → [0, 1)：各引擎结果一致（不用 Math.sin 的末位）
  const noise = (i) => {
    let x = Math.imul(i + 0x9e3779b9, 0x85ebca6b) >>> 0;
    x ^= x >>> 13;
    x = Math.imul(x, 0xc2b2ae35) >>> 0;
    x ^= x >>> 16;
    return x / 4294967296;
  };
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  };

  // ---------- 剧本 ----------
  // 以前：一来一回，越来越快；客服每次只问一样，顾客每次都「等下」，时间戳从 10:02 跳到 17:40
  const BEFORE = [
    { at: 0, side: "time", t: "10:02" },
    { at: 0, side: "in", text: ASK },
    { at: 0.42, side: "out", text: Q1, type: [0.12, 0.36] },
    { at: 0.86, side: "time", t: "11:37" },
    { at: 0.87, side: "in", text: WAIT_LINE },
    { at: 1.03, side: "out", text: Q2, type: [0.93, 1.0] },
    { at: 1.09, side: "time", t: "13:05" },
    { at: 1.1, side: "in", text: WAIT_LINE },
    { at: 1.16, side: "out", text: Q1, type: [1.12, 1.15] },
    { at: 1.21, side: "time", t: "15:16" },
    { at: 1.22, side: "in", text: WAIT_LINE },
    { at: 1.28, side: "out", text: Q2, type: [1.25, 1.27] },
    { at: 1.33, side: "time", t: "17:40" },
    { at: 1.34, side: "in", text: WAIT_LINE },
  ];
  const WAIT = { from: 0.48, to: 0.84, c0: 10 * 60 + 2, c1: 11 * 60 + 37 };
  // 现在：同一句问话，点一下纸飞机就回齐，顾客马上满意
  const AFTER = [
    { at: CUT - EASE_IN, side: "time", t: "10:02" }, // 切过来时问话已经在了（白闪底下就看得见）
    { at: CUT - EASE_IN, side: "in", text: ASK },
    { at: SEND, side: "out", text: PHRASE },
    { at: THANKS, side: "in", text: REPLY, heart: true },
  ];

  // ---------- 画笔 ----------
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function fillRR(ctx, x, y, w, h, r, color) {
    rr(ctx, x, y, w, h, r);
    ctx.fillStyle = color;
    ctx.fill();
  }
  function text(ctx, str, x, y, { size, weight = 500, color, align = "center", font = SANS, alpha = 1 }) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.restore();
  }
  function textW(ctx, str, size, weight = 500) {
    ctx.font = `${weight} ${size}px ${SANS}`;
    return ctx.measureText(str).width;
  }
  function scaleAt(ctx, x, y, s) {
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.translate(-x, -y);
  }
  function glow(ctx, x, y, r, color, alpha) {
    if (alpha <= 0) return;
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
  // 话术行的小方章：纸飞机指向左边（客户端 _draw_send_icon，同正片）
  function plane(ctx, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s / 20, s / 20);
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(9, -7);
    ctx.lineTo(5, 0);
    ctx.lineTo(9, 7);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }
  function heart(ctx, cx, cy, s, color) {
    if (s <= 0) return;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s / 32, s / 32);
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.bezierCurveTo(-26, -4, -16, -24, 0, -12);
    ctx.bezierCurveTo(16, -24, 26, -4, 0, 12);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  // ---------- 舞台：和正片 background() / vignette() 同一套（网点按 u 走，所以第 2.8 秒的网点正好接上正片第一帧） ----------
  // ext：画布四周超出设计画幅的那一圈（别的比例时），底色、网点一起铺满
  function stage(ctx, u, C, ext) {
    ctx.fillStyle = C.STAGE;
    ctx.fillRect(ext.x, ext.y, ext.w, ext.h);
    ctx.fillStyle = "rgba(255,255,255,0.045)";
    const off = (u * 12) % 48;
    const x0 = Math.floor(ext.x / 48) * 48 - 48;
    const y0 = Math.floor(ext.y / 48) * 48 - 48;
    for (let y = y0; y < ext.y + ext.h + 48; y += 48) for (let x = x0; x < ext.x + ext.w + 48; x += 48) ctx.fillRect(x + off, y + off * 0.5, 2, 2);
    glow(ctx, 240, BH - 80, 720, rgba(C.ACCENT, 0.32), 0.5);
    glow(ctx, BW - 200, 120, 600, rgba(C.ACCENT_HOT, 0.18), 0.5);
  }
  function vignette(ctx) {
    const d = Math.hypot(BW, BH);
    const g = ctx.createRadialGradient(BW / 2, BH / 2, d * 0.29, BW / 2, BH / 2, d * 0.59);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, BW, BH);
  }

  // ---------- 聊天（工作台坐标，尺寸同正片） ----------
  const msgH = (x) => (x.side === "time" ? TIME_H : BUB_H);
  function bubbleW(ctx, x) {
    return textW(ctx, x.text, BUB) + PAD * 2 + (x.heart ? 44 : 0);
  }
  function drawMsg(ctx, x, y, e, u, C) {
    const P = C.P;
    const sk = sk0();
    if (x.side === "time") {
      text(ctx, x.t, CHAT.x + CHAT.w / 2, y + TIME_H / 2, { size: 20, color: P.muted, font: MONO, alpha: clamp(e * 1.6, 0, 1) });
      return;
    }
    const own = x.side === "out";
    const left = CHAT.x + 22;
    const right = CHAT.x + CHAT.w - 22;
    const w = bubbleW(ctx, x);
    ctx.save();
    ctx.globalAlpha *= clamp(e * 1.6, 0, 1);
    scaleAt(ctx, own ? right : left, y + 20, 0.85 + 0.15 * easeBack(e));
    globalThis.PlatformChat.face(ctx, own ? right - AV : left, y, AV, { shape: sk.avatar, bg: own ? sk.accent : P.chipLine });
    const bx = own ? right - AV - 14 - w : left + AV + 14;
    fillRR(ctx, bx, y, w, BUB_H, 10, own ? sk.own : sk.in);
    text(ctx, x.text, bx + PAD, y + BUB_H / 2, { size: BUB, color: sk.ownFg, align: "left" });
    if (own && sk.read) text(ctx, "已读", bx - 12, y + BUB_H - 14, { size: 19, color: P.muted, align: "right" });
    if (x.heart) {
      // 心先弹出来，再跳两下（顾客是真高兴，不是客套）
      const pop = sm(x.at + 0.04, x.at + 0.18, u, easeBack);
      const beat = 1 + 0.22 * Math.max(0, Math.sin(clamp((u - x.at - 0.18) / 0.3, 0, 1) * Math.PI * 2));
      heart(ctx, bx + w - PAD - 16, y + BUB_H / 2 + 2, 34 * pop * beat, P.title);
    }
    ctx.restore();
  }
  // 消息区：新消息从底下推上来，堆满了就往上滚
  function drawMsgs(ctx, list, u, C) {
    const shown = list.filter((x) => x.at <= u);
    const viewH = IY - MSG_TOP;
    let total = 16;
    const hs = shown.map((x) => {
      const h = msgH(x) + GAP;
      total += h * easeOut(clamp((u - x.at) / EASE_IN, 0, 1));
      return h;
    });
    const offset = Math.max(0, total - viewH + 10);
    ctx.save();
    ctx.beginPath();
    ctx.rect(CHAT.x, MSG_TOP, CHAT.w, viewH);
    ctx.clip();
    let y = MSG_TOP + 16 - offset;
    shown.forEach((x, i) => {
      const e = clamp((u - x.at) / EASE_IN, 0, 1);
      if (y + hs[i] > MSG_TOP - 40) drawMsg(ctx, x, y, e, u, C);
      y += hs[i] * easeOut(e);
    });
    ctx.restore();
  }
  // 干等：消息区压暗，钟飞快地转（同正片 drawWait 的钟，只是不写字幕）
  function drawWait(ctx, u, C) {
    if (u < WAIT.from || u > WAIT.to + 0.08) return;
    const a = win(u, WAIT.from, WAIT.to + 0.08, 0.06);
    const mins = lerp(WAIT.c0, WAIT.c1, sm(WAIT.from + 0.04, WAIT.to - 0.04, u));
    const viewH = IY - MSG_TOP;
    const cx = CHAT.x + CHAT.w / 2;
    const cy = MSG_TOP + viewH / 2 - 30;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = rgba(C.P.ink, 0.72);
    ctx.fillRect(CHAT.x, MSG_TOP, CHAT.w, viewH);
    ctx.beginPath();
    ctx.arc(cx, cy, 92, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = C.ACCENT;
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      ctx.fillStyle = C.P.answer;
      ctx.fillRect(cx + Math.cos(ang) * 76 - 3, cy + Math.sin(ang) * 76 - 3, 6, 6);
    }
    const hand = (ang, len, wdt) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang - Math.PI / 2) * len, cy + Math.sin(ang - Math.PI / 2) * len);
      ctx.lineWidth = wdt;
      ctx.lineCap = "round";
      ctx.strokeStyle = C.P.ink;
      ctx.stroke();
    };
    hand(((mins / 60) % 12) * (Math.PI / 6), 44, 8);
    hand((mins % 60) * (Math.PI / 30), 66, 5);
    const hh = Math.floor(mins / 60);
    const mm = Math.floor(mins % 60);
    text(ctx, `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`, cx, cy + 140, { size: 52, weight: 700, color: C.ACCENT_HOT, font: MONO });
    ctx.restore();
  }
  // 输入框里的字：以前一个键一个键手打；现在话术整句贴进来，紧跟着回车发出
  function inputText(u, after) {
    if (after) return u >= FLY[1] && u < SEND ? PHRASE : "";
    const m = BEFORE.find((x) => x.type && u >= x.type[0] && u < x.at);
    if (!m) return "";
    const chars = Array.from(m.text);
    // 每个键之间的间隔不一样长（固定种子），最后一个键落在 type[1]
    const gaps = chars.map((_, i) => 0.6 + 0.8 * noise(i + Math.round(m.at * 100)));
    const sum = gaps.reduce((a, b) => a + b, 0);
    let t = m.type[0];
    let k = 0;
    for (let i = 0; i < chars.length; i++) {
      if (u >= t) k = i + 1;
      t += ((m.type[1] - m.type[0]) * gaps[i]) / sum;
    }
    return chars.slice(0, k).join("");
  }
  function drawInput(ctx, u, after, C) {
    const s = inputText(u, after);
    if (after && u >= FLY[1] && u < FLY[1] + 0.4) {
      ctx.fillStyle = rgba(C.ACCENT, 0.22 * (1 - (u - FLY[1]) / 0.4));
      ctx.fillRect(CHAT.x, IY, CHAT.w, IH);
    }
    if (!s) return;
    text(ctx, s, TEXT.x, TEXT.y, { size: 26, color: sk0().ownFg, align: "left" });
    if (Math.floor(u * 8) % 2 === 0) {
      ctx.fillStyle = C.P.ink;
      ctx.fillRect(TEXT.x + textW(ctx, s, 26) + 3, TEXT.y - 14, 2.5, 27);
    }
  }
  // 发送键：只有「以前」手动按；「现在」是纸飞机自带回车，发送键不动
  function sendPress(u, after) {
    if (after) return 0;
    const m = BEFORE.filter((x) => x.type).find((x) => u >= x.at - 0.04 && u < x.at + 0.08);
    return m ? win(u, m.at - 0.04, m.at + 0.08, 0.03) : 0;
  }

  // ---------- 话术精灵吸附栏的结果（客户端 attached_search_bar：贴在窗口底边，结果向上展开盖住聊天窗下半截） ----------
  const ROW = { h: 104, top: 10 };
  const PANEL_H = ROW.top + ROW.h + 8;
  const BAR_Y = CHAT.y + CHAT.h; // 吸附栏上沿（工作台坐标）
  const ROW_PLANE = { x: 36, y: BAR_Y - PANEL_H + ROW.top + ROW.h / 2 };
  function drawResults(ctx, u, C) {
    const P = C.P;
    const open = 1 - sm(FOLD[0], FOLD[1], u);
    const ph = PANEL_H * open;
    if (ph < 0.5) return;
    const py = BAR_Y - ph;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = -4;
    fillRR(ctx, 0, py, BENCH.w, ph, 0, P.paper);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, py, BENCH.w, ph);
    ctx.clip();
    ctx.fillStyle = P.focus;
    ctx.fillRect(0, py, BENCH.w, 2.8);
    const ry = py + ROW.top;
    const hover = sm(CLICK - 0.12, CLICK - 0.04, u);
    const hit = win(u, CLICK, CLICK + 0.3, 0.05);
    if (hover > 0) fillRR(ctx, 8, ry, BENCH.w - 16, ROW.h, 8, hit > 0 ? P.peach : P.hover);
    rr(ctx, 16, ry + ROW.h / 2 - 20, 40, 40, 8);
    ctx.fillStyle = P.badge;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = P.chipLine;
    ctx.stroke();
    plane(ctx, ROW_PLANE.x, ROW_PLANE.y, 26, P.hot);
    text(ctx, "1.", 72, ry + ROW.h / 2, { size: 24, color: P.digit, font: MONO, align: "left" });
    text(ctx, PHRASE, 108, ry + ROW.h / 2, { size: 30, weight: 700, color: P.ink, align: "left" });
    ctx.restore();
  }

  // ---------- 一个聊天窗（工作台坐标；平台外壳按原生像素 ×PK 画，同正片 drawSession） ----------
  function drawWindow(ctx, u, after, C) {
    const PC = globalThis.PlatformChat;
    ctx.save();
    ctx.scale(PK, PK);
    PC.draw(ctx, PLAT, { x: CHAT.x / PK, y: CHAT.y / PK, w: CHAT.w / PK, h: CHAT.h / PK }, {
      list: false, customer: "", headH: HEAD / PK, inputH: IH / PK, typing: !!inputText(u, after), press: sendPress(u, after),
      shops: [{}, {}, {}], active: 0, bar: after, frame: "#3f3f3f",
    });
    ctx.restore();
    drawMsgs(ctx, after ? AFTER : BEFORE, u, C);
    if (!after) drawWait(ctx, u, C);
    drawInput(ctx, u, after, C);
    if (after) drawResults(ctx, u, C);
  }

  // ---------- 镜头外：鼠标、点击涟漪、话术卡（画面坐标，同正片 drawCursor / drawFlies） ----------
  const rowPlane = { x: toX(ROW_PLANE.x), y: toY(ROW_PLANE.y) };
  function cursorAt(u) {
    if (u < CUT) return null;
    const from = { x: 900, y: 1500 };
    const e = sm(CUT + 0.02, CLICK - 0.04, u);
    const x = lerp(from.x, rowPlane.x + 6, e);
    const y = lerp(from.y, rowPlane.y + 6, e) - Math.sin(e * Math.PI) * 80;
    const a = 1 - sm(FOLD[0], FOLD[1] + 0.06, u); // 点完就收手：结果一收起，鼠标也淡掉
    return a > 0 ? { x, y, a } : null;
  }
  function drawCursor(ctx, u, C) {
    const k = u - CLICK;
    if (k >= 0 && k <= 0.4) {
      ctx.beginPath();
      ctx.arc(rowPlane.x, rowPlane.y, 16 + k * 220, 0, Math.PI * 2);
      ctx.lineWidth = 6;
      ctx.strokeStyle = rgba(C.ACCENT, 1 - k / 0.4);
      ctx.stroke();
    }
    const cur = cursorAt(u);
    if (!cur) return;
    const down = u >= CLICK && u < CLICK + 0.1 ? 0.88 : 1;
    ctx.save();
    ctx.globalAlpha = cur.a;
    ctx.translate(cur.x, cur.y);
    ctx.scale(2 * down, 2 * down);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 24);
    ctx.lineTo(6, 18);
    ctx.lineTo(10.5, 27);
    ctx.lineTo(14, 25.5);
    ctx.lineTo(9.6, 16.8);
    ctx.lineTo(17.4, 16.8);
    ctx.closePath();
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = "#111";
    ctx.stroke();
    ctx.restore();
  }
  function drawFly(ctx, u, C) {
    const k = (u - FLY[0]) / (FLY[1] - FLY[0]);
    if (k < 0 || k > 1) return;
    const tw = textW(ctx, PHRASE, 34, 800);
    const cw = tw + 110;
    const from = { x: rowPlane.x - 26 + cw / 2, y: rowPlane.y };
    const to = { x: toX(TEXT.x) + cw * 0.35, y: toY(TEXT.y) };
    const e = easeIO(k);
    const x = lerp(from.x, to.x, e);
    const y = lerp(from.y, to.y, e) - Math.sin(e * Math.PI) * 160;
    ctx.save();
    ctx.globalAlpha *= clamp(k * 6, 0, 1) * (1 - sm(0.8, 1, k));
    scaleAt(ctx, x, y, lerp(1, 0.75, e));
    rr(ctx, x - cw / 2, y - 46, cw, 92, 14);
    ctx.fillStyle = C.P.hover;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.ACCENT;
    ctx.stroke();
    plane(ctx, x - cw / 2 + 44, y, 30, C.P.hot);
    text(ctx, PHRASE, x - cw / 2 + 80, y + 1, { size: 34, weight: 800, color: C.P.title, align: "left" });
    ctx.restore();
  }

  // ---------- 片尾卡：小精灵 + 「话术精灵」（同正片片尾的摆法，小精灵放大到约 260 宽） ----------
  const LOGO = { w: 260, cy: 700 };
  const MARK = { y: 1030, size: 160, step: 170 };
  function drawCard(ctx, u, logo, C) {
    if (u < CARD) return;
    const b = sm(CARD_IN[0], CARD_IN[1], u, easeBack); // 窗口先退（0.1 秒），小精灵再弹出来
    glow(ctx, BW / 2, LOGO.cy + 120, 560, rgba(C.ACCENT, 0.7), 0.45 * clamp(b, 0, 1));
    if (logo && logo.complete && logo.naturalWidth) {
      const w = LOGO.w * b;
      const h = (w * logo.naturalHeight) / logo.naturalWidth || w * 1.125;
      ctx.save();
      ctx.globalAlpha = clamp(b, 0, 1);
      ctx.drawImage(logo, BW / 2 - w / 2, LOGO.cy - h / 2, w, h);
      ctx.restore();
    }
    Array.from(WORDMARK).forEach((c, i) => {
      const d = sm(CARD_IN[0] + 0.02 + i * 0.015, CARD_IN[1], u, easeBack);
      text(ctx, c, BW / 2 + (i - 1.5) * MARK.step, MARK.y - (1 - d) * 60, { size: MARK.size, weight: 900, color: C.FG, alpha: clamp(d, 0, 1) });
    });
  }

  function draw(ctx, u, opts = {}) {
    const width = opts.width || BW;
    const height = opts.height || BH;
    u = clamp(Number.isFinite(u) ? u : 0, 0, DURATION);
    const C = globalThis.FilmPalette;
    ctx.save();
    ctx.fillStyle = C ? C.STAGE : "#000";
    ctx.fillRect(0, 0, width, height);
    if (!C) return ctx.restore(); // 页面没引 film-palette.js：只铺底色，不报错
    // 竖屏 9:16 正好铺满；别的比例把这块竖屏等比放进去、居中，舞台底色和网点铺满四周
    const s = Math.min(width / BW, height / BH);
    const tx = (width - BW * s) / 2;
    const ty = (height - BH * s) / 2;
    ctx.translate(tx, ty);
    ctx.scale(s, s);
    stage(ctx, u, C, { x: -tx / s, y: -ty / s, w: width / s, h: height / s });
    ctx.beginPath();
    ctx.rect(0, 0, BW, BH);
    ctx.clip();
    const after = u >= CUT;
    const out = sm(CARD, CARD + 0.1, u);
    if (globalThis.PlatformChat && out < 1) {
      ctx.save();
      // 第一帧就在：不淡入，只往下落定 3 像素
      const settle = after ? 0 : 3 * (1 - sm(0, 0.12, u, easeOut));
      ctx.globalAlpha = 1 - out;
      scaleAt(ctx, BW / 2, BH / 2, 1 - 0.06 * out);
      ctx.translate(BX, BY - settle);
      ctx.scale(Z, Z);
      drawWindow(ctx, u, after, C);
      ctx.restore();
      if (after) {
        ctx.save();
        ctx.globalAlpha = 1 - out;
        drawFly(ctx, u, C);
        drawCursor(ctx, u, C);
        ctx.restore();
      }
    }
    drawCard(ctx, u, opts.logo, C);
    if (after && u < CUT + FLASH) {
      ctx.fillStyle = `rgba(255,255,255,${0.9 * (1 - (u - CUT) / FLASH)})`;
      ctx.fillRect(0, 0, BW, BH);
    }
    vignette(ctx);
    ctx.restore();
  }

  globalThis.SoftTalkBrandIntro = Object.freeze({ DURATION, draw });
})();
