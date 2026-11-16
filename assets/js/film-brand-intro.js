// 片头（issue #23）：2.8 秒、不配旁白、不配声音，用真界面演一遍「以前 → 现在」，任何一条竖屏短片都能接在前面。
//   0.00–1.40  以前：千牛样子的商家聊天窗，顾客问一句 → 客服手打一句反问 → 干等（钟飞转）→ 再问一句……时间戳一路往后跳，
//              气泡越来越快地往上堆（打码灰条 + 问号，看得出是一来一回，不用读字）
//   1.40–1.50  硬切：一下白闪
//   1.50–2.40  现在：同一位顾客、同一句问话，窗口底边吸着话术精灵吸附栏、结果向上展开 4 条话术；
//              鼠标点第 1 条左边的纸飞机（点一下 = 贴入 + 回车）→ 结果收起、话术卡飞进输入框 → 发送键按下 → 一整段回复发出 →
//              顾客回「太省心了」和一颗心
//   2.40–2.80  片尾卡：小精灵 + 「话术精灵」四个字，别的什么都没有；底色、网点、光晕与正片第一帧同一套，切进正片没有黑场
//
// 用法（不依赖任何一条片子；页面上 defer 引在 film-palette.js、platform-chat.js 之后）：
//   SoftTalkBrandIntro.DURATION                         片头秒数（≤ 3）
//   SoftTalkBrandIntro.draw(ctx, u, { width, height, logo? })
//     画第 u 秒（0 ≤ u ≤ DURATION，超出按两端算）的整帧。按 1080×1920 竖屏设计；别的比例整幅等比缩放、居中，四周补舞台底色。
//     是 u 的纯函数：不读时钟、不用随机数（打字节奏用固定种子的整数哈希），同一个 u 永远画同一帧。
//     logo 可选：已加载好的小精灵图（assets/logo.png）；不给或没加载好就不画图，只画字。
// 颜色只从 FilmPalette（film-palette.js）与 PlatformChat.SKINS（platform-chat.js）取，不另立配色表。
(() => {
  const DURATION = 2.8;
  const BW = 1080; // 设计画幅
  const BH = 1920;
  const SANS = '"MiSans", "HarmonyOS Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", system-ui, sans-serif';
  const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';
  const PLAT = "tm"; // 千牛：和补运费正片第一位顾客同一家，切进正片时窗口样子接得上
  const WORDMARK = "话术精灵";
  const REPLY = "太省心了"; // 全片头只有这两处字（共 8 个汉字）

  // 节拍（秒）
  const CUT = 1.4; // 以前 → 现在
  const FLASH = 0.12;
  const CLICK = 1.6; // 点纸飞机
  const FOLD = [1.64, 1.74]; // 结果收起
  const FLY = [1.64, 1.86]; // 话术卡飞进输入框
  const SEND = 1.94; // 发送键按下、气泡发出
  const THANKS = 2.04; // 顾客回话（留到 2.4 秒，够看清）
  const CARD = 2.4; // 片尾卡

  // 窗口：按「原生像素 × K」画（同正片 PLAT_K 的做法），聊天栏左边是千牛的蓝色导航栏
  const K = 2.2;
  const RAIL = 40;
  const CHAT = { x: RAIL, y: 0, w: 396, h: 600 };
  const WIN_W = RAIL + CHAT.w;
  const OX = (BW - WIN_W * K) / 2;
  const OY = 250;
  const IH = 104; // 输入区高
  const HEAD_H = 41;
  const ROW_H = 36; // 吸附栏结果行
  const ROWS = 4;
  const PANEL_H = ROWS * ROW_H + 12;
  const BAR_H = 24;
  const MSG_TOP = CHAT.y + HEAD_H;
  const INPUT_Y = CHAT.y + CHAT.h - IH;
  const TEXT_X = CHAT.x + 14; // 千牛输入框第一行字的位置（platform-chat.js inputArea：y + 30）
  const TEXT_Y = INPUT_Y + 36;
  const toX = (n) => OX + n * K; // 原生 → 设计画幅
  const toY = (n) => OY + n * K;

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
  // 以前：一来一回，越来越快；时间戳从 10:02 一路跳到 17:40，看得出拖了大半天
  const ASK = [[64, 44, 30]]; // 顾客那句问话（两边同一句）
  const BEFORE = [
    { at: 0, side: "time", t: "10:02" },
    { at: 0.06, side: "in", rows: ASK, q: true },
    { at: 0.52, side: "out", rows: [[78]], q: true, type: [0.16, 0.48] },
    { at: 0.92, side: "time", t: "11:37" },
    { at: 0.94, side: "in", rows: [[52]] },
    { at: 1.03, side: "out", rows: [[66]], q: true, type: [0.97, 1.01] },
    { at: 1.1, side: "time", t: "13:05" },
    { at: 1.12, side: "in", rows: [[40]] },
    { at: 1.19, side: "out", rows: [[72]], q: true, type: [1.14, 1.18] },
    { at: 1.25, side: "time", t: "15:16" },
    { at: 1.26, side: "in", rows: [[46]] },
    { at: 1.31, side: "out", rows: [[58]], q: true, type: [1.28, 1.3] },
    { at: 1.35, side: "time", t: "17:40" },
    { at: 1.36, side: "in", rows: [[36]] },
  ];
  const WAIT = { from: 0.58, to: 0.9, c0: 10 * 60 + 2, c1: 11 * 60 + 37 };
  // 现在：同一句问话，点一下就回齐，顾客马上满意
  const ANSWER = [[150, 100], [170, 72], [128]];
  const AFTER = [
    { at: CUT - 0.15, side: "time", t: "10:02" }, // 切过来时问话已经在了（白闪底下就看得见）
    { at: CUT - 0.15, side: "in", rows: ASK, q: true },
    { at: SEND, side: "out", rows: ANSWER },
    { at: THANKS, side: "in", text: REPLY, heart: true },
  ];
  // 吸附栏结果：4 条话术（标题 + 正文都是打码条，第 1 条就是要发的那条）
  const PHRASES = [
    [44, 210],
    [36, 180],
    [52, 236],
    [40, 160],
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
  function stage(ctx, u, C) {
    ctx.fillStyle = C.STAGE;
    ctx.fillRect(0, 0, BW, BH);
    ctx.fillStyle = "rgba(255,255,255,0.045)";
    const off = (u * 12) % 48;
    for (let y = -48; y < BH + 48; y += 48) for (let x = -48; x < BW + 48; x += 48) ctx.fillRect(x + off, y + off * 0.5, 2, 2);
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

  // ---------- 聊天 ----------
  const AV = 24; // 头像（原生像素）
  const BAR = 10; // 打码条高
  const PITCH = 18; // 打码条行距
  function msgSize(ctx, x) {
    if (x.side === "time") return { w: 0, h: 16 };
    if (x.text) {
      ctx.font = `700 16px ${SANS}`;
      return { w: ctx.measureText(x.text).width + (x.heart ? 26 : 0) + 24, h: 36 };
    }
    const w = Math.max(...x.rows.map((r) => r.reduce((s, b) => s + b + 6, -6))) + (x.q ? 16 : 0) + 22;
    return { w, h: x.rows.length * PITCH + 14 };
  }
  function drawMsg(ctx, x, y, e, u, sk, C) {
    const P = C.P;
    if (x.side === "time") {
      text(ctx, x.t, CHAT.x + CHAT.w / 2, y + 8, { size: 9.5, color: P.muted, font: MONO, alpha: e });
      return;
    }
    const own = x.side === "out";
    const left = CHAT.x + 10;
    const right = CHAT.x + CHAT.w - 10;
    const { w, h } = msgSize(ctx, x);
    ctx.save();
    ctx.globalAlpha *= clamp(e * 1.6, 0, 1);
    scaleAt(ctx, own ? right : left, y + 10, 0.85 + 0.15 * easeBack(e));
    globalThis.PlatformChat.face(ctx, own ? right - AV : left, y, AV, { shape: sk.avatar, bg: own ? sk.accent : P.chipLine });
    const bx = own ? right - AV - 7 - w : left + AV + 7;
    fillRR(ctx, bx, y, w, h, 5, own ? sk.own : sk.in);
    if (x.text) {
      text(ctx, x.text, bx + 12, y + h / 2, { size: 16, weight: 700, color: sk.ownFg, align: "left" });
      if (x.heart) {
        // 心先弹出来，再跳两下（顾客是真高兴，不是客套）
        const pop = sm(x.at + 0.04, x.at + 0.2, u, easeBack);
        const beat = 1 + 0.22 * Math.max(0, Math.sin(clamp((u - x.at - 0.2) / 0.3, 0, 1) * Math.PI * 2));
        heart(ctx, bx + w - 22, y + h / 2 + 1, 20 * pop * beat, P.title);
      }
    } else {
      const ink = own ? rgba(P.answer, 0.5) : P.answer;
      x.rows.forEach((row, ri) => {
        let xx = bx + 11;
        row.forEach((bw) => {
          fillRR(ctx, xx, y + 7 + ri * PITCH, bw, BAR, 3, ink);
          xx += bw + 6;
        });
        if (x.q && ri === x.rows.length - 1) text(ctx, "?", xx + 3, y + 7 + ri * PITCH + BAR / 2 + 0.5, { size: 15, weight: 900, color: own ? sk.accent : P.hot, align: "left" });
      });
    }
    ctx.restore();
  }
  // 消息区：新消息从底下推上来，堆满了就往上滚
  function drawMsgs(ctx, list, u, sk, C) {
    const shown = list.filter((x) => x.at <= u);
    const viewH = INPUT_Y - MSG_TOP;
    let total = 8;
    const hs = shown.map((x) => {
      const h = msgSize(ctx, x).h + 9;
      total += h * easeOut(clamp((u - x.at) / 0.15, 0, 1));
      return h;
    });
    const offset = Math.max(0, total - viewH + 6);
    ctx.save();
    ctx.beginPath();
    ctx.rect(CHAT.x, MSG_TOP, CHAT.w, viewH);
    ctx.clip();
    let y = MSG_TOP + 8 - offset;
    shown.forEach((x, i) => {
      const e = clamp((u - x.at) / 0.15, 0, 1);
      if (y + hs[i] > MSG_TOP - 20) drawMsg(ctx, x, y, e, u, sk, C);
      y += hs[i] * easeOut(e);
    });
    ctx.restore();
  }
  // 干等：消息区压暗，钟飞快地转（同正片 drawWait，只是不写字）
  function drawWait(ctx, u, C) {
    if (u < WAIT.from || u > WAIT.to + 0.08) return;
    const a = win(u, WAIT.from, WAIT.to + 0.08, 0.06);
    const mins = lerp(WAIT.c0, WAIT.c1, sm(WAIT.from + 0.04, WAIT.to - 0.04, u));
    const viewH = INPUT_Y - MSG_TOP;
    const cx = CHAT.x + CHAT.w / 2;
    const cy = MSG_TOP + viewH / 2 - 10;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = rgba(C.P.ink, 0.72);
    ctx.fillRect(CHAT.x, MSG_TOP, CHAT.w, viewH);
    ctx.beginPath();
    ctx.arc(cx, cy, 42, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.ACCENT;
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      ctx.fillStyle = C.P.answer;
      ctx.fillRect(cx + Math.cos(ang) * 34 - 1.5, cy + Math.sin(ang) * 34 - 1.5, 3, 3);
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
    hand(((mins / 60) % 12) * (Math.PI / 6), 20, 4);
    hand((mins % 60) * (Math.PI / 30), 30, 2.5);
    const hh = Math.floor(mins / 60);
    const mm = Math.floor(mins % 60);
    text(ctx, `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`, cx, cy + 66, { size: 24, weight: 700, color: C.ACCENT_HOT, font: MONO });
    ctx.restore();
  }
  // 输入框里的字（打码条）：以前是一个键一个键手打，现在是话术一下整段贴进来
  function inputBars(u, after) {
    if (after) return u >= FLY[1] && u < SEND ? ANSWER : null;
    const m = BEFORE.find((x) => x.type && u >= x.type[0] && u < x.at);
    if (!m) return null;
    const full = m.rows[0][0];
    const keys = 7;
    const k = Math.floor(clamp((u - m.type[0]) / (m.type[1] - m.type[0]), 0, 1) * keys);
    let w = 0;
    for (let i = 0; i < k; i++) w += (full / keys) * (0.6 + 0.8 * noise(i + Math.round(m.at * 100)));
    return [[Math.min(full, Math.max(6, w))]];
  }
  function drawInput(ctx, u, after, C) {
    const rows = inputBars(u, after);
    if (after && u >= FLY[1] && u < FLY[1] + 0.5) {
      ctx.fillStyle = rgba(C.ACCENT, 0.16 * (1 - (u - FLY[1]) / 0.5));
      ctx.fillRect(CHAT.x, INPUT_Y, CHAT.w, IH);
    }
    if (!rows) return;
    let w = 0;
    rows.forEach((row, ri) => {
      let xx = TEXT_X;
      row.forEach((bw) => {
        fillRR(ctx, xx, TEXT_Y + ri * 16 - 4.5, bw, 9, 3, C.P.answer);
        xx += bw + 6;
      });
      w = xx - 6;
    });
    if (Math.floor(u * 6) % 2 === 0) {
      ctx.fillStyle = C.P.ink;
      ctx.fillRect(w + 2, TEXT_Y + (rows.length - 1) * 16 - 7, 1.2, 14);
    }
  }
  function sendPress(u, after) {
    if (after) return win(u, SEND - 0.04, SEND + 0.08, 0.03);
    const m = BEFORE.filter((x) => x.type).find((x) => u >= x.at - 0.04 && u < x.at + 0.08);
    return m ? win(u, m.at - 0.04, m.at + 0.08, 0.03) : 0;
  }

  // ---------- 话术精灵吸附栏（客户端 attached_search_bar：贴在窗口底边，结果向上展开盖住聊天窗下半截） ----------
  function drawDock(ctx, u, C) {
    const P = C.P;
    const by = CHAT.y + CHAT.h;
    const open = 1 - sm(FOLD[0], FOLD[1], u);
    const ph = PANEL_H * open;
    if (ph > 0.5) {
      const py = by - ph;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = -2;
      fillRR(ctx, 0, py, WIN_W, ph, 0, P.paper);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, py, WIN_W, ph);
      ctx.clip();
      ctx.fillStyle = P.focus;
      ctx.fillRect(0, py, WIN_W, 1.4);
      PHRASES.forEach(([tw, bw], i) => {
        const ry = py + 6 + i * ROW_H;
        const hover = i === 0 ? sm(CLICK - 0.12, CLICK - 0.04, u) : 0;
        const hit = i === 0 ? win(u, CLICK, CLICK + 0.3, 0.05) : 0;
        if (hover > 0) fillRR(ctx, 4, ry + 1, WIN_W - 8, ROW_H - 2, 4, hit > 0 ? P.peach : P.hover);
        if (i) {
          ctx.fillStyle = P.chipLine;
          ctx.fillRect(10, ry, WIN_W - 20, 0.8);
        }
        text(ctx, String(i + 1), 14, ry + ROW_H / 2, { size: 11, weight: 700, color: P.digit, font: MONO });
        fillRR(ctx, 26, ry + 8, 20, 20, 4, i === 0 && hover > 0 ? P.badge : P.chip);
        plane(ctx, 36, ry + ROW_H / 2, 13, P.hot);
        fillRR(ctx, 54, ry + 9, tw, 8, 3, rgba(P.title, 0.75));
        fillRR(ctx, 54, ry + 21, bw, 7, 3, rgba(P.box, 0.45));
      });
      ctx.restore();
    }
    // 搜索栏本身：白底、橙色细边，左边放大镜和搜过的关键词，右边收起键
    fillRR(ctx, 0, by, WIN_W, BAR_H, 0, P.paper);
    ctx.strokeStyle = P.focus;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(0.6, by + 0.6, WIN_W - 1.2, BAR_H - 1.2);
    globalThis.PlatformChat.icon(ctx, "search", 14, by + BAR_H / 2, 9, P.muted);
    fillRR(ctx, 26, by + BAR_H / 2 - 4, 38 * open, 8, 3, rgba(P.answer, 0.55));
    fillRR(ctx, WIN_W - 24, by + BAR_H / 2 - 8, 16, 16, 8, P.paper);
    ctx.strokeStyle = P.chipLine;
    ctx.stroke();
    text(ctx, "›", WIN_W - 16, by + BAR_H / 2, { size: 11, color: P.base });
  }

  // ---------- 一个聊天窗（原生像素） ----------
  function drawWindow(ctx, u, after, C) {
    const PC = globalThis.PlatformChat;
    const sk = PC.SKINS[PLAT];
    const list = after ? AFTER : BEFORE;
    const rows = inputBars(u, after);
    PC.draw(ctx, PLAT, CHAT, {
      list: false, agent: false, customer: "", headH: HEAD_H, inputH: IH, typing: !!rows, press: sendPress(u, after),
      shops: [{}], active: 0, frame: "#3f3f3f",
    });
    drawMsgs(ctx, list, u, sk, C);
    if (!after) drawWait(ctx, u, C);
    drawInput(ctx, u, after, C);
    if (after) drawDock(ctx, u, C);
  }

  // ---------- 镜头外：鼠标、点击涟漪、话术卡（设计画幅坐标，同正片 drawCursor / drawFlies） ----------
  const rowPlane = { x: toX(36), y: toY(CHAT.y + CHAT.h - PANEL_H + 6 + ROW_H / 2) };
  function cursorAt(u) {
    if (u < CUT) return null;
    const from = { x: 930, y: 1820 };
    const e = sm(CUT + 0.02, CLICK - 0.04, u);
    const x = lerp(from.x, rowPlane.x + 4, e);
    const y = lerp(from.y, rowPlane.y + 4, e) - Math.sin(e * Math.PI) * 60;
    const a = 1 - sm(FOLD[0], FOLD[1] + 0.06, u); // 点完就收手：结果一收起，鼠标也淡掉
    return a > 0 ? { x, y, a } : null;
  }
  function drawCursor(ctx, u, C) {
    const k = u - CLICK;
    if (k >= 0 && k <= 0.45) {
      ctx.beginPath();
      ctx.arc(rowPlane.x, rowPlane.y, 10 + k * 90, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = rgba(C.ACCENT, 1 - k / 0.45);
      ctx.stroke();
    }
    const cur = cursorAt(u);
    if (!cur) return;
    const down = u >= CLICK && u < CLICK + 0.1 ? 0.9 : 1;
    ctx.save();
    ctx.globalAlpha = cur.a;
    ctx.translate(cur.x, cur.y);
    ctx.scale(1.5 * down, 1.5 * down);
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
    const to = { x: toX(TEXT_X + 70), y: toY(TEXT_Y + 8) };
    const e = easeIO(k);
    const x = lerp(rowPlane.x + 130, to.x, e);
    const y = lerp(rowPlane.y, to.y, e) - Math.sin(e * Math.PI) * 90;
    ctx.save();
    ctx.globalAlpha *= clamp(k * 6, 0, 1) * (1 - sm(0.8, 1, k));
    scaleAt(ctx, x, y, lerp(1, 0.75, e));
    rr(ctx, x - 150, y - 34, 300, 68, 10);
    ctx.fillStyle = C.P.hover;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.ACCENT;
    ctx.stroke();
    plane(ctx, x - 122, y, 22, C.P.hot);
    fillRR(ctx, x - 98, y - 9, 96, 18, 6, rgba(C.P.title, 0.75));
    fillRR(ctx, x + 8, y - 7, 120, 14, 5, rgba(C.P.box, 0.45));
    ctx.restore();
  }
  // ---------- 片尾卡：小精灵 + 「话术精灵」（同正片片尾的摆法） ----------
  function drawCard(ctx, u, logo, C) {
    if (u < CARD) return;
    const b = sm(CARD + 0.08, CARD + 0.26, u, easeBack); // 窗口先退干净（0.1 秒），小精灵再弹出来
    const cy = 700;
    glow(ctx, BW / 2, cy, 420, rgba(C.ACCENT, 0.7), 0.4 * clamp(b, 0, 1));
    if (logo && logo.complete && logo.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = clamp(b, 0, 1);
      ctx.drawImage(logo, BW / 2 - 120 * b, cy - 135 * b, 240 * b, 270 * b);
      ctx.restore();
    }
    Array.from(WORDMARK).forEach((c, i) => {
      const d = sm(CARD + 0.12 + i * 0.035, CARD + 0.28 + i * 0.035, u, easeBack);
      text(ctx, c, BW / 2 + (i - 1.5) * 170, 990 - (1 - d) * 60, { size: 160, weight: 900, color: C.FG, alpha: clamp(d, 0, 1) });
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
    const s = Math.min(width / BW, height / BH);
    ctx.translate((width - BW * s) / 2, (height - BH * s) / 2);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.rect(0, 0, BW, BH);
    ctx.clip();
    stage(ctx, u, C);
    const after = u >= CUT;
    const out = sm(CARD, CARD + 0.1, u);
    if (globalThis.PlatformChat && out < 1) {
      ctx.save();
      ctx.globalAlpha = (after ? 1 : sm(0, 0.12, u)) * (1 - out);
      scaleAt(ctx, BW / 2, BH / 2, (after ? 1 : 0.97 + 0.03 * sm(0, 0.12, u, easeOut)) * (1 - 0.06 * out));
      ctx.translate(OX, OY);
      ctx.scale(K, K);
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
