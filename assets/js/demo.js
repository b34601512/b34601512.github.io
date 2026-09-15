/* 首页交互演示：复刻客户端主界面的操作路径（话术域 → 套号 → 一级分类 → 二级分类 → 话术 → 发送）。
   演示数据只存在于当前页面内存，不发起任何请求。 */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const esc = (value) =>
    String(value).replace(
      /[&<>"]/g,
      (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch],
    );

  /* 话术类型角标取自客户端 platform_images（见 scripts/optimize-images.py）。 */
  const TYPE_ICONS = {
    text: "assets/type-text.png",
    image: "assets/type-image.png",
    pdf: "assets/type-pdf.png",
  };

  /* ---------- 演示数据 ---------- */
  const SCOPES = {
    team: {
      label: "团队话术",
      categories: [
        {
          label: "售前",
          color: "#DDEFFB",
          sections: [
            {
              title: "欢迎话术",
              open: true,
              items: [
                { title: "欢迎问候", text: "亲，您好！欢迎光临，有什么可以帮到您的吗？", tag: "text" },
                { title: "忙时提醒", text: "您好，稍等一下哦，马上为您服务~", tag: "text" },
              ],
            },
            {
              title: "产品咨询",
              items: [
                { title: "正品承诺", text: "我们家的产品都是正品保障，假一赔十，请放心~", tag: "image" },
                { title: "质量说明", text: "所有产品经过严格质检才会发货，品质有保障哦~" },
              ],
            },
            {
              title: "价格问题",
              items: [
                { title: "议价回复", text: "亲，已经是全网最优惠的价格啦，品质一流~" },
                { title: "优惠活动", text: "现在参加满减活动，优惠力度很大，下单稳赚~", tag: "image" },
              ],
            },
          ],
        },
        {
          label: "催付",
          color: "#FFF1D6",
          sections: [
            {
              title: "订单跟进",
              open: true,
              items: [
                { title: "拍后未付", text: "亲，您有一笔订单还未付款哦，现货有限，建议尽快付款~" },
                { title: "活动截止", text: "亲，活动即将结束，现在付款还能享受优惠价，不要错过哦~" },
              ],
            },
            {
              title: "付款提醒",
              items: [{ title: "付款致谢", text: "已收到您的付款，我们会尽快为您安排发货，感谢信任~" }],
            },
          ],
        },
        {
          label: "售后",
          color: "#DDF7EA",
          sections: [
            {
              title: "问题处理",
              open: true,
              items: [
                { title: "道歉先行", text: "非常抱歉给您带来了不好的体验！我马上帮您解决！" },
                { title: "核实情况", text: "麻烦您把问题照片发过来，我帮您确认一下~", tag: "image" },
              ],
            },
            {
              title: "退款退货",
              items: [
                { title: "申请退款", text: "已为您申请退款，预计 1-3 个工作日到账~" },
                { title: "退货说明", text: "请将商品原包装完好地寄回，运费由我们承担~", tag: "pdf" },
              ],
            },
          ],
        },
        {
          label: "发货",
          color: "#E6E9FF",
          sections: [
            {
              title: "发货时效",
              open: true,
              items: [
                { title: "常规发货", text: "付款后 48 小时内安排发货，节假日顺延 1-2 天哦~" },
                { title: "急单处理", text: "有急用可在订单备注写「急」，我们会优先安排发货~" },
              ],
            },
            {
              title: "快递查询",
              items: [
                { title: "查快递", text: "快递信息在订单详情页可查，也可把单号发我帮您查~" },
                { title: "丢件处理", text: "如快递超时未到，请联系我，我马上帮您跟进~" },
              ],
            },
          ],
        },
        {
          label: "退换",
          color: "#FFE6E1",
          sections: [
            {
              title: "退换流程",
              open: true,
              items: [
                { title: "7 天退换", text: "支持 7 天无理由退换货，在订单页申请退款即可~" },
                { title: "退货须知", text: "退货请保持商品原包装完好，不影响二次销售哦~" },
              ],
            },
            {
              title: "运费说明",
              items: [
                { title: "质量换货", text: "质量问题换货运费由我们承担，帮您安排补发~" },
                { title: "非质量退", text: "非质量问题退货，运费需买家自付，感谢您的理解~" },
              ],
            },
          ],
        },
        {
          label: "好评",
          color: "#FFF7DC",
          sections: [
            {
              title: "好评引导",
              open: true,
              items: [
                { title: "请求好评", text: "亲，如果满意的话，期待您给我们一个五星好评哦！" },
                { title: "好评答谢", text: "非常感谢您的好评！您的支持是我们前进的动力！" },
                { title: "差评处理", text: "非常抱歉！请告知具体问题，我们第一时间为您解决~" },
              ],
            },
          ],
        },
      ],
    },
    personal: {
      label: "个人话术",
      categories: [
        {
          label: "常用",
          color: "#DDEFFB",
          sections: [
            {
              title: "我的常用",
              open: true,
              items: [
                { title: "感谢购买", text: "感谢您的购买！收到商品后如有问题，随时联系我~", count: 12 },
                { title: "礼品备注", text: "已为您在包裹内附上贺卡，祝收礼愉快！", count: 5 },
                { title: "催好评", text: "亲，收到商品满意的话，欢迎给个五星好评哦~", count: 23 },
              ],
            },
          ],
        },
        {
          label: "投诉",
          color: "#F9D7D2",
          sections: [
            {
              title: "投诉安抚",
              open: true,
              items: [
                { title: "安抚先行", text: "非常抱歉给您添麻烦了！我立刻为您跟进处理，请您稍等~", count: 8 },
                { title: "责任说明", text: "这个问题确实是我们的疏忽，已经记录，会严格改进~", count: 3 },
              ],
            },
            {
              title: "进度跟进",
              items: [
                { title: "进度更新", text: "您好，您的问题我们已在跟进中，预计今天内给您回复~", count: 6 },
                { title: "满意确认", text: "您好，您之前反馈的问题已处理，请问是否解决了呢？", count: 4 },
              ],
            },
          ],
        },
        {
          label: "VIP",
          color: "#F2E8FF",
          sections: [
            {
              title: "VIP 接待",
              open: true,
              items: [
                { title: "专属问候", text: "您好，欢迎回来！作为尊贵客户，有任何需求优先为您服务~", count: 9 },
                { title: "专属感谢", text: "感谢您一直以来的支持！这份信任是我们最大的动力~", count: 2 },
              ],
            },
            {
              title: "优先服务",
              items: [
                { title: "加急处理", text: "您的订单已标记为优先处理，我们会第一时间安排发货~", count: 7 },
                { title: "专属折扣", text: "作为老客户，这次可以为您申请额外的专属折扣哦~", count: 1 },
              ],
            },
          ],
        },
        {
          label: "资料",
          color: "#F2EEE6",
          sections: [
            {
              title: "产品资料",
              open: true,
              items: [
                { title: "产品使用手册", text: "含安装、清洁与保养说明，可直接发给客户查阅~", tag: "pdf", count: 6 },
                { title: "尺码对照表", text: "按身高体重对应尺码，回复咨询时先发这张表~", tag: "pdf", count: 4 },
                { title: "产品详情图", text: "主图、细节图与实拍图合集，需要时直接发送~", tag: "image", count: 2 },
              ],
            },
          ],
        },
      ],
    },
    local: {
      label: "离线话术",
      categories: [
        {
          label: "常见问题",
          color: "#DDEFFB",
          sections: [
            {
              title: "快捷问答",
              open: true,
              items: [
                { title: "发货时间", text: "当天 16 点前付款当天发货，之后的顺延到次日发出~" },
                { title: "是否包邮", text: "全场满 59 元包邮，偏远地区需补少量运费哦~" },
                { title: "发票说明", text: "支持开具电子发票，下单备注单位名称即可~", tag: "pdf" },
              ],
            },
          ],
        },
        {
          label: "售后政策",
          color: "#DDF7EA",
          sections: [
            {
              title: "退换规则",
              open: true,
              items: [
                { title: "7 天无理由", text: "签收后 7 天内可无理由退换，商品需不影响二次销售~" },
                { title: "运费承担", text: "质量问题由我们承担往返运费，非质量问题买家承担~" },
              ],
            },
          ],
        },
      ],
    },
  };

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
    category: 0,
    query: "",
    sent: 0,
    replied: 0,
    replyPending: false,
    epoch: 0,
  };

  let rows = [];

  const categories = () => SCOPES[state.scope].categories;
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
    count: $("demo-count"),
    countNum: $("demo-count-num"),
    reset: $("demo-reset"),
  };

  /* ---------- 渲染 ---------- */
  const renderTabs = () => {
    el.tabs.querySelectorAll(".app-tab").forEach((tab) => {
      tab.classList.toggle("app-tab--active", tab.dataset.scope === state.scope);
    });
  };

  const renderDigits = () => {
    const total = categories().length;
    el.digits.innerHTML = Array.from({ length: 10 }, (_, digit) => {
      const active = !state.query && digit === state.category;
      const disabled = digit >= total;
      return `<button class="app-digit${active ? " app-digit--active" : ""}" type="button" data-digit="${digit}"${
        disabled ? " disabled" : ""
      }>${digit}</button>`;
    }).join("");
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

  const renderQuick = () => {
    el.quick.innerHTML = `${COMMON_PHRASES.map(
      (phrase) => `<button class="app-chip" type="button" data-phrase="${esc(phrase)}">${esc(phrase)}</button>`,
    ).join("")}<span class="app-chip app-chip--add" aria-hidden="true">+</span>`;
  };

  const rowHtml = (item, key, path) => `
      <div class="app-row" role="button" tabindex="0" data-key="${key}">
        <button class="app-row-send" type="button" data-send="${key}" title="直接发送（粘贴 + 回车）">
          <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M1 7 L13 1 L7 7 L13 13 Z" /><path d="M7 7 L13 1" /></svg>
        </button>
        <span class="app-row-body">
          <span class="app-row-main">
            ${item.tag ? `<img class="app-row-icon" src="${TYPE_ICONS[item.tag]}" alt="" />` : ""}
            <span class="app-row-title">${esc(item.title)}</span>
            ${typeof item.count === "number" ? `<span class="app-row-count">${item.count}</span>` : ""}
          </span>
          <span class="app-row-text">${esc(item.text)}</span>
          ${path ? `<span class="app-row-path">${esc(path)}</span>` : ""}
        </span>
      </div>`;

  const searchHits = (keyword) => {
    const hits = [];
    Object.values(SCOPES).forEach((scope) =>
      scope.categories.forEach((category) =>
        category.sections.forEach((section) =>
          section.items.forEach((item) => {
            if (`${item.title} ${item.text}`.toLowerCase().includes(keyword)) {
              hits.push({ item, path: `${scope.label} · ${category.label} · ${section.title}` });
            }
          }),
        ),
      ),
    );
    return hits;
  };

  const renderTree = () => {
    rows = [];

    if (state.query) {
      const hits = searchHits(state.query);
      hits.forEach((hit) => rows.push(hit.item));
      el.tree.innerHTML = hits.length
        ? hits.map((hit, index) => rowHtml(hit.item, index, hit.path)).join("")
        : `<p class="app-empty">没有找到相关话术</p>`;
      return;
    }

    const category = currentCategory();
    if (!category) {
      el.tree.innerHTML = `<p class="app-empty">暂无话术</p>`;
      return;
    }

    const parts = [];
    category.sections.forEach((section, sectionIndex) => {
      parts.push(`<div class="app-lv2">
        <div class="app-lv2-head" data-section="${sectionIndex}">
          <span class="app-lv2-arrow">${section.open ? "▼" : "▶"}</span>
          <span class="app-lv2-title">${esc(section.title)}</span>
        </div>`);
      if (section.open) {
        section.items.forEach((item) => {
          rows.push(item);
          parts.push(rowHtml(item, rows.length - 1, ""));
        });
      }
      parts.push(`</div>`);
    });
    el.tree.innerHTML = parts.join("");
  };

  const render = () => {
    renderTabs();
    renderDigits();
    renderChips();
    renderTree();
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
  const selectRow = (node) => {
    el.tree.querySelectorAll(".app-row--selected").forEach((row) => row.classList.remove("app-row--selected"));
    node.classList.add("app-row--selected");
  };

  // 双击＝仅粘贴（对应客户端“双击整行”），内容先落到聊天输入框，不直接发送。
  const pasteIntoInput = (item) => {
    if (!item) return;
    fillInput(item.text);
  };

  const focusCategory = (index) => {
    if (index < 0 || index >= categories().length) return;
    state.category = index;
    state.query = "";
    el.search.value = "";
    render();
  };

  const reset = () => {
    Object.assign(state, {
      scope: "team",
      category: 0,
      query: "",
      sent: 0,
      replied: 0,
      replyPending: false,
      epoch: state.epoch + 1,
    });
    Object.values(SCOPES).forEach((scope) =>
      scope.categories.forEach((category) =>
        category.sections.forEach((section, index) => {
          section.open = index === 0;
        }),
      ),
    );
    el.log.innerHTML = `<div class="msg msg--in"><p class="bubble">${esc(OPENING_MESSAGE)}</p></div>`;
    el.search.value = "";
    clearInput();
    updateCounter();
    render();
  };

  el.tabs.addEventListener("click", (event) => {
    const tab = event.target.closest(".app-tab");
    if (!tab || tab.dataset.scope === state.scope) return;
    state.scope = tab.dataset.scope;
    state.category = 0;
    state.query = "";
    el.search.value = "";
    render();
  });

  el.digits.addEventListener("click", (event) => {
    const digit = event.target.closest(".app-digit");
    if (digit) focusCategory(Number(digit.dataset.digit));
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
      const section = currentCategory()?.sections[Number(head.dataset.section)];
      if (section) {
        section.open = !section.open;
        renderTree();
      }
      return;
    }
    const node = event.target.closest(".app-row");
    if (!node) return;
    selectRow(node);
    // 点左侧纸飞机＝直接发送（粘贴 + 回车），对应客户端话术行左侧箭头。
    if (event.target.closest(".app-row-send")) sendText(rows[Number(node.dataset.key)]?.text, node);
  });

  el.tree.addEventListener("dblclick", (event) => {
    const node = event.target.closest(".app-row");
    if (event.target.closest(".app-row-send")) return;
    if (!node) return;
    selectRow(node);
    pasteIntoInput(rows[Number(node.dataset.key)]);
  });

  el.tree.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const node = event.target.closest(".app-row");
    if (!node) return;
    event.preventDefault();
    selectRow(node);
    pasteIntoInput(rows[Number(node.dataset.key)]);
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
    renderDigits();
    renderChips();
    renderTree();
  });

  el.search.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    el.search.value = "";
    state.query = "";
    renderDigits();
    renderChips();
    renderTree();
  });

  // Alt+Q：和客户端一致，任何位置按都能定位到搜索框（演示区不在视野内时先滚过去）。
  // 用 event.code 而不是 key，中文输入法或不同键盘布局下都能命中同一个物理键。
  document.addEventListener("keydown", (event) => {
    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.code !== "KeyQ") return;
    event.preventDefault();
    const demo = el.search.closest(".demo") ?? el.search;
    const box = demo.getBoundingClientRect();
    const offscreen = box.top < 0 || box.bottom > window.innerHeight;
    if (offscreen) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      demo.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    }
    el.search.focus({ preventScroll: true });
  });

  el.reset.addEventListener("click", reset);

  /* ---------- 启动 ---------- */
  if (el.tree) {
    renderQuick();
    updateCounter();
    render();
  }
})();
