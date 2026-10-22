// 「怎么用」页的 45 秒演示短片：不用视频文件，也不用画布，而是一块 DOM 舞台——
// 聊天窗、话术精灵主界面、吸附搜索栏都是首页演示同款的样子（样式见 assets/css/guide-film.css，数值照抄 demo.css），
// 再由一条时间线按秒驱动：真的鼠标箭头会移动、悬停高亮、按下有涟漪，搜索框与输入框逐字打字。
// 画面上的一切都是时间 T 的纯函数，拖进度条到哪一秒都能还原同一帧。
(() => {
  const stage = document.getElementById("guide-film");
  if (!stage) return;
  const playButton = document.getElementById("guide-play");
  const track = document.getElementById("guide-track");
  const fill = document.getElementById("guide-fill");
  const timeLabel = document.getElementById("guide-time");
  const stepButtons = [...document.querySelectorAll("[data-chapter]")];

  const W = 800;
  const DURATION = 45;
  const ZOOM = 1.5; // 窄屏（舞台 < 560px）时镜头推近的倍数，字才看得清

  // ---------- 数学 ----------
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOutBack = (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
  const sm = (a, b, t, e = easeIO) => e(clamp((t - a) / (b - a), 0, 1));
  const within = (t, a, b) => t >= a && t < b;
  const fadeWin = (t, a, b, f = 0.25) => sm(a, a + f, t) * (1 - sm(b - f, b, t));

  // 逐字打字：每个字间隔 60–110ms（固定伪随机，拖进度条也一样），返回到 T 为止打出的字数。
  function typedCount(text, start, t) {
    const chars = [...text];
    let at = start;
    for (let i = 0; i < chars.length; i++) {
      at += 0.06 + ((i * 37 + chars.length * 11) % 51) / 1000;
      if (t < at) return i;
    }
    return chars.length;
  }
  const typed = (text, start, t) => [...text].slice(0, typedCount(text, start, t)).join("");

  // ---------- 剧本 ----------
  // 场景时间都是整片的绝对秒数，与页面下方五个步骤（data-chapter = 段号）一一对应。
  const SCENES = [
    { start: 0, end: 4 },
    { start: 4, end: 11, caption: "分好类：团队 / 个人 / 离线，每类 0–9 十套" },
    { start: 11, end: 18, caption: "双击话术，贴进聊天输入框" },
    { start: 18, end: 26, caption: "点左侧纸飞机，直接发送" },
    { start: 26, end: 35, caption: "Alt+Q 搜索，按 Tab 再按数字直接发送" },
    { start: 35, end: 41, caption: "吸附搜索栏贴在聊天窗口下面" },
    { start: 41, end: DURATION },
  ];
  const NUMS = ["", "①", "②", "③", "④", "⑤"];
  // 搜索框与结果区的提示语，照客户端：一次只提示下一步该按什么。
  const HINT = {
    idle: "Alt+Q 定位搜索栏",
    empty: "输入关键词搜索",
    tab: `按 <span class="gf-hint-cap">Tab</span> 固定结果 → 按数字发送`,
    digits: "按数字直接发送 · Esc 退出",
  };

  const ROW = {
    welcome: { title: "欢迎问候", text: "亲，您好！欢迎光临，有什么可以帮到您的吗？" },
    busy: { title: "忙时提醒", text: "您好，稍等一下哦，马上为您服务~" },
    real: { title: "正品保证", text: "亲，我们是品牌直营，保证正品～" },
    ship: { title: "发货时间", text: "亲，今天下单今天发货～" },
    free: { title: "包邮说明", text: "亲，全场满 49 元包邮～" },
    rush: { title: "催发货", text: "亲，已经帮您催仓库了，今天一定发出～" },
    addr: { title: "发货地址", text: "亲，我们从杭州仓发货，一般 2 天到～" },
    swap: { title: "退换说明", text: "亲，7 天无理由退换，运费险已经帮您买好～" },
    hi: { title: "打招呼", text: "在的亲，请讲～" },
    off: { title: "下班留言", text: "亲，客服已下班，明早 9 点第一时间回复您～" },
    lag: { title: "网络异常", text: "亲，网络有点慢，稍等我一下～" },
  };
  // 主界面在各个时刻显示的那一屏：一级分类、二级分类、话术行（搜索结果带客户端格式的来源文案）。
  const VIEWS = {
    team0: { chips: ["欢迎", "售前", "售后", "物流"], chip: 0, lv2: "欢迎话术", rows: [ROW.welcome, ROW.busy] },
    personal: { chips: ["我的常用", "催单"], chip: 0, lv2: "我的常用", rows: [ROW.hi, ROW.off] },
    local: { chips: ["离线备用"], chip: 0, lv2: "离线备用", rows: [ROW.lag] },
    team3: { chips: ["欢迎", "售前", "售后", "物流"], chip: 0, lv2: "欢迎话术", rows: [ROW.welcome, ROW.busy] },
    presale: { chips: ["欢迎", "售前", "售后", "物流"], chip: 1, lv2: "常见问题", rows: [ROW.real, ROW.ship, ROW.free] },
    search: {
      results: true,
      chips: ["欢迎", "售前", "售后", "物流"],
      chip: 1,
      lv2: null,
      rows: [
        { ...ROW.ship, path: "团队·第3套｜售前 > 常见问题" },
        { ...ROW.rush, path: "团队·第3套｜售后 > 物流跟进" },
        { ...ROW.addr, path: "团队·第3套｜物流 > 发货说明" },
      ],
    },
    located: { chips: ["欢迎", "售前", "售后", "物流"], chip: 2, lv2: "物流跟进", rows: [ROW.rush, ROW.swap] },
  };
  const BAR_HIT = { ...ROW.free, path: "团队·第3套｜售前 > 常见问题" };

  const PASTED = ROW.real.text;
  const EDIT = "放心拍哦";
  const BUBBLES = [
    { side: "in", text: "老板，是正品吗？", at: 12.0 },
    { side: "out", text: PASTED + EDIT, at: 17.05 },
    { side: "out", text: ROW.ship.text, at: 20.45 },
    { side: "in", text: "好的，那我拍了！", at: 23.2 },
    { side: "out", text: ROW.rush.text, at: 31.55 },
    { side: "out", text: ROW.free.text, at: 39.3 },
  ];

  // 鼠标轨迹：[秒, 目标, dx, dy]。目标是舞台里的 data-ref，位置每帧现量（窗口在动也能停在按钮正中）；
  // 目标为 null 时 dx/dy 是舞台坐标。相邻两点之间缓动。
  const POINTER = [
    [5.5, null, 400, 420], [6.1, "tab1"], [6.3, "tab1"], [6.8, "tab2"], [7.0, "tab2"], [7.5, "tab0"], [7.7, "tab0"],
    [8.3, "digit3"], [8.5, "digit3"], [9.0, "chip1"], [9.2, "chip1"], [9.9, null, 430, 430],
    [12.8, null, 640, 430], [13.5, "title0"], [14.0, "title0"], [14.9, "input", -40, 6], [15.4, "input", -40, 6], [16.2, "input", 60, 40],
    [18.6, null, 660, 430], [19.6, "plane1"], [19.95, "plane1"], [20.9, "plane1", 70, 50],
    [36.5, null, 600, 300], [37.0, "barInput", -60, 0], [37.5, "barInput", -60, 0], [39.6, "barInput", -40, 0],
  ];
  const POINTER_SHOWN = [[5.5, 9.9], [12.8, 16.2], [18.6, 21.0], [36.5, 39.6]];
  const CLICKS = [
    [6.2, "tab1"], [6.9, "tab2"], [7.6, "tab0"], [8.4, "digit3"], [9.1, "chip1"],
    [13.6, "title0"], [13.85, "title0"], [15.0, "input", -40, 6], [19.8, "plane1"], [37.05, "barInput", -60, 0],
  ];
  // 按键提示：[出现, 按下, 消失, 键帽, 贴在哪个元素旁边, dx, dy]（dx 从元素水平中心算，dy 从元素顶边算）。
  // 第④段的键帽放在主界面右边的空白里、和搜索框齐平（dx 156 = 半宽 150 + 6），不压搜索结果卡。
  const KEYS = [
    [16.4, 17.0, 17.5, ["Enter"], "send", -24, -80],
    [26.3, 27.0, 27.8, ["Alt", "Q"], "app", 156, 300],
    [29.3, 29.8, 30.3, ["Tab"], "app", 156, 318],
    [30.5, 31.0, 31.5, ["2"], "app", 156, 318],
    [38.3, 38.8, 39.3, ["Enter"], "bar", 230, -2],
  ];
  // 标注：[出现, 消失, 文字, 宽屏位置, 窄屏位置]
  const NOTES = [
    [15.6, 17.0, "只贴进来，还没发，还能改字", [52, 276], [52, 276]],
    [20.6, 22.3, "贴进去 + 回车，一步发出", [52, 276], [52, 276]],
    [37.6, 41, "不用切回主界面，也能搜、能发", [470, 300], [52, 196]],
  ];
  // 窄屏镜头跟着操作走：[秒, 中心 x, 中心 y]（舞台坐标）
  const CAMERA = [
    [0, 400, 225], [10.0, 400, 225], [11.0, 600, 225], [13.95, 600, 225], [14.5, 240, 260], [17.8, 240, 260],
    [18.5, 610, 225], [20.0, 610, 225], [20.5, 240, 260], [26.0, 240, 260], [26.6, 610, 260], [31.1, 610, 260],
    [31.5, 240, 260], [35.4, 240, 260], [36.0, 300, 330], [41.0, 300, 330], [41.5, 400, 225],
  ];

  // ---------- 舞台 ----------
  const PLANE = `<svg class="gf-app-row-send" viewBox="0 0 14 14" data-hov><path d="M1 7 L13 1 L7 7 L13 13 Z" /><path d="M7 7 L13 1" /></svg>`;
  const rowHtml = (row, i) => `<div class="gf-app-row" data-ref="row${i}" data-hov>
    ${PLANE.replace("data-hov", `data-hov data-ref="plane${i}"`)}
    <span class="gf-app-row-body">
      <span class="gf-app-row-main"><span class="gf-app-row-digit" hidden>${(i + 1) % 10}</span><img class="gf-app-row-icon" src="assets/type-text.png" alt="" /><span class="gf-app-row-title" data-ref="title${i}">${row.title}</span>${row.path ? `<span class="gf-app-row-path">${row.path}</span>` : ""}</span>
      <span class="gf-app-row-text">${row.text}</span>
    </span>
  </div>`;
  // 搜索结果卡的表头：「搜索结果 · N」+ 下一步提示（按 Tab 之前教 Tab，按过 Tab 教数字）。
  const resultsHeadHtml = (count, hint) =>
    `<div class="gf-results-head"><span class="gf-results-title">搜索结果 · ${count}</span><span class="gf-results-hint">${hint}</span></div>`;
  const viewHtml = (view, hint) =>
    (view.results ? resultsHeadHtml(view.rows.length, hint) : "") +
    (view.lv2
      ? `<div class="gf-app-lv2"><span class="gf-app-lv2-arrow">▼</span><span class="gf-app-lv2-title">${view.lv2}</span></div>`
      : "") +
    view.rows.map(rowHtml).join("");

  stage.innerHTML = `<div class="gf-screen" aria-hidden="true">
  <div class="gf-win gf-chat" data-ref="chat" data-skin="css">
    <div class="gf-chat-head"><span class="gf-chat-avatar">陈</span><span class="gf-chat-who"><strong>顾客·小陈</strong><em>在线</em></span></div>
    <div class="gf-chat-log">
      ${BUBBLES.map((b) => `<div class="gf-msg ${b.side === "in" ? "gf-msg--in" : "gf-msg--out"}" hidden><p class="gf-bubble">${b.text}</p></div>`).join("")}
      <div class="gf-msg gf-msg--in" data-ref="typing" hidden><span class="gf-typing"><i class="gf-typing-dot"></i><i class="gf-typing-dot"></i><i class="gf-typing-dot"></i></span></div>
    </div>
    <div class="gf-chat-foot">
      <div class="gf-chat-input" data-ref="input" data-hov></div>
      <span class="gf-chat-send" data-ref="send">发送</span>
    </div>
  </div>
  <div class="gf-attached" data-ref="bar" hidden>
    <div class="gf-attached-results" data-ref="pop" hidden>
      ${resultsHeadHtml(1, HINT.tab)}
      <div data-ref="popList">${rowHtml(BAR_HIT, 9)}</div>
    </div>
    <span class="gf-snap" data-ref="snap"></span>
    <div class="gf-attached-row" data-ref="barRow">
      <span class="gf-attached-input" data-ref="barInput" data-hov></span>
      <span class="gf-attached-range">全部</span>
      <span class="gf-attached-toggle">›</span>
    </div>
  </div>
  <div class="gf-win gf-app" data-ref="app">
    <div class="gf-app-bar">
      <span class="gf-app-tag">演示</span>
      <span class="gf-app-wins">
        <svg class="gf-app-win" viewBox="0 0 16 16"><path d="M5 3.5v5a3 3 0 0 0 6 0v-5" /><path d="M5 3.5h1.6M9.4 3.5H11" /></svg>
        <svg class="gf-app-win" viewBox="0 0 16 16"><path d="M6.3 3.6h3.4" /><path d="M6.9 3.6 6.4 7.4h3.2l-.5-3.8" /><path d="M8 7.4v5.6" /></svg>
        <svg class="gf-app-win" viewBox="0 0 16 16"><path d="M4 8h8" /></svg>
      </span>
    </div>
    <div class="gf-app-tabs">${["团队话术", "个人话术", "离线话术"].map((t, i) => `<span class="gf-app-tab" data-ref="tab${i}" data-hov>${t}</span>`).join("")}</div>
    <div class="gf-app-digits">${Array.from({ length: 10 }, (_, i) => `<span class="gf-app-digit" data-ref="digit${i}" data-hov>${i}</span>`).join("")}</div>
    <div class="gf-app-lv1" data-ref="chips"></div>
    <div class="gf-app-tree" data-ref="tree"></div>
    <div class="gf-app-search">
      <span class="gf-app-search-input" data-ref="search"></span>
      <span class="gf-app-range">全部 ▾</span>
    </div>
  </div>
  ${NOTES.map(() => `<span class="gf-note" hidden></span>`).join("")}
  ${KEYS.map((k) => `<span class="gf-key" hidden>${k[3].map((c) => `<span class="gf-cap">${c}</span>`).join("+")}</span>`).join("")}
  <span class="gf-ripple" hidden></span><span class="gf-ripple" hidden></span>
  <span class="gf-pointer" data-ref="pointer" hidden><svg viewBox="0 0 14 21"><path d="M1 1v16.2l3.9-3.7 2.6 6.1 2.6-1.1-2.6-6H13Z" fill="#fff" stroke="#000" stroke-width="1" stroke-linejoin="round" /></svg></span>
</div>
<div class="gf-hud" aria-hidden="true">
  <p class="gf-caption" data-ref="caption"></p>
  <div class="gf-title" data-ref="intro"><img src="assets/logo.png" alt="" /><strong>话术精灵</strong><span>45 秒看懂怎么用</span></div>
  <div class="gf-title" data-ref="outro" hidden><img src="assets/logo.png" alt="" /><strong>装好就能用</strong><span>本地永久免费 · <b>luyao2089.cc</b></span></div>
</div>`;

  const screen = stage.querySelector(".gf-screen");
  const hud = stage.querySelector(".gf-hud");
  const ref = (name) => stage.querySelector(`[data-ref="${name}"]`);
  const R = Object.fromEntries(
    ["chat", "input", "send", "typing", "bar", "pop", "snap", "barRow", "barInput", "app", "chips", "tree", "search", "pointer", "caption", "intro", "outro"].map(
      (name) => [name, ref(name)],
    ),
  );
  const msgs = [...stage.querySelectorAll(".gf-chat-log .gf-msg:not([data-ref])")];
  const typingDots = [...R.typing.querySelectorAll(".gf-typing-dot")];
  const notes = [...stage.querySelectorAll(".gf-note")];
  const keys = [...stage.querySelectorAll(".gf-key")];
  const ripples = [...stage.querySelectorAll(".gf-ripple")];
  const tabs = [0, 1, 2].map((i) => ref(`tab${i}`));
  const digits = Array.from({ length: 10 }, (_, i) => ref(`digit${i}`));

  // 截图模式：页面上给了 data-chat-shot（assets/img/ 下的真实聊天窗截图）就用截图当聊天窗的底，
  // 代码画的外框隐藏，气泡和输入框里的字照常叠在上面。没给就是代码画的。
  const chatShot = stage.dataset.chatShot;
  if (chatShot) {
    R.chat.dataset.skin = "shot";
    R.chat.insertAdjacentHTML("afterbegin", `<img class="gf-shot" src="${chatShot}" alt="" />`);
  }

  // ---------- 小工具 ----------
  const show = (el, on) => {
    if (el.hidden === on) el.hidden = !on;
  };
  const setHtml = (el, html) => {
    if (el._html !== html) el.innerHTML = el._html = html;
  };
  const caretHtml = (on) => `<i class="gf-caret"${on ? "" : " hidden"}></i>`;
  const fieldHtml = (text, focused, placeholder, t) => {
    const blink = Math.floor(t * 2) % 2 === 0;
    if (!text) return focused ? caretHtml(blink) + `<span class="gf-placeholder">${placeholder}</span>` : `<span class="gf-placeholder">${placeholder}</span>`;
    return text + (focused ? caretHtml(blink) : "");
  };

  let scale = 1;
  let zoomed = false;
  let cam = { x: 0, y: 0, z: 1 };

  // 元素在舞台坐标里的位置（扣掉缩放和镜头）。
  let screenRect = null; // 每帧量一次
  function rectOf(el) {
    const s = (screenRect ??= screen.getBoundingClientRect());
    const r = el.getBoundingClientRect();
    const k = scale * cam.z;
    return { x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k };
  }
  function pointOf(target, dx = 0, dy = 0) {
    if (!target) return [dx, dy];
    const el = ref(target);
    if (!el) return [dx, dy];
    const r = rectOf(el);
    return [r.x + r.w / 2 + dx, r.y + r.h / 2 + dy];
  }

  // ---------- 每一帧 ----------
  function viewAt(t) {
    const tab = t < 6.2 ? 0 : t < 6.9 ? 1 : t < 7.6 ? 2 : 0;
    if (tab === 1) return "personal";
    if (tab === 2) return "local";
    if (t < 8.4) return "team0";
    if (t < 9.1) return "team3";
    if (within(t, 27.6, 31.6) && typedCount("发货", 27.6, t) === 2) return "search";
    if (t >= 31.6) return "located";
    return "presale";
  }

  function renderApp(t) {
    const on = within(t, 4, 35.6);
    show(R.app, on);
    if (!on) return;
    R.app.style.opacity = String(sm(4, 4.6, t) * (1 - sm(35, 35.6, t)));
    R.app.style.left = `${lerp(250, 460, sm(9.8, 10.8, t)) + 20 * sm(35, 35.6, t)}px`;
    R.app.style.transform = `scale(${lerp(0.97, 1, sm(4, 4.6, t))})`;

    const tab = t < 6.2 ? 0 : t < 6.9 ? 1 : t < 7.6 ? 2 : 0;
    tabs.forEach((el, i) => el.classList.toggle("gf-app-tab--active", i === tab));
    const digit = tab === 0 && t >= 8.4 ? 3 : 0;
    digits.forEach((el, i) => el.classList.toggle("gf-app-digit--active", i === digit));

    const name = viewAt(t);
    const view = VIEWS[name];
    setHtml(
      R.chips,
      view.chips.map((c, i) => `<span class="gf-app-chip${i === view.chip ? " gf-app-chip--active" : ""}" data-ref="chip${i}" data-hov>${c}</span>`).join(""),
    );
    R.tree.classList.toggle("gf-app-tree--results", Boolean(view.results));
    setHtml(R.tree, viewHtml(view, t >= 29.8 ? HINT.digits : HINT.tab));
    // 列表底边放不下整行的就不画：一行要么完整可见、要么还没开始，不会被底边横着切过文字。
    const treeBottom = R.tree.offsetTop + R.tree.clientTop + R.tree.clientHeight;
    R.tree.querySelectorAll(".gf-app-row").forEach((row) => {
      row.style.visibility = row.offsetTop + row.offsetHeight <= treeBottom ? "" : "hidden";
    });

    // 选中 / 正在发送的行
    let selected = -1;
    let sending = -1;
    if (name === "presale" && within(t, 13.6, 18)) selected = 0;
    if (name === "presale" && within(t, 19.8, 20.45)) sending = 1;
    if (name === "presale" && within(t, 20.45, 26)) selected = 1;
    if (name === "search" && within(t, 31.0, 31.6)) sending = 1;
    if (name === "located") selected = 0;
    R.tree.querySelectorAll(".gf-app-row").forEach((row, i) => {
      row.classList.toggle("gf-app-row--selected", i === selected);
      row.classList.toggle("gf-app-row--sending", i === sending);
      const badge = row.querySelector(".gf-app-row-digit");
      if (badge) show(badge, name === "search" && t >= 29.8);
    });

    // 搜索框：Alt+Q 定位 → 逐字打「发货」→ 用了第 2 条命中后退出搜索
    const focused = within(t, 27.0, 31.6);
    const text = within(t, 27.6, 31.6) ? typed("发货", 27.6, t) : "";
    R.search.classList.toggle("gf-app-search-input--focus", focused);
    R.search.classList.toggle("gf-app-search-input--hit", within(t, 27.0, 27.9));
    setHtml(R.search, fieldHtml(text, focused, focused ? HINT.empty : HINT.idle, t));
  }

  function renderChat(t) {
    const on = t >= 11;
    show(R.chat, on);
    if (!on) return;
    const k = sm(11, 11.6, t);
    R.chat.style.opacity = String(k);
    R.chat.style.transform = `translateY(${(1 - k) * 8}px)`;

    BUBBLES.forEach((b, i) => {
      const d = t - b.at;
      show(msgs[i], d >= 0);
      if (d >= 0) {
        const e = clamp(d / 0.22, 0, 1);
        msgs[i].style.opacity = String(e);
        msgs[i].style.transform = e < 1 ? `translateY(${(1 - e) * 6}px)` : "";
      }
    });
    const typing = within(t, 22.3, 23.2);
    show(R.typing, typing);
    if (typing) typingDots.forEach((dot, i) => (dot.style.opacity = String(0.3 + 0.7 * Math.max(0, Math.sin((t - i * 0.15) * Math.PI * 2)))));

    // 输入框：双击贴入（只贴不发）→ 点一下补几个字 → 回车发出；纸飞机、数字键、吸附栏回车都是「贴入 + 回车」
    let text = "";
    if (within(t, 13.95, 17.05)) text = PASTED + (t >= 15.1 ? typed(EDIT, 15.1, t) : "");
    else if (within(t, 19.85, 20.45)) text = ROW.ship.text;
    else if (within(t, 31.05, 31.55)) text = ROW.rush.text;
    else if (within(t, 38.85, 39.3)) text = ROW.free.text;
    const focused = within(t, 13.95, 17.05);
    R.input.classList.toggle("gf-chat-input--focus", focused);
    setHtml(R.input, fieldHtml(text, focused, "双击右侧话术贴进来，也可以直接打字，回车发送", t));
    R.send.classList.toggle("gf-chat-send--ready", Boolean(text));
  }

  function renderBar(t) {
    const on = t >= 35.8;
    show(R.bar, on);
    if (!on) return;
    // 从下方滑上来，吸附到聊天窗口底边（顶边亮一下表示吸住了）
    R.bar.style.top = `${lerp(470, 398, easeOutBack(clamp((t - 35.8) / 0.6, 0, 1)))}px`;
    R.snap.style.opacity = String(fadeWin(t, 36.3, 37.1, 0.15));
    const focused = within(t, 37.05, 38.85);
    R.barRow.classList.toggle("gf-attached-row--focus", focused);
    const text = within(t, 37.4, 38.85) ? typed("包邮", 37.4, t) : "";
    setHtml(R.barInput, fieldHtml(text, focused, focused ? HINT.empty : HINT.idle, t));
    show(R.pop, text === "包邮");
  }

  function renderPointer(t) {
    const visible = Math.max(...POINTER_SHOWN.map(([a, b]) => fadeWin(t, a, b, 0.2)));
    show(R.pointer, visible > 0);
    let at = null;
    if (visible > 0) {
      let i = POINTER.findIndex((key) => key[0] > t);
      if (i === -1) i = POINTER.length - 1;
      const b = POINTER[i];
      const a = POINTER[Math.max(0, i - 1)];
      const f = b[0] === a[0] ? 1 : easeIO(clamp((t - a[0]) / (b[0] - a[0]), 0, 1));
      const pa = pointOf(a[1], a[2], a[3]);
      const pb = pointOf(b[1], b[2], b[3]);
      at = [lerp(pa[0], pb[0], f), lerp(pa[1], pb[1], f)];
      const pressed = CLICKS.some(([c]) => within(t, c, c + 0.1));
      R.pointer.style.opacity = String(visible);
      R.pointer.style.transform = `translate(${at[0] - 1}px, ${at[1] - 1}px) scale(${pressed ? 0.88 : 1})`;
    }
    // 悬停：鼠标尖下面的可点元素亮起来（和真实界面的 :hover 一样）
    stage.querySelectorAll("[data-hov]").forEach((el) => {
      let over = false;
      if (at && visible > 0.5 && !el.closest("[hidden]")) {
        const r = rectOf(el);
        over = at[0] >= r.x && at[0] <= r.x + r.w && at[1] >= r.y && at[1] <= r.y + r.h;
      }
      el.classList.toggle("gf-hover", over);
    });
    // 按下的涟漪：双击两下各一圈
    const active = CLICKS.filter(([c]) => within(t, c, c + 0.4)).slice(-2);
    ripples.forEach((el, i) => {
      const click = active[i];
      show(el, Boolean(click));
      if (!click) return;
      const k = (t - click[0]) / 0.4;
      const [x, y] = pointOf(click[1], click[2], click[3]);
      el.style.opacity = String(1 - k);
      el.style.transform = `translate(${x}px, ${y}px) scale(${0.3 + 0.9 * k})`;
    });
  }

  function renderKeysAndNotes(t) {
    KEYS.forEach(([from, press, to, , target, dx, dy], i) => {
      const el = keys[i];
      const on = within(t, from, to);
      show(el, on);
      if (!on) return;
      const r = rectOf(ref(target));
      el.style.left = `${r.x + r.w / 2 + dx}px`;
      el.style.top = `${r.y + dy}px`;
      el.style.opacity = String(fadeWin(t, from, to, 0.15));
      el.querySelectorAll(".gf-cap").forEach((cap) => cap.classList.toggle("gf-cap--down", within(t, press, press + 0.18)));
    });
    NOTES.forEach(([from, to, text, wide, narrow], i) => {
      const el = notes[i];
      const on = within(t, from, to);
      show(el, on);
      if (!on) return;
      const [x, y] = zoomed ? narrow : wide;
      el.textContent = text;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.opacity = String(fadeWin(t, from, to, 0.25));
    });
  }

  function renderHud(t) {
    const scene = SCENES.findIndex((s) => s.caption && t >= s.start && t < s.end);
    show(R.caption, scene > 0);
    if (scene > 0) {
      const s = SCENES[scene];
      setHtml(R.caption, `<b>${NUMS[scene]}</b> ${s.caption}`);
      R.caption.style.opacity = String(fadeWin(t, s.start, s.end, 0.35));
    }
    show(R.intro, t < 4);
    if (t < 4) {
      R.intro.style.opacity = String(1 - sm(3.4, 4, t));
      [...R.intro.children].forEach((el, i) => (el.style.opacity = String(sm(0.2 + i * 0.5, 0.8 + i * 0.5, t))));
    }
    show(R.outro, t >= 41);
    if (t >= 41) {
      R.outro.style.opacity = String(sm(41, 41.6, t));
      [...R.outro.children].forEach((el, i) => (el.style.opacity = String(sm(41.4 + i * 0.5, 42 + i * 0.5, t))));
    }
  }

  function renderCamera(t) {
    let x = W / 2;
    let y = 225;
    if (zoomed) {
      let i = CAMERA.findIndex((key) => key[0] > t);
      if (i === -1) i = CAMERA.length - 1;
      const b = CAMERA[i];
      const a = CAMERA[Math.max(0, i - 1)];
      const f = b[0] === a[0] ? 1 : easeIO(clamp((t - a[0]) / (b[0] - a[0]), 0, 1));
      x = lerp(a[1], b[1], f);
      y = lerp(a[2], b[2], f);
    }
    const z = zoomed ? ZOOM : 1;
    const vw = W / z;
    const vh = 450 / z;
    cam = { x: clamp(x - vw / 2, 0, W - vw), y: clamp(y - vh / 2, 0, 450 - vh), z };
    screen.style.transform = `scale(${scale * z}) translate(${-cam.x}px, ${-cam.y}px)`;
    hud.style.transform = `scale(${scale})`;
  }

  function render(t) {
    renderCamera(t);
    renderApp(t);
    renderChat(t);
    renderBar(t);
    // 下面这些要量元素位置，放在所有状态写完之后
    screenRect = null;
    renderKeysAndNotes(t);
    renderPointer(t);
    renderHud(t);
  }

  // ---------- 播放器 ----------
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STILL = 16.8;
  let time = calm ? STILL : 0;
  let playing = false;
  let userPaused = calm;
  let onScreen = false;
  let lastNow = 0;
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

  function draw() {
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
    draw();
  }

  function resize() {
    const width = stage.clientWidth;
    if (!width) return;
    scale = width / W;
    zoomed = width < 560;
    stage.toggleAttribute("data-zoom", zoomed);
    draw();
  }

  playButton?.addEventListener("click", () => {
    userPaused = playing;
    setPlaying(!playing);
  });
  stage.addEventListener("click", () => playButton?.click());

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
      stage.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" });
    });
  });

  // 只在看得见的时候播：滚走或切到别的标签页就停，回来接着放（除非访客自己按了暂停）。
  new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      if (!userPaused) setPlaying(onScreen && !document.hidden);
    },
    { threshold: 0.35 },
  ).observe(stage);
  document.addEventListener("visibilitychange", () => {
    if (!userPaused) setPlaying(onScreen && !document.hidden);
  });
  new ResizeObserver(resize).observe(stage);
  resize();
})();
