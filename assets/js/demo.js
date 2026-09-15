/* 首页交互演示：复刻客户端主界面的操作路径（话术域 → 套号 → 一级分类 → 二级分类 → 话术 → 发送）。
   演示数据只存在于当前页面内存，不发起任何请求。 */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  // 演示数据与话术行标记来自 demo-data.js：同一份也用来预渲染首页静态 HTML（爬虫读得到）。
  const { SCOPES, esc, rowHtml, treeHtml } = globalThis.SOFTTALK_DEMO;

  const COMMON_PHRASES = ["你好～", "稍等一下~", "好的", "感谢您", "已收到", "马上处理"];

  const CUSTOMER_REPLIES = [
    "运费险有吗？不满意可以退换吗？",
    "好的，那就放心了。现在有优惠活动吗？",
    "我比较急，今天下单能当天发货吗？",
    "明白了，已经拍下！麻烦帮我备注一下是送人的礼物～",
    "收到货啦！质量很不错，跟描述完全一致，很满意！",
    "好评已给！感谢你们的耐心服务，下次还来～",
  ];

  const OPENING_MESSAGE = "老板，这款产品质量怎么样，是正品吗？";

  /* ---------- 状态 ---------- */
  const state = {
    scope: "team",
    set: 0,
    category: 0,
    range: "all",
    query: "",
    // 数字选择态：在哪个搜索框里按过 Tab（客户端 search_result_digit_selection）。
    digitSurface: null,
    // 底部吸附栏在客户端里有自己的搜索状态，但和主界面共用搜索范围与搜索历史。
    // barActive：焦点进过吸附栏（客户端「最近搜索」只在面板激活时显示）。
    barActive: false,
    history: [],
    sent: 0,
    replied: 0,
    replyPending: false,
    epoch: 0,
  };

  let rows = [];
  let barRows = [];

  const sets = () => SCOPES[state.scope].sets;
  const currentSet = () => sets()[state.set];
  const categories = () => currentSet().categories;
  const currentCategory = () => categories()[state.category];

  const el = {
    log: $("demo-log"),
    input: $("demo-input"),
    send: $("demo-send-btn"),
    tabs: $("demo-tabs"),
    digits: $("demo-digits"),
    chips: $("demo-chips"),
    tree: $("demo-list"),
    quick: $("demo-quick"),
    search: $("demo-search"),
    range: $("demo-range"),
    setLabel: $("demo-set"),
    count: $("demo-count"),
    countNum: $("demo-count-num"),
    reset: $("demo-reset"),
    bar: $("demo-attached"),
    barResults: $("demo-attached-results"),
    barTitle: $("demo-attached-title"),
    barClose: $("demo-attached-close"),
    barList: $("demo-attached-list"),
    barInput: $("demo-attached-input"),
    barClear: $("demo-attached-clear"),
    barRange: $("demo-attached-range"),
    barToggle: $("demo-attached-toggle"),
    barPhrases: $("demo-attached-phrases"),
    barQuick: $("demo-attached-quick"),
    barHistory: $("demo-attached-history"),
    barHistoryChips: $("demo-attached-history-chips"),
    barHistoryClear: $("demo-attached-history-clear"),
  };

  /* ---------- 渲染 ---------- */
  const renderTabs = () => {
    el.tabs.querySelectorAll(".app-tab").forEach((tab) => {
      tab.classList.toggle("app-tab--active", tab.dataset.scope === state.scope);
    });
  };

  const renderDigits = () => {
    // 0–9 全部可点（三个话术域各有十套），悬停显示套名——对应客户端的套号悬停预览。
    el.digits.innerHTML = sets()
      .map((set, digit) => {
        const active = !state.query && digit === state.set;
        const label = `第 ${digit} 套 · ${set.name}`;
        return `<button class="app-digit${active ? " app-digit--active" : ""}" type="button" data-digit="${digit}" title="${esc(label)}" aria-label="${esc(label)}">${digit}</button>`;
      })
      .join("");
  };

  const renderSetLabel = () => {
    if (!el.setLabel) return;
    el.setLabel.innerHTML = `<b>${esc(currentSet().name)}</b> · 第 ${state.set} 套 / 共 ${sets().length} 套`;
  };

  // 搜索范围按钮：点一下在「全部 / 当前话术域 / 当前套」之间循环，真正的定位范围就锁在这一层。
  const renderRange = () => {
    // 客户端只有「全部 / 当前 / 自定义」三种搜索范围（search_range_engine），
    // 演示不弹窗勾选，所以只做前两种，标签与语义都跟客户端一致。
    const label = state.range === "all" ? "全部" : "当前";
    const title =
      state.range === "all"
        ? "搜索范围：团队、个人和离线话术下的全部 0～9 套（点击切换）"
        : "搜索范围：当前话术域的当前套号（点击切换）";
    // 主界面与底部吸附栏共用同一份搜索范围口径，两处按钮始终显示同一状态。
    if (el.range) {
      el.range.textContent = `${label} ▾`;
      el.range.title = title;
      el.range.setAttribute("aria-label", title);
    }
    if (el.barRange) {
      el.barRange.textContent = label;
      el.barRange.title = title;
    }
  };

  const renderChips = () => {
    const chips = categories()
      .map(
        (category, index) =>
          `<button class="app-chip${
            !state.query && index === state.category ? " app-chip--active" : ""
          }" type="button" data-category="${index}"${
            category.color ? ` style="background:${category.color}"` : ""
          }>${esc(category.label)}</button>`,
      )
      .join("");
    el.chips.innerHTML = `${chips}<span class="app-chip app-chip--add" aria-hidden="true">+</span>`;
  };

  // 主界面短语栏与底部吸附栏短语区共用同一份常用短语（客户端也是同一份规则）。
  const quickChipsHtml = () =>
    `${COMMON_PHRASES.map(
      (phrase) => `<button class="app-chip" type="button" data-phrase="${esc(phrase)}">${esc(phrase)}</button>`,
    ).join("")}<span class="app-chip app-chip--add" aria-hidden="true">+</span>`;

  const renderQuick = () => {
    el.quick.innerHTML = quickChipsHtml();
    el.barQuick.innerHTML = quickChipsHtml();
  };

  // 命中来源文案照抄客户端 search_result_source：话术域·套号｜一级分类 > 二级分类
  // （客户端把这段放在悬停预览气泡里，演示没有气泡，就直接跟在话术行下面）。
  const hitPath = (scopeKey, setNo, lv1, lv2) => {
    const scope = { team: "团队", personal: "个人", local: "离线" }[scopeKey];
    const set = Number(setNo) === 0 ? "默认" : `第${setNo}套`;
    return [lv1, lv2].filter(Boolean).join(" > ") ? `${scope}·${set}｜${[lv1, lv2].filter(Boolean).join(" > ")}` : `${scope}·${set}`;
  };

  // 搜索沿着「话术域 → 套号 → 一级分类 → 二级分类」走，命中结果带来源，一眼看出在哪一套。
  // 搜索范围由右下角范围按钮控制：全部 / 当前话术域（页签所在域）/ 当前套（套号所在套）。
  const searchHits = (keyword) => {
    const hits = [];
    Object.entries(SCOPES).forEach(([scopeKey, scope]) => {
      scope.sets.forEach((set, setNo) => {
        // 「当前」＝只搜主界面当前选中的话术域与套号（客户端 SEARCH_RANGE_MODE_CURRENT）。
        if (state.range === "current" && (scopeKey !== state.scope || setNo !== state.set)) return;
        set.categories.forEach((category) =>
          category.sections.forEach((section) =>
            section.items.forEach((item) => {
              if (`${item.title} ${item.text}`.toLowerCase().includes(keyword)) {
                hits.push({ item, path: hitPath(scopeKey, setNo, category.label, section.title) });
              }
            }),
          ),
        );
      });
    });
    return hits;
  };

  const renderTree = () => {
    rows = [];
    // 重建前记住焦点在第几行：切套/切分类/数字发送都是键盘操作，重建后要把焦点还回列表，
    // 否则连续按数字切套第一次之后就失灵（焦点掉到 body）。
    const focusIndex = [...el.tree.querySelectorAll(".app-row")].indexOf(document.activeElement);
    const paint = (html) => {
      el.tree.innerHTML = html;
      if (focusIndex < 0) return;
      const items = el.tree.querySelectorAll(".app-row");
      items[Math.min(focusIndex, items.length - 1)]?.focus({ preventScroll: true });
    };

    if (state.query) {
      const hits = searchHits(state.query);
      hits.forEach((hit) => rows.push(hit.item));
      // 按过 Tab 才显示 1–9、0 临时序号（客户端 Tab 前不显示）。
      const digits = digitMode("panel");
      paint(
        hits.length
          ? hits.map((hit, index) => rowHtml(hit.item, index, hit.path, digits && index < 10 ? RESULT_DIGITS[index] : "")).join("")
          : `<p class="app-empty">没有匹配结果</p>`,
      );
      return;
    }

    const tree = treeHtml(currentCategory());
    rows = tree.items;
    paint(tree.html);
  };

  /* ---------- 搜索与数字选择态（主界面与吸附栏共用） ---------- */
  // 对应客户端 search_result_digit_selection：先在有搜索词的搜索框里按 Tab 冻结前十条结果，
  // 显示 1–9、0 临时序号，再按数字直接发送对应话术；继续编辑或按 Esc 退出数字态。
  const RESULT_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

  const digitMode = (surface) => state.digitSurface === surface;

  const refreshSurface = (surface) => (surface === "panel" ? renderTree() : renderBar());

  const enterDigitMode = (surface) => {
    state.digitSurface = surface;
    refreshSurface(surface);
  };

  const exitDigitMode = () => {
    if (!state.digitSurface) return false;
    // 先落状态再重绘，否则序号会留在结果行上。
    const surface = state.digitSurface;
    state.digitSurface = null;
    refreshSurface(surface);
    return true;
  };

  // 回车＝发送当前选中的那条命中；没有选中就发第一条（客户端 `_handle_enter_key`）。
  // 主界面发送后记一条搜索历史，吸附栏再顺手收起（客户端 clear_query）。
  const sendEnterHit = (container, items) => {
    const selected = container.querySelector(".app-row--selected");
    const index = selected ? Number(selected.dataset.key) : 0;
    const item = items[index] ?? items[0];
    if (!item) return false;
    selectIn(container, selected ?? container.querySelector(".app-row"));
    sendText(item.text, selected ?? container.querySelector(".app-row"));
    if (container === el.barList) useBarHit();
    else recordHistory(el.search.value);
    return true;
  };

  const sendDigitHit = (surface, digit) => {
    const index = digit === "0" ? 9 : Number(digit) - 1;
    const container = surface === "panel" ? el.tree : el.barList;
    const items = surface === "panel" ? rows : barRows;
    const item = items[index];
    const node = container.querySelectorAll(".app-row")[index];
    if (!item) return false;
    selectIn(container, node);
    sendText(item.text, node);
    if (surface === "panel") {
      recordHistory(el.search.value);
      exitDigitMode();
    } else {
      useBarHit();
    }
    return true;
  };

  // 顶部数字键与小键盘都要认（客户端 QKeySequence 两者都匹配）。
  const readDigit = (event) => {
    const byCode = /^(?:Digit|Numpad)([0-9])$/.exec(event.code);
    if (byCode) return byCode[1];
    return /^[0-9]$/.test(event.key) ? event.key : "";
  };

  // 搜索框键盘：Tab 进数字态、数字直接发送、Esc 先退数字态再清搜索（与客户端一致）。
  const bindSearchKeys = (input, surface) => {
    input.addEventListener("keydown", (event) => {
      if (event.isComposing || event.keyCode === 229) return;
      if (event.key === "Tab") {
        if (!input.value.trim()) return;
        event.preventDefault();
        enterDigitMode(surface);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        if (exitDigitMode()) return;
        if (!el.search.value && surface === "panel") return;
        clearSearch(surface);
        // 客户端 Esc 退出搜索后不再停在输入框：主搜索把焦点交给话术列表，
        // 吸附栏把焦点还给外部的聊天输入窗口。
        if (surface === "panel") {
          // 二级分类全收起时列表里没有话术行，就聚焦列表控件本身（客户端也是把焦点交给列表）。
          (el.tree.querySelector(".app-row") ?? el.tree).focus({ preventScroll: true });
        } else {
          el.input.focus();
        }
        return;
      }
      if (!digitMode(surface)) return;
      const digit = event.ctrlKey || event.metaKey || event.altKey ? "" : readDigit(event);
      if (digit) {
        event.preventDefault();
        sendDigitHit(surface, digit);
        return;
      }
      // 客户端只在「会改变文字」的按键上退出数字态：打字符、退格、删除
      // （`_deactivate_digit_selection_for_edit_key`）。方向键、Home/End 不动文字，
      // 数字态要保持——否则一按方向键序号就没了。
      // 带 Ctrl/Alt/Meta 的按键在客户端不产生文字（Ctrl+1、Alt+1 都不会退出数字态）。
      const plain = !event.ctrlKey && !event.metaKey && !event.altKey;
      const changesText =
        event.key === "Backspace" || event.key === "Delete" || (plain && event.key.length === 1);
      if (changesText) exitDigitMode();
    });
  };

  // 主搜索栏提示语跟着焦点换（客户端：未聚焦提示 Alt+Q，聚焦后提示 Tab 数字发送）。
  const bindSearchPlaceholder = (input) => {
    const idle = input.placeholder;
    input.addEventListener("focus", () => {
      input.placeholder = "按 Tab键，再按数字直接发送话术。";
    });
    input.addEventListener("blur", () => {
      input.placeholder = idle;
    });
  };

  const render = () => {
    renderTabs();
    renderDigits();
    renderSetLabel();
    renderRange();
    renderChips();
    renderTree();
    renderBar();
  };

  /* ---------- 底部吸附栏 ---------- */
  // 吸附栏贴在聊天窗口底边：结果向上展开盖住聊天窗，常用短语与最近搜索向下展开。
  // 搜索词归吸附栏自己，搜索范围与「最近搜索」跟主界面合用一份（与客户端一致）。
  const BAR_HISTORY_MAX = 8;

  const HISTORY_DISPLAY_CHARS = 12;

  const renderBarHistory = () => {
    // 客户端 search_history.build_search_history_visibility_plan：
    // 有历史 + 输入框为空 + 面板激活（焦点在吸附栏里）才显示；有搜索词就让位给结果。
    el.barHistory.hidden =
      state.history.length === 0 || el.barInput.value.trim() !== "" || !state.barActive;
    el.barHistoryChips.innerHTML = state.history
      .map((keyword) => {
        // 客户端 build_search_history_bar_payload：超过 12 字只显示前 12 字加省略号，
        // 点下去仍然用完整关键词搜。
        const label = keyword.length > HISTORY_DISPLAY_CHARS ? `${keyword.slice(0, HISTORY_DISPLAY_CHARS)}…` : keyword;
        return `<button class="app-chip" type="button" data-history="${esc(keyword)}" title="${esc(keyword)}">${esc(label)}</button>`;
      })
      .join("");
  };

  // 用过一次才记进「最近搜索」：回车、按数字发送、把命中贴进输入框都算用过。
  const recordHistory = (keyword) => {
    const text = String(keyword || "").trim().slice(0, 40);
    if (!text) return;
    state.history = [text, ...state.history.filter((item) => item !== text)].slice(0, BAR_HISTORY_MAX);
    renderBarHistory();
  };

  const renderBar = () => {
    const raw = el.barInput.value.trim();
    const hits = raw ? searchHits(raw.toLowerCase()) : [];
    barRows = hits.map((hit) => hit.item);
    el.barClear.hidden = raw === "";
    el.barResults.hidden = raw === "";
    if (raw) {
      el.barTitle.textContent = `搜索结果 · ${hits.length}`;
      // 按过 Tab 才显示临时序号：1–9、0 对应第一到第十条。
      const digits = digitMode("bar");
      el.barList.innerHTML = hits.length
        ? hits.map((hit, index) => rowHtml(hit.item, index, hit.path, digits && index < 10 ? RESULT_DIGITS[index] : "")).join("")
        : `<p class="app-empty">没有匹配结果</p>`;
    } else {
      // 搜索收起时连结果行一起清掉，避免隐藏区里留着上一次的序号。
      el.barList.innerHTML = "";
    }
    renderBarHistory();
  };

  const closeBarSearch = () => {
    el.barInput.value = "";
    if (digitMode("bar")) state.digitSurface = null;
    renderBar();
  };

  // 主界面搜索：清词的同时退出数字态（切套、切分类、切页签、重置都走这里）。
  const clearSearch = (surface) => {
    if (surface === "bar") {
      closeBarSearch();
      return;
    }
    state.query = "";
    state.digitSurface = null;
    el.search.value = "";
    renderDigits();
    renderChips();
    renderTree();
  };

  // 折叠后只剩聊天窗口右下角一个小按钮（客户端吸附栏的折叠态），按钮就长在原来右侧收起键的位置。
  const setBarCollapsed = (collapsed) => {
    el.bar.classList.toggle("attached--collapsed", collapsed);
    el.barToggle.textContent = collapsed ? "‹" : "›";
    const label = collapsed ? "展开吸附栏" : "收起吸附栏";
    el.barToggle.title = label;
    el.barToggle.setAttribute("aria-label", label);
    if (collapsed) closeBarSearch();
  };

  // 数字键直接发送第 N 条命中，用过之后在「最近搜索」里留一条并收起吸附栏结果。
  const useBarHit = () => {
    recordHistory(el.barInput.value);
    closeBarSearch();
  };

  /* ---------- 聊天窗口 ---------- */
  const scrollLog = () => {
    el.log.scrollTop = el.log.scrollHeight;
  };

  const addMessage = (text, direction) => {
    const row = document.createElement("div");
    row.className =
      direction === "out" ? "msg msg--out msg--new" : "msg msg--in msg--new";
    row.innerHTML = `<p class="bubble">${esc(text)}</p>`;
    el.log.append(row);
    scrollLog();
  };

  const showTyping = () => {
    const row = document.createElement("div");
    row.id = "demo-typing";
    row.className = "msg msg--in msg--new";
    row.innerHTML = `<span class="typing"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span>`;
    el.log.append(row);
    scrollLog();
  };

  const hideTyping = () => $("demo-typing")?.remove();

  const updateCounter = () => {
    el.countNum.textContent = String(state.sent);
    el.count.hidden = state.sent === 0;
    el.reset.hidden = state.sent === 0;
  };

  const clearInput = () => {
    el.input.value = "";
    resizeInput();
    el.send.classList.remove("chat-send--ready");
  };

  // 输入框是多行编辑框：随内容长高，上限取 CSS 的 max-height，避免改样式时两处不同步。
  const resizeInput = () => {
    el.input.style.height = "auto";
    const max = parseFloat(getComputedStyle(el.input).maxHeight);
    el.input.style.height = `${Number.isFinite(max) ? Math.min(el.input.scrollHeight, max) : el.input.scrollHeight}px`;
  };

  // 把话术写进输入框：只填入、不发送，用户还能自己改字（对应客户端双击整行）。
  const fillInput = (text) => {
    el.input.value = text;
    resizeInput();
    el.input.focus({ preventScroll: true });
    el.send.classList.add("chat-send--ready");
  };

  const sendText = (text, node) => {
    if (!text) return;
    const epoch = state.epoch;
    node?.classList.add("app-row--sending");

    fillInput(text);

    setTimeout(() => {
      node?.classList.remove("app-row--sending");
      if (epoch !== state.epoch) return;
      clearInput();
      addMessage(text, "out");
      state.sent += 1;
      updateCounter();
      scheduleReply();
    }, 520);
  };

  // 客户回复一次只排一条：连发多条时不会掉队，也不会抢答。
  const scheduleReply = () => {
    if (state.replyPending) return;
    const reply = CUSTOMER_REPLIES[state.replied];
    if (!reply) return;
    state.replyPending = true;
    const epoch = state.epoch;
    setTimeout(() => {
      if (epoch !== state.epoch) return;
      showTyping();
      setTimeout(() => {
        if (epoch !== state.epoch) {
          hideTyping();
          return;
        }
        hideTyping();
        addMessage(reply, "in");
        state.replied += 1;
        state.replyPending = false;
      }, 900);
    }, 350);
  };

  /* ---------- 交互 ---------- */
  const selectIn = (container, node) => {
    container.querySelectorAll(".app-row--selected").forEach((row) => row.classList.remove("app-row--selected"));
    node?.classList.add("app-row--selected");
  };

  // 双击＝仅粘贴（对应客户端“双击整行”），内容先落到聊天输入框，不直接发送。
  const pasteIntoInput = (item) => {
    if (!item) return;
    fillInput(item.text);
  };

  // 话术行交互三件套：单击选中、双击只粘贴、点左侧纸飞机直接发送。
  // 主界面列表和吸附栏结果共用同一套；用完之后各自收尾（主界面记搜索历史、吸附栏再收起结果）。
  const bindRows = (container, getItems, onUse) => {
    const itemAt = (node) => getItems()[Number(node.dataset.key)];

    container.addEventListener("click", (event) => {
      const node = event.target.closest(".app-row");
      if (!node) return;
      selectIn(container, node);
      // 点左侧纸飞机＝直接发送（粘贴 + 回车），对应客户端话术行左侧箭头。
      if (event.target.closest(".app-row-send")) {
        sendText(itemAt(node)?.text, node);
        onUse();
      }
    });

    container.addEventListener("dblclick", (event) => {
      const node = event.target.closest(".app-row");
      if (!node || event.target.closest(".app-row-send")) return;
      selectIn(container, node);
      pasteIntoInput(itemAt(node));
      onUse();
    });

    // 手机/平板没有双击：手指点一下就贴进输入框，否则触屏用户根本用不了这个演示。
    container.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "touch") return;
      const node = event.target.closest(".app-row");
      if (!node || event.target.closest(".app-row-send")) return;
      selectIn(container, node);
      pasteIntoInput(itemAt(node));
      onUse();
    });

    container.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      const node = event.target.closest(".app-row");
      if (!node) return;
      event.preventDefault();
      selectIn(container, node);
      pasteIntoInput(itemAt(node));
      onUse();
    });
  };

  // 客户端同一时刻只展开一个二级分类（`expanded_level2_key` 是单个键）：
  // 切套/切话术域/切一级分类都回到「第一节展开」，点已展开的标题就全收起。
  const resetSections = (category) => {
    category?.sections.forEach((section, index) => {
      section.open = index === 0;
    });
  };

  const focusCategory = (index) => {
    if (index < 0 || index >= categories().length) return;
    state.category = index;
    resetSections(currentCategory());
    clearSearch("panel");
    render();
  };

  // 点套号（0–9）＝切换整套话术；每套的一级分类不同，切套后回到第一个分类与第一节。
  const focusSet = (digit) => {
    if (!sets()[digit]) return;
    state.set = digit;
    state.category = 0;
    resetSections(currentCategory());
    clearSearch("panel");
    render();
  };

  const reset = () => {
    Object.assign(state, {
      scope: "team",
      set: 0,
      category: 0,
      query: "",
      digitSurface: null,
      history: [],
      barActive: false,
      sent: 0,
      replied: 0,
      replyPending: false,
      epoch: state.epoch + 1,
    });
    Object.values(SCOPES).forEach((scope) =>
      scope.sets.forEach((set) => set.categories.forEach(resetSections)),
    );
    el.log.innerHTML = `<div class="msg msg--in"><p class="bubble">${esc(OPENING_MESSAGE)}</p></div>`;
    clearSearch("panel");
    el.barInput.value = "";
    setBarCollapsed(false);
    clearInput();
    updateCounter();
    render();
  };

  el.tabs.addEventListener("click", (event) => {
    const tab = event.target.closest(".app-tab");
    if (!tab || tab.dataset.scope === state.scope) return;
    state.scope = tab.dataset.scope;
    state.set = 0;
    state.category = 0;
    resetSections(currentCategory());
    clearSearch("panel");
    render();
  });

  el.digits.addEventListener("click", (event) => {
    const digit = event.target.closest(".app-digit");
    if (digit) focusSet(Number(digit.dataset.digit));
  });

  el.chips.addEventListener("click", (event) => {
    const chip = event.target.closest(".app-chip");
    if (chip?.dataset.category !== undefined) focusCategory(Number(chip.dataset.category));
  });

  el.quick.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-phrase]");
    if (chip) sendText(chip.dataset.phrase, null);
  });

  el.tree.addEventListener("click", (event) => {
    const head = event.target.closest(".app-lv2-head");
    if (head) {
      const sections = currentCategory()?.sections ?? [];
      const index = Number(head.dataset.section);
      const wasOpen = Boolean(sections[index]?.open);
      // 点已展开的标题＝全收起（客户端 expanded_level2_key 置空），点其他标题＝只留这一个。
      sections.forEach((item, i) => {
        item.open = wasOpen ? false : i === index;
      });
      renderTree();
      return;
    }
    // 点列表空白处清掉选中（客户端点空白会 clear_selection）。
    if (!event.target.closest(".app-row")) {
      el.tree.querySelectorAll(".app-row--selected").forEach((row) => row.classList.remove("app-row--selected"));
    }
  });

  // 吸附栏里用过一条结果就收起结果（客户端用完命中也是 clear_query 后回到聊天窗口）。

  bindRows(el.tree, () => rows, () => {
    recordHistory(el.search.value);
    exitDigitMode();
  });
  bindRows(el.barList, () => barRows, useBarHit);

  /* ---------- 吸附栏交互 ---------- */
  el.barInput.addEventListener("input", () => {
    if (digitMode("bar")) state.digitSurface = null;
    renderBar();
  });

  // 回车＝发送第一条命中（客户端吸附栏里回车也是直接发送当前结果）。
  el.barInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.isComposing || event.keyCode === 229) return;
    if (!el.barInput.value.trim()) return;
    event.preventDefault();
    sendEnterHit(el.barList, barRows);
  });

  el.barClear.addEventListener("click", closeBarSearch);
  el.barClose.addEventListener("click", closeBarSearch);

  el.barToggle.addEventListener("click", () =>
    setBarCollapsed(!el.bar.classList.contains("attached--collapsed")),
  );

  el.barQuick.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-phrase]");
    if (chip) sendText(chip.dataset.phrase, null);
  });

  // 最近搜索：点一下就重新搜（与主界面共用一份历史），清空就全清。
  // 客户端用输入框的 FocusIn/FocusOut 控制「最近搜索」是否显示（panel_active）。
  // 这里用吸附栏整体的焦点进出，点历史词（焦点落在按钮上）也不会先收起。
  el.bar.addEventListener("focusin", () => {
    state.barActive = true;
    renderBarHistory();
  });
  el.bar.addEventListener("focusout", (event) => {
    if (el.bar.contains(event.relatedTarget)) return;
    state.barActive = false;
    renderBarHistory();
  });

  el.barHistoryChips.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-history]");
    if (!chip) return;
    el.barInput.value = chip.dataset.history;
    renderBar();
    el.barInput.focus();
  });

  el.barHistoryClear.addEventListener("click", () => {
    state.history = [];
    renderBarHistory();
  });

  // 聊天窗口自己的发送按钮：把输入框里的内容发出去（用户确认后再发的那一步）。
  el.send.addEventListener("click", () => {
    const text = el.input.value.trim();
    if (text) sendText(text, null);
  });

  el.input.addEventListener("input", () => {
    resizeInput();
    el.send.classList.toggle("chat-send--ready", el.input.value.trim() !== "");
  });

  // 输入框支持直接打字：回车发送（微信习惯），Shift+Enter 换行。
  // 用中文输入法选词时的回车不能当发送，否则会误发（isComposing / keyCode 229）。
  el.input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    const text = el.input.value.trim();
    if (text) sendText(text, null);
  });

  el.search.addEventListener("input", () => {
    state.query = el.search.value.trim().toLowerCase();
    state.digitSurface = null;
    renderDigits();
    renderChips();
    renderTree();
  });

  // 搜索框里回车＝直接发出第一条命中（与客户端搜索框 Enter 发送一致）；
  // Tab / Esc / 数字发送统一由 bindSearchKeys 处理，两个搜索框共用。
  el.search.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.isComposing || event.keyCode === 229) return;
    if (!el.search.value.trim()) return;
    event.preventDefault();
    sendEnterHit(el.tree, rows);
    exitDigitMode();
  });

  bindSearchKeys(el.search, "panel");
  bindSearchKeys(el.barInput, "bar");
  bindSearchPlaceholder(el.search);

  // 范围按钮可点：全部 → 当前话术域 → 当前套，循环切换后主界面与吸附栏都立即重算命中。
  const cycleRange = () => {
    state.range = state.range === "all" ? "current" : "all";
    renderRange();
    renderTree();
    renderBar();
  };

  el.range.addEventListener("click", cycleRange);
  el.barRange.addEventListener("click", cycleRange);

  // 演示区不在视野里时先滚过去（Alt+Q 与数字切套都用）。
  const revealDemo = () => {
    const demo = el.search.closest(".demo");
    const box = demo.getBoundingClientRect();
    if (box.top >= 0 && box.bottom <= window.innerHeight) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    demo.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  };

  // 数字键 0–9（顶部数字键与小键盘都认，对应客户端 QKeySequence）：
  // 客户端里它是窗口级快捷键，不要求先把光标点进列表，只要没在打字就生效。
  // 处于数字选择态时＝直接发送第 N 条命中，否则＝切换套话术。
  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const digit = readDigit(event);
    if (!digit) return;
    const target = event.target;
    // 正在打字（聊天输入框、搜索框、可编辑区域）就让位给文字。
    if (
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
    ) {
      return;
    }
    event.preventDefault();
    const surface = target instanceof HTMLElement && target.closest(".attached") ? "bar" : "panel";
    if (digitMode(surface)) {
      sendDigitHit(surface, digit);
      return;
    }
    focusSet(Number(digit));
    revealDemo();
  });

  // Alt+Q：和客户端一致，任何位置按都能定位到搜索框（演示区不在视野内时先滚过去）。
  // 用 event.code 而不是 key，中文输入法或不同键盘布局下都能命中同一个物理键。
  document.addEventListener("keydown", (event) => {
    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.code !== "KeyQ") return;
    event.preventDefault();
    revealDemo();
    el.search.focus({ preventScroll: true });
    // 焦点变化本身不够显眼，再加一次短高亮，让人确定「按下去有反应」。
    el.search.classList.remove("app-search-input--hit");
    void el.search.offsetWidth;
    el.search.classList.add("app-search-input--hit");
  });

  el.search.addEventListener("animationend", () => el.search.classList.remove("app-search-input--hit"));

  el.reset.addEventListener("click", reset);

  /* ---------- 启动 ---------- */
  if (el.tree) {
    renderQuick();
    updateCounter();
    render();
  }
})();
