// 推广视频「补运费登记案例」（知识分享第一期）：整片用 Canvas 2D 现画、声音用 Web Audio 现合成，没有视频文件、没有音频文件。
// 剧本是 GitHub issue #4 的原文，屏幕上的对白、话术、旁白一字不改照抄（见下面的 L 与 VERSIONS）。
// 画面与声音都是剧本时间 u 的函数：拖到哪一秒都能还原同一帧；时间线在加载时由 build() 按剧本顺序排出来。
//
// 挂到任何页面：放一个容器 <div class="promo" data-freight-film></div>，引 assets/css/promo-film.css（播放器外框与宣传片同一套）
// 与 assets/js/film-engine.js、assets/js/freight-film.js（都 defer，引擎在前）。播放器（封面、控制条、时钟、声音排程、导出、全屏）在 film-engine.js。
(() => {
  const W = 1920;
  const H = 1080;
  const SANS = '"MiSans", "HarmonyOS Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", system-ui, sans-serif';
  const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';
  const ACCENT = "#ff6b2c";
  const ACCENT_HOT = "#ff9a5c";
  const FG = "#f5f5f5";
  const MUTED = "#b8b8b8";
  const DIM = "#8c8c8c";
  const HEART = "💗";
  const PINK = "#ff4d8d";
  // 话术精灵主界面：客户端白色主题（同 demo.css 的 --p-*，取样自客户端实机截图）
  const P = {
    frame: "#fbf6ec", paper: "#fffdf8", tab: "#f4eadb", peach: "#ffe4d1", ink: "#2a1a12", chip: "#f4ebde",
    muted: "#7f7b74", digit: "#8c7b6b", answer: "#4a3a2e", box: "#8d8279", base: "#75685f", tabLine: "#b3a79b",
    chipLine: "#d6cabb", lv2Line: "#645145", hover: "#fdf3e7", badge: "#fff3e7", hot: "#c2410c", focus: "#e07f4a", title: "#e53935",
  };
  // 聊天窗：中性外观，不模仿任何平台（标题只写顾客名、没有平台名与标志、没有绿色）；自己发的气泡是品牌橙 + 白字
  const C = { bg: "#ededed", head: "#f7f7f7", line: "#e3e3e3", in: "#ffffff", inFg: "#1a1a1a", sub: "#8a8a8a", note: "#a54626" };

  // ---------- 剧本原文（issue #4，一字不改） ----------
  const L = {
    kicker: "先说第一个知识分享：",
    title: "补运费登记案例",
    intro: "分享客服工作中遇到的问题，我是如何解决这些问题的",
    h1: "一开始，没有话术的时候",
    c1: "那你们收到货后给我退运费",
    a1: "提供下收款方式",
    a2: "收款人姓名是？",
    wait1: "这时候客户可能也没时间回复",
    a3: "麻烦提供下运费支付的截图",
    wait2: "又过了很长时间后",
    long: "整个时间流程花费非常长。",
    h2: "其实可以直接用一条话术",
    one: "亲，麻烦提供下收款方式和姓名+运费支付后截图，我这边登记给财务安排打款哦~",
    benefit: "这样的好处是一次性说完要些什么，客户一次性提供，节约双方的时间。",
    h3: "后面用了话术精灵",
    bulb3: "客服突然有灵感了",
    after3: "后面用了话术精灵双击一下话术就发送到对话框，客户一次性提供，节约了时间。",
    h4: "然后没有话术精灵的时候",
    ok: "好的",
    bulb: "灵机一动",
    attitude: "（其实客户想要知道我们的态度。）",
    h5: "然后从此发送这个话术后",
    thanks: "好的谢谢",
    montage: "通过话术精灵一次性双击话术，然后就把客户的问题解决了。",
    real: "以上这些都是真实案例，真实经验。",
    value: "节约时间，快速高效率",
    wechat: "luyao2089",
  };
  // 登记之后的六轮：顾客问 → 客服手打 → 灵机一动，新增 / 编辑同一条话术
  // （原文里 Markdown 的行尾两个空格 + 换行就是换行；行中的两个空格照原文保留）
  const V1 = "好的亲，我已经帮您登记好了。";
  const V2 = "好的亲，我已经帮您登记了，请放心不会遗漏的～";
  const V3 = "好的亲，我已经帮您登记了，请放心不会遗漏的～  一般7个工作日左右处理好。";
  const V4 = "好的亲，我已经帮您登记了，请放心不会遗漏的～  后续会有专门的同事统一处理，一般7个工作日左右会返。";
  const V5 = "好的亲，我已经帮您登记了，请放心不会遗漏的～\n后续会有专门的同事统一处理，一般7个工作日左右会返到您余额里哈～";
  const V6 = "好的亲，我已经帮您登记了，请放心不会遗漏的～\n后续会有专门的同事统一处理，一般7个工作日左右会返到您余额里哈～\n辛苦您耐心等候一下，我们会积极跟进的哦！💗";
  const ROUNDS = [
    { ask: "登记好了吗？", reply: "是的", v: V1 },
    { ask: "不会忘记吧？", reply: "不会的亲", v: V2 },
    { ask: "什么时候退？", reply: "7个工作日左右", v: V3 },
    { ask: "我们要这么久？", reply: "亲因为财务是统一打款的", v: V4 },
    { ask: "返到哪里？", reply: "返到您余额里", v: V5 },
    { ask: "能不能快一点？", note: L.attitude, reply: "辛苦您耐心等候一下，我们会积极跟进的哦！", v: V6 },
  ];
  // 最后一版里，每一句对上的是哪一次追问（只做高亮，不加字）
  const ANSWERS = ["我已经帮您登记了", "请放心不会遗漏的～", "一般7个工作日左右", "后续会有专门的同事统一处理", "返到您余额里", "辛苦您耐心等候一下，我们会积极跟进的哦！"];
  // 「有的客户是直接发个OK表情，有的是发个好的，有的是发一个爱心，有的是发个拜拜表情，有是的发个飞吻，有是的发个花」
  const REPLIES = [{ text: L.thanks }, { sticker: "ok" }, { text: "好的" }, { sticker: "heart" }, { sticker: "bye" }, { sticker: "kiss" }, { sticker: "flower" }];
  const NAMES = ["小陈", "阿杰", "Lily", "老王", "小美", "大鹏", "安安", "Coco", "阿强", "糖糖", "小鱼", "老李", "木木", "Kiki", "阿峰", "晴天", "小周", "豆豆", "阿May", "大海"];

  // ---------- 数学 ----------
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeBack = (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
  const sm = (a, b, u, e = easeIO) => e(clamp((u - a) / (b - a), 0, 1));
  const win = (u, a, b, f = 0.3) => sm(a, a + f, u) * (1 - sm(b - f, b, u));
  const rnd = (i) => {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const chars = (s) => Array.from(s);
  // 按时间排好序的数组里找最后一个 at ≤ u 的下标
  function lastAt(list, u) {
    let lo = 0;
    let hi = list.length - 1;
    let ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (list[mid].at <= u) {
        ans = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return ans;
  }
  const clockLabel = (m) => `${Math.floor(m / 60)}:${String(Math.floor(m % 60)).padStart(2, "0")}`;

  // ---------- 剧本 → 时间线 ----------
  // 逐字 diff（最长公共子序列）：话术「编辑一下」时按真实的删改顺序动画，而不是整段替换
  function diff(a, b) {
    const n = a.length;
    const m = b.length;
    const dp = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const ops = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) {
        ops.push(["=", a[i++]]);
        j++;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push(["-", a[i++]]);
      else ops.push(["+", b[j++]]);
    }
    while (i < n) ops.push(["-", a[i++]]);
    while (j < m) ops.push(["+", b[j++]]);
    return ops;
  }

  function build() {
    const msgs = [];
    const sessions = [];
    const inputs = {};
    const appKeys = [];
    const cur = [];
    const clicks = [];
    const caps = [];
    const heads = [];
    const bulbs = [];
    const scenes = [];
    const waits = [];
    const keys = [];
    const steps = [];
    const score = [];
    const m = {}; // 各段的起止时刻
    let t = 0;
    let sess = null;
    let bulbCount = 0;
    const sfx = (u, type, arg = {}, dur = 0) => score.push({ u, type, arg, dur });

    let app = { rows: [], sel: -1, dialog: null, menu: null, flash: null };
    const appSet = (patch) => {
      app = { ...app, ...patch };
      appKeys.push({ at: t, st: app });
    };
    appSet({});
    const dlg = (patch) => appSet({ dialog: { ...app.dialog, ...patch } });
    const inputSet = (text, o = {}) => inputs[sess].push({ at: t, text, focus: o.focus ?? true, flash: o.flash ?? null });

    const session = (id, who) => {
      sess = id;
      sessions.push({ at: t, id, who });
      inputs[id] = [{ at: t, text: "", focus: false, flash: null }];
    };
    const scene = (mode) => scenes.push({ at: t, mode });
    const head = (text, n) => heads.push({ at: t, text, n });
    const cap = (text, from, to, tone) => caps.push({ from, to, text, tone });
    const readT = (s) => 0.8 + chars(s).length * 0.085;
    const say = (side, text, o = {}) => {
      msgs.push({ s: sess, at: t, side, kind: o.kind || "text", text, note: o.note, bars: o.bars, sticker: o.sticker });
      sfx(t, side === "in" ? "msgIn" : "msgOut");
      t += o.hold ?? readT(text || "");
    };
    const stamp = (label) => msgs.push({ s: sess, at: t, side: "time", text: label });
    // 客服在聊天输入框里手打
    const typeChat = (text) => {
      let acc = "";
      chars(text).forEach((c, i) => {
        acc += c;
        inputSet(acc);
        sfx(t, "key", { v: 0.4 + rnd(i) * 0.3 });
        t += 0.1 + rnd(i * 3 + t) * 0.06;
      });
      t += 0.3;
    };
    const send = (text, hold) => {
      keys.push({ at: t, label: "Enter" });
      sfx(t, "enter");
      inputSet("", { focus: false });
      t += 0.12;
      say("out", text, { hold });
    };
    // 鼠标：ref 是界面上的一个位置（每帧现量，所以窗口在动时也停在目标上）
    const move = (ref, dur = 0.55) => {
      t += dur;
      cur.push({ at: t, dur, ref });
      t += 0.08;
    };
    const hideCursor = () => cur.push({ at: t, dur: 0, ref: null });
    const click = (kind = "l") => {
      clicks.push({ at: t, key: cur[cur.length - 1], kind });
      sfx(t, "click");
      if (kind === "dbl") {
        sfx(t + 0.12, "click");
        t += 0.35;
      } else t += 0.22;
    };
    // 「灵机一动」第几次（第二次起标 ×N）
    const bulb = (label) => {
      bulbs.push({ at: t, label, n: label === L.bulb ? ++bulbCount : 1 });
      sfx(t, "ding");
      t += 1.5;
    };
    const waitLong = (label, c0, c1, d) => {
      waits.push({ from: t, to: t + d, label, c0, c1 });
      for (let k = 0, u = t + 0.2; u < t + d - 0.2; k++, u += 0.42 - k * 0.012) sfx(u, k % 2 ? "tock" : "tick");
      sfx(t + d - 0.2, "yawn", {}, 0.6);
      t += d + 0.25;
    };
    // 话术编辑框里打字（一个字一个键）
    const typeField = (field, text) => {
      let acc = app.dialog[field];
      chars(text).forEach((c, i) => {
        acc += c;
        dlg({ [field]: acc, caret: field, ci: chars(acc).length });
        sfx(t, "key", { v: 0.35 + rnd(i + 50) * 0.3 });
        t += 0.065 + rnd(i * 5 + t) * 0.04;
      });
      t += 0.25;
    };
    // 「又在刚才的话术编辑了一下」：点到要改的地方，退格删掉旧字，再打新字
    const editBody = (to) => {
      const now = chars(app.dialog.body);
      const ops = diff(now, chars(to));
      let pos = 0;
      let k = 0;
      while (k < ops.length) {
        if (ops[k][0] === "=") {
          pos++;
          k++;
          continue;
        }
        let del = 0;
        const ins = [];
        while (k < ops.length && ops[k][0] !== "=") {
          if (ops[k][0] === "-") del++;
          else ins.push(ops[k][1]);
          k++;
        }
        const end = pos + del;
        move({ dlgIdx: end }, 0.4);
        click();
        dlg({ caret: "body", ci: end });
        t += 0.12;
        for (let d = 0; d < del; d++) {
          now.splice(end - d - 1, 1);
          dlg({ body: now.join(""), ci: end - d - 1 });
          sfx(t, "key", { v: 0.3 });
          t += 0.06;
        }
        let p = pos;
        ins.forEach((c, i) => {
          now.splice(p, 0, c);
          p++;
          dlg({ body: now.join(""), ci: p });
          sfx(t, "key", { v: 0.35 + rnd(i + 70) * 0.3 });
          t += 0.065 + rnd(i * 7 + t) * 0.04;
        });
        pos = p;
        t += 0.2;
      }
    };
    const saveDialog = (rows, i) => {
      move("dlg:save", 0.45);
      click();
      appSet({ dialog: null, rows, sel: i, flash: { i, at: t } });
      sfx(t, "save");
      t += 0.9;
    };

    // ① 片头
    scene("intro");
    m.intro = [0, 6.6];
    t = 6.6;

    // ② 一开始，没有话术的时候：问一句、等一阵，一共三轮
    scene("solo");
    head(L.h1, "01");
    session("A", "顾客 · 小陈");
    t += 0.9;
    stamp("10:02");
    say("in", L.c1);
    typeChat(L.a1);
    send(L.a1, 1.0);
    say("in", null, { kind: "redact", bars: [[64, 96, 96, 80]], note: "收款方式", hold: 1.4 });
    typeChat(L.a2);
    send(L.a2, 0.7);
    waitLong(L.wait1, 10 * 60 + 4, 11 * 60 + 37, 3.4);
    stamp("11:37");
    say("in", null, { kind: "redact", bars: [[72]], note: "姓名", hold: 1.3 });
    typeChat(L.a3);
    send(L.a3, 0.7);
    waitLong(L.wait2, 11 * 60 + 38, 15 * 60 + 16, 3.4);
    stamp("15:16");
    say("in", null, { kind: "shot", note: "运费截图", hold: 1.4 });
    scene("card");
    m.timeline = [t, t + 6.2];
    cap(L.long, t + 2.6, t + 6.2);
    sfx(t + 2.7, "sad", {}, 1.4);
    t += 6.2;

    // ③ 其实可以直接用一条话术
    head(L.h2, "02");
    m.card = [t, t + 12.4];
    for (let i = 0; i < 3; i++) sfx(t + 0.3 + i * 0.25, "pop", { n: 76 + i * 3 });
    sfx(t + 1.3, "whoosh", {}, 0.7);
    for (let i = 0; i < 3; i++) sfx(t + 5.0 + i * 0.7, "blip", { n: 81 + i * 4 });
    cap(L.benefit, t + 7.0, t + 12.4);
    t += 12.4;

    // ④ 后面用了话术精灵：灵感来了 → 新增话术 → 编辑 → 双击 → 发送
    scene("solo");
    head(L.h3, "03");
    session("B", "顾客 · 阿杰");
    t += 0.9;
    say("in", L.c1, { hold: 1.4 });
    bulb(L.bulb3);
    scene("duo");
    t += 1.1;
    steps.push({ at: t, n: 0 });
    move("plus", 0.7);
    click();
    appSet({ dialog: { mode: "新增话术", title: "", body: "", caret: "title", ci: 0 } });
    sfx(t, "whoosh", {}, 0.35);
    t += 0.5;
    steps.push({ at: t, n: 1 });
    move("dlg:title", 0.4);
    click();
    typeField("title", "补运费登记");
    move("dlg:body", 0.4);
    click();
    dlg({ caret: "body", ci: 0 });
    typeField("body", L.one);
    saveDialog([{ title: "补运费登记", text: L.one }], 0);
    steps.push({ at: t, n: 2 });
    const cap3 = t;
    move("row:0", 0.6);
    click("dbl");
    appSet({ sel: 0 });
    inputSet(L.one, { flash: t });
    sfx(t, "paste");
    t += 1.1;
    steps.push({ at: t, n: 3 });
    send(L.one, 1.8);
    say("in", null, { kind: "redact", bars: [[64, 96, 96, 80], [72]], note: "收款方式和姓名", hold: 0.6 });
    say("in", null, { kind: "shot", note: "运费支付后截图", hold: 1.6 });
    steps.push({ at: t, n: 4 });
    m.compare = [t, t + 5.2];
    sfx(t + 0.5, "blip", { n: 72 });
    sfx(t + 2.2, "chime", { n: 84 });
    t += 5.2;
    cap(L.after3, cap3, t);

    // ⑤ 然后没有话术精灵的时候：顾客一句句追问，客服每回答一次就灵机一动，把答案补进同一条话术
    hideCursor();
    scene("solo");
    head(L.h4, "04");
    session("C", "顾客 · Lily");
    t += 0.9;
    say("in", null, { kind: "shot", note: "运费截图", hold: 1.3 });
    typeChat(L.ok);
    send(L.ok, 0.9);
    ROUNDS.forEach((r, i) => {
      say("in", r.ask, { hold: 1.3 });
      if (r.note) {
        cap(r.note, t - 0.9, t + 3.4, "note");
        t += 1.6;
      }
      if (i > 0) {
        move("chat:input", 0.45);
        click();
      }
      typeChat(r.reply);
      send(r.reply, 0.8);
      bulb(L.bulb);
      if (i === 0) {
        scene("duo");
        t += 1.1;
        move("plus", 0.7);
        click();
        appSet({ dialog: { mode: "新增话术", title: "", body: "", caret: "title", ci: 0 } });
        sfx(t, "whoosh", {}, 0.35);
        t += 0.45;
        move("dlg:title", 0.4);
        click();
        typeField("title", "已登记");
        move("dlg:body", 0.4);
        click();
        dlg({ caret: "body", ci: 0 });
        typeField("body", r.v);
      } else {
        move("row:1", 0.55);
        click("r");
        appSet({ menu: { row: 1 }, sel: 1 });
        t += 0.25;
        move("menu:edit", 0.3);
        click();
        appSet({ menu: null, dialog: { mode: "编辑话术", title: "已登记", body: ROUNDS[i - 1].v, caret: "body", ci: chars(ROUNDS[i - 1].v).length } });
        sfx(t, "whoosh", {}, 0.35);
        t += 0.4;
        editBody(r.v);
      }
      saveDialog([app.rows[0], { title: "已登记", text: r.v }], 1);
      t += 0.3;
    });
    hideCursor();
    m.reveal = [t, t + 9.2];
    for (let i = 0; i < ANSWERS.length; i++) sfx(t + 1.6 + i * 1.0, "blip", { n: 76 + i * 2 });
    sfx(t + 7.8, "chime", { n: 88 });
    t += 9.2;

    // ⑥ 然后从此发送这个话术后：双击 → 回车 → 顾客一次性「好的谢谢」
    head(L.h5, "05");
    session("D", "顾客 · 老王");
    t += 0.8;
    say("in", null, { kind: "shot", note: "运费截图", hold: 1.0 });
    move("row:1", 0.7);
    click("dbl");
    appSet({ sel: 1 });
    inputSet(V6, { flash: t });
    sfx(t, "paste");
    t += 1.2;
    send(V6, 2.0);
    say("in", L.thanks, { hold: 2.6 });
    hideCursor();

    // ⑦ 海量的这类客户
    scene("montage");
    m.montage = [t, t + 15];
    t += 15;
    cap(L.montage, m.montage[0] + 1.2, t);

    // ⑧ 以上这些都是真实案例，真实经验 + 话术精灵 + 微信
    scene("end");
    m.end = [t, t + 11];
    sfx(t, "swell", {}, 6);
    sfx(t + 3.6, "chime", { n: 84 });
    sfx(t + 4.0, "chime", { n: 88 });
    sfx(t + 4.4, "chime", { n: 91 });
    t += 11;

    const base = Math.ceil(t);
    // 海量客户：一格一格亮起来，每格一声
    montageTiles(m.montage[0]).forEach((tile, i) => {
      if (i < 40 || i % 3 === 0) sfx(tile.at + 0.15, "pop", { n: 76 + (i % 7) * 2, v: i < 8 ? 0.9 : 0.35 });
    });
    music(score, m, waits, base);
    return { base, msgs, sessions, inputs, appKeys, cur, clicks, caps, heads, bulbs, scenes, waits, keys, steps, m, score: score.sort((a, b) => a.u - b.u) };
  }

  // 海量客户的格子：三拨，越来越多、越来越快
  function montageTiles(t0) {
    const tiles = [];
    const waves = [
      { from: 0.3, cols: 4, rows: 2, gap: 0.55, to: 5.2 },
      { from: 5.2, cols: 8, rows: 4, gap: 0.09, to: 9.2 },
      { from: 9.2, cols: 16, rows: 8, gap: 0.022, to: 15.5 },
    ];
    let n = 0;
    waves.forEach((w, wi) => {
      const tw = 1680 / w.cols;
      const th = (tw * 380) / 420;
      const total = w.cols * w.rows;
      const x0 = (W - tw * w.cols) / 2;
      const y0 = 150 + (790 - th * w.rows) / 2;
      for (let i = 0; i < total; i++) {
        const order = wi === 0 ? i : Math.floor(rnd(i + wi * 1000) * total * 0.3 + i * 0.7);
        tiles.push({ wave: wi, from: t0 + w.from, to: t0 + w.to, at: t0 + w.from + 0.15 + order * w.gap, x: x0 + (i % w.cols) * tw, y: y0 + Math.floor(i / w.cols) * th, w: tw, h: th, n: n++, reply: REPLIES[(i + wi * 3) % REPLIES.length] });
      }
    });
    return tiles.sort((a, b) => a.at - b.at);
  }

  // 背景音乐：96 BPM，C–Am–F–G 循环；等待时音乐停下只剩钟摆，后半段加鼓，片尾一个长和弦
  const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const CHORDS = [
    { bass: 36, pad: [60, 64, 67] },
    { bass: 33, pad: [57, 60, 64] },
    { bass: 29, pad: [57, 60, 65] },
    { bass: 31, pad: [59, 62, 67] },
  ];
  function music(score, m, waits, base) {
    const beat = 0.625;
    const add = (u, type, arg = {}, dur = 0) => score.push({ u, type, arg, dur });
    const start = m.intro[0] + 0.2;
    const stop = m.end[0];
    const quiet = (u) => waits.some((w) => u > w.from - 0.3 && u < w.to + 0.1);
    for (let b = 0; start + b * beat < stop; b++) {
      const u = start + b * beat;
      if (quiet(u)) continue;
      const c = CHORDS[Math.floor(b / 4) % 4];
      const drive = u >= m.card[1] && u < stop; // 第三段（用上话术精灵）起鼓进来
      const fast = u >= m.montage[0];
      if (b % 4 === 0) add(u, "pad", { notes: c.pad, v: 0.55 }, beat * 4);
      add(u, "bass", { n: c.bass + (b % 2 ? 12 : 0), v: 0.7 }, beat * 0.9);
      if (drive) {
        if (b % 2 === 0) add(u, "kick", { v: 0.6 });
        add(u + beat / 2, "hat", { v: fast ? 0.5 : 0.3 });
        if (b % 4 === 2) add(u, "snap", {});
      } else if (b % 2 === 1) add(u + beat / 2, "hat", { v: 0.18 });
      if (fast || (drive && b % 8 >= 4)) {
        const seq = [0, 1, 2, 1];
        add(u, "pluck", { n: c.pad[seq[b % 4]] + 12, v: 0.45 });
        if (fast) add(u + beat / 2, "pluck", { n: c.pad[seq[(b + 2) % 4]] + 12, v: 0.35 });
      }
    }
    add(stop, "pad", { notes: [48, 60, 64, 67, 72], v: 0.9, long: 1 }, base - stop);
  }

  // ---------- 文字排版（中文逐字折行；💗 画成一颗心） ----------
  const KINSOKU = new Set(chars("，。！？、；：～~）」』…,.!?)"));
  const wcache = new Map();
  const lcache = new Map();
  function setFont(ctx, size, weight = 500, font = SANS) {
    ctx.font = `${weight} ${size}px ${font}`;
  }
  function cw(ctx, c, size) {
    if (c === HEART) return size * 1.15;
    const key = ctx.font + c;
    let w = wcache.get(key);
    if (w === undefined) {
      w = ctx.measureText(c).width;
      wcache.set(key, w);
    }
    return w;
  }
  // → { lines: [{ items: [{ c, x, w, i }], w, start, end }], n, w }
  function layout(ctx, str, maxW, size, weight = 500) {
    const key = `${size}|${weight}|${maxW}|${str}`;
    let out = lcache.get(key);
    if (out) return out;
    setFont(ctx, size, weight);
    const cs = chars(str);
    const lines = [];
    let line = { items: [], w: 0, start: 0 };
    cs.forEach((c, i) => {
      if (c === "\n") {
        line.end = i;
        lines.push(line);
        line = { items: [], w: 0, start: i + 1 };
        return;
      }
      const w = cw(ctx, c, size);
      if (line.w + w > maxW && line.items.length && !KINSOKU.has(c)) {
        line.end = i;
        lines.push(line);
        line = { items: [], w: 0, start: i };
      }
      line.items.push({ c, x: line.w, w, i });
      line.w += w;
    });
    line.end = cs.length;
    lines.push(line);
    out = { lines, n: cs.length, w: Math.max(...lines.map((l) => l.w)) };
    if (lcache.size > 5000) lcache.clear();
    lcache.set(key, out);
    return out;
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
    ctx.beginPath();
    ctx.ellipse(-8, -10, 4, 2.6, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.fill();
    ctx.restore();
  }
  // 画排好的字；o.hl(i) 返回某个字的底色（高亮用），o.maxLines 超出就在最后一行末尾放省略号
  function drawLayout(ctx, lay, x, y, lh, { size, weight = 500, color, alpha = 1, hl, maxLines = Infinity, skip = 0 } = {}) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    setFont(ctx, size, weight);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const lines = lay.lines.slice(skip, skip + maxLines);
    lines.forEach((line, li) => {
      const yy = y + li * lh + lh / 2;
      if (hl) {
        for (const it of line.items) {
          const bg = hl(it.i);
          if (bg) {
            ctx.fillStyle = bg;
            ctx.fillRect(x + it.x - 1, yy - lh * 0.42, it.w + 2, lh * 0.84);
          }
        }
      }
      let items = line.items;
      const clipped = li === lines.length - 1 && skip + maxLines < lay.lines.length;
      if (clipped) items = items.slice(0, Math.max(0, items.length - 1));
      let run = "";
      let runX = 0;
      const flush = () => {
        if (run) {
          ctx.fillStyle = color;
          ctx.fillText(run, x + runX, yy);
        }
        run = "";
      };
      for (const it of items) {
        if (it.c === HEART) {
          flush();
          heart(ctx, x + it.x + it.w / 2, yy, size * 0.95, PINK);
          continue;
        }
        if (!run) runX = it.x;
        run += it.c;
      }
      flush();
      if (clipped) {
        ctx.fillStyle = color;
        ctx.fillText("…", x + (items.length ? items[items.length - 1].x + items[items.length - 1].w : 0), yy);
      }
    });
    ctx.restore();
  }
  // 光标在第几个字前：返回 { x, y }（相对排版左上角）
  function caretAt(lay, idx, lh) {
    for (let li = 0; li < lay.lines.length; li++) {
      const line = lay.lines[li];
      const next = lay.lines[li + 1];
      if (idx < line.start) continue;
      if (idx > line.end) continue;
      if (idx === line.end && next && next.start === idx) {
        // 自动折行处：光标算在下一行开头
        return { x: 0, y: (li + 1) * lh, li: li + 1 };
      }
      const it = line.items.find((x) => x.i === idx);
      return { x: it ? it.x : line.w, y: li * lh, li };
    }
    const last = lay.lines[lay.lines.length - 1];
    return { x: last.w, y: (lay.lines.length - 1) * lh, li: lay.lines.length - 1 };
  }

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
  function text(ctx, str, x, y, { size = 40, weight = 500, color = FG, align = "center", font = SANS, alpha = 1, base = "middle", maxW } = {}) {
    if (alpha <= 0 || !str) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = base;
    ctx.fillStyle = color;
    ctx.fillText(str, x, y, maxW);
    ctx.restore();
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
  function scaleAt(ctx, x, y, s) {
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.translate(-x, -y);
  }
  // 话术行的小方章：纸飞机指向左边（客户端 _draw_send_icon）
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
  function keycap(ctx, x, y, label, press, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    setFont(ctx, 30, 700);
    const w = Math.max(84, ctx.measureText(label).width + 44);
    const h = 64;
    const d = 8 * (1 - press);
    rr(ctx, x - w / 2, y - h / 2 + 8, w, h, 12);
    ctx.fillStyle = "#3a1a0b";
    ctx.fill();
    rr(ctx, x - w / 2, y - h / 2 + 8 - d, w, h, 12);
    ctx.fillStyle = press > 0.5 ? ACCENT : "#f2ece6";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(0,0,0,.35)";
    ctx.stroke();
    text(ctx, label, x, y + 8 - d, { size: 30, weight: 700, color: press > 0.5 ? "#fff" : "#1a1714" });
    ctx.restore();
  }

  // 顾客发来的「表情」：全部代码现画，不靠系统表情字体
  function face(ctx) {
    const g = ctx.createRadialGradient(-14, -18, 6, 0, 0, 52);
    g.addColorStop(0, "#ffe27a");
    g.addColorStop(1, "#f7b500");
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#d18f00";
    ctx.stroke();
  }
  function palm(ctx, fingers) {
    ctx.fillStyle = "#ffd25e";
    ctx.strokeStyle = "#c98a00";
    ctx.lineWidth = 2.5;
    rr(ctx, -20, -6, 40, 40, 14);
    ctx.fill();
    ctx.stroke();
    fingers.forEach(([fx, fy, fh, a]) => {
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(a);
      rr(ctx, -6, -fh, 12, fh + 6, 6);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  }
  function sticker(ctx, kind, x, y, size, u) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 100, size / 100);
    if (kind === "heart") {
      const beat = 1 + Math.max(0, Math.sin(u * 7)) * 0.08;
      ctx.scale(beat, beat);
      heart(ctx, 0, 6, 104, "#ff3b5c");
    } else if (kind === "flower") {
      ctx.rotate(u * 0.6);
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate((i / 6) * Math.PI * 2);
        ctx.beginPath();
        ctx.ellipse(0, -26, 17, 25, 0, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 ? "#ff7aa8" : "#ff5c93";
        ctx.fill();
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fillStyle = "#ffcf3d";
      ctx.fill();
      ctx.fillStyle = "#e09b00";
      for (let i = 0; i < 6; i++) ctx.fillRect(Math.cos(i) * 7 - 1.5, Math.sin(i * 2) * 7 - 1.5, 3, 3);
    } else if (kind === "ok") {
      // 👌：拇指和食指捏成圈，另外三根手指竖起来
      ctx.rotate(-0.15);
      ctx.fillStyle = "#ffd25e";
      ctx.strokeStyle = "#c98a00";
      ctx.lineWidth = 3;
      [[4, -10, 44, -0.18], [18, -6, 40, 0.05], [30, 2, 32, 0.28]].forEach(([fx, fy, fh, a]) => {
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(a);
        rr(ctx, -7, -fh, 14, fh + 8, 7);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
      rr(ctx, -16, -12, 52, 54, 20);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-22, -4, 19, 0, Math.PI * 2);
      ctx.lineWidth = 12;
      ctx.strokeStyle = "#c98a00";
      ctx.stroke();
      ctx.lineWidth = 7;
      ctx.strokeStyle = "#ffd25e";
      ctx.stroke();
    } else {
      face(ctx);
      ctx.strokeStyle = "#5b3a00";
      ctx.fillStyle = "#5b3a00";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      if (kind === "kiss") {
        // 飞吻：一只眼眨着、嘟嘴，飞出一颗心
        ctx.beginPath();
        ctx.arc(-16, -8, 7, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(10, -10);
        ctx.lineTo(24, -12);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-4, 14);
        ctx.quadraticCurveTo(8, 18, -2, 22);
        ctx.quadraticCurveTo(8, 26, -4, 30);
        ctx.stroke();
        const f = (u * 0.8) % 1;
        heart(ctx, 30 + f * 30, 10 - f * 50, 30, `rgba(255,59,92,${1 - f * 0.6})`);
      } else {
        // 拜拜：笑脸 + 一只挥动的手
        ctx.beginPath();
        ctx.arc(-15, -8, 7, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(15, -8, 7, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 8, 18, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
        ctx.save();
        ctx.translate(46, 26);
        ctx.rotate(Math.sin(u * 9) * 0.35 - 0.2);
        ctx.scale(0.75, 0.75);
        palm(ctx, [[-14, -4, 26, -0.25], [-4, -6, 32, -0.08], [6, -6, 32, 0.08], [16, -4, 26, 0.25]]);
        ctx.restore();
        ctx.strokeStyle = "rgba(91,58,0,.6)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(46, 20, 44, -1.0, -0.4);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ---------- 场景布局：每种模式下聊天窗与话术精灵在哪，换模式时 0.8 秒滑过去 ----------
  const MODES = {
    intro: { chat: { x: 580, y: 170, a: 0, s: 0.92 }, app: { x: 1940, y: 170, a: 0, s: 1 } },
    solo: { chat: { x: 580, y: 170, a: 1, s: 1 }, app: { x: 1940, y: 170, a: 0, s: 1 } },
    card: { chat: { x: 140, y: 170, a: 1, s: 1 }, app: { x: 1940, y: 170, a: 0, s: 1 } },
    duo: { chat: { x: 140, y: 170, a: 1, s: 1 }, app: { x: 1000, y: 170, a: 1, s: 1 } },
    montage: { chat: { x: 140, y: 170, a: 0, s: 0.9 }, app: { x: 1000, y: 170, a: 0, s: 0.9 } },
    end: { chat: { x: 140, y: 170, a: 0, s: 0.9 }, app: { x: 1000, y: 170, a: 0, s: 0.9 } },
  };
  const CHAT_W = 760;
  const CHAT_H = 780;
  const APP_W = 780;
  const APP_H = 780;

  function makeFilm() {
    const TL = build();
    const { m } = TL;
    const tiles = montageTiles(m.montage[0]);
    const msgsBy = {};
    TL.msgs.forEach((x) => (msgsBy[x.s] ||= []).push(x));

    function layoutAt(u) {
      const i = Math.max(0, lastAt(TL.scenes, u));
      const now = TL.scenes[i];
      const prev = TL.scenes[Math.max(0, i - 1)];
      const k = i === 0 ? 1 : sm(now.at, now.at + 0.8, u);
      const mix = (key) => {
        const a = MODES[prev.mode][key];
        const b = MODES[now.mode][key];
        return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), a: lerp(a.a, b.a, k), s: lerp(a.s, b.s, k) };
      };
      const chat = { ...mix("chat"), w: CHAT_W, h: CHAT_H };
      const app = { ...mix("app"), w: APP_W, h: APP_H };
      return { chat, app };
    }

    const appAt = (u) => TL.appKeys[Math.max(0, lastAt(TL.appKeys, u))].st;
    const sessionAt = (u) => TL.sessions[lastAt(TL.sessions, u)] || null;
    function inputAt(id, u) {
      const list = TL.inputs[id];
      return list[Math.max(0, lastAt(list, u))];
    }

    // ---------- 话术精灵主界面里的位置 ----------
    function listLayout(r, st) {
      let y = r.y + 236;
      const heads = [];
      const rows = [];
      heads.push({ y, label: "退换货", open: false });
      y += 52;
      heads.push({ y, label: "补运费", open: true });
      y += 52;
      st.rows.forEach((row, i) => {
        rows.push({ y, row, i });
        y += 104;
      });
      heads.push({ y: y + 4, label: "催退款", open: false });
      y += 60;
      return { heads, rows, plus: { x: r.x + r.w / 2, y: y + 26 } };
    }
    const dialogRect = (r) => {
      const d = { x: r.x + 40, y: r.y + 120, w: r.w - 80, h: 580 };
      d.title = { x: d.x + 30, y: d.y + 112, w: d.w - 60, h: 58 };
      d.body = { x: d.x + 30, y: d.y + 222, w: d.w - 60, h: 248 };
      d.save = { x: d.x + d.w - 30 - 150, y: d.y + d.h - 84, w: 150, h: 58 };
      d.cancel = { x: d.save.x - 20 - 130, y: d.save.y, w: 130, h: 58 };
      return d;
    };
    const BODY_SIZE = 27;
    const BODY_LH = 40;
    function resolveRef(ctx, key, lay, u) {
      const ref = key.ref;
      const r = lay.app;
      if (ref === "chat:input") return { x: lay.chat.x + 260, y: lay.chat.y + lay.chat.h - 120 };
      if (ref === "plus") return listLayout(r, appAt(u)).plus;
      if (typeof ref === "string" && ref.startsWith("row:")) {
        const row = listLayout(r, appAt(u)).rows[Number(ref.slice(4))];
        return row ? { x: r.x + 230, y: row.y + 34 } : { x: r.x + r.w / 2, y: r.y + 400 };
      }
      const d = dialogRect(r);
      if (ref === "dlg:title") return { x: d.title.x + 300, y: d.title.y + d.title.h / 2 };
      if (ref === "dlg:body") return { x: d.body.x + 300, y: d.body.y + 60 };
      if (ref === "dlg:save") return { x: d.save.x + d.save.w / 2, y: d.save.y + d.save.h / 2 };
      if (ref === "menu:edit") {
        const p = resolveRef(ctx, { ref: `row:${appAt(u).menu?.row ?? 1}` }, lay, u);
        return { x: p.x + 110, y: p.y + 38 };
      }
      if (ref && typeof ref.dlgIdx === "number") {
        // 话术正文里第 n 个字的位置：按鼠标落点那一刻的正文量
        const st = appAt(key.at - 0.001);
        const body = st.dialog ? st.dialog.body : "";
        const tl = layout(ctx, body, d.body.w - 36, BODY_SIZE);
        const c = caretAt(tl, ref.dlgIdx, BODY_LH);
        return { x: d.body.x + 18 + c.x + 4, y: d.body.y + 14 + c.y + BODY_LH / 2 + 6 };
      }
      return { x: W / 2, y: H / 2 };
    }
    // 鼠标位置：从上一个落点平滑移到这一个；ref 为 null 表示藏起来
    function cursorAt(ctx, lay, u) {
      let k = -1; // 正在走（或已经走完）的那一段
      for (let j = 0; j < TL.cur.length; j++) {
        if (TL.cur[j].at - TL.cur[j].dur <= u) k = j;
        else break;
      }
      if (k < 0) return null;
      const key = TL.cur[k];
      if (!key.ref) return null;
      const to = resolveRef(ctx, key, lay, u);
      const prev = TL.cur[k - 1];
      if (u >= key.at || !prev || !prev.ref) {
        const a = prev && prev.ref ? 1 : sm(key.at - key.dur, key.at, u);
        return { ...to, a };
      }
      const from = resolveRef(ctx, prev, lay, u);
      const e = sm(key.at - key.dur, key.at, u);
      return { x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e) - Math.sin(e * Math.PI) * 30, a: 1 };
    }

    // ---------- 背景 ----------
    function background(ctx, u) {
      ctx.fillStyle = "#0b0a09";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,255,255,0.045)";
      const off = (u * 12) % 48;
      for (let y = -48; y < H + 48; y += 48) for (let x = -48; x < W + 48; x += 48) ctx.fillRect(x + off, y + off * 0.5, 2, 2);
      glow(ctx, 240, H - 80, 720, "rgba(255,107,44,0.32)", 0.5);
      glow(ctx, W - 200, 120, 600, "rgba(255,154,92,0.18)", 0.5);
    }

    // ---------- 聊天窗 ----------
    const BUB = 28;
    const BUB_LH = 40;
    const BUB_MAX = 452;
    function msgHeight(ctx, x) {
      const noteH = x.note ? 34 : 0;
      if (x.side === "time") return 44;
      if (x.kind === "text") {
        const lay = layout(ctx, x.text, BUB_MAX, BUB);
        return Math.max(56, lay.lines.length * BUB_LH + 24) + noteH;
      }
      if (x.kind === "redact") return x.bars.length * 40 + 24 + noteH;
      if (x.kind === "shot") return 248 + noteH;
      return 130;
    }
    function avatar(ctx, x, y, label, own) {
      rr(ctx, x, y, 52, 52, 10);
      ctx.fillStyle = own ? ACCENT : "#d9d2ca";
      ctx.fill();
      text(ctx, label, x + 26, y + 27, { size: 24, weight: 700, color: own ? "#fff" : "#5a4f46" });
    }
    function drawMsg(ctx, r, x, y, e, nick, u) {
      const own = x.side === "out";
      if (x.side === "time") {
        text(ctx, x.text, r.x + r.w / 2, y + 22, { size: 20, color: C.sub, font: MONO, alpha: e });
        return;
      }
      const left = r.x + 22;
      const right = r.x + r.w - 22;
      ctx.save();
      ctx.globalAlpha *= clamp(e * 1.6, 0, 1);
      const pop = 0.85 + 0.15 * easeBack(clamp(e, 0, 1));
      scaleAt(ctx, own ? right : left, y + 20, pop);
      avatar(ctx, own ? right - 52 : left, y, own ? "我" : chars(nick)[0], own);
      const bx0 = own ? right - 52 - 14 : left + 52 + 14;
      let bw = 0;
      let bh = 0;
      if (x.kind === "text") {
        const lay = layout(ctx, x.text, BUB_MAX, BUB);
        bw = lay.w + 36;
        bh = Math.max(56, lay.lines.length * BUB_LH + 24);
        const bx = own ? bx0 - bw : bx0;
        rr(ctx, bx, y, bw, bh, 10);
        ctx.fillStyle = own ? ACCENT : C.in;
        ctx.fill();
        if (!own) {
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = C.line;
          ctx.stroke();
        }
        drawLayout(ctx, lay, bx + 18, y + 12 + (bh - 24 - lay.lines.length * BUB_LH) / 2, BUB_LH, { size: BUB, color: own ? "#fff" : C.inFg });
      } else if (x.kind === "redact") {
        // 顾客给的收款方式 / 姓名：打码显示，不编造具体内容
        bw = Math.max(...x.bars.map((row) => row.reduce((s, w) => s + w + 12, 0))) + 24;
        bh = x.bars.length * 40 + 24;
        const bx = own ? bx0 - bw : bx0;
        rr(ctx, bx, y, bw, bh, 10);
        ctx.fillStyle = C.in;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = C.line;
        ctx.stroke();
        x.bars.forEach((row, ri) => {
          let xx = bx + 18;
          row.forEach((w) => {
            rr(ctx, xx, y + 18 + ri * 40, w, 24, 5);
            ctx.fillStyle = "#3b3633";
            ctx.fill();
            xx += w + 12;
          });
        });
      } else if (x.kind === "shot") {
        // 运费支付截图：一张代码画的小票（金额、单号全部打码）
        bw = 170;
        bh = 248;
        const bx = bx0;
        rr(ctx, bx, y, bw, bh, 10);
        ctx.fillStyle = "#fafafa";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#d4d4d4";
        ctx.stroke();
        ctx.fillStyle = "#e8eef8";
        ctx.fillRect(bx + 1, y + 1, bw - 2, 34);
        ctx.beginPath();
        ctx.arc(bx + bw / 2, y + 86, 26, 0, Math.PI * 2);
        ctx.fillStyle = "#4c8dff";
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx + bw / 2 - 12, y + 86);
        ctx.lineTo(bx + bw / 2 - 3, y + 96);
        ctx.lineTo(bx + bw / 2 + 13, y + 76);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.stroke();
        text(ctx, "¥", bx + bw / 2 - 34, y + 142, { size: 26, weight: 700, color: "#222" });
        rr(ctx, bx + bw / 2 - 18, y + 130, 60, 24, 5);
        ctx.fillStyle = "#3b3633";
        ctx.fill();
        [178, 200, 222].forEach((yy, i) => {
          ctx.fillStyle = "#d9d9d9";
          ctx.fillRect(bx + 18, y + yy, bw - 36 - i * 18, 8);
        });
      } else if (x.kind === "sticker") {
        sticker(ctx, x.sticker, bx0 + 60, y + 62, 110, u);
      }
      ctx.restore();
      if (x.note) {
        const bx = own ? bx0 - bw : bx0;
        text(ctx, `↑ ${x.note}`, bx + 4, y + bh + 18, { size: 21, weight: 600, color: C.note, align: "left", alpha: clamp((e - 0.5) * 2, 0, 1) });
      }
    }
    function inputHeight(ctx, r, inp) {
      const lay = layout(ctx, inp.text || " ", r.w - 56, 26);
      return 60 + clamp(lay.lines.length, 2, 5) * 36 + 84;
    }
    function drawChat(ctx, lay, u) {
      const r = lay.chat;
      if (r.a <= 0.01) return;
      const s = sessionAt(u);
      if (!s) return;
      const nick = s.who.split(" · ")[1];
      ctx.save();
      ctx.globalAlpha = r.a;
      scaleAt(ctx, r.x + r.w / 2, r.y + r.h / 2, r.s);
      rr(ctx, r.x, r.y, r.w, r.h, 18);
      ctx.fillStyle = C.bg;
      ctx.fill();
      ctx.save();
      rr(ctx, r.x, r.y, r.w, r.h, 18);
      ctx.clip();
      // 标题栏：只有顾客名与「在线」
      ctx.fillStyle = C.head;
      ctx.fillRect(r.x, r.y, r.w, 80);
      ctx.fillStyle = C.line;
      ctx.fillRect(r.x, r.y + 80, r.w, 1.5);
      const swap = sm(s.at, s.at + 0.35, u);
      ctx.save();
      ctx.globalAlpha *= swap;
      avatar(ctx, r.x + 22, r.y + 14, chars(nick)[0], false);
      text(ctx, s.who, r.x + 90, r.y + 30, { size: 27, weight: 700, color: "#1a1a1a", align: "left" });
      text(ctx, "在线", r.x + 90, r.y + 60, { size: 19, color: C.sub, align: "left" });
      ctx.restore();
      // 输入区（会跟着内容长高）
      const inp = inputAt(s.id, u);
      const ih = inputHeight(ctx, r, inp);
      const iy = r.y + r.h - ih;
      // 消息区
      const top = r.y + 82;
      const viewH = iy - top;
      const list = (msgsBy[s.id] || []).filter((x) => x.at <= u);
      let total = 16;
      const hs = list.map((x) => {
        const h = msgHeight(ctx, x) + 18;
        total += h * easeOut(clamp((u - x.at) / 0.3, 0, 1));
        return h;
      });
      const offset = Math.max(0, total - viewH + 10);
      ctx.save();
      ctx.beginPath();
      ctx.rect(r.x, top, r.w, viewH);
      ctx.clip();
      let y = top + 16 - offset;
      list.forEach((x, i) => {
        const e = clamp((u - x.at) / 0.3, 0, 1);
        if (y + hs[i] > top - 40 && y < iy + 40) drawMsg(ctx, r, x, y, e * swap, nick, u);
        y += hs[i] * easeOut(e);
      });
      drawWait(ctx, r, top, viewH, u);
      ctx.restore();
      // 输入区
      ctx.fillStyle = "#fff";
      ctx.fillRect(r.x, iy, r.w, ih);
      ctx.fillStyle = C.line;
      ctx.fillRect(r.x, iy, r.w, 1.5);
      if (inp.flash !== null) {
        const f = 1 - clamp((u - inp.flash) / 0.8, 0, 1);
        if (f > 0) {
          ctx.fillStyle = `rgba(255,107,44,${0.16 * f})`;
          ctx.fillRect(r.x, iy, r.w, ih);
        }
      }
      // 工具栏：表情 / 文件 / 截图（通用小图标）
      ctx.strokeStyle = "#7a7a7a";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(r.x + 40, iy + 30, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r.x + 40, iy + 32, 6, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      rr(ctx, r.x + 72, iy + 19, 26, 22, 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(r.x + 124, iy + 20);
      ctx.lineTo(r.x + 140, iy + 40);
      ctx.moveTo(r.x + 140, iy + 20);
      ctx.lineTo(r.x + 124, iy + 40);
      ctx.stroke();
      const tl = layout(ctx, inp.text || "", r.w - 56, 26);
      const show = Math.min(5, tl.lines.length);
      drawLayout(ctx, tl, r.x + 28, iy + 58, 36, { size: 26, color: "#1a1a1a", skip: tl.lines.length - show, maxLines: show });
      if (inp.focus && Math.floor(u * 2.2) % 2 === 0) {
        const c = caretAt(tl, tl.n, 36);
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(r.x + 28 + c.x + 2, iy + 58 + (c.li - (tl.lines.length - show)) * 36 + 5, 2.5, 27);
      }
      // 发送键：品牌橙；有字时亮，回车那一下压一下
      const kIdx = lastAt(TL.keys, u);
      const press = kIdx >= 0 ? win(u, TL.keys[kIdx].at - 0.02, TL.keys[kIdx].at + 0.25, 0.06) : 0;
      const sx = r.x + r.w - 140;
      const sy = r.y + r.h - 68;
      rr(ctx, sx, sy + press * 3, 118, 50, 8);
      ctx.fillStyle = inp.text ? ACCENT : "#f1d6c8";
      ctx.fill();
      text(ctx, "发送", sx + 59, sy + 26 + press * 3, { size: 24, weight: 700, color: "#fff" });
      ctx.restore();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#3f3f3f";
      rr(ctx, r.x, r.y, r.w, r.h, 18);
      ctx.stroke();
      ctx.restore();
    }
    // 漫长的等待：消息区压暗，钟飞快地转，时间一路往上跳
    function drawWait(ctx, r, top, viewH, u) {
      const w = TL.waits.find((x) => u >= x.from && u <= x.to + 0.3);
      if (!w) return;
      const a = win(u, w.from, w.to + 0.3, 0.3);
      const p = sm(w.from + 0.3, w.to - 0.3, u);
      const mins = lerp(w.c0, w.c1, p);
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.fillStyle = "rgba(20,16,14,0.72)";
      ctx.fillRect(r.x, top, r.w, viewH);
      const cx = r.x + r.w / 2;
      const cy = top + viewH / 2 - 10;
      ctx.beginPath();
      ctx.arc(cx, cy, 92, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = ACCENT;
      ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        ctx.fillStyle = "#3b3633";
        ctx.fillRect(cx + Math.cos(ang) * 76 - 3, cy + Math.sin(ang) * 76 - 3, 6, 6);
      }
      const hand = (ang, len, wdt) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang - Math.PI / 2) * len, cy + Math.sin(ang - Math.PI / 2) * len);
        ctx.lineWidth = wdt;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#1a1714";
        ctx.stroke();
      };
      hand(((mins / 60) % 12) * (Math.PI / 6), 44, 8);
      hand((mins % 60) * (Math.PI / 30), 66, 5);
      text(ctx, w.label, cx, cy - 140, { size: 32, weight: 700, color: FG });
      text(ctx, clockLabel(mins), cx, cy + 140, { size: 52, weight: 700, color: ACCENT_HOT, font: MONO });
      // 三个「……」轮流跳
      for (let i = 0; i < 3; i++) {
        const b = Math.max(0, Math.sin(u * 6 - i * 0.8));
        ctx.beginPath();
        ctx.arc(cx - 24 + i * 24, cy + 200 - b * 8, 6, 0, Math.PI * 2);
        ctx.fillStyle = MUTED;
        ctx.fill();
      }
      ctx.restore();
    }

    // ---------- 话术精灵主界面（客户端白色主题的复刻） ----------
    function drawApp(ctx, lay, u, cursor) {
      const r = lay.app;
      if (r.a <= 0.01 || r.x > W) return;
      const st = appAt(u);
      ctx.save();
      ctx.globalAlpha = r.a;
      scaleAt(ctx, r.x + r.w / 2, r.y + r.h / 2, r.s);
      rr(ctx, r.x, r.y, r.w, r.h, 10);
      ctx.fillStyle = P.frame;
      ctx.fill();
      ctx.save();
      rr(ctx, r.x, r.y, r.w, r.h, 10);
      ctx.clip();
      // 标题栏：小精灵 + 名字，右边磁吸 / 置顶 / 最小化
      if (logo.complete && logo.naturalWidth) ctx.drawImage(logo, r.x + 18, r.y + 12, 30, 34);
      text(ctx, "话术精灵", r.x + 58, r.y + 30, { size: 24, weight: 700, color: P.ink, align: "left" });
      ctx.strokeStyle = P.base;
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      const ix = r.x + r.w - 128;
      ctx.beginPath();
      ctx.arc(ix, r.y + 26, 9, Math.PI, 0);
      ctx.moveTo(ix - 9, r.y + 26);
      ctx.lineTo(ix - 9, r.y + 36);
      ctx.moveTo(ix + 9, r.y + 26);
      ctx.lineTo(ix + 9, r.y + 36);
      ctx.moveTo(ix + 40, r.y + 18);
      ctx.lineTo(ix + 40, r.y + 38);
      ctx.moveTo(ix + 32, r.y + 26);
      ctx.lineTo(ix + 48, r.y + 26);
      ctx.moveTo(ix + 76, r.y + 30);
      ctx.lineTo(ix + 94, r.y + 30);
      ctx.stroke();
      // 页签
      ["团队话术", "个人话术", "离线话术"].forEach((label, i) => {
        const tx = r.x + 20 + i * 150;
        if (i === 0) {
          ctx.beginPath();
          ctx.moveTo(tx, r.y + 108);
          ctx.lineTo(tx, r.y + 64);
          ctx.lineTo(tx + 140, r.y + 64);
          ctx.lineTo(tx + 140, r.y + 108);
          ctx.fillStyle = P.paper;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = P.ink;
          ctx.stroke();
        }
        text(ctx, label, tx + 70, r.y + 88, { size: 22, weight: i === 0 ? 700 : 500, color: i === 0 ? P.ink : P.muted });
      });
      ctx.fillStyle = P.paper;
      ctx.fillRect(r.x, r.y + 108, r.w, r.h - 108);
      ctx.fillStyle = P.base;
      ctx.fillRect(r.x, r.y + 107, 20, 1.5);
      ctx.fillRect(r.x + 160, r.y + 107, r.w - 160, 1.5);
      // 套名 + 0–9 套号
      text(ctx, "默认话术", r.x + 24, r.y + 141, { size: 21, color: P.muted, align: "left" });
      for (let i = 0; i < 10; i++) {
        const dx = r.x + 150 + i * 44;
        if (i === 0) {
          rr(ctx, dx, r.y + 122, 36, 38, 6);
          ctx.fillStyle = P.peach;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = P.ink;
          ctx.stroke();
        }
        text(ctx, String(i), dx + 18, r.y + 142, { size: 21, weight: i === 0 ? 700 : 400, color: i === 0 ? P.ink : P.digit, font: MONO });
      }
      // 一级分类
      ["售前", "售后", "物流"].forEach((label, i) => {
        const cx = r.x + 24 + i * 100;
        rr(ctx, cx, r.y + 176, 86, 40, 7);
        ctx.fillStyle = i === 1 ? P.peach : P.chip;
        ctx.fill();
        ctx.lineWidth = i === 1 ? 2 : 1;
        ctx.strokeStyle = i === 1 ? P.ink : P.chipLine;
        ctx.stroke();
        text(ctx, label, cx + 43, r.y + 197, { size: 21, weight: i === 1 ? 700 : 500, color: P.ink });
      });
      // 二级分类 + 话术行
      const ll = listLayout(r, st);
      ll.heads.forEach((h) => {
        if (h.open) {
          ctx.fillStyle = P.peach;
          ctx.fillRect(r.x + 16, h.y, r.w - 32, 42);
        }
        ctx.fillStyle = P.lv2Line;
        ctx.fillRect(r.x + 16, h.y + 42, r.w - 32, 1);
        text(ctx, h.open ? "▾" : "▸", r.x + 34, h.y + 22, { size: 20, color: P.lv2Line });
        text(ctx, h.label, r.x + 56, h.y + 22, { size: 22, weight: 700, color: P.ink, align: "left" });
      });
      ll.rows.forEach(({ y, row, i }) => {
        const x0 = r.x + 16;
        const rw = r.w - 32;
        if (st.sel === i) {
          rr(ctx, x0, y + 2, rw, 98, 6);
          ctx.fillStyle = P.hover;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = P.focus;
          ctx.stroke();
        }
        if (st.flash && st.flash.i === i) {
          const f = 1 - clamp((u - st.flash.at) / 1.2, 0, 1);
          if (f > 0) {
            rr(ctx, x0, y + 2, rw, 98, 6);
            ctx.fillStyle = `rgba(255,107,44,${0.28 * f})`;
            ctx.fill();
          }
        }
        rr(ctx, x0 + 12, y + 18, 28, 28, 5);
        ctx.fillStyle = P.badge;
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = P.chipLine;
        ctx.stroke();
        plane(ctx, x0 + 26, y + 32, 18, P.hot);
        text(ctx, `${i + 1}.`, x0 + 52, y + 33, { size: 22, color: P.digit, align: "left", font: MONO });
        text(ctx, row.title, x0 + 84, y + 33, { size: 24, weight: 700, color: P.title, align: "left" });
        const al = layout(ctx, row.text.replace(/\n/g, " "), rw - 70, 21);
        drawLayout(ctx, al, x0 + 52, y + 50, 28, { size: 21, color: P.answer, maxLines: 2 });
        ctx.fillStyle = "#e5eaf0";
        ctx.fillRect(x0, y + 102, rw, 1);
      });
      // ⊕
      ctx.beginPath();
      ctx.arc(ll.plus.x, ll.plus.y, 17, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = P.box;
      ctx.stroke();
      ctx.fillStyle = P.box;
      ctx.fillRect(ll.plus.x - 8, ll.plus.y - 1, 16, 2.5);
      ctx.fillRect(ll.plus.x - 1, ll.plus.y - 8, 2.5, 16);
      // 搜索行 + 底栏
      const sy = r.y + r.h - 106;
      rr(ctx, r.x + 16, sy, r.w - 32, 48, 8);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = P.chipLine;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r.x + 44, sy + 22, 9, 0, Math.PI * 2);
      ctx.moveTo(r.x + 51, sy + 29);
      ctx.lineTo(r.x + 58, sy + 36);
      ctx.strokeStyle = P.muted;
      ctx.lineWidth = 2.4;
      ctx.stroke();
      text(ctx, "Alt+Q 定位搜索栏", r.x + 72, sy + 25, { size: 20, color: P.muted, align: "left" });
      rr(ctx, r.x + r.w - 104, sy + 8, 72, 32, 6);
      ctx.fillStyle = P.chip;
      ctx.fill();
      text(ctx, "全部", r.x + r.w - 68, sy + 25, { size: 19, color: P.ink });
      text(ctx, "官网 luyao2089.cc", r.x + 20, r.y + r.h - 28, { size: 19, color: P.muted, align: "left" });
      if (logo.complete && logo.naturalWidth) ctx.drawImage(logo, r.x + r.w - 46, r.y + r.h - 50, 26, 29);
      // 右键菜单
      if (st.menu) {
        const p = resolveRef(ctx, { ref: `row:${st.menu.row}` }, lay, u);
        const mx = p.x + 20;
        const my = p.y + 10;
        rr(ctx, mx, my, 190, 112, 8);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = P.box;
        ctx.stroke();
        ["编辑话术", "删除"].forEach((label, i) => {
          const hot = cursor && cursor.x > mx && cursor.x < mx + 190 && cursor.y > my + 6 + i * 50 && cursor.y < my + 56 + i * 50;
          if (hot) {
            ctx.fillStyle = P.peach;
            ctx.fillRect(mx + 4, my + 6 + i * 50, 182, 50);
          }
          text(ctx, label, mx + 24, my + 31 + i * 50, { size: 22, color: P.ink, align: "left" });
        });
      }
      if (st.dialog) drawDialog(ctx, r, st.dialog, u, cursor);
      ctx.restore();
      ctx.lineWidth = 2;
      ctx.strokeStyle = P.box;
      rr(ctx, r.x, r.y, r.w, r.h, 10);
      ctx.stroke();
      ctx.restore();
    }
    // 新增 / 编辑话术的对话框：标题一行、内容多行、保存
    function drawDialog(ctx, r, dg, u, cursor) {
      const d = dialogRect(r);
      ctx.fillStyle = "rgba(42,26,18,0.28)";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      rr(ctx, d.x, d.y, d.w, d.h, 10);
      ctx.fillStyle = P.paper;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = P.ink;
      ctx.stroke();
      text(ctx, dg.mode, d.x + 30, d.y + 44, { size: 28, weight: 800, color: P.ink, align: "left" });
      text(ctx, "×", d.x + d.w - 36, d.y + 42, { size: 34, color: P.muted });
      text(ctx, "标题", d.x + 30, d.y + 94, { size: 21, color: P.muted, align: "left" });
      text(ctx, "内容", d.x + 30, d.y + 204, { size: 21, color: P.muted, align: "left" });
      const blink = Math.floor(u * 2.4) % 2 === 0;
      [["title", d.title], ["body", d.body]].forEach(([field, box]) => {
        rr(ctx, box.x, box.y, box.w, box.h, 8);
        ctx.fillStyle = "#fff";
        ctx.fill();
        const on = dg.caret === field;
        ctx.lineWidth = on ? 2.5 : 1.2;
        ctx.strokeStyle = on ? P.focus : P.chipLine;
        ctx.stroke();
      });
      const tl = layout(ctx, dg.title, d.title.w - 36, 26, 700);
      drawLayout(ctx, tl, d.title.x + 18, d.title.y + 9, 40, { size: 26, weight: 700, color: P.title });
      if (dg.caret === "title" && blink) {
        const c = caretAt(tl, dg.ci, 40);
        ctx.fillStyle = P.ink;
        ctx.fillRect(d.title.x + 18 + c.x + 1, d.title.y + 15, 2.5, 28);
      }
      const bl = layout(ctx, dg.body, d.body.w - 36, BODY_SIZE);
      ctx.save();
      ctx.beginPath();
      ctx.rect(d.body.x, d.body.y + 2, d.body.w, d.body.h - 4);
      ctx.clip();
      drawLayout(ctx, bl, d.body.x + 18, d.body.y + 14, BODY_LH, { size: BODY_SIZE, color: P.answer });
      if (dg.caret === "body" && blink) {
        const c = caretAt(bl, dg.ci, BODY_LH);
        ctx.fillStyle = P.ink;
        ctx.fillRect(d.body.x + 18 + c.x + 1, d.body.y + 14 + c.y + 6, 2.5, 28);
      }
      ctx.restore();
      text(ctx, `${bl.n} 字`, d.body.x + d.body.w, d.body.y + d.body.h + 22, { size: 18, color: P.muted, align: "right", font: MONO });
      rr(ctx, d.cancel.x, d.cancel.y, d.cancel.w, d.cancel.h, 8);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = P.chipLine;
      ctx.stroke();
      text(ctx, "取消", d.cancel.x + d.cancel.w / 2, d.cancel.y + 30, { size: 23, color: P.ink });
      const hot = cursor && cursor.x > d.save.x && cursor.x < d.save.x + d.save.w && cursor.y > d.save.y && cursor.y < d.save.y + d.save.h;
      rr(ctx, d.save.x, d.save.y, d.save.w, d.save.h, 8);
      ctx.fillStyle = hot ? "#ffd2b3" : P.peach;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = P.ink;
      ctx.stroke();
      text(ctx, "保存", d.save.x + d.save.w / 2, d.save.y + 30, { size: 24, weight: 800, color: P.hot });
    }

    // 鼠标箭头 + 点击涟漪
    function drawCursor(ctx, lay, u, cur) {
      for (const c of TL.clicks) {
        const k = u - c.at;
        if (k < 0 || k > 0.6) continue;
        const p = resolveRef(ctx, c.key, lay, c.at);
        const rings = c.kind === "dbl" ? [0, 0.12] : [0];
        rings.forEach((d) => {
          const kk = k - d;
          if (kk < 0 || kk > 0.45) return;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 10 + kk * 90, 0, Math.PI * 2);
          ctx.lineWidth = 4;
          ctx.strokeStyle = `rgba(255,107,44,${1 - kk / 0.45})`;
          ctx.stroke();
        });
        if (c.kind !== "l") {
          text(ctx, c.kind === "dbl" ? "双击" : "右键", p.x + 34, p.y - 30, { size: 26, weight: 800, color: ACCENT, align: "left", alpha: win(u, c.at, c.at + 0.6, 0.1) });
        }
      }
      if (!cur || cur.a <= 0) return;
      const down = TL.clicks.some((c) => u >= c.at && u < c.at + 0.1) ? 0.9 : 1;
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

    // 回车键帽：贴着聊天窗输入区
    function drawKeys(ctx, lay, u) {
      const i = lastAt(TL.keys, u);
      if (i < 0) return;
      const k = TL.keys[i];
      const a = win(u, k.at - 0.25, k.at + 0.55, 0.12);
      if (a <= 0) return;
      const press = win(u, k.at - 0.02, k.at + 0.2, 0.05);
      keycap(ctx, lay.chat.x + lay.chat.w - 81, lay.chat.y + lay.chat.h - 130, k.label, press, a * lay.chat.a);
    }

    // 灵机一动：灯泡亮起来
    function drawBulb(ctx, lay, u) {
      const b = TL.bulbs.find((x) => u >= x.at - 0.05 && u < x.at + 1.5);
      if (!b) return;
      const k = u - b.at;
      const a = win(u, b.at, b.at + 1.5, 0.15);
      const pop = easeBack(clamp(k / 0.35, 0, 1));
      const x = lay.chat.x + lay.chat.w + 4;
      const y = lay.chat.y + 46;
      if (k < 0.18) {
        ctx.fillStyle = `rgba(255,236,200,${0.22 * (1 - k / 0.18)})`;
        ctx.fillRect(0, 0, W, H);
      }
      glow(ctx, x, y, 260 * pop, "rgba(255,200,80,0.9)", 0.55 * a);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(x, y);
      ctx.scale(pop, pop);
      ctx.rotate(Math.sin(k * 14) * 0.08 * (1 - clamp(k, 0, 1)));
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2 + k * 0.6;
        const r0 = 70 + Math.sin(k * 10 + i) * 6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0 - 6);
        ctx.lineTo(Math.cos(ang) * (r0 + 28), Math.sin(ang) * (r0 + 28) - 6);
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#ffcf3d";
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, -12, 46, Math.PI * 0.8, Math.PI * 2.2);
      ctx.quadraticCurveTo(26, 22, 18, 40);
      ctx.lineTo(-18, 40);
      ctx.quadraticCurveTo(-26, 22, -38, 14);
      ctx.closePath();
      ctx.fillStyle = "#ffe066";
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#c98a00";
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-10, 38);
      ctx.lineTo(-6, 4);
      ctx.lineTo(0, 14);
      ctx.lineTo(6, 4);
      ctx.lineTo(10, 38);
      ctx.strokeStyle = "#e08a00";
      ctx.lineWidth = 3;
      ctx.stroke();
      rr(ctx, -20, 42, 40, 22, 5);
      ctx.fillStyle = "#8d8279";
      ctx.fill();
      ctx.restore();
      const label = b.n > 1 ? `${b.label} ×${b.n}` : b.label;
      ctx.save();
      ctx.globalAlpha = a;
      setFont(ctx, 34, 800);
      const tw = ctx.measureText(label).width + 40;
      const ly = y + 130 + (1 - pop) * 20;
      rr(ctx, x - tw / 2, ly - 30, tw, 60, 30);
      ctx.fillStyle = ACCENT;
      ctx.fill();
      text(ctx, label, x, ly + 1, { size: 34, weight: 800, color: "#fff" });
      ctx.restore();
    }

    // 第三段的步骤条：新增话术 → 编辑话术 → 双击话术 → 发送话术
    function drawSteps(ctx, lay, u) {
      if (!TL.steps.length || u < TL.steps[0].at - 0.4 || u > m.compare[0] + 0.4) return;
      const a = win(u, TL.steps[0].at - 0.4, m.compare[0] + 0.4, 0.3) * lay.app.a;
      const cur = TL.steps[Math.max(0, lastAt(TL.steps, u))].n;
      const labels = ["新增话术", "编辑话术", "双击话术", "发送话术"];
      const x0 = lay.app.x;
      ctx.save();
      ctx.globalAlpha = a;
      labels.forEach((label, i) => {
        const x = x0 + i * 198;
        const on = i === cur;
        const done = i < cur;
        rr(ctx, x, 112, 180, 44, 22);
        ctx.fillStyle = on ? ACCENT : done ? "rgba(255,107,44,.18)" : "rgba(255,255,255,.06)";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = on || done ? ACCENT : "#3f3f3f";
        ctx.stroke();
        text(ctx, `${done ? "✓" : i + 1} ${label}`, x + 90, 135, { size: 22, weight: 700, color: on ? "#fff" : done ? ACCENT_HOT : DIM });
      });
      ctx.restore();
    }

    // 章节标题（左上角）与字幕（下方）
    function drawHead(ctx, u) {
      const i = lastAt(TL.heads, u);
      if (i < 0) return;
      const h = TL.heads[i];
      const next = TL.heads[i + 1];
      const until = next ? next.at : m.montage[0];
      let a = win(u, h.at, until + 0.1, 0.35);
      if (u >= m.reveal[0] && u < m.reveal[1]) a *= 1 - win(u, m.reveal[0], m.reveal[1], 0.4);
      if (a <= 0) return;
      const slide = (1 - sm(h.at, h.at + 0.5, u, easeOut)) * -40;
      ctx.save();
      ctx.globalAlpha = a;
      rr(ctx, 140 + slide, 52, 64, 44, 8);
      ctx.fillStyle = ACCENT;
      ctx.fill();
      text(ctx, h.n, 172 + slide, 75, { size: 26, weight: 800, color: "#000", font: MONO });
      text(ctx, h.text, 222 + slide, 75, { size: 38, weight: 800, color: FG, align: "left" });
      ctx.restore();
    }
    function drawCaps(ctx, u) {
      for (const c of TL.caps) {
        if (u < c.from || u > c.to) continue;
        const a = win(u, c.from, c.to, 0.3);
        const lift = (1 - sm(c.from, c.from + 0.35, u, easeOut)) * 16;
        const note = c.tone === "note";
        ctx.save();
        ctx.globalAlpha = a;
        setFont(ctx, 40, 700);
        const tw = ctx.measureText(c.text).width + 56;
        const y = 1012 + lift;
        rr(ctx, W / 2 - tw / 2, y - 34, tw, 68, 12);
        ctx.fillStyle = note ? "rgba(255,107,44,.92)" : "rgba(0,0,0,.72)";
        ctx.fill();
        if (!note) {
          ctx.fillStyle = ACCENT;
          ctx.fillRect(W / 2 - tw / 2, y - 34, 6, 68);
        }
        text(ctx, c.text, W / 2, y + 1, { size: 40, weight: 700, color: note ? "#fff" : FG });
        ctx.restore();
      }
    }

    // ① 片头
    function sceneIntro(ctx, u) {
      const [a0, a1] = m.intro;
      if (u > a1 + 0.6) return;
      const out = 1 - sm(a1 - 0.4, a1 + 0.5, u);
      ctx.save();
      ctx.globalAlpha = out;
      // 飘过的聊天气泡（剪影）
      for (let i = 0; i < 18; i++) {
        const sp = 30 + rnd(i) * 50;
        const x = ((rnd(i + 5) * W + u * sp * (i % 2 ? 1 : -1)) % (W + 400)) - 200;
        const y = 120 + rnd(i + 9) * 840;
        const w = 120 + rnd(i + 2) * 200;
        rr(ctx, x, y, w, 52, 14);
        ctx.fillStyle = i % 3 ? "rgba(255,255,255,.05)" : "rgba(255,107,44,.12)";
        ctx.fill();
      }
      const tag = sm(a0 + 0.2, a0 + 0.6, u, easeOut);
      ctx.save();
      ctx.globalAlpha *= tag;
      rr(ctx, W / 2 - 130, 250 - (1 - tag) * 20, 260, 52, 26);
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.save();
      if ("letterSpacing" in ctx) ctx.letterSpacing = "6px";
      text(ctx, "知识分享 01", W / 2 + 3, 277 - (1 - tag) * 20, { size: 26, weight: 700, color: ACCENT_HOT });
      ctx.restore();
      ctx.restore();
      // 「先说第一个知识分享：」逐字打出
      const kick = chars(L.kicker);
      const shown = Math.floor(clamp((u - a0 - 0.6) / 0.08, 0, kick.length));
      text(ctx, kick.slice(0, shown).join(""), W / 2, 380, { size: 46, weight: 600, color: MUTED });
      // 「补运费登记案例」一个字一个字砸下来
      const t = chars(L.title);
      t.forEach((c, i) => {
        const d = sm(a0 + 1.6 + i * 0.09, a0 + 2.0 + i * 0.09, u, easeBack);
        text(ctx, c, W / 2 + (i - (t.length - 1) / 2) * 170, 530 - (1 - d) * 90, { size: 160, weight: 900, color: FG, alpha: clamp(d, 0, 1) });
      });
      const line = sm(a0 + 2.6, a0 + 3.2, u);
      ctx.fillStyle = ACCENT;
      ctx.fillRect(W / 2 - 560 * line, 640, 1120 * line, 6);
      text(ctx, L.intro, W / 2, 712, { size: 38, color: MUTED, alpha: sm(a0 + 3.0, a0 + 3.5, u) });
      // 署名放在顶上：底部正中留给播放器的封面字条（封面就停在这一幕）
      text(ctx, "话术精灵 · SoftTalk", W / 2, 170, { size: 28, weight: 600, color: DIM, alpha: sm(a0 + 3.4, a0 + 3.9, u) });
      ctx.restore();
    }

    // 第一段末尾：右边一条时间线，三问三等
    function sceneTimeline(ctx, lay, u) {
      const [t0, t1] = m.timeline;
      const a = win(u, t0 + 0.2, t1 + 0.5, 0.4);
      if (a <= 0) return;
      const x = 1010;
      const rows = [
        { time: "10:02", who: "顾客", text: L.c1 },
        { time: "10:03", who: "我", text: L.a1 },
        { time: "10:03", who: "顾客", text: "（收款方式）" },
        { time: "10:04", who: "我", text: L.a2 },
        { gap: "等了 1 小时 33 分" },
        { time: "11:37", who: "顾客", text: "（姓名）" },
        { time: "11:38", who: "我", text: L.a3 },
        { gap: "等了 3 小时 38 分" },
        { time: "15:16", who: "顾客", text: "（运费截图）" },
      ];
      ctx.save();
      ctx.globalAlpha = a;
      let y = 200;
      rows.forEach((row, i) => {
        const e = sm(t0 + 0.3 + i * 0.22, t0 + 0.6 + i * 0.22, u, easeOut);
        if (row.gap) {
          ctx.strokeStyle = `rgba(255,107,44,${0.8 * e})`;
          ctx.setLineDash([8, 8]);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x + 92, y);
          ctx.lineTo(x + 92, y + 96 * e);
          ctx.stroke();
          ctx.setLineDash([]);
          text(ctx, row.gap, x + 126, y + 48, { size: 30, weight: 800, color: ACCENT_HOT, align: "left", alpha: e });
          y += 100;
          return;
        }
        ctx.fillStyle = "#3f3f3f";
        ctx.fillRect(x + 91, y, 2, 58);
        ctx.beginPath();
        ctx.arc(x + 92, y + 29, 8, 0, Math.PI * 2);
        ctx.fillStyle = row.who === "我" ? ACCENT : "#d9d2ca";
        ctx.globalAlpha = a * e;
        ctx.fill();
        text(ctx, row.time, x, y + 29, { size: 24, color: DIM, align: "left", font: MONO, alpha: 1 });
        text(ctx, `${row.who}：${row.text}`, x + 118 + (1 - e) * 20, y + 29, { size: 26, color: row.who === "我" ? FG : MUTED, align: "left", alpha: 1, maxW: 650 });
        ctx.globalAlpha = a;
        y += 58;
      });
      const tot = sm(t0 + 2.4, t0 + 2.9, u, easeBack);
      text(ctx, "前后 5 小时 14 分", x + 390, y + 70, { size: 58, weight: 900, color: ACCENT, alpha: clamp(tot, 0, 1) });
      ctx.restore();
    }

    // 第二段：三句问话合成一条话术，三个要点依次点亮
    function sceneCard(ctx, lay, u) {
      const [t0, t1] = m.card;
      const a = win(u, t0, t1 + 0.6, 0.4);
      if (a <= 0) return;
      const asks = [L.a1, L.a2, L.a3];
      const cx = 1000;
      const cardY = 470;
      const cardW = 780;
      ctx.save();
      ctx.globalAlpha = a;
      const merge = sm(t0 + 1.4, t0 + 2.3, u, easeIO);
      asks.forEach((s, i) => {
        const e = sm(t0 + 0.3 + i * 0.25, t0 + 0.7 + i * 0.25, u, easeBack);
        const y = lerp(200 + i * 82, cardY + 60, merge);
        const x = lerp(cx + 30 + i * 40, cx + 120, merge);
        const al = clamp(e, 0, 1) * (1 - merge);
        if (al <= 0) return;
        ctx.save();
        ctx.globalAlpha *= al;
        setFont(ctx, 30, 600);
        const w = ctx.measureText(s).width + 40;
        rr(ctx, x, y, w, 58, 10);
        ctx.fillStyle = ACCENT;
        ctx.fill();
        text(ctx, s, x + 20, y + 30, { size: 30, weight: 600, color: "#fff", align: "left" });
        ctx.restore();
      });
      // 话术卡片
      const show = sm(t0 + 2.0, t0 + 2.5, u, easeBack);
      if (show > 0) {
        ctx.save();
        ctx.globalAlpha *= clamp(show, 0, 1);
        scaleAt(ctx, cx + cardW / 2, cardY + 150, 0.9 + 0.1 * show);
        rr(ctx, cx, cardY - 80, cardW, 400, 14);
        ctx.fillStyle = P.paper;
        ctx.fill();
        ctx.fillStyle = ACCENT;
        ctx.fillRect(cx, cardY - 80, 8, 400);
        text(ctx, "一条话术", cx + 40, cardY - 36, { size: 24, weight: 700, color: P.muted, align: "left" });
        const lay2 = layout(ctx, L.one, cardW - 80, 40, 700);
        const n = Math.floor(clamp((u - t0 - 2.4) / 0.05, 0, lay2.n));
        const keys = ["收款方式", "姓名", "运费支付后截图"].map((k) => {
          const s = L.one.indexOf(k);
          return [chars(L.one.slice(0, s)).length, chars(k).length];
        });
        const hl = (i) => {
          for (let k = 0; k < keys.length; k++) {
            const [s, len] = keys[k];
            const on = sm(t0 + 5.0 + k * 0.7, t0 + 5.3 + k * 0.7, u);
            if (on > 0 && i >= s && i < s + len) return `rgba(255,107,44,${0.3 * on})`;
          }
          return null;
        };
        const partial = layout(ctx, chars(L.one).slice(0, n).join(""), cardW - 80, 40, 700);
        drawLayout(ctx, partial, cx + 40, cardY + 4, 64, { size: 40, weight: 700, color: P.ink, hl });
        keys.forEach(([s], k) => {
          const on = sm(t0 + 5.0 + k * 0.7, t0 + 5.4 + k * 0.7, u, easeBack);
          if (on <= 0) return;
          const c = caretAt(lay2, s, 64);
          const bx = cx + 40 + c.x;
          const by = cardY + 4 + c.y - 10;
          ctx.beginPath();
          ctx.arc(bx, by, 18 * on, 0, Math.PI * 2);
          ctx.fillStyle = ACCENT;
          ctx.fill();
          text(ctx, String(k + 1), bx, by + 1, { size: 22, weight: 800, color: "#fff", alpha: clamp(on, 0, 1) });
        });
        ctx.restore();
      }
      ctx.restore();
    }

    // 第三段末尾：以前三问三等 / 现在一问一等
    function sceneCompare(ctx, lay, u) {
      const [t0, t1] = m.compare;
      const a = win(u, t0, t1, 0.35);
      if (a <= 0) return;
      const r = lay.app;
      ctx.save();
      ctx.globalAlpha = a;
      rr(ctx, r.x, r.y + 160, r.w, 460, 16);
      ctx.fillStyle = "rgba(14,12,11,0.94)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = ACCENT;
      ctx.stroke();
      const bars = [
        { label: "以前", note: "问 3 次 · 等 3 次", n: 3, len: 600, y: r.y + 290, grow: [t0 + 0.4, t0 + 1.8] },
        { label: "现在", note: "问 1 次 · 等 1 次", n: 1, len: 150, y: r.y + 470, grow: [t0 + 1.9, t0 + 2.3] },
      ];
      bars.forEach((b) => {
        const g = sm(b.grow[0], b.grow[1], u);
        text(ctx, b.label, r.x + 40, b.y, { size: 34, weight: 800, color: b.n === 1 ? ACCENT : FG, align: "left" });
        const x0 = r.x + 130;
        ctx.strokeStyle = b.n === 1 ? ACCENT : "#6b6560";
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x0, b.y);
        ctx.lineTo(x0 + b.len * g, b.y);
        ctx.stroke();
        for (let i = 0; i < b.n; i++) {
          const px = x0 + (b.len / b.n) * i;
          if (px > x0 + b.len * g) continue;
          ctx.beginPath();
          ctx.arc(px, b.y, 16, 0, Math.PI * 2);
          ctx.fillStyle = b.n === 1 ? ACCENT : FG;
          ctx.fill();
          text(ctx, "?", px, b.y + 1, { size: 22, weight: 900, color: "#000" });
        }
        if (g >= 1) {
          ctx.beginPath();
          ctx.arc(x0 + b.len, b.y, 18, 0, Math.PI * 2);
          ctx.fillStyle = b.n === 1 ? ACCENT : "#6b6560";
          ctx.fill();
          text(ctx, "✓", x0 + b.len, b.y + 1, { size: 22, weight: 900, color: "#fff" });
        }
        text(ctx, b.note, x0, b.y + 50, { size: 26, color: MUTED, align: "left", alpha: g });
      });
      ctx.restore();
    }

    // 第四段末尾：最后一版话术里，六句话各自答掉了哪一次追问
    function sceneReveal(ctx, lay, u) {
      const [t0, t1] = m.reveal;
      const a = win(u, t0, t1, 0.45);
      if (a <= 0) return;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(8,7,6,0.9)";
      ctx.fillRect(0, 0, W, H);
      const cardX = 760;
      const cardY = 250;
      const cardW = 1040;
      rr(ctx, cardX, cardY - 90, cardW, 620, 16);
      ctx.fillStyle = P.paper;
      ctx.fill();
      text(ctx, "2.", cardX + 40, cardY - 44, { size: 28, color: P.digit, align: "left", font: MONO });
      text(ctx, "已登记", cardX + 84, cardY - 44, { size: 32, weight: 800, color: P.title, align: "left" });
      const lay2 = layout(ctx, V6, cardW - 80, 40, 600);
      const ranges = ANSWERS.map((s) => {
        const at = V6.indexOf(s);
        return [chars(V6.slice(0, at)).length, chars(s).length];
      });
      const lit = (k) => sm(t0 + 1.6 + k * 1.0, t0 + 1.9 + k * 1.0, u);
      const hl = (i) => {
        for (let k = 0; k < ranges.length; k++) {
          const [s, len] = ranges[k];
          if (i >= s && i < s + len && lit(k) > 0) return `rgba(255,107,44,${0.3 * lit(k)})`;
        }
        return null;
      };
      drawLayout(ctx, lay2, cardX + 40, cardY + 10, 70, { size: 40, weight: 600, color: P.ink, hl });
      ROUNDS.forEach((r, k) => {
        const e = sm(t0 + 0.3 + k * 0.12, t0 + 0.7 + k * 0.12, u, easeOut);
        const y = 210 + k * 104;
        const on = lit(k);
        ctx.save();
        ctx.globalAlpha *= e;
        setFont(ctx, 32, 700);
        const w = ctx.measureText(r.ask).width + 44;
        const x = 600 - w - (1 - e) * 40;
        rr(ctx, x, y - 32, w, 64, 12);
        ctx.fillStyle = on > 0.5 ? "#fff" : "#2a2623";
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = on > 0.5 ? ACCENT : "#4a4440";
        ctx.stroke();
        text(ctx, r.ask, x + 22, y + 1, { size: 32, weight: 700, color: on > 0.5 ? "#1a1a1a" : MUTED, align: "left" });
        ctx.restore();
        if (on > 0) {
          const c = caretAt(lay2, ranges[k][0], 70);
          const tx = cardX + 40 + c.x;
          const ty = cardY + 10 + c.y + 35;
          ctx.save();
          ctx.globalAlpha *= on;
          ctx.strokeStyle = ACCENT;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(606, y);
          ctx.bezierCurveTo(680, y, tx - 60, ty, tx - 4, ty);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(tx - 4, ty, 6, 0, Math.PI * 2);
          ctx.fillStyle = ACCENT;
          ctx.fill();
          ctx.restore();
        }
      });
      ctx.restore();
    }

    // 海量的这类客户：一格一个顾客，双击一下话术，回过来的都是「好的谢谢」、OK、爱心、拜拜、飞吻、花……
    function tile(ctx, tl, u) {
      const k = u - tl.at;
      if (k < 0) return;
      const s = tl.w / 420;
      ctx.save();
      ctx.translate(tl.x + tl.w / 2, tl.y + tl.h / 2);
      const pop = easeBack(clamp(k / 0.25, 0, 1));
      ctx.scale(s * 0.94 * pop, s * 0.94 * pop);
      ctx.translate(-210, -190);
      rr(ctx, 0, 0, 420, 380, 18);
      ctx.fillStyle = C.bg;
      ctx.fill();
      ctx.save();
      rr(ctx, 0, 0, 420, 380, 18);
      ctx.clip();
      ctx.fillStyle = C.head;
      ctx.fillRect(0, 0, 420, 58);
      const name = NAMES[tl.n % NAMES.length];
      avatar(ctx, 14, 8, chars(name)[0], false);
      text(ctx, `顾客 · ${name}`, 80, 30, { size: 24, weight: 700, color: "#1a1a1a", align: "left" });
      // 自己发出的那条话术
      const out = clamp((k - 0.12) / 0.2, 0, 1);
      if (out > 0) {
        ctx.save();
        ctx.globalAlpha *= out;
        rr(ctx, 120, 76, 280, 132, 10);
        ctx.fillStyle = ACCENT;
        ctx.fill();
        const lay2 = layout(ctx, V6.replace(/\n/g, ""), 248, 20);
        drawLayout(ctx, lay2, 136, 86, 28, { size: 20, color: "#fff", maxLines: 4 });
        ctx.restore();
      }
      // 顾客一次性回复
      const back = easeBack(clamp((k - 0.42) / 0.25, 0, 1));
      if (back > 0) {
        const rep = tl.reply;
        if (rep.text) {
          ctx.save();
          scaleAt(ctx, 20, 260, back);
          setFont(ctx, 32, 600);
          const w = ctx.measureText(rep.text).width + 40;
          rr(ctx, 20, 232, w, 62, 10);
          ctx.fillStyle = C.in;
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = C.line;
          ctx.stroke();
          text(ctx, rep.text, 40, 264, { size: 32, weight: 600, color: C.inFg, align: "left" });
          ctx.restore();
        } else sticker(ctx, rep.sticker, 90, 290, 140 * back, u);
        // 已解决
        const done = sm(tl.at + 0.7, tl.at + 0.9, u, easeBack);
        if (done > 0) {
          ctx.beginPath();
          ctx.arc(372, 330, 26 * done, 0, Math.PI * 2);
          ctx.fillStyle = ACCENT;
          ctx.fill();
          text(ctx, "✓", 372, 331, { size: 30, weight: 900, color: "#fff", alpha: clamp(done, 0, 1) });
        }
      }
      ctx.restore();
      ctx.restore();
      // 双击涟漪
      if (k < 0.35) {
        ctx.beginPath();
        ctx.arc(tl.x + tl.w * 0.7, tl.y + tl.h * 0.35, (10 + k * 120) * s, 0, Math.PI * 2);
        ctx.lineWidth = 4 * s + 1;
        ctx.strokeStyle = `rgba(255,154,92,${1 - k / 0.35})`;
        ctx.stroke();
      }
    }
    function sceneMontage(ctx, u) {
      const [t0, t1] = m.montage;
      if (u < t0 || u > t1 + 0.6) return;
      const a = win(u, t0, t1 + 0.6, 0.4);
      ctx.save();
      ctx.globalAlpha = a;
      for (const tl of tiles) {
        if (u < tl.from || u > tl.to + 0.4) continue;
        const wa = win(u, tl.from, tl.to + 0.4, 0.4);
        ctx.save();
        ctx.globalAlpha *= wa;
        tile(ctx, tl, u);
        ctx.restore();
      }
      // 计数器：解决了多少位顾客（三拨加起来）
      const solved = tiles.filter((tl) => u >= tl.at + 0.4).length;
      text(ctx, "双击一下话术", 140, 82, { size: 40, weight: 800, color: FG, align: "left" });
      text(ctx, `已解决 ${solved} 位顾客`, W - 140, 82, { size: 40, weight: 800, color: ACCENT, align: "right", font: SANS });
      ctx.restore();
    }

    // 片尾
    function sceneEnd(ctx, u) {
      const [t0] = m.end;
      if (u < t0) return;
      const real = win(u, t0 + 0.2, t0 + 3.6, 0.4);
      text(ctx, L.real, W / 2, H / 2, { size: 72, weight: 800, color: FG, alpha: real });
      const b = sm(t0 + 3.6, t0 + 4.2, u, easeBack);
      if (b <= 0) return;
      glow(ctx, W / 2, 330, 420, "rgba(255,107,44,0.7)", 0.4 * clamp(b, 0, 1));
      if (logo.complete && logo.naturalWidth) {
        const bob = Math.sin(u * 2.4) * 8;
        ctx.save();
        ctx.globalAlpha = clamp(b, 0, 1);
        ctx.drawImage(logo, W / 2 - 100 * b, 330 - 112 * b + bob, 200 * b, 225 * b);
        ctx.restore();
      }
      const name = "话术精灵";
      chars(name).forEach((c, i) => {
        const d = sm(t0 + 4.0 + i * 0.08, t0 + 4.4 + i * 0.08, u, easeBack);
        text(ctx, c, W / 2 + (i - 1.5) * 150, 560 - (1 - d) * 60, { size: 140, weight: 900, color: FG, alpha: clamp(d, 0, 1) });
      });
      text(ctx, L.value, W / 2, 680, { size: 54, weight: 800, color: ACCENT, alpha: sm(t0 + 4.8, t0 + 5.2, u) });
      const w = sm(t0 + 5.6, t0 + 6.1, u, easeBack);
      if (w > 0) {
        ctx.save();
        ctx.globalAlpha = clamp(w, 0, 1);
        scaleAt(ctx, W / 2, 820, 0.9 + 0.1 * w);
        rr(ctx, W / 2 - 330, 780, 660, 84, 42);
        ctx.fillStyle = ACCENT;
        ctx.fill();
        text(ctx, `加我微信  ${L.wechat}`, W / 2, 823, { size: 44, weight: 800, color: "#000" });
        ctx.restore();
      }
      text(ctx, "luyao2089.cc   ·   Windows 本地永久免费", W / 2, 950, { size: 30, color: MUTED, alpha: sm(t0 + 6.3, t0 + 6.8, u) });
    }

    function vignette(ctx) {
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.6, W / 2, H / 2, H * 1.2);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    function render(ctx, u) {
      ctx.save();
      background(ctx, u);
      const lay = layoutAt(u);
      const cur = cursorAt(ctx, lay, u);
      sceneIntro(ctx, u);
      drawChat(ctx, lay, u);
      drawApp(ctx, lay, u, cur);
      drawSteps(ctx, lay, u);
      sceneTimeline(ctx, lay, u);
      sceneCard(ctx, lay, u);
      sceneCompare(ctx, lay, u);
      drawKeys(ctx, lay, u);
      drawCursor(ctx, lay, u, cur);
      drawBulb(ctx, lay, u);
      sceneReveal(ctx, lay, u);
      sceneMontage(ctx, u);
      sceneEnd(ctx, u);
      drawHead(ctx, u);
      drawCaps(ctx, u);
      vignette(ctx);
      ctx.restore();
    }

    return { TL, render };
  }

  // 小精灵图（标题栏与片尾）：加载好之前这两处先不画
  const logo = typeof Image === "function" ? new Image() : { complete: false };

  // ---------- 声音：Web Audio 现合成 ----------
  class Synth {
    constructor() {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.85;
      this.comp = this.ctx.createDynamicsCompressor();
      this.comp.threshold.value = -16;
      this.comp.ratio.value = 4;
      this.master.connect(this.comp);
      this.comp.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      let seed = 7;
      for (let i = 0; i < len; i++) {
        seed = (seed * 16807) % 2147483647;
        d[i] = (seed / 2147483647) * 2 - 1;
      }
      this.verb = this.ctx.createGain();
      this.verb.gain.value = 0.22;
      const d1 = this.ctx.createDelay(1);
      d1.delayTime.value = 0.21;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.32;
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 2800;
      this.verb.connect(d1);
      d1.connect(lp);
      lp.connect(fb);
      fb.connect(d1);
      lp.connect(this.master);
    }
    stream() {
      if (!this.dest) {
        this.dest = this.ctx.createMediaStreamDestination();
        this.comp.connect(this.dest);
      }
      return this.dest.stream;
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
    // t：开始时刻；k：时间缩放；skip：从中间开始时这个长音已经过去的秒数
    play(e, t, k, out, skip = 0) {
      const a = e.arg;
      const v = a.v ?? 1;
      switch (e.type) {
        case "msgIn": {
          const g = this.gain(out);
          this.env(g, t, 0.004, 0.16, 0.16);
          this.osc("sine", NOTE(88), t, t + 0.09, g);
          this.osc("sine", NOTE(83), t + 0.08, t + 0.26, g);
          break;
        }
        case "msgOut": {
          const g = this.gain(out);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
          const f = this.filter("bandpass", 900, 1.5, g);
          f.frequency.exponentialRampToValueAtTime(4000, t + 0.2);
          this.noiseSrc(t, t + 0.25, f);
          const g2 = this.gain(out);
          this.env(g2, t + 0.12, 0.004, 0.1, 0.14);
          this.osc("triangle", NOTE(91), t + 0.12, t + 0.3, g2);
          break;
        }
        case "key": {
          const g = this.gain(out);
          this.env(g, t, 0.001, 0.09 * v, 0.03);
          this.noiseSrc(t, t + 0.05, this.filter("bandpass", 3200 + v * 1500, 2, g));
          break;
        }
        case "click": {
          const g = this.gain(out);
          this.env(g, t, 0.001, 0.14, 0.025);
          this.osc("square", 1800, t, t + 0.04, this.filter("highpass", 1200, 1, g));
          break;
        }
        case "enter": {
          const g = this.gain(out);
          this.env(g, t, 0.002, 0.22, 0.08);
          this.noiseSrc(t, t + 0.1, this.filter("lowpass", 1400, 1, g));
          break;
        }
        case "paste": {
          const g = this.gain(out);
          this.env(g, t, 0.003, 0.14, 0.18);
          const o = this.osc("sine", NOTE(72), t, t + 0.25, g);
          o.frequency.exponentialRampToValueAtTime(NOTE(84), t + 0.12);
          break;
        }
        case "ding": {
          [0, 0.09, 0.18].forEach((d, i) => {
            const g = this.gain(out);
            this.env(g, t + d, 0.003, 0.16, 0.9);
            const f = NOTE([84, 88, 91][i]);
            this.osc("sine", f, t + d, t + d + 1.0, g);
            this.osc("sine", f * 2.76, t + d, t + d + 0.4, this.filter("lowpass", 6000, 1, g));
          });
          break;
        }
        case "chime":
        case "blip": {
          const g = this.gain(out);
          const len = e.type === "chime" ? 0.8 : 0.18;
          this.env(g, t, 0.003, (e.type === "chime" ? 0.18 : 0.12) * v, len);
          this.osc("sine", NOTE(a.n), t, t + len + 0.05, g);
          if (e.type === "chime") this.osc("sine", NOTE(a.n) * 2, t, t + 0.3, g);
          break;
        }
        case "save": {
          [0, 0.1].forEach((d, i) => {
            const g = this.gain(out);
            this.env(g, t + d, 0.003, 0.14, 0.3);
            this.osc("triangle", NOTE([79, 84][i]), t + d, t + d + 0.35, g);
          });
          break;
        }
        case "pop": {
          const g = this.gain(out);
          this.env(g, t, 0.002, 0.14 * v, 0.1);
          const o = this.osc("sine", NOTE(a.n || 76), t, t + 0.14, g);
          o.frequency.exponentialRampToValueAtTime(NOTE((a.n || 76) + 7), t + 0.06);
          break;
        }
        case "whoosh": {
          const len = Math.max(0.1, (e.dur || 0.5) * k - skip);
          const g = this.gain(out);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.14, t + len * 0.6);
          g.gain.exponentialRampToValueAtTime(0.0001, t + len);
          const f = this.filter("bandpass", 500, 1.2, g);
          f.frequency.exponentialRampToValueAtTime(3500, t + len);
          this.noiseSrc(t, t + len + 0.05, f);
          break;
        }
        case "tick":
        case "tock": {
          const g = this.gain(out);
          this.env(g, t, 0.001, 0.2, 0.05);
          this.osc("sine", e.type === "tick" ? 1500 : 1100, t, t + 0.08, g);
          break;
        }
        case "yawn": {
          // 等到了：一声慢悠悠往下滑的「终于……」
          const g = this.gain(out);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.1, t + 0.08);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
          const o = this.osc("triangle", NOTE(76), t, t + 0.65, this.filter("lowpass", 1800, 1, g));
          o.frequency.exponentialRampToValueAtTime(NOTE(67), t + 0.55);
          break;
        }
        case "sad": {
          // 「整个时间流程花费非常长」：三声往下走的长号
          [0, 0.35, 0.7].forEach((d, i) => {
            const g = this.gain(out);
            const len = i === 2 ? 0.7 : 0.3;
            g.gain.setValueAtTime(0.0001, t + d);
            g.gain.exponentialRampToValueAtTime(0.12, t + d + 0.04);
            g.gain.exponentialRampToValueAtTime(0.0001, t + d + len);
            const f = this.filter("lowpass", 1100, 2, g);
            const o = this.osc("sawtooth", NOTE([62, 61, 60][i]), t + d, t + d + len + 0.05, f);
            if (i === 2) o.frequency.linearRampToValueAtTime(NOTE(58), t + d + len);
          });
          break;
        }
        case "kick": {
          const g = this.gain(out);
          this.env(g, t, 0.003, 0.6 * v, 0.3);
          const o = this.osc("sine", 130, t, t + 0.4, g);
          o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
          break;
        }
        case "hat": {
          const g = this.gain(out);
          this.env(g, t, 0.002, 0.08 * v, 0.05);
          this.noiseSrc(t, t + 0.1, this.filter("highpass", 8000, 0.7, g));
          break;
        }
        case "snap": {
          const g = this.gain(out);
          this.env(g, t, 0.002, 0.2, 0.08);
          this.noiseSrc(t, t + 0.12, this.filter("bandpass", 2000, 2, g));
          break;
        }
        case "bass": {
          const len = (e.dur || 0.5) * k;
          const g = this.gain(out);
          this.env(g, t, 0.01, 0.16 * v, len);
          this.osc("triangle", NOTE(a.n), t, t + len + 0.05, this.filter("lowpass", 600, 1, g));
          break;
        }
        case "pluck": {
          const g = this.gain(out);
          this.env(g, t, 0.003, 0.07 * v, 0.2);
          const f = this.filter("lowpass", 3000, 3, g);
          f.frequency.exponentialRampToValueAtTime(700, t + 0.18);
          this.osc("square", NOTE(a.n), t, t + 0.25, f);
          break;
        }
        case "pad":
        case "swell": {
          const len = (e.dur || 2) * k - skip;
          if (len <= 0.05) break;
          const g = this.gain(out);
          const peak = (e.type === "swell" ? 0.06 : 0.035) * v;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.5, len / 3));
          g.gain.setValueAtTime(peak, t + len * 0.7);
          g.gain.exponentialRampToValueAtTime(0.0001, t + len);
          const f = this.filter("lowpass", a.long || e.type === "swell" ? 2400 : 1200, 1, g);
          (a.notes || [48, 55, 60, 64, 67]).forEach((n) => {
            [-6, 6].forEach((det) => {
              const o = this.osc("sawtooth", NOTE(n), t, t + len + 0.05, f);
              o.detune.value = det;
            });
          });
          break;
        }
        default:
          break;
      }
    }
  }

  function mount(root) {
    const film = makeFilm();
    const base = film.TL.base;
    logo.src = root.dataset.logo || "assets/logo.png";
    const { refresh, ...api } = window.mountFilm(root, {
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
      base,
      duration: base,
      width: W,
      height: H,
      still: 4.2, // 封面停在片头「补运费登记案例」上
      label: `推广视频《补运费登记案例》（${Math.floor(base / 60)} 分 ${base % 60} 秒，有声）：没有话术时客服问一句、顾客等很久才回一句，整个流程花费非常长；其实一条话术就能一次问齐；用话术精灵新增、编辑、双击、发送；顾客一句句追问，客服每次灵机一动把答案补进同一条话术；从此顾客一次性回「好的谢谢」、OK、爱心、拜拜、飞吻、花。片尾：话术精灵，节约时间，快速高效率，微信 luyao2089。`,
      cover: { text: "播放 · 补运费登记案例 · 有声", again: "再看一遍" },
      render: film.render,
      score: film.TL.score,
      createSynth: () => new Synth(),
      fullscreen: true,
      record: { filename: "话术精灵-补运费登记案例" },
    });
    logo.addEventListener("load", refresh);
    root.freightFilm = api;
  }

  // 测试钩子：Node 里没有 document，只把时间线与渲染交出去
  if (typeof document === "undefined") {
    globalThis.__freightFilm = makeFilm;
    return;
  }
  document.querySelectorAll("[data-freight-film]").forEach(mount);
})();
