// 推广视频「补运费登记案例」（知识分享第一期）：整片用 Canvas 2D 现画、声音用 Web Audio 现合成，没有视频文件、没有音频文件。
// 剧本是 GitHub issue #4 的原文，屏幕上的对白、话术、旁白一字不改照抄（见下面的 L 与 V1–V6）；issue #16 砍掉的段落，字也一并删掉了。
// 画面与声音都是剧本时间 u 的函数：拖到哪一秒都能还原同一帧；时间线在加载时由 build() 按剧本顺序排出来。
//
// 竖屏 1080×1920（issue #9：抖音手机上的竖屏比例）。摆法照真电脑（issue #16）：商家工作台在左、话术精灵磁吸在它右边，
// 不因为画布是竖的就改成上下；全景按真实比例占满宽度、上下留白，要看字时镜头推近、看完退回全景。
// 开场不放片头（issue #16：观众只有两秒耐心）：第一帧就是顾客发来消息，钩子问话作为标题条同时挂在画面顶上，之后收成一条题目条挂到片尾。
// 整片没有「整屏只有字」的画面（issue #16）：能演的不说，一段里没有新东西出现就压短；灯泡只是叠在画面上的提示，不停下来等。
//
// 挂到任何页面：放一个容器 <div class="promo promo--tall" data-freight-film></div>，引 assets/css/promo-film.css（播放器外框与宣传片同一套）
// 与 assets/js/film-engine.js、assets/js/freight-film.js（都 defer，引擎在前）。播放器（封面、控制条、时钟、声音排程、全屏）在 film-engine.js。
(() => {
  const W = 1080;
  const H = 1920;
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
  // 聊天窗：默认是微信样子（issue #8）——自己发的气泡是微信绿 + 深字、发送键是微信绿；
  // 原来的品牌橙会和「灵机一动」的橙色底撞成一片，橙色只留给话术精灵自己的动作（灯泡、双击、贴入闪光）
  const C = { bg: "#ededed", head: "#f7f7f7", line: "#e3e3e3", in: "#ffffff", inFg: "#1a1a1a", sub: "#8a8a8a", note: "#a54626" };
  // 平台聊天窗（issue #11）：照真实的商家工作台画——京东咚咚、千牛（天猫）、拼多多商家版、抖店飞鸽（assets/js/platform-chat.js），
  // 顶栏店铺页签、左侧导航、聊天头、工具栏、发送键、底边贴着的话术精灵吸附栏；平台名与标志一律不画，客服一眼认得出就够了。
  // 不画会话列表（issue #16 老板看片后定：完整工作台竖屏放不下，只留店铺页签、导航、聊天区）。
  // 窗口按「原生像素 ×2」画（PLAT_K），聊天栏（消息区 + 输入区）是 lay.chat 那块矩形，导航栏与顶栏围着它往外画。
  const PLATFORMS = ["jd", "tm", "pdd", "dy"];
  const PLAT_K = 2;
  const BENCH_OPTS = { list: false }; // 工作台外壳：不画会话列表（量尺寸与画图用同一份）
  const PLAT_SHOPS = [{}, {}, {}]; // 顶栏上开着的几家店
  const skin = (plat) => globalThis.PlatformChat.SKINS[plat];
  // 聊天头 41（原生）＝ 82；拼多多聊天头下面还有一条红色的售后义务提醒
  const msgTop = (plat) => 82 + (plat === "pdd" ? 60 : 0);
  // 输入框里第一行字的位置：拼多多输入框上面多一条服务用语提醒
  const inputTextY = (plat) => 58 + (plat === "pdd" ? 44 : 0);
  // 一窗接一窗的第一位顾客：先说一句、发运费截图 → 单击纸飞机 → 回一句真满意的话（不是「好的」和表情那种模板回复）
  const FIRST = { plat: "dy", who: "顾客 · 晴天", ask: "运费补了，截图给你", back: "第一次遇到讲这么明白的客服，好评！" };

  // ---------- 剧本原文（issue #4，一字不改） ----------
  const L = {
    // 开场钩子（issue #5）：第一帧就在画面上，客服一眼认出是不是自己的事；题目（title）从头到尾挂在顶上（issue #16）
    hook: ["补运费，你还在", "一句一句", "问顾客？"],
    title: "补运费登记案例",
    intro: "分享客服工作中遇到的问题，我是如何解决这些问题的",
    h1: "一开始，没有话术的时候",
    c1: "那你们收到货后给我退运费",
    a1: "提供下收款方式",
    a2: "收款人姓名是？",
    wait1: "这时候客户可能也没时间回复",
    a3: "麻烦提供下运费支付的截图",
    wait2: "又过了很长时间后",
    one: "亲，麻烦提供下收款方式和姓名+运费支付后截图，我这边登记给财务安排打款哦~",
    h3: "后面用了话术精灵",
    bulb3: "客服突然有灵感了",
    h4: "然后没有话术精灵的时候",
    ok: "好的",
    bulb: "灵机一动",
    attitude: "（其实客户想要知道我们的态度。）",
    h5: "然后从此发送这个话术后",
    thanks: "好的谢谢",
    montage: "通过话术精灵一次性双击话术，然后就把客户的问题解决了。",
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
  // 最后一版里，每一句对上的是哪一次追问（老王那次发出去的气泡上一次全亮，只做高亮、标序号，不加字）
  const ANSWER_AT = 0.35; // 气泡出来后多久开始亮
  const ANSWER_GAP = 0.07; // 六句之间错开一点点，看得出是六处，但等于一下全亮
  const ANSWERS = ["我已经帮您登记了", "请放心不会遗漏的～", "一般7个工作日左右", "后续会有专门的同事统一处理", "返到您余额里", "辛苦您耐心等候一下，我们会积极跟进的哦！"];
  // 「有的客户是直接发个OK表情，有的是发个好的，有的是发一个爱心，有的是发个拜拜表情，有是的发个飞吻，有是的发个花」
  // issue #8：再多一些看得出是真满意的文字回复，和表情穿插着来
  const REPLIES = [{ text: L.thanks }, { sticker: "ok" }, { text: "一次说清楚，太省心了" }, { sticker: "heart" }, { text: "服务真贴心，好评！" }, { sticker: "bye" }, { text: "这么快就登记好了" }, { sticker: "kiss" }, { text: "讲得很明白，放心了" }, { sticker: "flower" }, { text: "下次还来你家买" }, { text: "好的" }];
  const NAMES = ["小陈", "阿杰", "Lily", "老王", "小美", "大鹏", "安安", "Coco", "阿强", "糖糖", "小鱼", "老李", "木木", "Kiki", "阿峰", "晴天", "小周", "豆豆", "阿May", "大海"];

  // ---------- 数学 ----------
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeBack = (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
  const sm = (a, b, u, e = easeIO) => e(clamp((u - a) / (b - a), 0, 1));
  const win = (u, a, b, f = 0.3) => sm(a, a + f, u) * (1 - sm(b - f, b, u));
  // 节奏旋钮（issue #16）：打字快慢、镜头快慢各一个数，老板看片嫌快嫌慢只改这里
  const TYPE_SPEED = 1.8; // 打字速度倍率：每个字的间隔都除以它
  const CAM_SPEED = 1.6; // 镜头速度倍率：剧本里每一拍推拉的时长都除以它（再快也不超过 PAN_MAX / ZOOM_MAX 的限速）
  const rnd = (i) => {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const chars = (s) => Array.from(s);
  const ANSWER_RANGES = ANSWERS.map((s) => [chars(V6.slice(0, V6.indexOf(s))).length, chars(s).length]); // 六句话在 V6 里 里第几个字起、几个字
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
    const flies = []; // 双击话术行：那条话术从话术精灵飞进聊天输入框（看得出是另一个软件把字送过去的）
    const score = [];
    const shots = []; // 镜头：每一拍对准什么（target）、几秒推过去（dur）；makeFilm 里换算成取景框
    const turns = []; // 翻页：{ from, to }（assets/js/film-page-turn.js）
    const m = {}; // 各段的起止时刻
    let t = 0;
    let sess = null;
    let bulbCount = 0;
    const sfx = (u, type, arg = {}, dur = 0) => score.push({ u, type, arg, dur });
    const shot = (target, dur = 0.9, at = t) => shots.push({ at, dur: dur / CAM_SPEED, target });

    let app = { rows: [], sel: -1, dialog: null, menu: null, flash: null };
    const appSet = (patch) => {
      app = { ...app, ...patch };
      appKeys.push({ at: t, st: app });
    };
    appSet({});
    const dlg = (patch) => appSet({ dialog: { ...app.dialog, ...patch } });
    const inputSet = (text, o = {}) => inputs[sess].push({ at: t, text, focus: o.focus ?? true, flash: o.flash ?? null });

    const session = (id, who, plat) => {
      sess = id;
      sessions.push({ at: t, id, who, plat });
      inputs[id] = [{ at: t, text: "", focus: false, flash: null }];
    };
    const scene = (mode) => scenes.push({ at: t, mode });
    const head = (text, n) => heads.push({ at: t, text, n });
    const cap = (text, from, to, tone) => caps.push({ from, to, text, tone });
    const readT = (s) => 0.8 + chars(s).length * 0.085;
    const say = (side, text, o = {}) => {
      msgs.push({ s: sess, at: t, side, kind: o.kind || "text", text, note: o.note, bars: o.bars, sticker: o.sticker, answers: o.answers });
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
        t += (0.1 + rnd(i * 3 + t) * 0.06) / TYPE_SPEED;
      });
      t += 0.3;
    };
    const send = (text, hold, o = {}) => {
      keys.push({ at: t, label: "Enter" });
      sfx(t, "enter");
      inputSet("", { focus: false });
      t += 0.12;
      say("out", text, { ...o, hold });
    };
    // 鼠标：ref 是界面上的一个位置（每帧现量，所以窗口在动时也停在目标上）
    const move = (ref, dur = 0.55) => {
      t += dur;
      cur.push({ at: t, dur, ref });
      t += 0.08;
    };
    const hideCursor = () => cur.push({ at: t, dur: 0, ref: null });
    const click = (kind = "l") => {
      const key = cur[cur.length - 1];
      clicks.push({ at: t, key, kind });
      if (kind === "dbl" && typeof key.ref === "string" && key.ref.startsWith("row:")) flies.push({ at: t + 0.12, key });
      sfx(t, "click");
      if (kind === "dbl") {
        sfx(t + 0.12, "click");
        t += 0.35;
      } else t += 0.22;
    };
    // 「灵机一动」第几次（第二次起标 ×N）。只是叠在画面上的提示（issue #16）：亮 1.5 秒自己消失，不占进度，操作照常往下走
    const bulb = (label) => {
      bulbs.push({ at: t, label, n: label === L.bulb ? ++bulbCount : 1 });
      sfx(t, "ding");
    };
    // 翻页（issue #18）：换到不相干的画面（换了一位顾客、一家平台）。旧画面定格在 from，新画面从 to 开始（中间那一下快切被翻页盖住）
    const pageTurn = () => {
      turns.push({ from: t, to: t + CUT });
      t += CUT;
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
        t += (0.065 + rnd(i * 5 + t) * 0.04) / TYPE_SPEED;
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
          t += 0.06 / TYPE_SPEED;
        }
        let p = pos;
        ins.forEach((c, i) => {
          now.splice(p, 0, c);
          p++;
          dlg({ body: now.join(""), ci: p });
          sfx(t, "key", { v: 0.35 + rnd(i + 70) * 0.3 });
          t += (0.065 + rnd(i * 7 + t) * 0.04) / TYPE_SPEED;
        });
        pos = p;
        t += 0.2;
      }
    };
    const saveDialog = (rows, i, next, hold) => {
      move("dlg:save", 0.45);
      click();
      appSet({ dialog: null, rows, sel: i, flash: { i, at: t } });
      shot(next, 0.9);
      sfx(t, "save");
      t += hold;
    };

    // ① 一开始，没有话术的时候：问一句、等一阵，一共三轮。
    // 没有片头（issue #16）：第 0 秒镜头已经对准聊天窗，顾客的第一句马上进来；钩子问话是顶上的标题条（m.hook），
    // 挂到第一次干等开始时收成顶上一条细的题目条，从此一直挂到片尾（drawTopic）
    scene("solo");
    head(L.h1, "01");
    session("A", "顾客 · 小陈", "tm");
    shot("chat", 0);
    stamp("10:02");
    say("in", L.c1);
    typeChat(L.a1);
    send(L.a1, 1.0);
    say("in", null, { kind: "redact", bars: [[64, 96, 96, 80]], note: "收款方式", hold: 1.4 });
    typeChat(L.a2);
    send(L.a2, 0.7);
    m.hook = [0, t];
    waitLong(L.wait1, 10 * 60 + 4, 11 * 60 + 37, 3.4);
    stamp("11:37");
    say("in", null, { kind: "redact", bars: [[72]], note: "姓名", hold: 1.3 });
    typeChat(L.a3);
    send(L.a3, 0.7);
    waitLong(L.wait2, 11 * 60 + 38, 15 * 60 + 16, 3.4);
    stamp("15:16");
    say("in", null, { kind: "shot", note: "运费截图", hold: 1.4 });

    // ② 后面用了话术精灵：灵感来了 → 新增话术 → 编辑 → 双击 → 发送（issue #16：原来中间那块时间线、话术卡片整屏板子砍掉，
    // 一条话术问齐、顾客一次给齐，靠这一段演出来）。换了一位顾客、一家平台：翻页过去
    pageTurn();
    head(L.h3, "02");
    session("B", "顾客 · 阿杰", "jd");
    m.s2 = [t, 0];
    shot("chat", 0);
    t += 0.3;
    say("in", L.c1, { hold: 1.4 });
    bulb(L.bulb3);
    // 话术精灵来了：先退到全景看清「聊天窗在左、话术精灵啪地吸在右边」，再推近它的「＋」（灯泡只是提示，不等它）
    scene("duo");
    shot("wide", 0.8);
    t += 0.6;
    shot("app:plus", 0.9);
    steps.push({ at: t, n: 0 });
    move("plus", 0.7);
    click();
    appSet({ dialog: { mode: "新增话术", title: "", body: "", caret: "title", ci: 0 } });
    shot("dlg:title", 0.8);
    sfx(t, "whoosh", {}, 0.35);
    t += 0.3;
    steps.push({ at: t, n: 1 });
    move("dlg:title", 0.4);
    click();
    typeField("title", "补运费登记");
    shot("dlg:body", 0.7);
    move("dlg:body", 0.4);
    click();
    dlg({ caret: "body", ci: 0 });
    typeField("body", L.one);
    saveDialog([{ title: "补运费登记", text: L.one }], 0, "row:0", 0.5);
    steps.push({ at: t, n: 2 });
    move("row:0", 0.6);
    shot("chat", 0.9); // 双击那一下就开始摇向聊天窗（缓入，头 0.3 秒几乎不动），话术贴进输入框时镜头已经到了
    click("dbl");
    appSet({ sel: 0 });
    inputSet(L.one, { flash: t });
    sfx(t, "paste");
    t += 1.2;
    steps.push({ at: t, n: 3 });
    send(L.one, 1.6);
    say("in", null, { kind: "redact", bars: [[64, 96, 96, 80], [72]], note: "收款方式和姓名", hold: 0.6 });
    say("in", null, { kind: "shot", note: "运费支付后截图", hold: 1.2 });
    steps.push({ at: t, n: 4 });
    sfx(t - 0.8, "chime", { n: 84 });
    m.s2[1] = t;

    // ③ 然后没有话术精灵的时候：顾客一句句追问，客服每回答一次就灵机一动，把答案补进同一条话术。
    // 灯泡只是叠在画面上的提示（issue #16）：亮起来的同时镜头已经往话术精灵走，不停下来等它
    hideCursor();
    pageTurn();
    scene("cut");
    head(L.h4, "03");
    session("C", "顾客 · Lily", "pdd");
    shot("chat", 0);
    t += 0.3;
    say("in", null, { kind: "shot", note: "运费截图", hold: 1.3 });
    typeChat(L.ok);
    send(L.ok, 0.9);
    ROUNDS.forEach((r, i) => {
      say("in", r.ask, { hold: 1.3 });
      if (r.note) {
        cap(r.note, t - 0.9, t + 3.4, "note");
        t += 0.9;
      }
      if (i > 0) {
        move("chat:input", 0.45);
        click();
      }
      typeChat(r.reply);
      send(r.reply, 0.6);
      bulb(L.bulb);
      if (i === 0) {
        scene("duo");
        shot("wide", 0.8);
        t += 0.6;
        shot("app:plus", 0.9);
        move("plus", 0.7);
        click();
        appSet({ dialog: { mode: "新增话术", title: "", body: "", caret: "title", ci: 0 } });
        shot("dlg:title", 0.8);
        sfx(t, "whoosh", {}, 0.35);
        t += 0.3;
        move("dlg:title", 0.4);
        click();
        typeField("title", "已登记");
        shot("dlg:body", 0.7);
        move("dlg:body", 0.4);
        click();
        dlg({ caret: "body", ci: 0 });
        typeField("body", r.v);
      } else {
        shot("app:menu", 0.8);
        move("row:1", 0.55);
        click("r");
        appSet({ menu: { row: 1 }, sel: 1 });
        t += 0.1;
        move("menu:edit", 0.3);
        click();
        appSet({ menu: null, dialog: { mode: "编辑话术", title: "已登记", body: ROUNDS[i - 1].v, caret: "body", ci: chars(ROUNDS[i - 1].v).length } });
        shot("dlg:body", 0.7);
        sfx(t, "whoosh", {}, 0.35);
        t += 0.15;
        editBody(r.v);
      }
      // 存好以后马上回聊天窗：镜头还在往回走，顾客的下一句已经进来
      saveDialog([app.rows[0], { title: "已登记", text: r.v }], 1, i < ROUNDS.length - 1 ? "chat" : "row:1", 0.5);
    });
    hideCursor();

    // ④ 然后从此发送这个话术后：双击 → 回车 → 顾客一次性「好的谢谢」。
    // 原来的六问对照整屏板子砍掉（issue #16）：发出去的那个气泡上，六句话一次全亮（对上前面六次追问），顾客一次就满意
    t += 0.4; // 第六版存好、那一行闪一下
    pageTurn();
    head(L.h5, "04");
    session("D", "顾客 · 老王", "dy");
    shot("chat", 0);
    t += 0.3;
    say("in", null, { kind: "shot", note: "运费截图", hold: 0.7 });
    shot("row:1", 0.8);
    move("row:1", 0.7);
    shot("chat", 0.9);
    click("dbl");
    // 全片唯一一次双击（issue #16）：「通过话术精灵一次性双击话术……」挂在这一次上，到顾客道谢完
    const capMontage = t;
    appSet({ sel: 1 });
    inputSet(V6, { flash: t });
    sfx(t, "paste");
    t += 1.2;
    for (let k = 0; k < ANSWERS.length; k++) sfx(t + 0.12 + ANSWER_AT + k * ANSWER_GAP, "blip", { n: 76 + k * 2, v: 0.6 });
    send(V6, 2.0, { answers: true });
    say("in", L.thanks, { hold: 1.2 });
    say("in", "一次就说清楚了，你们服务真贴心！", { hold: 1.5 });
    cap(L.montage, capMontage, t);
    // 一窗接一窗也是双击之后直接接上；平台换着来（每个新窗口换一家的工作台），不再把双击演一遍
    shot("wide", 0.8, t - 0.9); // 好评读完前退回全景，接一窗接一窗

    // ⑦ 一窗接一窗（issue #17）：画面上永远只有一个聊天窗、话术精灵吸在它右边，全景不推近。
    // 顾客来了 → 单击话术行左边的纸飞机（粘贴 + 回车，自动发出）→ 顾客道谢 → 这个窗口往下滑、慢慢消失 → 新窗口从上面落下来……
    // 一轮比一轮快，快到最后话术精灵成了一挺机枪（m.gun）：窗口像传送带一样往下飞，纸飞机一发一发打进聊天框；
    // 右上角好评数一路往上跳，左上角的钟从下午走到半夜。急停之后最后一位顾客照常一发、道谢，窗口滑走，第二天早上的窗口又落下来。
    // 一个字都不说（老板：「是意会，不是言传」）。
    const rush = { wins: [], fires: [], coins: [], clock: [], belt: null, dawn: null, base: 86 };
    m.rush = [t, 0];
    const coin = (at, add, id, gun = false) => {
      rush.coins.push({ at, add, id, gun });
      sfx(at + HEART_FLY, "coin", { n: gun ? 84 + Math.min(14, Math.floor(rush.coins.length / 3)) : 88, v: gun ? 0.6 : 1 });
    };
    const putIn = (id, at, rep) => msgs.push({ s: id, at, side: "in", kind: rep.text ? "text" : "sticker", text: rep.text || null, sticker: rep.sticker });
    const putOut = (id, at) => msgs.push({ s: id, at, side: "out", kind: "text", text: V6 });
    const putStamp = (id, at, min) => msgs.push({ s: id, at, side: "time", text: clockLabel(min) });
    const newWin = (id, who, plat, at, land) => {
      session(id, who, plat);
      sessions[sessions.length - 1].at = at;
      inputs[id][0].at = at;
      const w = { id, who, plat, enter: at, rest: land, leave: Infinity, gone: Infinity, send: Infinity };
      rush.wins.push(w);
      return w;
    };
    // 单击纸飞机：话术飞进输入框（贴入）→ 回车自动发出（客户端的「纸飞机 = 粘贴 + 回车」，不是双击）
    const fire = (w, fly, gap) => {
      clicks.push({ at: t, key: cur[cur.length - 1], kind: "l" });
      sfx(t, "click");
      sfx(t, "zip", {}, fly);
      rush.fires.push({ at: t, hit: t + fly, id: w.id, gun: false });
      t += fly;
      inputs[w.id].push({ at: t, text: V6, focus: true, flash: t });
      sfx(t, "paste");
      t += gap;
      inputs[w.id].push({ at: t, text: "", focus: false, flash: null });
      w.send = t;
      putOut(w.id, t);
      sfx(t, "msgOut");
    };
    // 一窗：越往后越快（每轮的时长乘 0.7）
    const CLOCK = [14 * 60 + 10, 15 * 60 + 5, 16 * 60, 16 * 60 + 50, 17 * 60 + 35, 18 * 60 + 15, 18 * 60 + 50];
    CLOCK.forEach((min, k) => {
      const f = Math.pow(0.7, k);
      const w = k
        ? newWin(`R${k}`, `顾客 · ${NAMES[(k * 7) % NAMES.length]}`, PLATFORMS[(k + 3) % PLATFORMS.length], t, t + Math.max(0.22, 0.8 * f))
        : newWin("R0", FIRST.who, FIRST.plat, t, t + 0.8);
      sfx(t, "whoosh", {}, w.rest - t);
      putStamp(w.id, t, min);
      if (k) msgs.push({ s: w.id, at: t, side: "in", kind: "shot" });
      t = w.rest;
      sfx(t, "drop", { v: Math.max(0.35, f) });
      rush.clock.push({ at: t, min });
      if (!k) {
        say("in", FIRST.ask, { hold: 0.45 });
        say("in", null, { kind: "shot", hold: 0.3 });
        move("plane:1", 0.5);
      } else t += Math.max(0.06, 0.3 * f);
      fire(w, Math.max(0.07, 0.4 * f), Math.max(0.04, 0.18 * f));
      t += Math.max(0.1, 0.5 * f);
      putIn(w.id, t, k ? REPLIES[(k * 5) % REPLIES.length] : { text: FIRST.back });
      sfx(t, "msgIn");
      coin(t, 1, w.id);
      t += Math.max(0.12, 0.7 * f);
      w.leave = t;
      w.gone = t + Math.max(0.3, 1.3 * f);
      sfx(t, "slide", { v: Math.max(0.4, f) }, w.gone - t);
      t += (w.gone - w.leave) * (k < 2 ? 0.8 : 0.5);
    });

    // 机枪：N 个窗口挂在一条传送带上往下飞（belt.x(u) 是传送带走了多远），每个窗口经过原位的那一刻正好挨一发
    const N = 26;
    const GUN = 5.2;
    const SP = BENCH.h + 90; // 传送带上相邻两个窗口的间距
    const g0 = t;
    const g1 = t + GUN;
    // 速度：先慢后快一路加速，最后 10% 急刹到零；积分成表，按表查位置与「第 j 个窗口到位」的时刻
    const vel = (p) => (p < 0.9 ? 0.12 + Math.pow(p / 0.9, 1.7) : Math.pow((1 - p) / 0.1, 2) * 1.12);
    const STEPS = 2000;
    const F = new Float64Array(STEPS + 1);
    for (let i = 1; i <= STEPS; i++) F[i] = F[i - 1] + (vel((i - 1) / STEPS) + vel(i / STEPS)) / 2;
    for (let i = 1; i <= STEPS; i++) F[i] /= F[STEPS];
    const pAt = (f) => {
      let i = 1;
      while (i < STEPS && F[i] < f) i++;
      return (i - 1 + (f - F[i - 1]) / (F[i] - F[i - 1] || 1)) / STEPS;
    };
    rush.belt = { from: g0, to: g1, n: N, sp: SP, F, steps: STEPS, base: rush.wins.length };
    m.gun = [g0, g1];
    const gunWins = [];
    for (let j = 0; j < N; j++) {
      const hit = g0 + GUN * pAt((j + 1) / N);
      const id = `G${j}`;
      const who = `顾客 · ${NAMES[(j * 3 + 1) % NAMES.length]}`;
      session(id, who, PLATFORMS[j % PLATFORMS.length]);
      sessions.pop(); // 传送带上的窗口不进 sessions（sessions 是「当前这一个聊天窗」的时间线）；消息与输入框照常按 id 记
      const w = { id, who, plat: PLATFORMS[j % PLATFORMS.length], belt: j, enter: g0, rest: hit, leave: Infinity, gone: Infinity, send: Infinity };
      rush.wins.push(w);
      gunWins.push(w);
      const min = Math.round(lerp(19 * 60 + 10, 23 * 60 + 58, j / (N - 1)));
      putStamp(id, g0 - 1, min);
      msgs.push({ s: id, at: g0 - 1, side: "in", kind: "shot" });
      if (j === N - 1) break; // 最后一位：急停以后照常一发（见下面）
      const fly = 0.05;
      clicks.push({ at: hit - fly, key: cur[cur.length - 1], kind: "l" });
      rush.fires.push({ at: hit - fly, hit, id, gun: true });
      sfx(hit - fly, "gun", { v: 0.6 + 0.4 * (j / N) });
      if (j % 2) sfx(hit - fly + 0.09, "tink", { n: j });
      inputs[id].push({ at: hit, text: V6, focus: true, flash: hit });
      inputs[id].push({ at: hit + 0.03, text: "", focus: false, flash: null });
      w.send = hit + 0.03;
      putOut(id, hit + 0.03);
      putIn(id, hit + 0.1, REPLIES[(j * 7 + 2) % REPLIES.length]);
      coin(hit + 0.1, Math.max(1, Math.round(Math.pow(1.27, j))), id, true);
      rush.clock.push({ at: hit, min });
    }
    sfx(g0, "riser", {}, GUN * 0.9);
    sfx(g1 - 0.02, "brake");
    // 急停：最后一个窗口落定，一口气松下来；还是那一下纸飞机、那一句「好的谢谢」
    const last = gunWins[gunWins.length - 1];
    t = g1 + 0.6;
    rush.clock.push({ at: t, min: 23 * 60 + 58 });
    fire(last, 0.4, 0.18);
    t += 0.55;
    putIn(last.id, t, { text: L.thanks });
    sfx(t, "msgIn");
    coin(t, 1, last.id);
    rush.clock.push({ at: t, min: 23 * 60 + 59 });
    sfx(t + 0.3, "hiss", {}, 1.6);
    t += 1.15;
    last.leave = t;
    last.gone = t + 1.3;
    sfx(t, "slide", { v: 0.6 }, 1.3);
    t += 1.35;
    // 第二天早上：钟跳回 9:00，新窗口又从上面落下来
    rush.clock.push({ at: t, min: 23 * 60 + 59 }, { at: t + 0.001, min: 9 * 60 });
    const dawn = newWin("D9", `顾客 · ${NAMES[11]}`, "jd", t, t + 1.0);
    rush.dawn = dawn.id;
    putStamp(dawn.id, t, 9 * 60);
    msgs.push({ s: dawn.id, at: t, side: "in", kind: "shot" });
    sfx(t, "whoosh", {}, 1.0);
    t = dawn.rest;
    sfx(t, "drop", { v: 0.5 });
    t += 0.15;
    m.rush[1] = t;
    msgs.sort((a, b) => a.at - b.at);

    // ⑧ 片尾：话术精灵 + 标语 + 作者账号（issue #16：「以上这些都是真实案例，真实经验。」那张字卡砍掉）
    scene("end");
    m.end = [t, t + END];
    sfx(t, "swell", {}, 4.5);
    sfx(t + 0.1, "chime", { n: 84 });
    sfx(t + 0.5, "chime", { n: 88 });
    sfx(t + 0.9, "chime", { n: 91 });
    t += END;

    const base = Math.ceil(t);
    music(score, m, waits, base);
    return { base, msgs, sessions, inputs, appKeys, cur, clicks, caps, heads, bulbs, scenes, waits, keys, steps, flies, shots, turns, m, rush, score: score.sort((a, b) => a.u - b.u) };
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
    const add = (u, type, arg = {}, dur = 0) => score.push({ u, type, arg, dur });
    const start = 0.2;
    const stop = m.gun[0]; // 机枪一响音乐就停，只剩枪声和往上爬的嗡鸣；急停以后一片安静，片尾一个长和弦
    const quiet = (u) => waits.some((w) => u > w.from - 0.3 && u < w.to + 0.1);
    // 一窗接一窗（issue #17）：拍子一路变快，到机枪前快到原来的两倍
    const beatAt = (u) => (u < m.rush[0] ? 0.625 : 0.625 / (1 + sm(m.rush[0], stop, u, (k) => k * k)));
    let u = start;
    for (let b = 0; u < stop; b++) {
      const beat = beatAt(u);
      if (!quiet(u)) {
        const c = CHORDS[Math.floor(b / 4) % 4];
        const drive = u >= m.s2[0]; // 第二段（用上话术精灵）起鼓进来
        const fast = u >= m.rush[0];
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
      // 进一窗接一窗之前照原来的拍点（start + b × 拍长）算，免得浮点累加让前面的音乐挪位
      u = u < m.rush[0] ? start + (b + 1) * 0.625 : u + beat;
    }
    add(m.end[0], "pad", { notes: [48, 60, 64, 67, 72], v: 0.9, long: 1 }, base - m.end[0]);
  }

  // ---------- 文字排版（中文逐字折行；💗 画成一颗心） ----------
  // Node 里（测试）没有画布：按「中文一个字宽、ASCII 半个字宽」量字，只给镜头表排版用
  const NODE_CTX = {
    font: "",
    measureText(c) {
      const size = parseFloat(this.font.split(" ")[1]);
      return { width: c.charCodeAt(0) < 128 ? size * 0.55 : size };
    },
  };
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

  // ---------- 场景布局（issue #16）：照真电脑摆——商家工作台在左，话术精灵磁吸在它右边，两个窗口顶边对齐、一样高 ----------
  // 全景（镜头 1 倍）里两个窗口按真实比例占满画布宽度，上下留白；工作台一直不动，话术精灵用到时从右边滑进来「啪」地吸上，
  // 不用时（第一段、第四段开头）滑出画面——这时右边空着，镜头只盯聊天记录和输入框。尺寸与「为什么」短片第④段同一套。
  const BENCH = { x: 24, y: 430, w: 620, h: 1060 }; // 工作台整块窗口（含导航栏、顶栏、底边吸附栏）
  const DOCK = { x: BENCH.x + BENCH.w, y: BENCH.y, w: 412, h: BENCH.h }; // 磁吸在右边的话术精灵：和工作台一样高的窄长条
  const BAR_H = 24 * PLAT_K; // 工作台底边贴着的话术精灵吸附栏
  const DOCK_OUT = W - DOCK.x + 40; // 不用时话术精灵在画面右边外面
  // 每种模式：工作台与话术精灵的透明度、缩放，话术精灵离磁吸位还差多少（dx），换过来用多少秒（cut：快切）
  const MODES = {
    solo: { chat: { a: 1, s: 1 }, app: { dx: DOCK_OUT, a: 0, s: 1 } },
    duo: { chat: { a: 1, s: 1 }, app: { dx: 0, a: 1, s: 1 } },
    end: { chat: { a: 0, s: 0.96 }, app: { dx: 0, a: 0, s: 0.96 }, cut: true },
    // 翻页过来的新画面里话术精灵已经不在（翻页盖住了换场，不用再演一遍滑走）
    cut: { chat: { a: 1, s: 1 }, app: { dx: DOCK_OUT, a: 0, s: 1 }, jump: true },
  };
  const MODE_DUR = 0.45; // 话术精灵滑进 / 滑出的时长
  const HEART_FLY = 0.35; // 顾客道谢 → 一颗心飞到右上角好评数（到了数字才跳）
  const CUT = 0.12; // 快切：换顾客、片尾进出原来的那一下；现在这一下被翻页盖住（issue #18），翻页的 from / to 按它算
  const END = 4.5; // 片尾几秒：最后一行字出来以后留 1.6 秒看微信号
  const HOOK_H = 250; // 开场钩子标题条的高度（画面像素，钉在顶上）
  const TOPIC_H = 76; // 钩子收起以后一直挂在顶上的题目条（issue #16：任何时刻看一眼都知道讲的是补运费登记）
  const CAP_BOTTOM = H - 130; // 字幕底边（再往下留给播放器的封面字条）
  // 聊天栏（消息区 + 输入区）在工作台里的位置：各平台的顶栏、导航栏宽高不一样，按 PlatformChat.dims 量
  function chatRect(plat) {
    const d = globalThis.PlatformChat.dims(plat, BENCH_OPTS);
    return { x: BENCH.x + d.left * PLAT_K, y: BENCH.y + d.top * PLAT_K, w: BENCH.w - d.left * PLAT_K, h: BENCH.h - d.top * PLAT_K - BAR_H };
  }

  function makeFilm() {
    const TL = build();
    const { m } = TL;
    const msgsBy = {};
    TL.msgs.forEach((x) => (msgsBy[x.s] ||= []).push(x));

    function layoutAt(u) {
      const i = Math.max(0, lastAt(TL.scenes, u));
      const now = TL.scenes[i];
      const prev = TL.scenes[Math.max(0, i - 1)];
      const B = MODES[now.mode];
      const k = i === 0 || B.jump ? 1 : sm(now.at, now.at + (B.cut ? CUT : MODE_DUR), u);
      // 吸上时「啪」地过头一点再弹回（easeBack），滑走时干脆利落
      const kx = i === 0 || B.jump ? 1 : B.app.dx < MODES[prev.mode].app.dx ? sm(now.at, now.at + MODE_DUR, u, easeBack) : k;
      const A = MODES[prev.mode];
      const s0 = sessionAt(u);
      const chat = { ...chatRect(s0 ? s0.plat : "tm"), a: lerp(A.chat.a, B.chat.a, k), s: lerp(A.chat.s, B.chat.s, k) };
      const app = { ...DOCK, x: DOCK.x + lerp(A.app.dx, B.app.dx, kx) + recoil(u), a: clamp(lerp(A.app.a, B.app.a, k), 0, 1), s: lerp(A.app.s, B.app.s, k) };
      return { bench: BENCH, chat, app };
    }

    // 机枪的后坐力：每一发把话术精灵往右顶一下，很快弹回（鼠标跟着它走，所以一直按在纸飞机上）
    const gunFires = TL.rush.fires.filter((f) => f.gun);
    function recoil(u) {
      if (u < m.gun[0] - 0.1 || u > m.gun[1] + 0.3) return 0;
      let x = 0;
      for (const f of gunFires) if (u >= f.at && u < f.at + 0.25) x += 11 * Math.exp(-(u - f.at) / 0.045);
      return Math.min(24, x);
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
    // 话术行左边那只纸飞机（单击 = 粘贴 + 回车，直接发出）
    function planeAt(lay, u, i = 1) {
      const row = listLayout(lay.app, appAt(u)).rows[i];
      return row ? { x: lay.app.x + 42, y: row.y + 32 } : { x: lay.app.x + 42, y: lay.app.y + 400 };
    }
    // 窄长条里的对话框：和主界面一样宽（左右各留 16），正文框够高，最长的第 6 版话术也不用滚动
    const dialogRect = (r) => {
      const d = { x: r.x + 16, y: r.y + 120, w: r.w - 32, h: 880 };
      d.title = { x: d.x + 20, y: d.y + 112, w: d.w - 40, h: 58 };
      d.body = { x: d.x + 20, y: d.y + 222, w: d.w - 40, h: 540 };
      d.save = { x: d.x + d.w - 20 - 150, y: d.y + d.h - 84, w: 150, h: 58 };
      d.cancel = { x: d.save.x - 20 - 130, y: d.save.y, w: 130, h: 58 };
      return d;
    };
    const BODY_SIZE = 27;
    const BODY_LH = 40;
    function resolveRef(ctx, key, lay, u) {
      const ref = key.ref;
      const r = lay.app;
      if (ref === "chat:input") return { x: lay.chat.x + lay.chat.w * 0.45, y: lay.chat.y + lay.chat.h - 120 };
      if (ref === "plus") return listLayout(r, appAt(u)).plus;
      if (ref === "plane:1") return planeAt(lay, u);
      if (typeof ref === "string" && ref.startsWith("row:")) {
        const row = listLayout(r, appAt(u)).rows[Number(ref.slice(4))];
        return row ? { x: r.x + 150, y: row.y + 34 } : { x: r.x + r.w / 2, y: r.y + 400 };
      }
      const d = dialogRect(r);
      if (ref === "dlg:title") return { x: d.title.x + d.title.w * 0.6, y: d.title.y + d.title.h / 2 };
      if (ref === "dlg:body") return { x: d.body.x + d.body.w * 0.6, y: d.body.y + 60 };
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

    // ---------- 镜头（issue #5：手机上看，整屏的字太小，要推近、拉远；issue #9 起画布是竖屏，取景框也是 9:16） ----------
    // 剧本里每一拍写「对准什么」（TL.shots 的 target），这里换算成取景框，得到一张 { at, dur, from, focus } 的镜头表：
    // 从上一拍停下（或正在走）的位置，用 dur 秒缓入缓出推到 focus，然后停住。取景框比例恒为 9:16（= 画布）、永远在画布里面，
    // 所以不会露出画布外的空白；focus 一定包住它对准的东西（fit 只会放大取景框，不会切掉目标）。
    // 聊天窗那一拍（"chat"）跟着对话走：只有新消息、输入框、等待钟、回车键帽要出框时才挪，挪的距离最小。
    const Z_CHAT = W / (BENCH.w + 30); // 工作台推近到左右刚好放下：≈ 1.66 倍，气泡 28px ≈ 46px（画面宽 1080）
    const HEAD_FOR = 3.5; // 章节标题显示几秒
    const BAND_TOP = 220; // 画面上：章节标题 / 步骤条占的那一条（画布像素）
    const HEAD_DROP = HOOK_H - 50; // 钩子标题条挂着时，章节标题往下让开这么多
    const BAND_BOT = 400; // 字幕占的那一块（竖屏字幕会折成两三行）
    const hookOn = (a, b) => m.hook[0] < b && m.hook[1] > a;
    // 画面顶上被占掉多高（画布像素）：钩子标题条，章节标题，或第三段的步骤条
    const topBand = (a, b) => {
      const head = TL.heads.some((h) => h.at < b && h.at + HEAD_FOR > a) || (TL.steps.length > 0 && TL.steps[0].at - 0.4 < b && m.s2[1] + 0.4 > a);
      if (hookOn(a, b)) return head ? BAND_TOP + HEAD_DROP : HOOK_H + 20;
      return head ? BAND_TOP : TOPIC_H + 20;
    };
    const capOn = (a, b) => TL.caps.some((c) => c.from < b && c.to > a);
    // 包住 T、至少推近到 z 倍的最小取景框（比例同画布），以 T 为中心，推到画布边上就贴边
    function fit(T, z) {
      const w = Math.min(W, Math.max(W / z, T.w, (T.h * W) / H));
      const h = (w * H) / W;
      return { x: clamp(T.x + T.w / 2 - w / 2, 0, W - w), y: clamp(T.y + T.h / 2 - h / 2, 0, H - h), w, h };
    }
    const WIDE = { x: 0, y: 0, w: W, h: H };
    // 镜头走得多快：中心每秒最多走 PAN_MAX 画面像素、倍数每秒最多变 ZOOM_MAX（对数），按缓动的峰值速度算；
    // 剧本写的 dur 不够就拉长（宁可慢一点到位，也不甩镜头）
    const PAN_MAX = 2800;
    const ZOOM_MAX = 0.9;
    const camEase = (k) => (1 - Math.cos(Math.PI * k)) / 2; // 峰值速度 = 平均的 π/2 倍
    function calmDur(a, b, dur) {
      const za = W / a.w;
      const zb = W / b.w;
      const dist = Math.hypot(b.x + b.w / 2 - a.x - a.w / 2, b.y + b.h / 2 - a.y - a.h / 2) * Math.max(za, zb);
      const need = (Math.PI / 2) * Math.max(dist / PAN_MAX, Math.abs(Math.log(zb / za)) / ZOOM_MAX);
      return Math.max(dur, need);
    }
    // 镜头对准的东西（设计坐标）；at 是镜头到位的时刻，按那时的布局量
    function shotTarget(target, at) {
      const lay = layoutAt(at);
      const r = lay.app;
      const st = appAt(at);
      const ll = listLayout(r, st);
      const d = dialogRect(r);
      switch (target) {
        case "wide":
          return { T: WIDE, z: 1 };
        case "app:plus":
          return { T: { x: r.x + 16, y: r.y + 176, w: r.w - 32, h: ll.plus.y + 30 - (r.y + 176) }, z: 2.2 };
        case "app:menu": {
          const row = ll.rows[1];
          return { T: { x: r.x + 16, y: row.y, w: r.w - 32, h: 160 }, z: 2.3 };
        }
        case "dlg:title":
          return { T: { x: d.x, y: d.y, w: d.w, h: 300 }, z: 2.2 };
        case "dlg:body":
          return { T: { x: d.x, y: d.body.y - 34, w: d.w, h: d.save.y + d.save.h + 16 - (d.body.y - 34) }, z: 2.2 };
        default: {
          const row = target.startsWith("row:") && ll.rows[Number(target.slice(4))];
          if (row) return { T: { x: r.x + 16, y: row.y, w: r.w - 32, h: 104 }, z: 2.3 };
          throw new Error(`未知镜头 ${target}`);
        }
      }
    }
    // 聊天窗第 u 秒（按已经落定的位置算）要看清的几段竖向范围：最新一条消息、输入框里的字、等待钟、回车键帽
    function chatNeed(ctx, lay, sid, u) {
      const r = lay.chat;
      const inp = inputAt(sid, u);
      const plat = TL.sessions.find((x) => x.id === sid).plat;
      const iy = r.y + r.h - inputHeight(ctx, r, inp, plat);
      const top = r.y + msgTop(plat);
      const list = (msgsBy[sid] || []).filter((x) => x.at <= u);
      const hs = list.map((x) => msgHeight(ctx, x) + 18);
      const total = 16 + hs.reduce((a, b) => a + b, 0);
      const offset = Math.max(0, total - (iy - top) + 10);
      const spans = [];
      if (list.length) {
        const y = top - offset + total - hs[hs.length - 1];
        spans.push([y - 6, y + hs[hs.length - 1] - 12]);
      }
      if (inp.text) {
        const n = Math.min(5, layout(ctx, inp.text, r.w - 56, 26).lines.length);
        spans.push([iy + inputTextY(plat) - 8, iy + inputTextY(plat) + 8 + n * 36]);
      }
      if (TL.waits.some((w) => u >= w.from - 0.1 && u <= w.to)) {
        const cy = top + (iy - top) / 2 - 10;
        spans.push([cy - 165, cy + 215]);
      }
      if (TL.keys.some((k) => u >= k.at - 0.5 && u <= k.at + 0.15)) spans.push([r.y + r.h - 160, r.y + r.h - 84]); // 按下之前；按下以后看的是发出去的气泡
      if (!spans.length) spans.push([top, top + 120]);
      return [Math.min(...spans.map((x) => x[0])), Math.max(...spans.map((x) => x[1]))];
    }
    function chatBeats(ctx, s, until, out) {
      const arrive = s.at + s.dur;
      const sid = sessionAt(arrive).id;
      const r = layoutAt(arrive).chat;
      const w = W / Z_CHAT;
      const h = (w * H) / W;
      const x = clamp(BENCH.x + BENCH.w / 2 - w / 2, 0, W - w); // 左右以整个工作台为准（导航栏也在画面里）
      let y = null;
      let aim = null; // 这一拍要看清的那一段（交给镜头表核对用）
      let cut = 0; // 放不下、只好让出去的高度（设计像素）
      const frame = (e) => {
        let [a, b] = chatNeed(ctx, layoutAt(e + 0.35), sid, e + 0.35);
        const top = topBand(e + 0.5, e + 1.2) / Z_CHAT; // 半秒内就收起的标题不让位
        const bot = capOn(e, e + 1.2) ? BAND_BOT / Z_CHAT : 0;
        const room = h - top - bot;
        cut = Math.max(0, b - a - room);
        if (cut) a = b - room; // 放不下就保住下面（输入框、回车）
        aim = { x: r.x, y: a, w: r.w, h: b - a };
        if (y === null) y = r.y - (top || 20); // 一开场先带上聊天窗标题栏（谁在说话），放不下再往下挪
        if (a < y + top) y = a - top;
        if (b > y + h - bot) y = b - h + bot;
        y = clamp(y, 0, H - h);
      };
      frame(arrive);
      out.push({ at: s.at, dur: s.dur, focus: { x, y, w, h }, target: "chat", aim, cut });
      const events = new Set();
      (msgsBy[sid] || []).forEach((m) => events.add(m.at));
      TL.inputs[sid].forEach((k, i, list) => k.text && !(list[i - 1] && list[i - 1].text) && events.add(k.at));
      TL.waits.forEach((wt) => events.add(wt.from));
      TL.keys.forEach((k) => events.add(k.at - 0.4));
      [...events]
        .filter((e) => e > arrive && e < until - 0.3)
        .sort((a, b) => a - b)
        .forEach((e) => {
          const before = y;
          frame(e);
          if (Math.abs(y - before) <= 1) {
            const last = out[out.length - 1];
            if (cut > last.cut) last.cut = cut;
            return;
          }
          // 离上一次挪不到 0.8 秒：并进上一次（一口气挪到位），不连着挪两下
          const last = out[out.length - 1];
          if (e - 0.15 - last.at < 0.8) {
            last.focus = { x, y, w, h };
            last.aim = aim;
            last.cut = Math.max(last.cut, cut);
            last.dur = Math.max(last.dur, e + 0.45 - last.at);
          } else out.push({ at: e - 0.15, dur: 0.6, focus: { x, y, w, h }, target: "chat", aim, cut });
        });
    }
    // 两个取景框之间：倍数按对数插（推近拉远的速度均匀），中心按直线插，再贴回画布里面
    function mixRect(a, b, k) {
      if (k <= 0) return a;
      if (k >= 1) return b;
      const z = Math.exp(lerp(Math.log(W / a.w), Math.log(W / b.w), k));
      const w = W / z;
      const h = (w * H) / W;
      const cx = lerp(a.x + a.w / 2, b.x + b.w / 2, k);
      const cy = lerp(a.y + a.h / 2, b.y + b.h / 2, k);
      return { x: clamp(cx - w / 2, 0, W - w), y: clamp(cy - h / 2, 0, H - h), w, h };
    }
    const beatAt = (b, u) => mixRect(b.from, b.focus, b.dur > 0 ? camEase(clamp((u - b.at) / b.dur, 0, 1)) : 1);
    let track = null;
    function cameraTrack() {
      if (track) return track;
      const ctx = typeof document === "undefined" ? NODE_CTX : document.createElement("canvas").getContext("2d");
      const out = [];
      TL.shots.forEach((s, i) => {
        const until = i + 1 < TL.shots.length ? TL.shots[i + 1].at : TL.base;
        if (s.target === "chat") return chatBeats(ctx, s, until, out);
        const { T, z } = shotTarget(s.target, s.at + s.dur);
        out.push({ at: s.at, dur: s.dur, focus: fit(T, z), target: s.target, aim: T });
      });
      out.sort((a, b) => a.at - b.at);
      out.forEach((b, i) => {
        b.from = i ? beatAt(out[i - 1], b.at) : b.focus;
        if (b.dur > 0) b.dur = calmDur(b.from, b.focus, b.dur);
      });
      track = out;
      return track;
    }
    function camera(u) {
      const list = cameraTrack();
      return beatAt(list[Math.max(0, lastAt(list, u))], u);
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
    const BUB_MAX = 370; // 聊天栏约 540 宽：头像 + 气泡最宽 370，对面还留一截空
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
    // 头像：照工作台的样子是剪影（顾客）和店铺头像（自己），不写字
    function avatar(ctx, x, y, label, own, sk) {
      globalThis.PlatformChat.face(ctx, x, y, 52, { shape: sk.avatar, bg: own ? sk.accent : "#c9b8a8" });
    }
    function drawMsg(ctx, r, x, y, e, nick, u, sk) {
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
      avatar(ctx, own ? right - 52 : left, y, own ? "我" : chars(nick)[0], own, sk);
      const bx0 = own ? right - 52 - 14 : left + 52 + 14;
      let bw = 0;
      let bh = 0;
      if (x.kind === "text") {
        const lay = layout(ctx, x.text, BUB_MAX, BUB);
        bw = lay.w + 36;
        bh = Math.max(56, lay.lines.length * BUB_LH + 24);
        const bx = own ? bx0 - bw : bx0;
        rr(ctx, bx, y, bw, bh, 10);
        ctx.fillStyle = own ? sk.own : sk.in;
        ctx.fill();
        if (!own && sk.inLine !== sk.msgBg) {
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = sk.inLine;
          ctx.stroke();
        }
        if (own && sk.read) text(ctx, "已读", bx - 12, y + bh - 14, { size: 19, color: "#a0a6ae", align: "right" });
        const ty = y + 12 + (bh - 24 - lay.lines.length * BUB_LH) / 2;
        const lit = x.answers ? (k) => sm(x.at + ANSWER_AT + k * ANSWER_GAP, x.at + ANSWER_AT + k * ANSWER_GAP + 0.2, u) : null;
        const hl = lit
          ? (i) => {
              const k = ANSWER_RANGES.findIndex(([s, len]) => i >= s && i < s + len);
              return k >= 0 && lit(k) > 0 ? `rgba(255,190,0,${0.5 * lit(k)})` : null;
            }
          : undefined;
        drawLayout(ctx, lay, bx + 18, ty, BUB_LH, { size: BUB, color: C.inFg, hl });
        // 六句话各标一个序号（对上前面顾客的六次追问），标在那句话开头的左上角
        if (lit) {
          ANSWER_RANGES.forEach(([s], k) => {
            const on = lit(k);
            if (on <= 0) return;
            const c = caretAt(lay, s, BUB_LH);
            const cx = bx + 18 + c.x - 2;
            const cy = ty + c.y;
            ctx.beginPath();
            ctx.arc(cx, cy, 11 * easeBack(clamp(on, 0, 1)), 0, Math.PI * 2);
            ctx.fillStyle = ACCENT;
            ctx.fill();
            text(ctx, String(k + 1), cx, cy + 1, { size: 16, weight: 800, color: "#fff", font: MONO, alpha: clamp(on, 0, 1) });
          });
        }
      } else if (x.kind === "redact") {
        // 顾客给的收款方式 / 姓名：打码显示，不编造具体内容
        bw = Math.max(...x.bars.map((row) => row.reduce((s, w) => s + w + 12, 0))) + 24;
        bh = x.bars.length * 40 + 24;
        const bx = own ? bx0 - bw : bx0;
        rr(ctx, bx, y, bw, bh, 10);
        ctx.fillStyle = sk.in;
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
    function inputHeight(ctx, r, inp, plat) {
      const lay = layout(ctx, inp.text || " ", r.w - 56, 26);
      return inputTextY(plat) + 2 + clamp(lay.lines.length, 2, 5) * 36 + 84;
    }
    function drawChat(ctx, lay, u) {
      const r = lay.chat;
      if (r.a <= 0.01) return;
      const s = sessionAt(u);
      if (!s) return;
      const prevS = TL.sessions[TL.sessions.indexOf(s) - 1];
      const hop = prevS && prevS.plat !== s.plat ? 0.96 + 0.04 * sm(s.at, s.at + 0.3, u, easeOut) : 1; // 换平台：窗口轻轻弹一下
      const kIdx = lastAt(TL.keys, u);
      const press = kIdx >= 0 ? win(u, TL.keys[kIdx].at - 0.02, TL.keys[kIdx].at + 0.25, 0.06) : 0;
      drawSession(ctx, r, s, u, r.a, r.s * hop, press);
    }
    // 一个聊天窗（工作台外壳 + 消息 + 输入框）：r 是聊天栏的位置，s 是哪位顾客（id / who / plat / at）
    function drawSession(ctx, r, s, u, alpha, scale, press) {
      const nick = s.who.split(" · ")[1];
      const sk = skin(s.plat);
      ctx.save();
      ctx.globalAlpha = alpha;
      scaleAt(ctx, r.x + r.w / 2, r.y + r.h / 2, scale);
      const swap = sm(s.at, s.at + 0.35, u);
      const inp = inputAt(s.id, u);
      const ih = inputHeight(ctx, r, inp, s.plat);
      const iy = r.y + r.h - ih;
      // 平台工作台：聊天栏就是 r，导航栏、会话列表、顶栏围着它往外画；第一段还没用话术精灵，底边没有吸附栏
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.scale(PLAT_K, PLAT_K);
      globalThis.PlatformChat.draw(ctx, s.plat, { x: 0, y: 0, w: r.w / PLAT_K, h: r.h / PLAT_K }, {
        ...BENCH_OPTS, customer: nick, headH: 41, inputH: ih / PLAT_K, typing: !!inp.text, press,
        shops: PLAT_SHOPS, active: 0, bar: s.id !== "A", frame: "#3f3f3f",
      });
      ctx.restore();
      // 消息区
      const top = r.y + msgTop(s.plat);
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
        if (y + hs[i] > top - 40 && y < iy + 40) drawMsg(ctx, r, x, y, e * swap, nick, u, sk);
        y += hs[i] * easeOut(e);
      });
      drawWait(ctx, r, top, viewH, u);
      ctx.restore();
      // 输入区：话术贴进来那一下闪一下
      if (inp.flash !== null) {
        const f = 1 - clamp((u - inp.flash) / 0.8, 0, 1);
        if (f > 0) {
          ctx.fillStyle = `rgba(255,107,44,${0.16 * f})`;
          ctx.fillRect(r.x, iy, r.w, ih);
        }
      }
      const ty = iy + inputTextY(s.plat);
      const tl = layout(ctx, inp.text || "", r.w - 56, 26);
      const show = Math.min(5, tl.lines.length);
      drawLayout(ctx, tl, r.x + 28, ty, 36, { size: 26, color: "#1a1a1a", skip: tl.lines.length - show, maxLines: show });
      if (inp.focus && Math.floor(u * 2.2) % 2 === 0) {
        const c = caretAt(tl, tl.n, 36);
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(r.x + 28 + c.x + 2, ty + (c.li - (tl.lines.length - show)) * 36 + 5, 2.5, 27);
      }
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
      if (r.a <= 0.01 || r.x > W || r.y > H) return;
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
      const tabW = Math.min(150, (r.w - 40) / 3);
      ["团队话术", "个人话术", "离线话术"].forEach((label, i) => {
        const tx = r.x + 20 + i * tabW;
        if (i === 0) {
          ctx.beginPath();
          ctx.moveTo(tx, r.y + 108);
          ctx.lineTo(tx, r.y + 64);
          ctx.lineTo(tx + tabW - 10, r.y + 64);
          ctx.lineTo(tx + tabW - 10, r.y + 108);
          ctx.fillStyle = P.paper;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = P.ink;
          ctx.stroke();
        }
        text(ctx, label, tx + (tabW - 10) / 2, r.y + 88, { size: 22, weight: i === 0 ? 700 : 500, color: i === 0 ? P.ink : P.muted });
      });
      ctx.fillStyle = P.paper;
      ctx.fillRect(r.x, r.y + 108, r.w, r.h - 108);
      ctx.fillStyle = P.base;
      ctx.fillRect(r.x, r.y + 107, 20, 1.5);
      ctx.fillRect(r.x + 10 + tabW, r.y + 107, r.w - 10 - tabW, 1.5);
      // 套名 + 0–9 套号（窄长条里套号挨紧一点）
      text(ctx, "默认话术", r.x + 24, r.y + 141, { size: 21, color: P.muted, align: "left" });
      const setStep = Math.min(44, (r.w - 130) / 10);
      for (let i = 0; i < 10; i++) {
        const dx = r.x + 122 + i * setStep;
        if (i === 0) {
          rr(ctx, dx - 4, r.y + 122, 36, 38, 6);
          ctx.fillStyle = P.peach;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = P.ink;
          ctx.stroke();
        }
        text(ctx, String(i), dx + 14, r.y + 142, { size: 21, weight: i === 0 ? 700 : 400, color: i === 0 ? P.ink : P.digit, font: MONO });
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
      text(ctx, L.wechat, r.x + 20, r.y + r.h - 28, { size: 19, color: P.muted, align: "left" });
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
      text(ctx, dg.mode, d.x + 20, d.y + 44, { size: 28, weight: 800, color: P.ink, align: "left" });
      text(ctx, "×", d.x + d.w - 30, d.y + 42, { size: 34, color: P.muted });
      text(ctx, "标题", d.x + 20, d.y + 94, { size: 21, color: P.muted, align: "left" });
      text(ctx, "内容", d.x + 20, d.y + 204, { size: 21, color: P.muted, align: "left" });
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

    // 双击话术行：一张话术小卡从话术精灵那一行飞进聊天输入框（字不用看清，看得出是话术精灵把话术送过去的）
    function drawFlies(ctx, lay, u) {
      for (const f of TL.flies) {
        const k = (u - f.at) / 0.5;
        if (k < 0 || k > 1) continue;
        const from = resolveRef(ctx, f.key, lay, f.at);
        const to = { x: lay.chat.x + 230, y: lay.chat.y + lay.chat.h - 150 };
        const e = easeIO(k);
        const x = lerp(from.x, to.x, e);
        const y = lerp(from.y, to.y, e) - Math.sin(e * Math.PI) * 90;
        const st = appAt(f.at);
        const row = st.rows[Number(f.key.ref.slice(4))];
        ctx.save();
        ctx.globalAlpha *= clamp(k * 6, 0, 1) * (1 - sm(0.8, 1, k));
        scaleAt(ctx, x, y, lerp(1, 0.75, e));
        rr(ctx, x - 150, y - 34, 300, 68, 10);
        ctx.fillStyle = P.hover;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = ACCENT;
        ctx.stroke();
        plane(ctx, x - 122, y, 22, P.hot);
        text(ctx, row ? row.title : "", x - 98, y + 1, { size: 26, weight: 800, color: P.title, align: "left" });
        ctx.restore();
      }
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

    // 灵机一动：灯泡亮起来。画在镜头外面那一层（不跟着推近变大），位置是聊天窗右上角投到画面上、再收进画面里
    function drawBulb(ctx, lay, u, cam) {
      const b = TL.bulbs.find((x) => u >= x.at - 0.05 && u < x.at + 1.5);
      if (!b) return;
      const k = u - b.at;
      const a = win(u, b.at, b.at + 1.5, 0.15);
      const pop = easeBack(clamp(k / 0.35, 0, 1));
      const z = W / cam.w;
      const x = clamp((lay.chat.x + lay.chat.w + 4 - cam.x) * z, 170, W - 170);
      const y = clamp((lay.chat.y + 46 - cam.y) * z, 170, H - 330);
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
      setFont(ctx, 44, 800);
      const tw = ctx.measureText(label).width + 48;
      const lx = clamp(x, tw / 2 + 24, W - tw / 2 - 24);
      const ly = y + 136 + (1 - pop) * 20;
      rr(ctx, lx - tw / 2, ly - 36, tw, 72, 36);
      ctx.fillStyle = ACCENT;
      ctx.fill();
      text(ctx, label, lx, ly + 1, { size: 44, weight: 800, color: "#fff" });
      ctx.restore();
    }

    // 第三段的步骤条：新增话术 → 编辑话术 → 双击话术 → 发送话术（镜头外那一层，钉在画面顶上正中）
    function drawSteps(ctx, lay, u) {
      if (!TL.steps.length || u < TL.steps[0].at - 0.4 || u > m.s2[1] + 0.4) return;
      const a = win(u, TL.steps[0].at - 0.4, m.s2[1] + 0.4, 0.3) * lay.app.a;
      const cur = TL.steps[Math.max(0, lastAt(TL.steps, u))].n;
      const labels = ["新增话术", "编辑话术", "双击话术", "发送话术"];
      const x0 = (W - 3 * 206 - 190) / 2;
      ctx.save();
      ctx.globalAlpha = a;
      labels.forEach((label, i) => {
        const x = x0 + i * 206;
        const on = i === cur;
        const done = i < cur;
        rr(ctx, x, 96, 190, 52, 26);
        ctx.fillStyle = on ? ACCENT : done ? "rgba(40,20,10,.85)" : "rgba(14,12,11,.85)";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = on || done ? ACCENT : "#3f3f3f";
        ctx.stroke();
        text(ctx, `${done ? "✓" : i + 1} ${label}`, x + 95, 123, { size: 28, weight: 700, color: on ? "#fff" : done ? ACCENT_HOT : MUTED });
      });
      ctx.restore();
    }

    // 章节标题（左上角，每章开头亮 HEAD_FOR 秒，不一直压在推近的画面上）与字幕（下方）
    function drawHead(ctx, u) {
      const i = lastAt(TL.heads, u);
      if (i < 0) return;
      const h = TL.heads[i];
      const next = TL.heads[i + 1];
      let until = Math.min(next ? next.at : m.rush[0], h.at + HEAD_FOR);
      const steps0 = TL.steps.length ? TL.steps[0].at - 0.4 : Infinity; // 第二段的步骤条占同一条：它一出来章节标题就让开
      if (h.at < steps0 && until > steps0) until = steps0 - 0.1;
      const a = win(u, h.at, until + 0.1, 0.35);
      if (a <= 0) return;
      const slide = (1 - sm(h.at, h.at + 0.5, u, easeOut)) * -40;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(0, HEAD_DROP * (1 - sm(m.hook[1], m.hook[1] + 0.45, u))); // 钩子标题条挂着：章节标题挪到它下面，跟着它收起来
      setFont(ctx, 46, 800);
      rr(ctx, 60 + slide, 88, 98 + ctx.measureText(h.text).width + 28, 66, 12);
      ctx.fillStyle = "rgba(10,9,8,.82)";
      ctx.fill();
      rr(ctx, 72 + slide, 98, 72, 46, 8);
      ctx.fillStyle = ACCENT;
      ctx.fill();
      text(ctx, h.n, 108 + slide, 122, { size: 30, weight: 800, color: "#000", font: MONO });
      text(ctx, h.text, 158 + slide, 122, { size: 46, weight: 800, color: FG, align: "left" });
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
        // 竖屏一行放不下：按 920 宽折行，每行居中，底边钉在 CAP_BOTTOM
        const lay = layout(ctx, c.text, 920, 48, 700);
        const tw = lay.w + 60;
        const th = lay.lines.length * 66 + 22;
        const y = CAP_BOTTOM - th + lift;
        rr(ctx, W / 2 - tw / 2, y, tw, th, 12);
        ctx.fillStyle = note ? "rgba(255,107,44,.94)" : "rgba(0,0,0,.8)";
        ctx.fill();
        if (!note) {
          ctx.fillStyle = ACCENT;
          ctx.fillRect(W / 2 - tw / 2, y, 6, th);
        }
        lay.lines.forEach((line, li) => {
          const str = line.items.map((it) => it.c).join("");
          text(ctx, str, W / 2, y + 11 + li * 66 + 34, { size: 48, weight: 700, color: note ? "#fff" : FG });
        });
        ctx.restore();
      }
    }

    // 钩子标题条（issue #16）：没有片头了，钩子问话从第 0 秒起就钉在画面顶上，和聊天窗同时在画面里；
    // 期号、题目、简介与署名挤在它上下两行小字里（字一个不少）。第一次干等开始时（m.hook 结束）收成一条细的题目条，
    // 只剩「知识分享 01 · 补运费登记案例」，从此一直挂到片尾——任何时刻看一眼都知道这条片子讲的是补运费登记，又不压聊天窗。
    // 竖屏一行放下整句：「一句一句」橙色
    function hookLine(ctx, y, size, alpha) {
      setFont(ctx, size, 900);
      const ws = L.hook.map((part) => ctx.measureText(part).width);
      let x = W / 2 - ws.reduce((p, q) => p + q, 0) / 2;
      L.hook.forEach((part, i) => {
        text(ctx, part, x, y, { size, weight: 900, color: i === 1 ? ACCENT : FG, align: "left", alpha });
        x += ws[i];
      });
    }
    function drawHook(ctx, u) {
      const k = sm(m.hook[1], m.hook[1] + 0.45, u); // 0：钩子大条；1：题目细条
      const bandH = lerp(HOOK_H, TOPIC_H, k);
      ctx.save();
      const g = ctx.createLinearGradient(0, 0, 0, bandH);
      g.addColorStop(0, "rgba(10,9,8,.96)");
      g.addColorStop(0.8, "rgba(10,9,8,.9)");
      g.addColorStop(1, "rgba(10,9,8,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, bandH);
      if (k < 1) {
        text(ctx, `知识分享 01 · ${L.title}`, 48, 52, { size: 30, weight: 800, color: ACCENT_HOT, align: "left", alpha: 1 - k });
        text(ctx, "话术精灵 · SoftTalk", W - 48, 52, { size: 26, weight: 600, color: DIM, align: "right", alpha: 1 - k });
        hookLine(ctx, 128 - k * 60, 64, 1 - k);
        text(ctx, L.intro, W / 2, 194 - k * 100, { size: 28, color: MUTED, alpha: 1 - k });
      }
      if (k > 0) {
        ctx.globalAlpha = k;
        const tag = "知识分享 01";
        setFont(ctx, 24, 800);
        const tw = ctx.measureText(tag).width + 28;
        rr(ctx, 44, 18, tw, 40, 20);
        ctx.fillStyle = ACCENT;
        ctx.fill();
        text(ctx, tag, 44 + tw / 2, 39, { size: 24, weight: 800, color: "#000" });
        text(ctx, L.title, 44 + tw + 18, 38, { size: 40, weight: 800, color: FG, align: "left" });
        text(ctx, "话术精灵", W - 44, 38, { size: 26, weight: 600, color: DIM, align: "right" });
      }
      ctx.restore();
    }

    // ---------- 一窗接一窗与机枪（issue #17） ----------
    const R = TL.rush;
    const DROP = BENCH.y + BENCH.h + 60; // 新窗口从画面上方整个落进来
    const SLIDE = 380; // 服务完的窗口往下滑这么多，同时慢慢淡没
    function beltX(u) {
      const b = R.belt;
      const p = clamp((u - b.from) / (b.to - b.from), 0, 1) * b.steps;
      const i = Math.min(b.steps - 1, Math.floor(p));
      const f = lerp(b.F[i], b.F[i + 1], p - i);
      return -b.sp + b.n * b.sp * f;
    }
    const beltV = (u) => (beltX(u + 0.004) - beltX(u - 0.004)) / 0.008;
    // 某个窗口第 u 秒在哪：dy 是相对原位（工作台位置）往下挪了多少，a 是透明度；不在画面里返回 null
    function winPose(w, u) {
      let dy;
      let a = 1;
      if (w.belt !== undefined) {
        if (u < R.belt.from - 0.05) return null;
        dy = beltX(u) - w.belt * R.belt.sp;
        a = 1 - sm(SLIDE * 1.3, SLIDE * 2.9, dy); // 过了原位往下走就淡掉（和一窗接一窗的滑走一样）；急停后上一个窗口已经看不见
      } else {
        if (u < w.enter) return null;
        dy = -DROP * (1 - easeOut(clamp((u - w.enter) / (w.rest - w.enter), 0, 1)));
      }
      if (u > w.leave) {
        const p = clamp((u - w.leave) / (w.gone - w.leave), 0, 1);
        if (p >= 1) return null;
        dy += SLIDE * easeIO(p);
        a *= 1 - sm(0.2, 1, p);
      }
      if (a <= 0.01) return null;
      if (BENCH.y + dy > H || BENCH.y + BENCH.h + dy < 0) return null;
      return { dy, a };
    }
    const winRect = (w, dy) => {
      const r = chatRect(w.plat);
      return { ...r, y: r.y + dy };
    };
    const winById = Object.fromEntries(R.wins.map((w) => [w.id, w]));
    const targetOf = (w, u) => {
      const pose = winPose(w, u) || { dy: 0 };
      const r = winRect(w, pose.dy);
      return { x: r.x + r.w * 0.42, y: r.y + r.h - 150 };
    };
    const inRush = (u) => u >= m.rush[0] && u < m.end[0] + CUT;
    function drawRush(ctx, lay, u) {
      const v = Math.abs(beltV(u));
      for (const w of R.wins) {
        const pose = winPose(w, u);
        if (!pose) continue;
        const s = { id: w.id, who: w.who, plat: w.plat, at: w.belt !== undefined ? R.belt.from - 1 : w.enter };
        const press = win(u, w.send - 0.02, w.send + 0.2, 0.05);
        // 传送带飞起来以后拖一道残影
        if (w.belt !== undefined && v > 2500) drawSession(ctx, winRect(w, pose.dy - v * 0.014), s, u, 0.2 * lay.chat.a, 1, 0);
        drawSession(ctx, winRect(w, pose.dy), s, u, pose.a * lay.chat.a, 1, press);
      }
      // 速度线
      if (v > 1500) {
        const k = clamp((v - 1500) / 8000, 0, 1);
        ctx.save();
        ctx.globalAlpha = 0.35 * k * lay.chat.a;
        ctx.fillStyle = "#fff";
        for (let i = 0; i < 22; i++) {
          const len = 80 + v * 0.03 * (0.5 + rnd(i + 900));
          const y = ((rnd(i + 700) * (H + len) + beltX(u) * (0.6 + rnd(i) * 0.5)) % (H + len)) - len;
          ctx.fillRect(BENCH.x + rnd(i + 800) * BENCH.w, y, 2 + rnd(i + 600) * 3, len);
        }
        ctx.restore();
      }
    }
    // 纸飞机一发：慢的时候是一只纸飞机划一道弧飞进输入框；机枪时是枪口火光 + 一道曳光 + 弹出来的纸壳
    function drawShots(ctx, lay, u) {
      const muzzle = planeAt(lay, u);
      for (const f of R.fires) {
        if (u < f.at || u > f.hit + 0.9) continue;
        const w = winById[f.id];
        const to = targetOf(w, Math.min(u, f.hit));
        const k = clamp((u - f.at) / (f.hit - f.at), 0, 1);
        const pos = (kk) => {
          const e = f.gun ? kk : easeIO(kk);
          return { x: lerp(muzzle.x, to.x, e), y: lerp(muzzle.y, to.y, e) - (f.gun ? 0 : Math.sin(e * Math.PI) * 150) };
        };
        if (u < f.hit) {
          if (f.gun) {
            const a = pos(Math.max(0, k - 0.7));
            const b = pos(k);
            const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            g.addColorStop(0, "rgba(255,154,92,0)");
            g.addColorStop(1, "#fff3c4");
            ctx.save();
            ctx.lineCap = "round";
            ctx.lineWidth = 12;
            ctx.strokeStyle = g;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            ctx.restore();
            glow(ctx, b.x, b.y, 60, "rgba(255,200,120,1)", 0.8);
          } else {
            for (let i = 6; i >= 1; i--) {
              const q = pos(Math.max(0, k - i * 0.05));
              ctx.beginPath();
              ctx.arc(q.x, q.y, 7 - i * 0.8, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(255,154,92,${0.5 - i * 0.07})`;
              ctx.fill();
            }
          }
          const b = pos(k);
          const c = pos(Math.min(1, k + 0.02));
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(Math.atan2(c.y - b.y, c.x - b.x) - Math.PI);
          plane(ctx, 0, 0, f.gun ? 44 : 64, ACCENT);
          plane(ctx, 1.5, 0, f.gun ? 34 : 50, "#fff");
          ctx.restore();
        } else {
          // 打进输入框：一圈冲击波 + 火星
          const kk = (u - f.hit) / (f.gun ? 0.25 : 0.4);
          if (kk < 1) {
            ctx.save();
            ctx.globalAlpha = 1 - kk;
            ctx.beginPath();
            ctx.arc(to.x, to.y, 14 + kk * (f.gun ? 130 : 90), 0, Math.PI * 2);
            ctx.lineWidth = f.gun ? 8 : 5;
            ctx.strokeStyle = f.gun ? "#ffd27a" : ACCENT;
            ctx.stroke();
            if (f.gun) {
              for (let i = 0; i < 9; i++) {
                const ang = (i / 9) * Math.PI * 2 + rnd(f.at * 10 + i);
                const r0 = 20 + kk * 90;
                ctx.beginPath();
                ctx.moveTo(to.x + Math.cos(ang) * r0, to.y + Math.sin(ang) * r0);
                ctx.lineTo(to.x + Math.cos(ang) * (r0 + 36), to.y + Math.sin(ang) * (r0 + 36));
                ctx.lineWidth = 5;
                ctx.strokeStyle = "#fff3c4";
                ctx.stroke();
              }
            }
            ctx.restore();
          }
        }
        if (!f.gun) continue;
        // 枪口火光
        const fl = 1 - (u - f.at) / 0.08;
        if (fl > 0) {
          glow(ctx, muzzle.x, muzzle.y, 220 * fl, "rgba(255,150,60,1)", 0.9);
          ctx.save();
          ctx.translate(muzzle.x, muzzle.y);
          ctx.rotate(rnd(f.at * 31) * Math.PI);
          ctx.beginPath();
          for (let i = 0; i < 16; i++) {
            const r0 = (i % 2 ? 22 : 70 + rnd(f.at + i) * 40) * (0.6 + 0.4 * fl);
            const ang = (i / 16) * Math.PI * 2;
            ctx.lineTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
          }
          ctx.closePath();
          ctx.fillStyle = `rgba(255,243,196,${fl})`;
          ctx.fill();
          ctx.restore();
        }
        // 弹出来的纸壳：一小张折过的纸，往右上抛出去再掉下来
        const tau = u - f.at;
        if (tau < 0.9) {
          const r1 = rnd(f.at * 13);
          const x = muzzle.x + (220 + r1 * 260) * tau;
          const y = muzzle.y - (900 + rnd(f.at * 17) * 350) * tau + 0.5 * 3600 * tau * tau;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(tau * (10 + r1 * 10) * (r1 > 0.5 ? 1 : -1));
          ctx.globalAlpha = 1 - sm(0.6, 0.9, tau);
          ctx.fillStyle = "#fffdf8";
          ctx.fillRect(-13, -8, 26, 16);
          ctx.fillStyle = ACCENT;
          ctx.fillRect(-1, -8, 2, 16);
          ctx.restore();
        }
      }
    }
    // 纸飞机打热了：机枪时越打越红，急停以后慢慢凉下来、冒几缕烟
    function drawHeat(ctx, lay, u) {
      const [g0, g1] = m.gun;
      if (u < g0 || u > g1 + 4) return;
      const heat = u <= g1 ? sm(g0, g1, u, (k) => k * k) : 1 - sm(g1 + 0.2, g1 + 3.4, u);
      const p = planeAt(lay, u);
      if (heat > 0.01) {
        glow(ctx, p.x, p.y, 40 + 110 * heat, "rgba(255,70,20,1)", 0.85 * heat);
        plane(ctx, p.x, p.y, 18, `rgba(255,${Math.round(220 - 150 * heat)},${Math.round(120 - 100 * heat)},${heat})`);
      }
      for (let i = 0; i < 8; i++) {
        const tau = u - (g1 + 0.1 + i * 0.32);
        if (tau < 0 || tau > 1.8) continue;
        ctx.beginPath();
        ctx.arc(p.x + Math.sin(tau * 3 + i) * 16 + tau * 12, p.y - 14 - tau * 130, 8 + tau * 22, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,195,190,${0.32 * (1 - tau / 1.8)})`;
        ctx.fill();
      }
    }
    // 屏幕震：机枪越打越抖，急停那一下最狠
    function shake(u) {
      const [g0, g1] = m.gun;
      let amp = 0;
      if (u >= g0 && u < g1) amp = 2 + 7 * sm(g0, g1, u);
      if (u >= g1 - 0.02) amp = Math.max(amp, 22 * Math.exp(-(u - g1 + 0.02) / 0.12));
      if (amp < 0.3) return null;
      const fr = Math.floor(u * 60);
      return { x: (rnd(fr * 1.7) - 0.5) * 2 * amp, y: (rnd(fr * 2.3 + 5) - 0.5) * 2 * amp };
    }
    // 左上角的钟：下午 → 半夜 → 第二天早上 9:00
    function clockAt(u) {
      const list = R.clock;
      const i = lastAt(list, u);
      if (i < 0) return list[0].min;
      const a = list[i];
      const b = list[i + 1];
      if (!b) return a.min;
      return lerp(a.min, b.min, clamp((u - a.at) / (b.at - a.at), 0, 1));
    }
    // 天色：越晚背景越暗、越偏蓝（第二天早上回来）
    function nightTint(ctx, u) {
      if (!inRush(u)) return;
      const a = 0.42 * clamp((clockAt(u) - 17 * 60) / (6 * 60), 0, 1);
      if (a <= 0) return;
      ctx.fillStyle = `rgba(6,10,32,${a})`;
      ctx.fillRect(0, 0, W, H);
    }
    // 右上角的好评数：每一颗心飞到了才跳；数字一位一位滚（里程表那样）
    const coinArrive = (c) => c.at + HEART_FLY;
    const coinValue = (u) => R.coins.reduce((v, c) => v + c.add * easeOut(clamp((u - coinArrive(c)) / 0.22, 0, 1)), R.base);
    function drawHud(ctx, u, cam) {
      const a = sm(m.rush[0], m.rush[0] + 0.5, u) * (1 - sm(m.end[0], m.end[0] + CUT, u));
      if (a <= 0) return;
      const z = W / cam.w;
      const scr = (x, y) => ({ x: (x - cam.x) * z, y: (y - cam.y) * z });
      ctx.save();
      ctx.globalAlpha = a;
      // 飞向好评数的心
      const goal = { x: W - 200, y: 152 };
      for (const c of R.coins) {
        const k = (u - c.at) / HEART_FLY;
        if (k < 0 || k > 1) continue;
        const w = winById[c.id];
        const pose = winPose(w, c.at) || { dy: 0 };
        const r = winRect(w, pose.dy);
        for (let h = 0; h < (c.gun ? 3 : 1); h++) {
          const from = scr(r.x + 120 + h * 70, r.y + r.h - 330 - h * 40);
          const e = easeIO(k);
          const x = lerp(from.x, goal.x, e) + Math.sin(e * Math.PI) * (60 + h * 50);
          const y = lerp(from.y, goal.y, e);
          heart(ctx, x, y, (c.gun ? 34 : 46) * (1 - 0.4 * e), "#ff3b5c");
        }
      }
      // 好评数
      const v = coinValue(u);
      const pk = R.coins.reduce((p, c) => (u >= coinArrive(c) ? Math.max(p, 1 - clamp((u - coinArrive(c)) / 0.3, 0, 1)) : p), 0);
      const nd = Math.max(3, String(Math.floor(v + 0.999)).length);
      ctx.font = `800 76px ${MONO}`;
      const dw = ctx.measureText("0").width;
      const boxW = 70 + 86 + nd * dw + 34;
      const bx = W - 44 - boxW;
      const by = 92;
      const bh = 120;
      ctx.save();
      scaleAt(ctx, bx + boxW / 2, by + bh / 2, 1 + 0.1 * pk);
      glow(ctx, bx + boxW - 80, by + bh / 2, 220, "rgba(255,59,92,1)", 0.45 * pk);
      rr(ctx, bx, by, boxW, bh, 22);
      ctx.fillStyle = "rgba(10,9,8,.86)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255,107,44,.6)";
      ctx.stroke();
      heart(ctx, bx + 46, by + bh / 2 + 4, 52, "#ff3b5c");
      text(ctx, "好评", bx + 84, by + bh / 2, { size: 34, weight: 800, color: MUTED, align: "left" });
      ctx.save();
      rr(ctx, bx + 160, by + 12, nd * dw + 20, bh - 24, 10);
      ctx.clip();
      for (let i = 0; i < nd; i++) {
        const place = Math.pow(10, i);
        const whole = Math.floor(v / place);
        const frac = i === 0 ? v - Math.floor(v) : clamp((v % place) - (place - 1), 0, 1);
        const x = bx + 170 + (nd - 1 - i) * dw + dw / 2;
        const y = by + bh / 2 + 4;
        if (whole > 0 || i === 0) text(ctx, String(whole % 10), x, y - frac * 90, { size: 76, weight: 800, color: FG, font: MONO });
        if (frac > 0) text(ctx, String((whole + 1) % 10), x, y + 90 - frac * 90, { size: 76, weight: 800, color: FG, font: MONO });
      }
      ctx.restore();
      ctx.restore();
      // 刚加上去的分：在好评数下面往下飘（只留最新的一个，机枪时一个顶掉一个）
      const recent = R.coins.filter((c) => u >= coinArrive(c) && u < coinArrive(c) + 0.7).pop();
      if (recent) {
        const k = (u - coinArrive(recent)) / 0.7;
        const pop = easeBack(clamp(k / 0.15, 0, 1));
        text(ctx, `+${recent.add}`, W - 70, by + bh + 50 + k * 60, { size: (recent.add > 9 ? 60 : 46) * pop, weight: 900, color: ACCENT_HOT, align: "right", font: MONO, alpha: 1 - k * k });
      }
      // 左上角的钟
      const min = clockAt(u);
      const cx = 44;
      ctx.font = `800 64px ${MONO}`;
      const cw = 120 + ctx.measureText("00:00").width + 24;
      rr(ctx, cx, by, cw, bh, 22);
      ctx.fillStyle = "rgba(10,9,8,.86)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255,255,255,.18)";
      ctx.stroke();
      const ox = cx + 62;
      const oy = by + bh / 2;
      ctx.beginPath();
      ctx.arc(ox, oy, 36, 0, Math.PI * 2);
      ctx.fillStyle = "#f2ece6";
      ctx.fill();
      const hand = (ang, len, wdt) => {
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + Math.cos(ang - Math.PI / 2) * len, oy + Math.sin(ang - Math.PI / 2) * len);
        ctx.lineWidth = wdt;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#1a1714";
        ctx.stroke();
      };
      hand(((min / 60) % 12) * (Math.PI / 6), 18, 5);
      hand((min % 60) * (Math.PI / 30), 27, 3);
      text(ctx, clockLabel(min).padStart(5, "0"), cx + 112, oy + 3, { size: 64, weight: 800, color: FG, align: "left", font: MONO });
      // 机枪每一发：整屏闪一下橙光
      const last = gunFires[lastAt(gunFires, u)];
      if (last) {
        const fl = 1 - (u - last.at) / 0.06;
        if (fl > 0) {
          ctx.fillStyle = `rgba(255,140,60,${0.08 * fl})`;
          ctx.fillRect(0, 0, W, H);
        }
      }
      ctx.restore();
    }

    // 片尾（竖屏：一屏从上到下排开；底部正中留给播放器的「再看一遍」字条）：翻页进来就是小精灵，没有字卡
    function sceneEnd(ctx, u) {
      const [t0] = m.end;
      if (u < t0) return;
      const b = sm(t0, t0 + 0.6, u, easeBack);
      const cy = 640;
      glow(ctx, W / 2, cy, 420, "rgba(255,107,44,0.7)", 0.4 * clamp(b, 0, 1));
      if (logo.complete && logo.naturalWidth) {
        const bob = Math.sin(u * 2.4) * 8;
        ctx.save();
        ctx.globalAlpha = clamp(b, 0, 1);
        ctx.drawImage(logo, W / 2 - 120 * b, cy - 135 * b + bob, 240 * b, 270 * b);
        ctx.restore();
      }
      const name = "话术精灵";
      chars(name).forEach((c, i) => {
        const d = sm(t0 + 0.4 + i * 0.08, t0 + 0.8 + i * 0.08, u, easeBack);
        text(ctx, c, W / 2 + (i - 1.5) * 170, 930 - (1 - d) * 60, { size: 160, weight: 900, color: FG, alpha: clamp(d, 0, 1) });
      });
      text(ctx, L.value, W / 2, 1080, { size: 64, weight: 800, color: ACCENT, alpha: sm(t0 + 1.2, t0 + 1.6, u) });
      const w = sm(t0 + 1.8, t0 + 2.3, u, easeBack);
      if (w > 0) {
        ctx.save();
        ctx.globalAlpha = clamp(w, 0, 1);
        scaleAt(ctx, W / 2, 1220, 0.9 + 0.1 * w);
        rr(ctx, W / 2 - 360, 1174, 720, 92, 46);
        ctx.fillStyle = ACCENT;
        ctx.fill();
        text(ctx, L.wechat, W / 2, 1221, { size: 48, weight: 800, color: "#000" });
        ctx.restore();
      }
      text(ctx, "Windows 本地永久免费", W / 2, 300, { size: 36, color: MUTED, alpha: sm(t0 + 2.4, t0 + 2.9, u) });
    }

    function vignette(ctx) {
      const d = Math.hypot(W, H);
      const g = ctx.createRadialGradient(W / 2, H / 2, d * 0.29, W / 2, H / 2, d * 0.59);
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
      if (inRush(u)) {
        nightTint(ctx, u);
        const sh = shake(u);
        if (sh) ctx.translate(sh.x, sh.y);
        drawRush(ctx, lay, u);
      } else drawChat(ctx, lay, u);
      drawApp(ctx, lay, u, cur);
      if (inRush(u)) {
        drawHeat(ctx, lay, u);
        drawShots(ctx, lay, u);
      }
      drawFlies(ctx, lay, u);
      drawKeys(ctx, lay, u);
      drawCursor(ctx, lay, u, cur);
      sceneEnd(ctx, u);
      ctx.restore();
    }
    // 镜头外那一层：灯泡、步骤条、钩子标题条 / 题目条、章节标题、字幕、暗角——按画面坐标画，推近时不跟着变大、也不被推出画面
    function overlay(ctx, u, cam) {
      const lay = layoutAt(u);
      ctx.save();
      drawBulb(ctx, lay, u, cam || WIDE);
      drawSteps(ctx, lay, u);
      drawHook(ctx, u);
      drawHead(ctx, u);
      drawCaps(ctx, u);
      drawHud(ctx, u, cam || WIDE);
      vignette(ctx);
      ctx.restore();
    }

    // 翻页（issue #18，assets/js/film-page-turn.js）：只在换到不相干的画面时翻——换了一位顾客（一家平台）的三处（build 里的 pageTurn）、
    // 急停后换片尾。镜头在同一段操作里的推拉不翻。
    function turns() {
      return [...TL.turns.map((x) => ({ ...x, why: "customer" })), { from: m.end[0], to: m.end[0] + CUT, why: "end" }];
    }

    return { TL, render, overlay, camera, cameraTrack, turns };
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
        // ---- 一窗接一窗与机枪（issue #17） ----
        case "zip": {
          // 纸飞机划出去：一道往上走的风声
          const len = Math.max(0.06, (e.dur || 0.3) * k);
          const g = this.gain(out);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.1, t + len * 0.4);
          g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.05);
          const f = this.filter("bandpass", 1200, 2, g);
          f.frequency.exponentialRampToValueAtTime(6000, t + len);
          this.noiseSrc(t, t + len + 0.08, f);
          break;
        }
        case "drop": {
          // 窗口落定：一声闷闷的「咚」
          const g = this.gain(out);
          this.env(g, t, 0.003, 0.32 * v, 0.16);
          const o = this.osc("sine", 140, t, t + 0.22, g);
          o.frequency.exponentialRampToValueAtTime(55, t + 0.15);
          break;
        }
        case "slide": {
          // 窗口往下滑走：往下沉的风声
          const len = Math.max(0.1, (e.dur || 1) * k - skip);
          const g = this.gain(out);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.07 * v, t + Math.min(0.15, len / 3));
          g.gain.exponentialRampToValueAtTime(0.0001, t + len);
          const f = this.filter("lowpass", 1800, 1.5, g);
          f.frequency.exponentialRampToValueAtTime(260, t + len);
          this.noiseSrc(t, t + len + 0.05, f);
          break;
        }
        case "coin": {
          // 好评数跳一下：街机吃金币的两声
          [0, 0.05].forEach((d, i) => {
            const g = this.gain(out);
            this.env(g, t + d, 0.002, 0.05 * v, 0.07);
            this.osc("square", NOTE(a.n + (i ? 7 : 0)), t + d, t + d + 0.1, this.filter("lowpass", 5000, 1, g));
          });
          break;
        }
        case "gun": {
          // 一发：一团噪声 + 一记低音 + 一下尖的击发声
          const g = this.gain(out);
          this.env(g, t, 0.001, 0.32 * v, 0.08);
          this.noiseSrc(t, t + 0.12, this.filter("bandpass", 1400, 0.8, g));
          const g2 = this.gain(out);
          this.env(g2, t, 0.002, 0.55 * v, 0.12);
          const o = this.osc("sine", 120, t, t + 0.16, g2);
          o.frequency.exponentialRampToValueAtTime(42, t + 0.1);
          const g3 = this.gain(out);
          this.env(g3, t, 0.001, 0.06, 0.012);
          this.osc("square", 2600, t, t + 0.02, g3);
          break;
        }
        case "tink": {
          // 纸壳落地：叮
          const g = this.gain(out);
          this.env(g, t, 0.001, 0.045, 0.12);
          this.osc("sine", 4200 + (a.n % 5) * 180, t, t + 0.15, g);
          this.osc("sine", 6300 + (a.n % 3) * 240, t, t + 0.08, g);
          break;
        }
        case "riser": {
          // 机枪越打越快：一股往上爬的嗡鸣
          const len = (e.dur || 4) * k - skip;
          if (len <= 0.05) break;
          const g = this.gain(out);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.07, t + len);
          g.gain.linearRampToValueAtTime(0.0001, t + len + 0.06);
          const f = this.filter("lowpass", 300, 4, g);
          f.frequency.exponentialRampToValueAtTime(5000, t + len);
          [-9, 9].forEach((det) => {
            const o = this.osc("sawtooth", NOTE(36), t, t + len + 0.08, f);
            o.detune.value = det;
            o.frequency.exponentialRampToValueAtTime(NOTE(60), t + len);
          });
          break;
        }
        case "brake": {
          // 急停：一记重的「哐」，往下沉
          const g = this.gain(out);
          this.env(g, t, 0.002, 0.7, 0.5);
          const o = this.osc("sine", 95, t, t + 0.6, g);
          o.frequency.exponentialRampToValueAtTime(32, t + 0.5);
          const g2 = this.gain(out);
          this.env(g2, t, 0.002, 0.3, 0.35);
          this.noiseSrc(t, t + 0.4, this.filter("lowpass", 700, 1, g2));
          break;
        }
        case "hiss": {
          // 打热的纸飞机凉下来：一缕「嘶——」
          const len = Math.max(0.1, (e.dur || 1.5) * k - skip);
          const g = this.gain(out);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.035, t + 0.1);
          g.gain.exponentialRampToValueAtTime(0.0001, t + len);
          this.noiseSrc(t, t + len + 0.05, this.filter("highpass", 3500, 0.7, g));
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
    const view = globalThis.FilmPageTurn.compose({ width: W, height: H, render: film.render, camera: film.camera, overlay: film.overlay, turns: film.turns() });
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
      still: 2.6, // 封面：钩子标题条 + 顾客第一句 + 客服正在手打的回复，都已在画面里
      label: `推广视频《补运费登记案例》（${Math.floor(base / 60)} 分 ${base % 60} 秒，有声）：开场一句「${L.hook.join("")}」，题目「${L.title}」从头挂到尾；没有话术时客服问一句、顾客等很久才回一句；用话术精灵新增一条话术一次问齐，双击、发送，顾客一次给齐；顾客一句句追问，客服每次灵机一动把答案补进同一条话术；从此双击一下话术就发出去，气泡里六句话对上六次追问一起亮起，顾客一次性回「好的谢谢」；然后一个聊天窗接一个聊天窗、平台换着来：点一下话术左边的纸飞机直接发出，顾客道谢，窗口滑走，下一个落下来，越来越快，最后话术精灵像机枪一样把话术一发发打进聊天框，右上角好评数一路往上跳，钟从下午走到半夜；急停之后最后一位顾客回「好的谢谢」，第二天早上新的窗口又落下来。片尾：话术精灵，节约时间，快速高效率。`,
      cover: { text: "播放 · 补运费登记案例 · 有声", again: "再看一遍" },
      render: view.render, // 镜头与镜头外那一层由翻页模块按页各自走（翻页时一帧里有两页）
      score: film.TL.score,
      createSynth: () => new Synth(),
      fullscreen: true,
    });
    logo.addEventListener("load", refresh);
    root.freightFilm = { ...api, film };
  }

  // 测试钩子：Node 里没有 document，只把时间线与渲染交出去
  if (typeof document === "undefined") {
    globalThis.__freightFilm = makeFilm;
    return;
  }
  document.querySelectorAll("[data-freight-film]").forEach(mount);
})();
