// diff.html 的短片「话术软件，有什么不同？」（GitHub issue #7）：整片用 Canvas 2D 现画、声音用 Web Audio 现合成，没有视频文件、没有音频文件。
// 讲老板原话里的两点不同：
//   ① 普通话术软件所有话术挤在一套里，话术上千条以后一级分类翻不完；话术精灵是团队 / 个人 / 离线三类 × 0–9 十套 = 30 套，
//      分开存、各有各的分类（售前一套、售后一套、图片一套、文件一套），按数字切套，一下就找到。
//   ② 普通话术软件只能人用；话术精灵能连本机 AI 助手（客户端设置里的「连接 AI」，AI 通过本机的 softtalk-cli 读写话术）：
//      AI 能优化、新增、整理话术，还能从话术精灵里调话术来回答；删除和导入仍须人在客户端批准。人和 AI 共用一套话术。
// 核心价值「节约时间，快速高效率」，片尾是作者账号。
// 竖屏 1080×1920（给手机上刷短视频的人看）：远景看「多」、特写看「字」，镜头按关键帧推拉，字在手机上也读得清。
// 第 0 帧就是问题本身（刷到的人 1 秒内知道这条讲什么），封面也停在这道题上。
// 画面与声音都是剧本时间 u（0–42 秒）的函数：拖到哪一秒都能还原同一帧，声音按同一条时间线排程。
// 画笔、镜头、合成器与 why-film.js 同一套（每部片子自带一份，互不牵连）。
//
// 挂到任何页面：放一个容器 <div class="promo promo--tall" data-diff-film></div>，引 assets/css/promo-film.css
// 与 assets/js/film-engine.js、assets/js/diff-film.js（都 defer，引擎在前）。播放器（封面、控制条、时钟、声音排程、全屏）在 film-engine.js。
(() => {
  const BASE = 42;
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


  // ---------- 文案 ----------
  const WECHAT = "luyao2089";
  // 普通话术软件：所有话术挤在一套里，一级分类一排排往下堆
  const OLD_CHIPS = [
    "欢迎", "售前", "价格", "优惠", "活动", "尺码", "材质", "颜色",
    "库存", "预售", "发货", "物流", "快递", "催单", "改地址", "签收",
    "售后", "退货", "换货", "退款", "运费", "质量", "破损", "少件",
    "发票", "好评", "差评", "返现", "图片", "实拍", "尺码表", "细节图",
    "视频", "文件", "说明书", "合同", "保修", "安装", "会员", "积分",
    "赠品", "包装", "批发", "定制", "老客", "节日", "大促", "夜班",
  ];
  const TARGET_CHIP = OLD_CHIPS.indexOf("运费");
  // 找「运费」时高亮一格格乱跳（固定顺序，拖到哪一秒都是同一格）
  const HUNT = [3, 12, 27, 9, 40, 18, 33, 6, 45, 22, 15, 37, 29, 42, TARGET_CHIP];
  const FOUND_ROW = { title: "退货运费", text: "亲，质量问题退货，运费我们来承担哦～" };

  // 话术精灵：三类话术 × 0–9 十套。套名是客户端里可以改的备注名，团队话术的前四套就是老板举的例子
  const SCOPES = ["团队话术", "个人话术", "离线话术"];
  const SET_NAMES = [
    ["售前", "售后", "图片", "文件", "活动", "物流", "新品", "大促", "老客", "备用"],
    ["我的常用", "第1套", "第2套", "第3套", "第4套", "第5套", "第6套", "第7套", "第8套", "第9套"],
    ["默认话术", "第1套", "第2套", "第3套", "第4套", "第5套", "第6套", "第7套", "第8套", "第9套"],
  ];
  // 推近时看到的：每套只有自己的几个一级分类
  const SET_CHIPS = [
    ["欢迎", "价格", "尺码", "优惠"],
    ["退货", "换货", "运费", "质量"],
    ["实拍", "尺码表", "细节图"],
    ["说明书", "发票", "合同"],
  ];
  // 普通软件里的分类原本属于哪一套（飞进 30 格时往哪格飞）
  const chipHome = (i) => {
    const name = OLD_CHIPS[i];
    const k = SET_CHIPS.findIndex((list) => list.includes(name));
    if (k >= 0) return k;
    if (["售前", "活动", "颜色", "材质", "库存", "预售"].includes(name)) return 0;
    if (["售后", "退款", "破损", "少件", "保修"].includes(name)) return 1;
    if (["图片", "视频"].includes(name)) return 2;
    if (["文件", "安装"].includes(name)) return 3;
    return 4 + (i % 6);
  };
  // 话术精灵里「售后」那一套的话术
  const AFTER_ROWS = [
    { title: "退货运费", text: "亲，质量问题退货，运费我们来承担哦～" },
    { title: "换货流程", text: "申请换货后寄回，收到就给您发新的～" },
    { title: "破损处理", text: "拍张照片给我，马上给您补发～" },
    { title: "退款时效", text: "仓库签收后 24 小时内退款到账～" },
  ];
  // AI 新增的两条
  const AI_ROWS = [
    { title: "退货地址", text: "退货请寄到仓库，备注订单号就行～" },
    { title: "七天无理由", text: "签收 7 天内不影响二次销售都能退～" },
  ];
  const ASK = "把售后话术优化一下，退货再补 2 条";
  const AI_DONE = ["优化了 3 条话术", "新增 2 条「退货」话术", "归到「售后 › 退货」分类"];
  const BUYER_Q = "退货运费谁出？";

  // ---------- 时间线（剧本秒） ----------
  const T = {
    old: 3.2, // 普通话术软件：分类堆进一套里
    search: 5.5, // 开始找一句
    found: 8.4, // 12 秒后终于找到
    turn: 9.6, // 话术精灵不一样 ①
    sets: 11.4, // 30 套
    zoom: 14.3, // 推近团队话术前四套
    press: 17.0, // 主界面按数字 1 切到售后
    key: 17.7, // 按下那一刻
    turn2: 20.6, // 不一样 ②：不只人能用
    ai: 22.6, // 连上 AI
    tidy: 24.6, // AI 动手：优化、新增、整理
    answer: 28.4, // 顾客问 → AI 从话术精灵调话术
    share: 31.2, // 人和 AI 共用一套话术
    value: 33.6, // 节约时间，快速高效率
    end: 35.6, // 片尾：作者账号
  };
  const BEAT = 0.5; // 120 BPM
  const CUT = 0.12; // 换到不相干的画面（30 格 → 工作台 + 话术精灵 → 只能人用 → AI 并排 → 关系图）用快切，不慢慢淡（issue #16；翻页过渡另见 #18）
  const huntAt = (k) => T.search + 0.2 + k * ((T.found - T.search - 0.4) / (HUNT.length - 1));
  const doneAt = (k) => T.tidy + 0.5 + k * 0.7;

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
  // CAM_SPEED：镜头速度倍率（issue #16）。每一段推拉只用原来 1/CAM_SPEED 的时长，到位时刻不变（先停着、再更快地推过去），
  // 所以字幕、按键、打勾仍对得上镜头；1 = 关键帧里写的速度（本片的推拉本来就排得快）
  const CAM_SPEED = 1;
  function camAt(keys, u) {
    if (u <= keys[0].u) return keys[0];
    for (let i = 1; i < keys.length; i++) {
      const b = keys[i];
      if (u > b.u) continue;
      const a = keys[i - 1];
      const span = (b.u - a.u) / CAM_SPEED;
      const t = clamp((u - (b.u - span)) / (span || 1), 0, 1);
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


  // 鼓点脉冲：每拍开头冲到 1、迅速衰减
  const beatFrom = (u) => (u >= T.old && u < T.turn ? T.old : u >= T.sets && u < T.value ? T.sets : null);
  const pulse = (u) => {
    const from = beatFrom(u);
    return from === null ? 0 : Math.exp(-((u - from) % BEAT) * 9);
  };

  // ---------- 字幕：屏幕上方两行，大字（手机上也读得清），后面压一道黑带不被镜头里的画面吃掉 ----------
  const CAPTIONS = [
    { from: T.old + 0.1, to: T.search - 0.05, l1: "普通话术软件", l2: "所有话术挤在[一套]里" },
    { from: T.search, to: 7.2, l1: "一级分类[越堆越多]", l2: "售前、售后、图片、文件全混着" },
    { from: 7.3, to: T.turn - 0.05, l1: "找一句话术", l2: "[翻了 12 秒]", hot: RED },
    { from: T.sets + 0.15, to: T.zoom - 0.05, l1: "团队、个人、离线三类话术", l2: "每类 0–9 十套，共 [30 套]" },
    { from: T.zoom, to: T.press - 0.05, l1: "[售前]一套，[售后]一套", l2: "[图片]一套，[文件]一套" },
    { from: T.press + 0.05, to: 18.9, l1: "按数字 [1]", l2: "直接切到售后那一套" },
    { from: 19.0, to: T.turn2 - 0.05, l1: "分类少，一眼就找到", l2: "以前 12 秒，现在 [1 秒]" },
    { from: T.ai + 0.1, to: T.tidy - 0.05, l1: "跟 AI 说一句", l2: "它就在[话术精灵]里干活" },
    { from: T.tidy, to: T.answer - 0.05, l1: "AI 帮你[优化]、[新增]、[整理]", l2: "话术库越用越顺手" },
    { from: T.answer + 0.05, to: T.share - 0.05, l1: "顾客问什么", l2: "AI 从话术精灵里[调话术]来答" },
    { from: T.share + 0.05, to: T.value - 0.05, l1: "[人和 AI]", l2: "共用一套话术" },
  ];

  function captions(ctx, u) {
    const band = win(u, T.old - 0.1, T.turn, 0.3) + win(u, T.sets, T.turn2, 0.3) + win(u, T.ai, T.value, 0.3);
    if (band > 0) {
      const g = ctx.createLinearGradient(0, 0, 0, 600);
      g.addColorStop(0, `rgba(0,0,0,${0.92 * band})`);
      g.addColorStop(0.7, `rgba(0,0,0,${0.75 * band})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, 600);
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

  // 「不同 ①」「不同 ②」小章：字幕上方一枚橙色标签
  function badge(ctx, label, y, a) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.font = `800 44px ${SANS}`;
    const w = ctx.measureText(label).width + 60;
    rr(ctx, W / 2 - w / 2, y - 40, w, 80, 40);
    ctx.fillStyle = ACCENT;
    ctx.fill();
    text(ctx, label, W / 2, y + 2, { size: 44, weight: 800, color: "#000" });
    ctx.restore();
  }

  function drawLogo(ctx, opts, x, y, h) {
    const img = opts.logo;
    if (!img || !img.complete || !img.naturalWidth) return;
    const w = (h * img.naturalWidth) / img.naturalHeight;
    ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  }

  // 键帽：主界面右边亮一下「按了哪个键」
  function keycap(ctx, label, x, y, s, down) {
    ctx.save();
    ctx.translate(x, y + down * 6);
    rr(ctx, -s / 2, -s / 2, s, s, s * 0.18);
    ctx.fillStyle = down > 0.5 ? ACCENT : SURFACE;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = ACCENT;
    ctx.stroke();
    text(ctx, label, 0, 3, { size: s * 0.56, weight: 800, color: down > 0.5 ? "#000" : FG, font: MONO });
    ctx.restore();
  }

  // 秒表：圆圈 + 一根转动的指针 + 秒数
  function stopwatch(ctx, x, y, secs, color, a) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    rr(ctx, x - 250, y - 70, 500, 140, 70);
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.stroke();
    const cx = x - 150;
    ctx.beginPath();
    ctx.arc(cx, y + 4, 38, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(cx - 10, y - 50, 20, 10);
    const ang = -Math.PI / 2 + (secs / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, y + 4);
    ctx.lineTo(cx + Math.cos(ang) * 28, y + 4 + Math.sin(ang) * 28);
    ctx.lineCap = "round";
    ctx.stroke();
    segs(ctx, [{ t: String(Math.floor(secs)), color }, { t: " 秒", color: FG }], x + 40, y + 4, { size: 80, weight: 900, align: "center", font: SANS });
    ctx.restore();
  }

  // ---------- 一级分类小块的排版：按字数估宽，从左到右排、满了换行 ----------
  function flow(list, x0, y0, width, size, gap, rowH) {
    const out = [];
    let x = x0;
    let y = y0;
    list.forEach((name) => {
      const w = name.length * size + size * 1.1;
      if (x + w > x0 + width) {
        x = x0;
        y += rowH;
      }
      out.push({ x, y, w, h: rowH - gap });
      x += w + gap;
    });
    return out;
  }
  // 普通话术软件的窗口：从第 0 帧就在画面下半截，片头的分类一块块掉进它的分类区（issue #16：开场就是看得懂的真实界面）。
  // 只借这类软件的结构——顶上一排排一级分类、下面按分类列出话术、常用语、搜索框、底栏——文字和配色都是自己的，不照抄任何一家，也不做 1:1。
  const OLD = { x: 60, y: 850, w: 960, h: 1010 };
  const OLD_UI = { title: "#ffffff", bar: "#f1f3f6", line: "#dde2e8", body: "#fafbfc", tag: "#eef1f5", tagLine: "#d5dbe3", tagInk: "#3b4351", pick: "#5b6cf0", hover: "#8f9bff", ink: "#1f2430", faint: "#e3e7ed", mute: "#9aa3af" };
  const OLD_ROW = 62; // 话术列表一行的高
  const OLD_ALL = flow([...OLD_CHIPS, "+"], OLD.x + 24, OLD.y + 128, OLD.w - 48, 26, 10, 56);
  const OLD_LAYOUT = OLD_ALL.slice(0, OLD_CHIPS.length);
  const OLD_PLUS = OLD_ALL.at(-1);
  const OLD_CHIP_BOTTOM = OLD_PLUS.y + 56;
  const OLD_LIST_Y = OLD_CHIP_BOTTOM + 8; // 话术列表的分组抬头
  const OLD_ROWS = Math.floor((OLD.y + OLD.h - 212 - (OLD_LIST_Y + 50)) / OLD_ROW);
  const FOUND_Y = OLD_LIST_Y + 50 + OLD_ROW / 2; // 找到的那一句话术（列表第一行）的中线
  const hookChipAt = (i) => 0.25 + i * 0.045; // 片头一块块掉下来

  function chip(ctx, name, r, size, { fill = SURFACE, stroke = LINE, color = FG, weight = 600, lw = 1.5 } = {}) {
    rr(ctx, r.x, r.y, r.w, r.h, Math.min(10, r.h / 4));
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
    text(ctx, name, r.x + r.w / 2, r.y + r.h / 2 + 1, { size, weight, color });
  }

  // ① 0–3.2s：片头的问题（上半屏）+ 下半屏普通话术软件的分类一块块往下堆
  function sceneHook(ctx, u) {
    if (u > T.old + 0.5) return;
    const out = sm(T.old - 0.4, T.old + 0.3, u);
    ctx.save();
    ctx.globalAlpha = 1 - out;
    ctx.translate(0, -240 * easeIO(out));
    // 小标签：说给谁听
    ctx.font = `700 46px ${SANS}`;
    const tag = "做客服、用过话术软件的你";
    const tw = ctx.measureText(tag).width + 64;
    rr(ctx, W / 2 - tw / 2, 200, tw, 84, 42);
    ctx.fillStyle = "rgba(255,107,44,0.16)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = ACCENT;
    ctx.stroke();
    text(ctx, tag, W / 2, 244, { size: 46, weight: 700, color: ACCENT });
    text(ctx, "话术上千条", W / 2, 420, { size: 140, weight: 900 });
    const lit = clamp(Math.floor((u - hookChipAt(0)) / 0.045) + 1, 0, OLD_CHIPS.length);
    const bump = lit > 0 && lit < OLD_CHIPS.length ? Math.exp(-((u - hookChipAt(0)) % 0.045) * 40) : 0;
    ctx.save();
    ctx.translate(W / 2, 600);
    ctx.scale(1 + bump * 0.03, 1 + bump * 0.03);
    segs(ctx, [{ t: "找一句", color: FG }, { t: "翻半天", color: ACCENT }, { t: "？", color: FG }], 0, 0, { size: 140, weight: 900, align: "center" });
    ctx.restore();
    // 一级分类计数：问题下面、窗口上面
    text(ctx, `一级分类 ${lit} 个……`, W / 2, 770, { size: 56, weight: 700, color: MUTED, alpha: lit > 0 ? 1 : 0 });
    ctx.restore();
  }

  // ---------- ② 3.2–9.6s：普通话术软件，鼠标在一级分类里点来点去，翻半天 ----------
  // 镜头：片头是全窗口；开始找时推到「分类区 + 列表」，宽度刚好装下一整排分类（看得见有多少），找到时再推近那一行
  const CAM_OLD = [
    { u: T.old, x: W / 2, y: H / 2, z: 1 },
    { u: T.search - 0.3, x: W / 2, y: H / 2 + 40, z: 1.02 },
    { u: T.search + 0.1, x: W / 2, y: OLD.y + 420, z: 1.12 },
    { u: T.found - 0.1, x: W / 2, y: OLD.y + 410, z: 1.12 },
    { u: T.found + 0.3, x: W / 2, y: FOUND_Y + 40, z: 1.12 },
    { u: T.turn, x: W / 2, y: FOUND_Y + 40, z: 1.12 },
  ];
  const huntIndex = (u) => {
    let k = -1;
    for (let i = 0; i < HUNT.length; i++) if (u >= huntAt(i)) k = i;
    return k;
  };
  // 鼠标：先进场在分类之间来回看（只悬停、不点），再一格格点（每一下都对着秒表的嘀嗒），最后点中「运费」
  const WANDER = [
    { u: 3.75, i: 5 },
    { u: 4.15, i: 20 },
    { u: 4.5, i: 34 },
    { u: 4.85, i: 9 },
    { u: 5.2, i: 29 },
  ];
  const MOUSE = [...WANDER, ...HUNT.map((i, k) => ({ u: huntAt(k), i, click: true }))];
  const chipCenter = (i) => ({ x: OLD_LAYOUT[i].x + OLD_LAYOUT[i].w * 0.62, y: OLD_LAYOUT[i].y + OLD_LAYOUT[i].h * 0.62 });
  function mouseAt(u) {
    const enter = { u: 3.4, x: OLD.x + OLD.w - 60, y: OLD.y + OLD.h + 140 };
    if (u < enter.u) return null;
    let a = enter;
    for (const m of MOUSE) {
      const b = { u: m.u, ...chipCenter(m.i) };
      if (u < b.u) {
        const go = Math.min(0.3, (b.u - a.u) * 0.8); // 每一段在到点前 go 秒才动身
        const e = easeIO(clamp((u - (b.u - go)) / go, 0, 1));
        return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), hover: -1 };
      }
      a = { ...b, i: m.i };
    }
    return { x: a.x, y: a.y, hover: a.i };
  }

  function oldPanel(ctx, u) {
    const { x, y, w, h } = OLD;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 8;
    rr(ctx, x, y, w, h, 10);
    ctx.fillStyle = OLD_UI.body;
    ctx.fill();
    ctx.restore();
    ctx.save();
    rr(ctx, x, y, w, h, 10);
    ctx.clip();
    // 标题栏：图标 + 「普通话术软件」，右边一级分类计数和窗口按钮
    ctx.fillStyle = OLD_UI.title;
    ctx.fillRect(x, y, w, 64);
    rr(ctx, x + 22, y + 16, 32, 32, 8);
    ctx.fillStyle = "#64748b";
    ctx.fill();
    rr(ctx, x + 29, y + 24, 18, 13, 3);
    ctx.fillStyle = "#fff";
    ctx.fill();
    text(ctx, "普通话术软件", x + 68, y + 33, { size: 30, weight: 800, align: "left", color: OLD_UI.ink });
    text(ctx, `一级分类 ${OLD_CHIPS.length} 个`, x + w - 120, y + 33, { size: 28, weight: 700, align: "right", color: RED });
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = OLD_UI.mute;
    ctx.beginPath();
    ctx.moveTo(x + w - 92, y + 33);
    ctx.lineTo(x + w - 72, y + 33);
    ctx.moveTo(x + w - 46, y + 23);
    ctx.lineTo(x + w - 26, y + 43);
    ctx.moveTo(x + w - 26, y + 23);
    ctx.lineTo(x + w - 46, y + 43);
    ctx.stroke();
    // 页签行：所有话术都在「全部话术」这一套里
    ctx.fillStyle = OLD_UI.bar;
    ctx.fillRect(x, y + 64, w, 50);
    ctx.fillStyle = OLD_UI.line;
    ctx.fillRect(x, y + 64, w, 1.5);
    ctx.fillRect(x, y + 113, w, 1.5);
    ctx.fillStyle = OLD_UI.title;
    ctx.fillRect(x + 16, y + 70, 150, 44);
    ctx.fillStyle = OLD_UI.pick;
    ctx.fillRect(x + 16, y + 110, 150, 4);
    text(ctx, "全部话术", x + 91, y + 92, { size: 26, weight: 800, color: OLD_UI.ink });
    text(ctx, "▾", x + 190, y + 92, { size: 22, color: OLD_UI.mute });
    [0, 1, 2].forEach((k) => {
      ctx.fillStyle = OLD_UI.mute;
      ctx.fillRect(x + w - 50, y + 81 + k * 8, 26, 3);
    });
    // 一级分类：一块块掉进来；鼠标悬停描边、点中填色、找到变橙
    const k = huntIndex(u);
    const cur = k >= 0 ? HUNT[k] : u >= T.old ? 0 : -1; // 没点之前，默认选着第一个分类
    const found = u >= T.found;
    const mouse = mouseAt(u);
    OLD_CHIPS.forEach((name, i) => {
      const at = hookChipAt(i);
      if (u < at) return;
      const drop = easeBack(clamp((u - at) / 0.22, 0, 1));
      const r0 = OLD_LAYOUT[i];
      const r = { ...r0, y: r0.y - 60 * (1 - drop) };
      const on = i === cur;
      const hover = mouse && mouse.hover === i && !on;
      ctx.save();
      ctx.globalAlpha *= clamp(drop, 0, 1);
      chip(ctx, name, r, 26, {
        fill: on ? (found ? ACCENT : OLD_UI.pick) : OLD_UI.tag,
        stroke: on ? (found ? ACCENT : OLD_UI.pick) : hover ? OLD_UI.hover : OLD_UI.tagLine,
        color: on ? "#fff" : OLD_UI.tagInk,
        weight: on ? 800 : 500,
        lw: hover ? 3 : 1.5,
      });
      ctx.restore();
    });
    if (u >= hookChipAt(OLD_CHIPS.length - 1)) chip(ctx, "+", OLD_PLUS, 30, { fill: OLD_UI.body, stroke: OLD_UI.tagLine, color: OLD_UI.mute, weight: 400 });
    // 话术列表：点哪个分类，就列出那个分类下的话术（没找对时只是一行行别的话术，找到时第一行亮出那一句）
    const ly = OLD_LIST_Y;
    ctx.fillStyle = OLD_UI.line;
    ctx.fillRect(x, ly - 4, w, 1.5);
    ctx.fillStyle = OLD_UI.bar;
    ctx.fillRect(x, ly, w, 44);
    text(ctx, `▾ ${OLD_CHIPS[Math.max(0, cur)]}`, x + 24, ly + 23, { size: 26, weight: 800, color: OLD_UI.ink, align: "left" });
    for (let r = 0; r < OLD_ROWS; r++) {
      const ry = ly + 50 + r * OLD_ROW;
      text(ctx, `${r + 1}.`, x + 30, ry + OLD_ROW / 2, { size: 24, weight: 600, color: OLD_UI.mute, align: "left" });
      if (r === 0 && found) {
        const f = 1 - sm(0, 0.8, u - T.found);
        rr(ctx, x + 14, ry + 4, w - 28, OLD_ROW - 8, 8);
        ctx.fillStyle = `rgba(255,107,44,${0.14 + 0.3 * f})`;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = ACCENT;
        ctx.stroke();
        segs(ctx, [{ t: FOUND_ROW.title + "  ", color: "#c2410c" }, { t: FOUND_ROW.text, color: OLD_UI.ink }], x + 66, ry + OLD_ROW / 2, { size: 30, weight: 700 });
      } else {
        const s = rnd(Math.max(0, cur) * 13 + r * 3 + 1);
        rr(ctx, x + 66, ry + 18, 110 + s * 60, 26, 6);
        ctx.fillStyle = "rgba(91,108,240,0.22)";
        ctx.fill();
        rr(ctx, x + 196 + s * 60, ry + 20, 300 + rnd(Math.max(0, cur) * 7 + r) * 360, 22, 6);
        ctx.fillStyle = OLD_UI.faint;
        ctx.fill();
      }
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      ctx.fillRect(x + 14, ry + OLD_ROW - 1, w - 28, 1);
    }
    // 常用语：两排短句（只画样子，不写字）
    const py = y + h - 204;
    ctx.fillStyle = OLD_UI.line;
    ctx.fillRect(x, py - 10, w, 1.5);
    for (let row = 0; row < 2; row++) {
      let px = x + 20;
      for (let n = 0; px < x + w - 120; n++) {
        const pw = 70 + rnd(row * 31 + n * 7) * 70;
        rr(ctx, px, py + row * 46, pw, 36, 6);
        ctx.fillStyle = OLD_UI.title;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = OLD_UI.tagLine;
        ctx.stroke();
        rr(ctx, px + 14, py + row * 46 + 13, pw - 28, 10, 5);
        ctx.fillStyle = OLD_UI.faint;
        ctx.fill();
        px += pw + 12;
      }
    }
    // 搜索框 + 底栏
    const sy = y + h - 106;
    rr(ctx, x + 20, sy, w - 40, 52, 26);
    ctx.fillStyle = OLD_UI.title;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = OLD_UI.tagLine;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 52, sy + 24, 10, 0, Math.PI * 2);
    ctx.moveTo(x + 59, sy + 31);
    ctx.lineTo(x + 67, sy + 39);
    ctx.lineWidth = 3;
    ctx.strokeStyle = OLD_UI.mute;
    ctx.stroke();
    text(ctx, "输入关键词搜索", x + 82, sy + 27, { size: 24, color: OLD_UI.mute, align: "left" });
    ctx.fillStyle = OLD_UI.bar;
    ctx.fillRect(x, y + h - 46, w, 46);
    for (let n = 0; n < 6; n++) {
      rr(ctx, x + 26 + n * 64, y + h - 34, 24, 24, 6);
      ctx.lineWidth = 2;
      ctx.strokeStyle = OLD_UI.mute;
      ctx.stroke();
    }
    ctx.restore();
    // 鼠标点下去的那一圈
    if (mouse) {
      let press = 0;
      MOUSE.forEach((m) => {
        const r = u - m.u;
        if (!m.click || r < 0 || r >= 0.3) return;
        const c = chipCenter(m.i);
        ctx.beginPath();
        ctx.arc(c.x, c.y, 10 + r * 120, 0, Math.PI * 2);
        ctx.lineWidth = 4 * (1 - r / 0.3);
        ctx.strokeStyle = m.i === TARGET_CHIP ? ACCENT : OLD_UI.pick;
        ctx.stroke();
        if (r < 0.06) press = 1;
      });
      cursor(ctx, mouse.x, mouse.y, press, 2.2);
    }
  }

  // 鼠标箭头
  function cursor(ctx, x, y, press, s = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * (1 - press * 0.12), s * (1 - press * 0.12));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 22);
    ctx.lineTo(5.5, 17);
    ctx.lineTo(9.5, 26);
    ctx.lineTo(13, 24.5);
    ctx.lineTo(9, 15.8);
    ctx.lineTo(16, 15.8);
    ctx.closePath();
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111";
    ctx.stroke();
    ctx.restore();
  }

  function sceneOld(ctx, u) {
    if (u > T.sets + 0.8) return;
    // 话术精灵一出场，普通软件就散开：分类块飞去 30 格
    const burst = sm(T.sets - 0.1, T.sets + 0.8, u);
    const cam = camAt(CAM_OLD, u);
    const shake = u >= T.found && u < T.found + 0.3 ? (1 - sm(T.found, T.found + 0.3, u)) * 14 : 0;
    ctx.save();
    ctx.translate(Math.sin(u * 83) * shake, Math.cos(u * 61) * shake);
    applyCam(ctx, cam);
    const away = u > T.turn ? sm(T.turn, T.turn + 0.5, u) : 0;
    if (u < T.sets) {
      ctx.globalAlpha = 1 - away * 0.85;
      oldPanel(ctx, u);
    } else {
      OLD_CHIPS.forEach((name, i) => {
        const a = OLD_LAYOUT[i];
        const home = chipHome(i);
        const b = cellRect(0, home);
        const t = clamp((burst - rnd(i) * 0.3) / 0.7, 0, 1);
        const e = easeIO(t);
        const r = { x: lerp(a.x, b.x + b.w / 2 - a.w / 2, e), y: lerp(a.y, b.y + b.h / 2 - a.h / 2, e), w: a.w * lerp(1, 0.5, e), h: a.h * lerp(1, 0.5, e) };
        ctx.globalAlpha = 0.5 * (1 - e);
        chip(ctx, name, r, 26 * lerp(1, 0.5, e), { fill: "#22262b", stroke: "#3a3f46", color: "#c9ced4" });
      });
    }
    ctx.restore();
    // 秒表：开始找就转，找到时停在 12 秒
    const secs = clamp(((u - T.search) / (T.found - T.search)) * 12, 0, 12);
    stopwatch(ctx, W / 2, 1780, secs, u >= T.found ? RED : FG, win(u, T.search, T.turn, 0.25));
  }

  // ---------- ③ 9.6–11.4s：话术精灵不一样 ----------
  function sceneTurn(ctx, u, opts) {
    const a = win(u, T.turn, T.sets + 0.2, 0.3);
    if (a <= 0) return;
    const pop = easeBack(clamp((u - T.turn) / 0.35, 0, 1));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(W / 2, 860);
    ctx.scale(lerp(0.6, 1, pop), lerp(0.6, 1, pop));
    drawLogo(ctx, opts, 0, -330, 200);
    text(ctx, "话术精灵", 0, -110, { size: 150, weight: 900 });
    text(ctx, "不一样在哪？", 0, 40, { size: 84, weight: 800, color: MUTED });
    ctx.restore();
    const b = sm(T.turn + 0.6, T.turn + 0.9, u, easeOut);
    if (b > 0) {
      ctx.save();
      ctx.globalAlpha = a * b;
      badge(ctx, "不同 ①", 1130, 1);
      segs(ctx, marked("[30 套话术]，分开存", FG), W / 2, 1290, { size: 96, weight: 900, align: "center" });
      ctx.restore();
    }
    glow(ctx, W / 2, 860, 600, "rgba(255,107,44,0.7)", 0.3 * a * (1 - sm(T.turn + 0.3, T.sets, u)));
  }

  // ---------- ④ 11.4–17s：三类 × 十套 = 30 格 ----------
  const CELL_W = 300;
  const CELL_H = 96;
  const CELL_GX = 30;
  const CELL_GY = 12;
  const GRID_Y = 700;
  const cellRect = (col, row) => ({ x: 60 + col * (CELL_W + CELL_GX), y: GRID_Y + row * (CELL_H + CELL_GY), w: CELL_W, h: CELL_H });
  const cellAt = (col, row) => T.sets + 0.25 + row * 0.07 + col * 0.12;
  // 推近团队话术前四套：格子被拉高，露出各自的一级分类
  const grow = (u) => sm(T.zoom + 0.1, T.zoom + 0.8, u);
  const zoomCellRect = (row, g) => {
    const base = cellRect(0, row);
    const h = lerp(CELL_H, 180, g);
    const y = GRID_Y + row * (h + CELL_GY);
    return { x: base.x, y, w: lerp(CELL_W, 520, g), h };
  };
  const CAM_SETS = [
    { u: T.sets, x: W / 2, y: H / 2 + 120, z: 1 },
    { u: T.zoom, x: W / 2, y: H / 2 + 120, z: 1 },
    { u: T.zoom + 0.8, x: 60 + 260, y: GRID_Y + 270, z: 1.8 },
    { u: T.press - 0.2, x: 60 + 260, y: GRID_Y + 285, z: 1.84 },
  ];

  function sceneSets(ctx, u) {
    const a = sm(T.sets, T.sets + 0.3, u) * (1 - sm(T.press, T.press + CUT, u)); // 切到工作台 + 话术精灵用快切
    if (a <= 0) return;
    const cam = camAt(CAM_SETS, u);
    const g = grow(u);
    ctx.save();
    ctx.globalAlpha = a;
    applyCam(ctx, cam);
    const k = 1 + pulse(u) * 0.012;
    // 三列的抬头
    SCOPES.forEach((name, col) => {
      const r = cellRect(col, 0);
      const fade = col === 0 ? 1 : 1 - g;
      text(ctx, name, r.x + r.w / 2, GRID_Y - 46, { size: 46, weight: 800, color: col === 0 ? ACCENT : FG, alpha: sm(T.sets, T.sets + 0.3, u) * fade });
    });
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 10; row++) {
        const at = cellAt(col, row);
        if (u < at) continue;
        const pop = easeBack(clamp((u - at) / 0.3, 0, 1));
        const focus = col === 0 && row < 4;
        const fade = focus ? 1 : 1 - g * 0.92;
        const r = focus ? zoomCellRect(row, g) : cellRect(col, row);
        ctx.save();
        ctx.globalAlpha = a * fade;
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        ctx.translate(cx, cy);
        ctx.scale(pop * k, pop * k);
        ctx.translate(-cx, -cy);
        rr(ctx, r.x, r.y, r.w, r.h, 12);
        ctx.fillStyle = SURFACE;
        ctx.fill();
        ctx.lineWidth = focus && g > 0 ? 3 : 1.5;
        ctx.strokeStyle = focus ? ACCENT : LINE;
        ctx.stroke();
        // 套号 + 套名
        rr(ctx, r.x + 14, r.y + 16, 62, 62, 10);
        ctx.fillStyle = col === 0 ? "rgba(255,107,44,0.18)" : "#22201d";
        ctx.fill();
        text(ctx, String(row), r.x + 45, r.y + 48, { size: 42, weight: 800, color: col === 0 ? ACCENT : MUTED, font: MONO });
        text(ctx, SET_NAMES[col][row], r.x + 96, r.y + 48, { size: 40, weight: 800, color: col === 0 ? FG : MUTED, align: "left" });
        // 推近后：每套只有自己的几个分类
        if (focus && g > 0.3) {
          ctx.globalAlpha = a * sm(0.3, 1, g);
          text(ctx, `${SET_CHIPS[row].length} 个分类`, r.x + r.w - 20, r.y + 48, { size: 26, weight: 600, color: DIM, align: "right" });
          let cxp = r.x + 16;
          SET_CHIPS[row].forEach((name) => {
            const w = name.length * 26 + 30;
            chip(ctx, name, { x: cxp, y: r.y + 104, w, h: 54 }, 26, { fill: "#22201d", stroke: LINE, color: FG });
            cxp += w + 10;
          });
        }
        ctx.restore();
      }
    }
    ctx.restore();
    // 远景里的大字：30
    const n = win(u, T.sets + 1.2, T.zoom, 0.25);
    if (n > 0) {
      const p = easeBack(clamp((u - T.sets - 1.2) / 0.3, 0, 1));
      ctx.save();
      ctx.globalAlpha = n;
      rr(ctx, W / 2 - 260, 1795 - 70, 520, 140, 70);
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = ACCENT;
      ctx.stroke();
      ctx.translate(W / 2, 1799);
      ctx.scale(p, p);
      segs(ctx, [{ t: "3 × 10 = ", color: MUTED }, { t: "30", color: ACCENT }, { t: " 套", color: FG }], 0, 0, { size: 76, weight: 900, align: "center" });
      ctx.restore();
    }
  }

  // ---------- 话术精灵主界面：客户端白色主题的窄长条（同 why-film.js 的磁吸竖条：标题栏 → 三个话术域页签 → 0–9 套号 → 一级分类 → 二级分类 → 话术行 → 搜索行 → 底栏） ----------
  // 一屏是「商家工作台在左（店铺页签、导航、聊天区，不画会话列表）+ 话术精灵磁吸在右」，按真实比例画（issue #16）
  const BENCH = { x: 24, y: 640, w: 620, h: 1060 }; // 商家工作台（画布坐标）
  const BK = 2; // 工作台按原生像素画，放大 2 倍
  const DOCK = { x: BENCH.x + BENCH.w, y: BENCH.y, w: 412, h: BENCH.h }; // 磁吸在右边的话术精灵
  const DIGIT_Y = DOCK.y + 138; // 套号那一行
  const digitX = (d) => DOCK.x + 70 + d * 33;
  const PCX = () => globalThis.PlatformChat;
  const BENCH_PLAT = "jd";
  const benchOpts = { list: false, notice: false, headH: 44, inputH: 120, tabW: 60, pddAlert: false };
  function benchChat() {
    const d = PCX().dims(BENCH_PLAT, benchOpts);
    return { x: d.left, y: d.top, w: BENCH.w / BK - d.left, h: BENCH.h / BK - d.top };
  }
  function bench(ctx) {
    ctx.save();
    ctx.translate(BENCH.x, BENCH.y);
    ctx.scale(BK, BK);
    PCX().draw(ctx, BENCH_PLAT, benchChat(), { ...benchOpts, shops: [{}, {}, {}, {}, {}], active: 0, customer: "", frame: "#3f3f3f" });
    ctx.restore();
  }
  // 镜头靠左 / 靠右：画面左（右）边缘对齐画布左（右）边缘
  const LEFT = (z) => W / (2 * z);
  const RIGHT = (z) => W - W / (2 * z);

  // 按字宽折行（中文逐字断）
  function wrap(ctx, str, maxW) {
    const lines = [];
    let line = "";
    for (const ch of str) {
      if (line && ctx.measureText(line + ch).width > maxW) {
        lines.push(line);
        line = ch;
      } else line += ch;
    }
    if (line) lines.push(line);
    return lines;
  }

  // 磁吸图标：一块 U 形磁铁（开着磁吸就是品牌橙）
  function magnet(ctx, x, y, s, color) {
    ctx.beginPath();
    ctx.arc(x, y, s, Math.PI, 0, true);
    ctx.lineWidth = s * 0.55;
    ctx.strokeStyle = color;
    ctx.lineCap = "butt";
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - s - s * 0.28, y - s * 0.05, s * 0.56, s * 0.35);
    ctx.fillRect(x + s - s * 0.28, y - s * 0.05, s * 0.56, s * 0.35);
  }

  // s：{ set, setName, chips, chip, sec, rows: [{ title, text, tag, flash, enter, hot }], snap }
  function stripPanel(ctx, x, s) {
    const { y, w, h } = DOCK;
    rr(ctx, x, y, w, h, 8);
    ctx.fillStyle = P.frame;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = P.base;
    ctx.stroke();
    // 标题栏：磁吸开着
    text(ctx, "话术精灵", x + 22, y + 34, { size: 26, weight: 800, color: P.ink, align: "left" });
    const mx = x + w - 112;
    if (s.snap > 0) glow(ctx, mx, y + 36, 70, "rgba(255,107,44,0.9)", s.snap * 0.7);
    magnet(ctx, mx, y + 38, 11, ACCENT);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = P.digit;
    ctx.beginPath();
    ctx.moveTo(x + w - 74, y + 36);
    ctx.lineTo(x + w - 56, y + 36);
    ctx.moveTo(x + w - 36, y + 27);
    ctx.lineTo(x + w - 18, y + 45);
    ctx.moveTo(x + w - 18, y + 27);
    ctx.lineTo(x + w - 36, y + 45);
    ctx.stroke();
    // 页签
    const ty = y + 70;
    ctx.fillStyle = P.base;
    ctx.fillRect(x + 12, ty + 50, w - 24, 1.5);
    SCOPES.forEach((t, k) => {
      const tx = x + 14 + k * 128;
      if (k === 0) {
        ctx.fillStyle = P.paper;
        ctx.fillRect(tx, ty, 122, 51);
        ctx.lineWidth = 2;
        ctx.strokeStyle = P.ink;
        ctx.beginPath();
        ctx.moveTo(tx, ty + 51);
        ctx.lineTo(tx, ty);
        ctx.lineTo(tx + 122, ty);
        ctx.lineTo(tx + 122, ty + 51);
        ctx.stroke();
      }
      text(ctx, t, tx + 61, ty + 27, { size: 24, weight: k === 0 ? 800 : 500, color: k === 0 ? P.ink : P.digit });
    });
    // 套名 + 套号 0–9
    const dy = DIGIT_Y;
    text(ctx, s.setName, x + 16, dy + 20, { size: 21, weight: 700, color: P.ink, align: "left" });
    for (let d = 0; d < 10; d++) {
      const dx = x + 70 + d * 33;
      if (d === s.set) {
        rr(ctx, dx, dy, 30, 40, 5);
        ctx.fillStyle = P.peach;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = P.ink;
        ctx.stroke();
      }
      text(ctx, String(d), dx + 15, dy + 21, { size: 22, weight: d === s.set ? 800 : 500, color: d === s.set ? P.ink : P.digit, font: MONO });
    }
    // 一级分类
    const cy = y + 196;
    let cx = x + 16;
    s.chips.forEach((t, k) => {
      const cw = t.length * 24 + 34;
      rr(ctx, cx, cy, cw, 44, 7);
      ctx.fillStyle = k === s.chip ? P.peach : P.chip;
      ctx.fill();
      if (k === s.chip) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = P.ink;
        ctx.stroke();
      }
      text(ctx, t, cx + cw / 2, cy + 23, { size: 24, weight: k === s.chip ? 800 : 500, color: P.ink });
      cx += cw + 10;
    });
    // 二级分类（展开的是桃色条）
    ctx.fillStyle = P.peach;
    ctx.fillRect(x + 12, y + 254, w - 24, 42);
    text(ctx, `▾ ${s.sec}`, x + 24, y + 276, { size: 24, weight: 700, color: P.ink, align: "left" });
    // 话术行：标题一行，正文按宽折行
    let ry = y + 306;
    s.rows.forEach((row, i) => {
      ctx.font = `500 20px ${SANS}`;
      const lines = wrap(ctx, row.text, w - 36);
      const rh = 46 + lines.length * 28 + 12;
      const enter = row.enter ?? 1;
      if (enter > 0) {
        ctx.save();
        ctx.globalAlpha *= enter;
        ctx.translate((1 - enter) * 80, 0);
        if (row.flash > 0 || row.hot) {
          rr(ctx, x + 8, ry + 2, w - 16, rh - 6, 8);
          ctx.fillStyle = `rgba(255,107,44,${0.1 + 0.3 * (row.flash || 0)})`;
          ctx.fill();
          if (row.hot) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = ACCENT;
            ctx.stroke();
          }
        }
        plane(ctx, x + 18, ry + 10, 28);
        segs(ctx, [{ t: `${i + 1}. `, color: P.digit }, { t: row.title, color: P.title }], x + 56, ry + 25, { size: 22, weight: 700 });
        if (row.tag) {
          ctx.font = `800 18px ${SANS}`;
          const tw = ctx.measureText(row.tag).width + 20;
          rr(ctx, x + w - 20 - tw, ry + 9, tw, 32, 16);
          ctx.fillStyle = "#c2410c";
          ctx.fill();
          text(ctx, row.tag, x + w - 20 - tw / 2, ry + 26, { size: 18, weight: 800, color: "#fff" });
        }
        lines.forEach((l, k) => text(ctx, l, x + 20, ry + 60 + k * 28, { size: 20, weight: 500, color: P.answer, align: "left" }));
        ctx.fillStyle = "rgba(117,104,95,0.25)";
        ctx.fillRect(x + 14, ry + rh - 3, w - 28, 1);
        ctx.restore();
      }
      ry += rh * enter;
    });
    if (ry + 60 < y + h - 160) {
      ctx.beginPath();
      ctx.arc(x + w / 2, ry + 36, 18, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = P.digit;
      ctx.stroke();
      text(ctx, "+", x + w / 2, ry + 36, { size: 28, weight: 500, color: P.digit });
    }
    // 搜索行 + 底栏
    const sy = y + h - 150;
    rr(ctx, x + 12, sy, w - 24, 56, 8);
    ctx.fillStyle = P.paper;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = P.base;
    ctx.stroke();
    text(ctx, "Alt+Q 定位搜索栏", x + 30, sy + 29, { size: 21, color: "#9a8b7d", align: "left" });
    text(ctx, "全部", x + w - 52, sy + 29, { size: 21, weight: 700, color: P.ink });
    text(ctx, "luyao2089.cc", x + 20, y + h - 46, { size: 19, color: P.digit, align: "left", font: MONO });
  }

  // ---------- ⑤ 17–20.6s：工作台在左、话术精灵磁吸在右；按 1，切到售后那一套 ----------
  // 先全景看清位置，再高速推到套号和键帽上，按下后拉到话术行
  const CAM_PRESS = [
    { u: T.press, x: W / 2, y: H / 2, z: 0.96 },
    { u: T.press + 0.35, x: W / 2, y: H / 2, z: 1 },
    { u: T.key - 0.05, x: RIGHT(1.8), y: 910, z: 1.8 },
    { u: T.key + 1.0, x: RIGHT(1.8), y: 910, z: 1.8 },
    { u: 19.1, x: RIGHT(1.3), y: 1150, z: 1.3 },
    { u: T.turn2, x: RIGHT(1.3), y: 1150, z: 1.3 },
  ];

  function scenePress(ctx, u) {
    const a = win(u, T.press, T.turn2 + CUT, CUT);
    if (a <= 0) return;
    const cam = camAt(CAM_PRESS, u);
    const pressed = u >= T.key;
    const state = pressed
      ? { set: 1, setName: "售后", chips: SET_CHIPS[1], chip: 2, sec: "退货运费", rows: AFTER_ROWS.slice(0, 3).map((r, i) => ({ ...r, hot: i === 0 && u >= T.key + 0.5, flash: i === 0 ? 1 - sm(T.key + 0.5, T.key + 1.3, u) : 0 })) }
      : { set: 0, setName: "售前", chips: SET_CHIPS[0], chip: 0, sec: "欢迎语", rows: [{ title: "欢迎", text: "亲，在的，有什么可以帮您～" }, { title: "价格", text: "现在下单立减 20 元哦～" }, { title: "尺码", text: "身高体重发我，帮您推荐～" }] };
    ctx.save();
    ctx.globalAlpha = a;
    applyCam(ctx, cam);
    // 工作台弹出来，话术精灵从右边滑进来「啪」地吸上
    const pin = easeBack(clamp((u - T.press) / 0.4, 0, 1));
    ctx.save();
    const bx = BENCH.x + BENCH.w / 2;
    const by = BENCH.y + BENCH.h / 2;
    ctx.translate(bx, by);
    ctx.scale(lerp(0.94, 1, pin), lerp(0.94, 1, pin));
    ctx.translate(-bx, -by);
    bench(ctx);
    ctx.restore();
    const dock = T.press + 0.3;
    const dx = (1 - sm(T.press + 0.05, dock, u, easeOut)) * 460;
    state.snap = u >= dock ? 1 - sm(0, 0.5, u - dock) : 0;
    ctx.save();
    ctx.globalAlpha *= sm(T.press + 0.05, T.press + 0.2, u);
    stripPanel(ctx, DOCK.x + dx, state);
    ctx.restore();
    // 键帽「1」在工作台右上的空白里，紧挨套号那一行
    const down = u >= T.key && u < T.key + 0.25 ? 1 : 0;
    const show = sm(T.press + 0.4, T.press + 0.6, u) * (1 - sm(19.0, 19.3, u));
    if (show > 0) {
      ctx.save();
      ctx.globalAlpha *= show;
      keycap(ctx, "1", DOCK.x - 66, DIGIT_Y + 20, 96, down);
      ctx.restore();
    }
    // 点下去那一瞬间套号上的涟漪
    if (u >= T.key && u < T.key + 0.6) {
      const k = (u - T.key) / 0.6;
      ctx.beginPath();
      ctx.arc(digitX(1) + 15, DIGIT_Y + 20, 22 + k * 70, 0, Math.PI * 2);
      ctx.lineWidth = 6 * (1 - k);
      ctx.strokeStyle = ACCENT;
      ctx.stroke();
    }
    ctx.restore();
    // 以前 12 秒 / 现在 1 秒
    const cmp = win(u, 19.0, T.turn2, 0.25);
    if (cmp > 0) {
      ctx.save();
      ctx.globalAlpha = cmp;
      rr(ctx, 90, 1700, 900, 150, 75);
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = ACCENT;
      ctx.stroke();
      segs(ctx, [{ t: "12 秒", color: RED }, { t: "  →  ", color: MUTED }, { t: "1 秒", color: ACCENT }], W / 2, 1777, { size: 88, weight: 900, align: "center" });
      // 12 秒上划一道
      ctx.font = `900 88px ${SANS}`;
      const full = ctx.measureText("12 秒  →  1 秒").width;
      const w12 = ctx.measureText("12 秒").width;
      const sx = W / 2 - full / 2;
      const strike = sm(19.3, 19.6, u);
      ctx.fillStyle = RED;
      ctx.fillRect(sx - 6, 1772, (w12 + 12) * strike, 7);
      ctx.restore();
    }
  }

  // ---------- ⑥ 20.6–22.6s：不同 ②——以前只能人用 ----------
  // 一个小人：圆头 + 半圆身子
  function person(ctx, x, y, s, color) {
    ctx.beginPath();
    ctx.arc(x, y - s * 0.35, s * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y + s * 0.32, s * 0.38, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
  }

  // AI 助手的头像：圆角方块里两只眼睛 + 天线
  function robot(ctx, x, y, s, color) {
    rr(ctx, x - s * 0.4, y - s * 0.3, s * 0.8, s * 0.62, s * 0.16);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = "#000";
    [-1, 1].forEach((d) => {
      ctx.beginPath();
      ctx.arc(x + d * s * 0.16, y, s * 0.075, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = color;
    ctx.fillRect(x - s * 0.025, y - s * 0.5, s * 0.05, s * 0.2);
    ctx.beginPath();
    ctx.arc(x, y - s * 0.52, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  function sceneTurn2(ctx, u) {
    const a = win(u, T.turn2, T.ai + CUT, CUT);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    badge(ctx, "不同 ②", 300, sm(T.turn2, T.turn2 + 0.3, u, easeOut));
    const l1 = sm(T.turn2 + 0.15, T.turn2 + 0.45, u, easeOut);
    ctx.globalAlpha = a * l1;
    text(ctx, "普通话术软件", W / 2, 470, { size: 76, weight: 700, color: MUTED });
    segs(ctx, marked("只能[人]用", FG, RED), W / 2, 590, { size: 110, weight: 900, align: "center" });
    // 左：一个人孤零零地用；右：AI 进来
    const slide = sm(T.turn2 + 0.9, T.ai, u, easeOut);
    const px = lerp(W / 2, 300, slide);
    person(ctx, px, 1080, 260, FG);
    text(ctx, "你", px, 1330, { size: 60, weight: 800 });
    if (slide > 0) {
      ctx.globalAlpha = a * slide;
      robot(ctx, lerp(W + 200, 780, slide), 1080, 300, ACCENT);
      text(ctx, "AI 助手", lerp(W + 200, 780, slide), 1330, { size: 60, weight: 800, color: ACCENT });
      segs(ctx, marked("话术精灵：还能和 [AI] 一起用", FG), W / 2, 1560, { size: 66, weight: 800, align: "center" });
    }
    ctx.restore();
  }

  // ---------- ⑦ 22.6–31.2s：AI 连上话术精灵——优化、新增、整理，调话术回答 ----------
  // 左右并排（issue #16）：AI 助手的聊天卡在左，话术精灵在右（同一个磁吸位），中间一根横向的连接线；
  // 干活时数据点从左往右流（写进话术精灵），调话术时从右往左流（从话术精灵拿出来）
  const CARD = { x: 24, y: 640, w: 500, h: 1060 };
  const LINK_Y = DOCK.y + 430; // 连接线的高度
  const typedAt = (str, from, per = 0.06) => (u) => str.slice(0, clamp(Math.floor((u - from) / per), 0, str.length));
  const askTyped = typedAt(ASK, T.ai + 0.6);
  const Z_AI = 1.45;
  const ON_CARD = (u) => ({ u, x: LEFT(Z_AI), y: 1000, z: Z_AI });
  const ON_DOCK = (u) => ({ u, x: RIGHT(Z_AI), y: 1180, z: Z_AI });
  const AI_WIDE = (u, z = 1) => ({ u, x: W / 2, y: H / 2, z });
  const CAM_AI = [
    AI_WIDE(T.ai, 0.96),
    AI_WIDE(T.ai + 0.4),
    ON_CARD(T.ai + 0.75), // 你打字、AI 读话术
    ON_CARD(T.tidy + 0.25),
    AI_WIDE(T.tidy + 0.5), // 第一个勾 + 右边三条闪「AI 优化」，数据点往右流
    AI_WIDE(T.tidy + 0.95),
    ON_DOCK(T.tidy + 1.2), // 两条新增滑进来
    ON_DOCK(T.tidy + 1.7),
    ON_CARD(T.tidy + 1.95), // 第三个勾：归到分类
    ON_CARD(T.tidy + 3.0),
    AI_WIDE(T.tidy + 3.3),
    AI_WIDE(T.answer - 0.1),
    ON_CARD(T.answer + 0.2), // 顾客问
    ON_CARD(T.answer + 0.6),
    AI_WIDE(T.answer + 0.85), // 从话术精灵调话术：数据点往左流，右边第一行亮
    AI_WIDE(T.answer + 1.05),
    ON_CARD(T.answer + 1.3), // AI 的回答
    ON_CARD(T.share - 0.3),
    AI_WIDE(T.share),
  ];

  function bubble(ctx, str, x, y, maxW, { mine, size = 34, fill, color }) {
    ctx.font = `600 ${size}px ${SANS}`;
    const lines = wrap(ctx, str, maxW - 40);
    const lh = Math.round(size * 1.3);
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 40;
    const h = lines.length * lh + 26;
    const bx = mine ? x - w : x;
    rr(ctx, bx, y, w, h, 16);
    ctx.fillStyle = fill ?? (mine ? ACCENT : "#26231f");
    ctx.fill();
    lines.forEach((l, k) => text(ctx, l, bx + 20, y + 13 + lh * k + lh / 2 + 1, { size, weight: 600, color: color ?? (mine ? "#000" : FG), align: "left" }));
    return h;
  }

  function chatCard(ctx, u) {
    const { x, y, w, h } = CARD;
    rr(ctx, x, y, w, h, 16);
    ctx.fillStyle = SURFACE;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = LINE;
    ctx.stroke();
    robot(ctx, x + 48, y + 50, 58, ACCENT);
    text(ctx, "本机 AI 助手", x + 92, y + 38, { size: 30, weight: 800, align: "left" });
    text(ctx, "如 Claude Code、Codex · 已连接话术精灵", x + 92, y + 74, { size: 19, weight: 500, color: MUTED, align: "left", maxW: w - 132 });
    ctx.beginPath();
    ctx.arc(x + w - 28, y + 38, 8, 0, Math.PI * 2);
    ctx.fillStyle = ACCENT;
    ctx.fill();
    ctx.fillStyle = LINE;
    ctx.fillRect(x + 1, y + 104, w - 2, 1.5);
    // 底下的输入框（只画样子）
    rr(ctx, x + 16, y + h - 92, w - 32, 72, 14);
    ctx.fillStyle = "#1d1a17";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = LINE;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + w - 56, y + h - 56, 20, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,107,44,0.35)";
    ctx.fill();
    let cy = y + 128;
    const answering = u >= T.answer;
    if (!answering) {
      // 你：一句话交代任务
      const ask = askTyped(u);
      if (ask) cy += bubble(ctx, ask, x + w - 20, cy, w - 70, { mine: true }) + 22;
      if (u >= T.tidy) {
        text(ctx, "AI", x + 24, cy + 30, { size: 24, weight: 800, color: ACCENT, align: "left" });
        AI_DONE.forEach((line, k) => {
          const at = doneAt(k);
          if (u < at) return;
          const p = easeBack(clamp((u - at) / 0.25, 0, 1));
          const ly = cy + k * 78;
          ctx.save();
          ctx.globalAlpha *= clamp(p, 0, 1);
          rr(ctx, x + 64, ly, w - 84, 64, 12);
          ctx.fillStyle = "#26231f";
          ctx.fill();
          check(ctx, x + 96, ly + 32, 18);
          text(ctx, line, x + 126, ly + 33, { size: 28, weight: 700, align: "left", maxW: w - 160 });
          ctx.restore();
        });
      } else if (u >= T.tidy - 0.6) {
        const dots = ".".repeat(1 + (Math.floor(u * 6) % 3));
        text(ctx, `AI 正在读话术${dots}`, x + 24, cy + 30, { size: 26, weight: 600, color: MUTED, align: "left" });
      }
    } else {
      // 顾客问 → AI 从话术精灵调出那一句
      cy += bubble(ctx, `顾客：${BUYER_Q}`, x + 20, cy, w - 70, { mine: false, size: 34 }) + 22;
      const pull = T.answer + 0.9;
      if (u >= T.answer + 0.4 && u < pull + 0.4) {
        const dots = ".".repeat(1 + (Math.floor(u * 6) % 3));
        text(ctx, `AI 在话术精灵里找${dots}`, x + w - 20, cy + 30, { size: 26, weight: 600, color: MUTED, align: "right" });
      }
      if (u >= pull + 0.4) {
        const p = easeBack(clamp((u - pull - 0.4) / 0.3, 0, 1));
        ctx.save();
        ctx.globalAlpha *= clamp(p, 0, 1);
        text(ctx, "调用：团队·售后｜售后 › 退货运费", x + w - 20, cy + 16, { size: 20, weight: 600, color: DIM, align: "right" });
        bubble(ctx, AFTER_ROWS[0].text, x + w - 20, cy + 40, w - 70, { mine: true, size: 32 });
        ctx.restore();
      }
    }
  }

  function aiRows(u) {
    // 三条老话术被 AI 依次润色（闪一下 + 角标），两条新增的从右边滑进来
    const opt = doneAt(0);
    const add = doneAt(1);
    const rows = AFTER_ROWS.slice(0, 3).map((r, i) => {
      const at = opt + i * 0.12;
      return { ...r, tag: u >= at ? "AI 优化" : "", flash: u >= at ? 1 - sm(at, at + 0.7, u) : 0 };
    });
    AI_ROWS.forEach((r, i) => {
      const at = add + i * 0.2;
      rows.push({ ...r, tag: "新增", enter: sm(at, at + 0.35, u, easeOut), flash: u >= at ? 1 - sm(at + 0.2, at + 1, u) : 0 });
    });
    if (u >= T.answer + 0.9) rows[0].hot = true;
    return rows;
  }

  function sceneAI(ctx, u) {
    const a = win(u, T.ai, T.share + CUT, CUT);
    if (a <= 0) return;
    const cam = camAt(CAM_AI, u);
    ctx.save();
    ctx.globalAlpha = a;
    applyCam(ctx, cam);
    const k = 1 + pulse(u) * 0.008;
    ctx.translate(W / 2, H / 2);
    ctx.scale(k, k);
    ctx.translate(-W / 2, -H / 2);
    // AI 卡从左边进，话术精灵从右边进、吸上
    const inA = easeBack(clamp((u - T.ai) / 0.4, 0, 1));
    ctx.save();
    ctx.translate((1 - inA) * -260, 0);
    ctx.globalAlpha *= clamp(inA, 0, 1);
    chatCard(ctx, u);
    ctx.restore();
    const dock = T.ai + 0.35;
    const dx = (1 - sm(T.ai + 0.1, dock, u, easeOut)) * 460;
    ctx.save();
    ctx.globalAlpha *= sm(T.ai + 0.1, T.ai + 0.25, u);
    stripPanel(ctx, DOCK.x + dx, { set: 1, setName: "售后", chips: SET_CHIPS[1], chip: 0, sec: "退货", rows: aiRows(u), snap: u >= dock ? 1 - sm(0, 0.5, u - dock) : 0 });
    ctx.restore();
    // 连接线：AI 助手 ⇄ 话术精灵，横着，有数据在上面跑
    const from = { x: CARD.x + CARD.w, y: LINK_Y };
    const to = { x: DOCK.x, y: LINK_Y };
    const line = sm(T.ai + 0.4, T.ai + 0.8, u);
    ctx.save();
    ctx.setLineDash([12, 10]);
    ctx.lineDashOffset = -u * 60;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.lineWidth = 6;
    ctx.strokeStyle = ACCENT;
    ctx.globalAlpha *= line;
    ctx.stroke();
    ctx.restore();
    const busyWrite = u >= T.tidy && u < doneAt(2) + 0.6;
    const busyRead = u >= T.answer + 0.6 && u < T.answer + 1.5;
    if (busyWrite || busyRead) {
      for (let d = 0; d < 3; d++) {
        const t = (u * 2.4 + d / 3) % 1;
        const xx = busyWrite ? lerp(from.x, to.x, t) : lerp(to.x, from.x, t);
        glow(ctx, xx, LINK_Y, 30, "rgba(255,170,120,1)", 0.95);
      }
    }
    ctx.save();
    ctx.globalAlpha *= line;
    ctx.font = `800 22px ${SANS}`;
    const lw = ctx.measureText("连接 AI").width + 28;
    const lx = (from.x + to.x) / 2;
    rr(ctx, lx - lw / 2, LINK_Y - 62, lw, 40, 20);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = ACCENT;
    ctx.stroke();
    text(ctx, "连接 AI", lx, LINK_Y - 41, { size: 22, weight: 800, color: ACCENT });
    ctx.restore();
    ctx.restore();
  }

  // ---------- ⑧ 31.2–33.6s：人和 AI 共用一套话术 ----------
  function sceneShare(ctx, u, opts) {
    const a = sm(T.share, T.share + CUT, u) * (1 - sm(T.value - 0.1, T.value + 0.2, u)); // 关系图快切进来
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    const hub = { x: W / 2, y: 1380 };
    const left = { x: 250, y: 860 };
    const right = { x: 830, y: 860 };
    const p = sm(T.share, T.share + 0.5, u, easeOut);
    [left, right].forEach((n) => {
      ctx.beginPath();
      ctx.moveTo(n.x, n.y + 260);
      ctx.lineTo(lerp(n.x, hub.x, p), lerp(n.y + 260, hub.y - 140, p));
      ctx.lineWidth = 6;
      ctx.strokeStyle = ACCENT;
      ctx.stroke();
    });
    person(ctx, left.x, left.y, 230, FG);
    text(ctx, "你", left.x, left.y + 210, { size: 56, weight: 800 });
    robot(ctx, right.x, right.y, 260, ACCENT);
    text(ctx, "AI 助手", right.x, right.y + 210, { size: 56, weight: 800, color: ACCENT });
    const hp = easeBack(clamp((u - T.share - 0.3) / 0.35, 0, 1));
    ctx.save();
    ctx.translate(hub.x, hub.y);
    ctx.scale(hp, hp);
    rr(ctx, -300, -130, 600, 260, 28);
    ctx.fillStyle = P.frame;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = ACCENT;
    ctx.stroke();
    drawLogo(ctx, opts, -170, 0, 150);
    text(ctx, "话术精灵", 50, -28, { size: 72, weight: 900, color: P.ink });
    text(ctx, "同一套话术", 50, 54, { size: 44, weight: 700, color: "#c2410c" });
    ctx.restore();
    glow(ctx, hub.x, hub.y, 500, "rgba(255,107,44,0.7)", 0.25 * hp);
    text(ctx, "删除、导入，仍要你在客户端点头批准", W / 2, 1700, { size: 40, weight: 600, color: MUTED, alpha: sm(T.share + 0.8, T.share + 1.1, u) });
    ctx.restore();
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
    // 落定前一句小字把两点不同收一下
    const sub = win(u, T.value + 0.4, T.end, 0.25);
    if (sub > 0) {
      ctx.save();
      ctx.globalAlpha = sub;
      segs(ctx, marked("[30 套]精准定位 · [AI] 一起整理", MUTED), W / 2, 1180, { size: 56, weight: 700, align: "center" });
      ctx.restore();
    }
  }

  // ---------- ⑨ 35.6–42s：片尾——话术精灵 + 作者账号（底部留给播放器的「再看一遍」字条） ----------
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
      text(ctx, "想用、想问，加我", W / 2, 1110, { size: 60, weight: 700 });
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
    sceneOld(ctx, u);
    sceneHook(ctx, u);
    sceneTurn(ctx, u, opts);
    sceneSets(ctx, u);
    scenePress(ctx, u);
    sceneTurn2(ctx, u);
    sceneAI(ctx, u);
    sceneShare(ctx, u, opts);
    captions(ctx, u);
    slogan(ctx, u);
    sceneEnd(ctx, u, opts);
    ctx.restore();
    impact(ctx, u, 0, { strength: 0.5, y: 700, flash: false }); // 第 0 帧不闪白：那一帧就是问题本身
    impact(ctx, u, T.old, { strength: 0.5 });
    impact(ctx, u, T.found, { color: "255,59,48", strength: 0.6, y: 1780, flash: false });
    impact(ctx, u, T.turn, { strength: 0.7, y: 860 });
    impact(ctx, u, T.turn2, { strength: 0.6, y: 300 });
    impact(ctx, u, T.value, { strength: 1, y: 880 });
    vignette(ctx);
    // 最后一帧不淡出：停在账号上
  }

  // ---------- 声音：Web Audio 现合成 ----------
  // 120 BPM 的电子节拍：普通软件那段 Am–F–C–G（越找越急：加十六分镲和琶音），找到时断拍；
  // 话术精灵出场后换成 C–G–Am–F 的亮色进行，加上和画面对齐的音效（分类落下、秒表、格子、按键、敲字、打勾、发送、冲击）。
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
    // ① 片头：一下冲击把人留住，分类块一块一声往上爬
    add(0, "impact", { v: 0.8 });
    add(0, "drone", {}, T.old);
    OLD_CHIPS.forEach((_, i) => {
      if (i % 2 === 0) add(hookChipAt(i), "blip", { n: 60 + (i / 2) * 1, v: 0.55 });
    });
    [0, 1, 2, 2.5, 2.75].forEach((u) => add(u, "kick", { v: 0.8 }));
    for (let u = 0.25; u < T.old; u += 0.25) add(u, "hat", { v: 0.3 + u * 0.08, open: u > 2.6 });
    add(2.0, "riser", { len: 1.2 }, 1.2);
    add(T.old - 0.4, "whoosh", { len: 0.6, hi: 1 }, 0.6);
    // ② 普通话术软件：小调，越找越急
    add(T.old, "impact", { v: 0.9 });
    groove(T.old, T.found, MINOR, { busy: [T.search, T.found] });
    arp(T.search, T.found, T.old, MINOR);
    add(T.search - 0.3, "whoosh", { len: 0.7 }, 0.7);
    HUNT.forEach((_, k) => add(huntAt(k), "tick", { v: 0.7 }));
    for (let s = 1; s <= 12; s++) add(T.search + (s / 12) * (T.found - T.search) - 0.01, "ping", { n: 84 });
    add(T.found, "thud", { v: 0.9 });
    add(T.found, "snap", {});
    add(T.found, "pad", { notes: [57, 60, 64], v: 0.6 }, T.turn - T.found);
    // ③ 话术精灵不一样
    add(T.turn - 0.5, "riser", { len: 0.5 }, 0.5);
    add(T.turn, "impact", { v: 0.8 });
    add(T.turn, "pad", { notes: [48, 55, 60, 64], v: 0.7, long: 1 }, T.sets - T.turn);
    [0, 0.09, 0.18, 0.27].forEach((d, i) => add(T.turn + 0.05 + d, "chime", { n: [72, 76, 79, 84][i], v: 0.55 }));
    add(T.turn + 0.6, "shimmer", {}, 0.8);
    // ④ 30 套 → ⑤ 按 1：亮色进行
    add(T.sets, "impact", { v: 0.7 });
    groove(T.sets, T.turn2, MAJOR, { busy: [T.zoom, T.press] });
    arp(T.zoom, T.turn2, T.sets, MAJOR);
    add(T.sets, "zip", { up: 1 }, 0.4);
    const PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93];
    for (let col = 0; col < 3; col++) for (let row = 0; row < 10; row++) if ((row + col) % 2 === 0) add(cellAt(col, row), "pop", { n: PENTA[row] - 12 + col * 2 });
    add(T.sets + 1.2, "chime", { n: 84, v: 0.6 });
    add(T.zoom, "whoosh", { len: 0.8 }, 0.8);
    add(T.press, "whoosh", { len: 0.5, hi: 1 }, 0.5);
    add(T.key, "key", { v: 1 });
    add(T.key + 0.02, "send", { n: 84 });
    add(T.key + 0.5, "chime", { n: 88 });
    add(19.3, "snap", {});
    // ⑥ 不同 ②
    add(T.turn2, "impact", { v: 0.7 });
    add(T.turn2, "pad", { notes: [45, 52, 57, 60], v: 0.6 }, T.ai - T.turn2);
    add(T.turn2 + 0.9, "whoosh", { len: 0.9, hi: 1 }, 0.9);
    add(T.ai - 0.3, "chime", { n: 79, v: 0.5 });
    // ⑦ AI：一直是亮色的律动，敲字、打勾、新增、发出
    add(T.ai, "impact", { v: 0.6 });
    groove(T.ai, T.value, MAJOR, { busy: [T.tidy, T.share] });
    arp(T.tidy, T.share, T.ai, MAJOR);
    for (let i = 0; i < ASK.length; i += 2) add(T.ai + 0.6 + i * 0.06, "type", { v: 0.55 });
    AI_DONE.forEach((_, k) => {
      add(doneAt(k), "blip", { n: 79 + k * 3, v: 0.6 });
      add(doneAt(k) + 0.05, "chime", { n: 84 + k * 2, v: 0.4 });
    });
    AI_ROWS.forEach((_, i) => add(doneAt(1) + i * 0.2, "zip", { up: 1 }, 0.4));
    add(T.tidy + 1.9, "whoosh", { len: 0.7 }, 0.7);
    add(T.answer, "whoosh", { len: 0.6, hi: 1 }, 0.6);
    add(T.answer + 0.05, "pop", { n: 76 });
    add(T.answer + 1.3, "send", { n: 86 });
    // ⑧ 人和 AI 共用
    add(T.share, "thud", { v: 0.8 });
    add(T.share + 0.3, "chime", { n: 88 });
    add(T.share + 0.35, "shimmer", {}, 0.8);
    // 节约时间，快速高效率 → 片尾
    add(T.value - 0.5, "riser", { len: 0.5 }, 0.5);
    add(T.value, "impact", { v: 1.2 });
    add(T.value, "pad", { notes: [48, 60, 64, 67], v: 0.8 }, T.end - T.value);
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
      still: 2.75, // 封面停在片头的问题上：分类块全掉下来了
      label: `短片「话术软件，有什么不同？」（${BASE} 秒，有声）：话术上千条，找一句翻半天？普通话术软件把所有话术挤在一套里，一级分类越堆越多，售前、售后、图片、文件全混着，找一句话术翻了 12 秒。话术精灵不一样：第一，30 套话术分开存——团队、个人、离线三类话术，每类 0–9 十套，共 30 套；售前一套、售后一套、图片一套、文件一套，每套只有自己的分类，按数字 1 直接切到售后那一套，以前 12 秒，现在 1 秒。第二，普通话术软件只能人用，话术精灵还能和本机 AI 助手一起用：跟 AI 说一句，它就在话术精灵里优化、新增、整理话术；顾客问什么，AI 从话术精灵里调话术来答；删除和导入仍要你在客户端批准。人和 AI 共用一套话术。节约时间，快速高效率。想用、想问，加我 ${WECHAT}。`,
      cover: { text: "播放短片 · 有声", again: "再看一遍" },
      render: (ctx, u) => render(ctx, u, opts),
      score: buildScore(),
      createSynth: () => new Synth(),
      fullscreen: true,
    });
    // 小精灵图加载好了再画一次封面
    opts.logo.addEventListener("load", refresh);
    root.diffFilm = film;
  }

  document.querySelectorAll("[data-diff-film]").forEach(mount);
})();
