(function () {
  // 话术数据：分类 → 折叠节 → 条目
  var DATA = {
    presale: {
      label: '售前',
      sections: [
        {
          title: '欢迎话术', open: true,
          items: [
            { title: '欢迎问候', text: '亲，您好！欢迎光临，有什么可以帮到您的吗？😊' },
            { title: '忙时提醒', text: '您好，稍等一下哦，我马上为您服务，请问有什么需要帮忙的？' },
          ]
        },
        {
          title: '产品咨询', open: false,
          items: [
            { title: '正品承诺', text: '我们家的产品都是正品保障，假一赔十，请放心购买~' },
            { title: '质量说明', text: '所有产品经过严格质检才会发货，品质有保障哦~' },
            { title: '参数说明', text: '亲，建议您对照详情页的参数表格来选择适合的型号~' },
          ]
        },
        {
          title: '价格问题', open: false,
          items: [
            { title: '议价回复', text: '亲，已经是全网最优惠的价格啦，品质一流~' },
            { title: '优惠活动', text: '现在参加店铺满减活动，优惠力度很大，下单稳赚~' },
          ]
        },
      ]
    },
    urge: {
      label: '催付',
      sections: [
        {
          title: '订单跟进', open: true,
          items: [
            { title: '拍后未付', text: '亲，您有一笔订单还未付款哦，现货有限，建议尽快付款~' },
            { title: '活动截止', text: '亲，活动即将结束，现在付款还能享受优惠价，不要错过哦~' },
            { title: '关怀询问', text: '亲，请问是遇到什么问题了吗？有什么需要帮忙的请告诉我~' },
          ]
        },
      ]
    },
    aftersale: {
      label: '售后',
      sections: [
        {
          title: '问题处理', open: true,
          items: [
            { title: '道歉先行', text: '非常抱歉给您带来了不好的体验！我马上帮您解决！' },
            { title: '核实情况', text: '麻烦您把问题照片发过来，我帮您确认一下具体情况~' },
          ]
        },
        {
          title: '退款退货', open: false,
          items: [
            { title: '申请退款', text: '已为您申请退款，预计1-3个工作日到账，请注意查收~' },
            { title: '退货说明', text: '请将商品原包装完好地寄回，运费由我们承担~' },
          ]
        },
      ]
    },
    delivery: {
      label: '发货',
      sections: [
        {
          title: '发货时效', open: true,
          items: [
            { title: '常规发货', text: '付款后48小时内安排发货，节假日顺延1-2天哦~' },
            { title: '急单处理', text: '有急用可在订单备注写"急"，我们会优先安排发货~' },
          ]
        },
        {
          title: '快递查询', open: false,
          items: [
            { title: '查快递',   text: '快递信息在订单详情页可查，也可把单号发我帮您查~' },
            { title: '丢件处理', text: '如快递超时未到，请联系我，我马上帮您跟进快递公司~' },
          ]
        },
      ]
    },
    exchange: {
      label: '退换',
      sections: [
        {
          title: '退换流程', open: true,
          items: [
            { title: '7天退换', text: '支持7天无理由退换货，在订单页申请退款即可~' },
            { title: '退货须知', text: '退货请保持商品原包装完好，不影响二次销售哦~' },
          ]
        },
        {
          title: '运费说明', open: false,
          items: [
            { title: '质量换货', text: '质量问题换货运费由我们承担，我帮您安排补发新品~' },
            { title: '非质量退', text: '非质量问题退货，运费需买家自付，感谢您的理解~' },
          ]
        },
      ]
    },
    review: {
      label: '好评',
      sections: [
        {
          title: '好评引导', open: true,
          items: [
            { title: '请求好评', text: '亲，如果满意的话，期待您给我们一个五星好评哦！🌟' },
            { title: '好评答谢', text: '非常感谢您的好评！您的支持是我们前进的动力！' },
            { title: '差评处理', text: '非常抱歉！请告知具体问题，我们第一时间为您解决~' },
          ]
        },
      ]
    },
  };

  var CAT_ORDER = ['presale', 'urge', 'aftersale', 'delivery', 'exchange', 'review'];

  var CUSTOMER_REPLIES = [
    '运费险有吗？不满意可以退换吗？',
    '好的，那我就放心了，现在有什么优惠活动吗？',
    '明白了，我决定下单！帮我备注一下是送礼用的~',
    '嗯嗯，谢谢你的耐心解答，我去付款了～',
  ];

  var currentCat = 'presale';
  var sendCount  = 0;
  var isBusy     = false;
  var searchMode = false; // true 时显示搜索结果，false 时显示折叠树

  function el(id) { return document.getElementById(id); }

  function safe(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── 分类 Chip ──────────────────────────────────────

  function renderChips() {
    var row = el('demo-chips-row');
    if (!row) return;
    row.innerHTML = CAT_ORDER.map(function (catId) {
      var active = catId === currentCat && !searchMode ? ' demo-cat-chip--active' : '';
      return '<button class="demo-cat-chip' + active + '" data-cat="' + catId + '">'
        + safe(DATA[catId].label) + '</button>';
    }).join('');
    row.querySelectorAll('.demo-cat-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        // 切换分类时清空搜索
        var searchInput = el('demo-search-input');
        if (searchInput) searchInput.value = '';
        searchMode = false;
        currentCat = btn.getAttribute('data-cat');
        renderChips();
        renderAccordion();
      });
    });
  }

  // ── 折叠树 ────────────────────────────────────────

  function renderAccordion() {
    searchMode = false;
    var container = el('demo-accordion');
    if (!container) return;
    var cat = DATA[currentCat];
    if (!cat) return;

    container.innerHTML = cat.sections.map(function (sec, sIdx) {
      var openClass = sec.open ? ' open' : '';
      var arrow     = sec.open ? '▼' : '▶';
      var itemsHtml = sec.items.map(function (item, iIdx) {
        return '<div class="demo-phrase-item" data-sec="' + sIdx + '" data-item="' + iIdx
          + '" role="button" tabindex="0">'
          + '<span class="demo-phrase-item-icon"></span>'
          + '<span class="demo-phrase-item-title">' + safe(item.title) + '</span>'
          + '<span class="demo-phrase-item-preview">' + safe(item.text) + '</span>'
          + '</div>';
      }).join('');

      return '<div class="demo-accordion-section' + openClass + '">'
        + '<div class="demo-section-header" data-sec="' + sIdx + '">'
        + '<span class="demo-section-arrow">' + arrow + '</span>'
        + '<span class="demo-section-title">' + safe(sec.title) + '</span>'
        + '</div>'
        + '<div class="demo-section-items">' + itemsHtml + '</div>'
        + '</div>';
    }).join('');

    container.querySelectorAll('.demo-section-header').forEach(function (header) {
      header.addEventListener('click', function () {
        var sIdx = parseInt(header.getAttribute('data-sec'), 10);
        DATA[currentCat].sections[sIdx].open = !DATA[currentCat].sections[sIdx].open;
        renderAccordion();
      });
    });

    container.querySelectorAll('.demo-phrase-item').forEach(function (itemEl) {
      itemEl.addEventListener('click', function () {
        var sIdx = parseInt(itemEl.getAttribute('data-sec'), 10);
        var iIdx = parseInt(itemEl.getAttribute('data-item'), 10);
        sendPhrase(DATA[currentCat].sections[sIdx].items[iIdx], itemEl);
      });
      itemEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var sIdx = parseInt(itemEl.getAttribute('data-sec'), 10);
          var iIdx = parseInt(itemEl.getAttribute('data-item'), 10);
          sendPhrase(DATA[currentCat].sections[sIdx].items[iIdx], itemEl);
        }
      });
    });
  }

  // ── 搜索功能 ──────────────────────────────────────

  function onSearchInput(query) {
    var q = String(query || '').trim().toLowerCase();
    if (!q) {
      searchMode = false;
      renderChips();
      renderAccordion();
      return;
    }
    searchMode = true;
    renderChips(); // 取消 chip 高亮

    // 跨所有分类收集匹配条目
    var results = [];
    CAT_ORDER.forEach(function (catId) {
      var cat = DATA[catId];
      cat.sections.forEach(function (sec) {
        sec.items.forEach(function (item) {
          if ((item.title + ' ' + item.text).toLowerCase().indexOf(q) !== -1) {
            results.push({ catLabel: cat.label, item: item });
          }
        });
      });
    });

    renderSearchResults(results);
  }

  function renderSearchResults(results) {
    var container = el('demo-accordion');
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = '<div class="demo-search-empty">未找到相关话术</div>';
      return;
    }

    // 把结果数组存在闭包变量里，供点击事件取用
    var resultCache = results;

    container.innerHTML = results.map(function (r, idx) {
      return '<div class="demo-phrase-item" data-ridx="' + idx
        + '" role="button" tabindex="0">'
        + '<span class="demo-phrase-item-icon"></span>'
        + '<span class="demo-result-cat">' + safe(r.catLabel) + '</span>'
        + '<span class="demo-phrase-item-title">' + safe(r.item.title) + '</span>'
        + '<span class="demo-phrase-item-preview">' + safe(r.item.text) + '</span>'
        + '</div>';
    }).join('');

    container.querySelectorAll('.demo-phrase-item').forEach(function (itemEl) {
      itemEl.addEventListener('click', function () {
        var idx = parseInt(itemEl.getAttribute('data-ridx'), 10);
        sendPhrase(resultCache[idx].item, itemEl);
      });
      itemEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var idx = parseInt(itemEl.getAttribute('data-ridx'), 10);
          sendPhrase(resultCache[idx].item, itemEl);
        }
      });
    });
  }

  // ── 发送话术（accordion 和搜索结果共用） ──────────

  function sendPhrase(phrase, itemEl) {
    if (isBusy || !phrase) return;
    isBusy = true;

    if (itemEl) itemEl.classList.add('demo-phrase-item--sending');

    var inputBox  = el('demo-input-box');
    var inputText = el('demo-input-text');
    var inputHint = el('demo-input-hint');
    var sendBtn   = el('demo-send-btn');

    if (inputHint) inputHint.style.display = 'none';
    if (inputText) inputText.textContent = phrase.text;
    if (inputBox)  inputBox.classList.add('demo-input-box--active');
    if (sendBtn)   sendBtn.classList.add('ready');

    setTimeout(function () {
      if (itemEl) itemEl.classList.remove('demo-phrase-item--sending');
      if (inputHint) inputHint.style.display = '';
      if (inputText) inputText.textContent = '';
      if (inputBox)  inputBox.classList.remove('demo-input-box--active');
      if (sendBtn)   sendBtn.classList.remove('ready');

      addChatMsg(phrase.text, 'agent');
      sendCount++;

      var countTag = el('demo-count-tag');
      var countNum = el('demo-send-count');
      var resetBtn = el('demo-reset-btn');
      if (countTag) countTag.hidden = false;
      if (countNum) countNum.textContent = sendCount;

      var reply = CUSTOMER_REPLIES[Math.min(sendCount - 1, CUSTOMER_REPLIES.length - 1)];
      if (reply && sendCount <= CUSTOMER_REPLIES.length) {
        setTimeout(function () {
          showTyping();
          setTimeout(function () {
            hideTyping();
            addChatMsg(reply, 'customer');
            isBusy = false;
            if (sendCount >= CUSTOMER_REPLIES.length && resetBtn) {
              resetBtn.hidden = false;
            }
          }, 1100);
        }, 450);
      } else {
        isBusy = false;
      }
    }, 650);
  }

  // ── 聊天工具函数 ──────────────────────────────────

  function addChatMsg(text, type) {
    var area = el('demo-messages-area');
    if (!area) return;
    var row = document.createElement('div');
    row.className = 'demo-msg demo-msg--' + type + ' demo-msg--new';
    row.innerHTML = '<div class="demo-msg-bubble">' + safe(text) + '</div>';
    area.appendChild(row);
    area.scrollTop = area.scrollHeight;
  }

  function showTyping() {
    var area = el('demo-messages-area');
    if (!area) return;
    var row = document.createElement('div');
    row.id  = 'demo-typing-row';
    row.className = 'demo-msg demo-msg--customer demo-msg--new';
    row.innerHTML = '<div class="demo-msg-bubble demo-typing-bubble">'
      + '<span class="demo-dot"></span><span class="demo-dot"></span><span class="demo-dot"></span>'
      + '</div>';
    area.appendChild(row);
    area.scrollTop = area.scrollHeight;
  }

  function hideTyping() {
    var row = el('demo-typing-row');
    if (row) row.remove();
  }

  // ── 重置演示 ──────────────────────────────────────

  function resetDemo() {
    sendCount  = 0;
    isBusy     = false;
    searchMode = false;
    currentCat = 'presale';

    Object.keys(DATA).forEach(function (catId) {
      DATA[catId].sections.forEach(function (sec, i) { sec.open = i === 0; });
    });

    var area = el('demo-messages-area');
    if (area) {
      area.innerHTML = '<div class="demo-msg demo-msg--customer demo-msg--new">'
        + '<div class="demo-msg-bubble">老板，这款产品质量怎么样，是正品吗？🤔</div>'
        + '</div>';
    }

    var countTag    = el('demo-count-tag');
    var resetBtn    = el('demo-reset-btn');
    var searchInput = el('demo-search-input');
    if (countTag)    countTag.hidden = true;
    if (resetBtn)    resetBtn.hidden = true;
    if (searchInput) searchInput.value = '';

    renderChips();
    renderAccordion();
  }

  // ── 初始化 ────────────────────────────────────────

  function init() {
    if (!el('demo-accordion')) return;

    var resetBtn    = el('demo-reset-btn');
    var searchInput = el('demo-search-input');

    if (resetBtn)    resetBtn.addEventListener('click', resetDemo);

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        onSearchInput(searchInput.value);
      });
      // ESC 清空搜索
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { searchInput.value = ''; onSearchInput(''); }
      });
    }

    renderChips();
    renderAccordion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
