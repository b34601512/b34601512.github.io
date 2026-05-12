(function () {

  // ══════════════════════════════════════════════════
  //  话术数据
  // ══════════════════════════════════════════════════

  // 团队话术 套0（默认）
  var TEAM_0 = {
    presale: {
      label: '售前',
      sections: [
        { title: '欢迎话术', open: true, items: [
            { title: '欢迎问候', text: '亲，您好！欢迎光临，有什么可以帮到您的吗？😊' },
            { title: '忙时提醒', text: '您好，稍等一下哦，马上为您服务~' },
          ]
        },
        { title: '产品咨询', open: false, items: [
            { title: '正品承诺', text: '我们家的产品都是正品保障，假一赔十，请放心~' },
            { title: '质量说明', text: '所有产品经过严格质检才会发货，品质有保障哦~' },
          ]
        },
        { title: '价格问题', open: false, items: [
            { title: '议价回复', text: '亲，已经是全网最优惠的价格啦，品质一流~' },
            { title: '优惠活动', text: '现在参加满减活动，优惠力度很大，下单稳赚~' },
          ]
        },
      ]
    },
    urge: {
      label: '催付',
      sections: [
        { title: '订单跟进', open: true, items: [
            { title: '拍后未付', text: '亲，您有一笔订单还未付款哦，现货有限，建议尽快付款~' },
            { title: '活动截止', text: '亲，活动即将结束，现在付款还能享受优惠价，不要错过哦~' },
          ]
        },
      ]
    },
    aftersale: {
      label: '售后',
      sections: [
        { title: '问题处理', open: true, items: [
            { title: '道歉先行', text: '非常抱歉给您带来了不好的体验！我马上帮您解决！' },
            { title: '核实情况', text: '麻烦您把问题照片发过来，我帮您确认一下~' },
          ]
        },
        { title: '退款退货', open: false, items: [
            { title: '申请退款', text: '已为您申请退款，预计1-3个工作日到账~' },
            { title: '退货说明', text: '请将商品原包装完好地寄回，运费由我们承担~' },
          ]
        },
      ]
    },
    delivery: {
      label: '发货',
      sections: [
        { title: '发货时效', open: true, items: [
            { title: '常规发货', text: '付款后48小时内安排发货，节假日顺延1-2天哦~' },
            { title: '急单处理', text: '有急用可在订单备注写"急"，我们会优先安排发货~' },
          ]
        },
        { title: '快递查询', open: false, items: [
            { title: '查快递',   text: '快递信息在订单详情页可查，也可把单号发我帮您查~' },
            { title: '丢件处理', text: '如快递超时未到，请联系我，我马上帮您跟进~' },
          ]
        },
      ]
    },
    exchange: {
      label: '退换',
      sections: [
        { title: '退换流程', open: true, items: [
            { title: '7天退换', text: '支持7天无理由退换货，在订单页申请退款即可~' },
            { title: '退货须知', text: '退货请保持商品原包装完好，不影响二次销售哦~' },
          ]
        },
        { title: '运费说明', open: false, items: [
            { title: '质量换货', text: '质量问题换货运费由我们承担，帮您安排补发~' },
            { title: '非质量退', text: '非质量问题退货，运费需买家自付，感谢您的理解~' },
          ]
        },
      ]
    },
    review: {
      label: '好评',
      sections: [
        { title: '好评引导', open: true, items: [
            { title: '请求好评', text: '亲，如果满意的话，期待您给我们一个五星好评哦！🌟' },
            { title: '好评答谢', text: '非常感谢您的好评！您的支持是我们前进的动力！' },
            { title: '差评处理', text: '非常抱歉！请告知具体问题，我们第一时间为您解决~' },
          ]
        },
      ]
    },
  };

  // 团队话术 套1（第1套，服装类示例）
  var TEAM_1 = {
    sizing: {
      label: '尺码',
      sections: [
        { title: '尺码咨询', open: true, items: [
            { title: '尺码推荐', text: '亲，请告知您的身高体重，我帮您推荐合适的尺码~' },
            { title: '尺码对照', text: '亲，可参考商品详情页的尺码对照表来选择哦~' },
            { title: '偏大偏小', text: '这款版型偏宽松，建议身材偏瘦的亲选小一码~' },
          ]
        },
      ]
    },
    material: {
      label: '材质',
      sections: [
        { title: '面料说明', open: true, items: [
            { title: '材质介绍', text: '本品采用优质棉料，透气舒适，不易起球~' },
            { title: '手感问题', text: '这款手感柔软，穿着舒适，很多买家复购了哦~' },
          ]
        },
      ]
    },
    care: {
      label: '洗护',
      sections: [
        { title: '洗涤说明', open: true, items: [
            { title: '洗涤建议', text: '建议手洗或30度以下轻柔机洗，避免高温~' },
            { title: '晾晒建议', text: '建议阴干，避免阳光直晒，防止褪色变形~' },
            { title: '收纳建议', text: '建议叠放收纳，避免长期悬挂导致变形哦~' },
          ]
        },
      ]
    },
  };

  // 团队话术 套2（第2套，数码类示例）
  var TEAM_2 = {
    warranty: {
      label: '保修',
      sections: [
        { title: '保修政策', open: true, items: [
            { title: '保修期限', text: '本产品享受1年全国联保，3年维修服务~' },
            { title: '保修流程', text: '如需维修，请联系我们提供订单号，我帮您申请售后~' },
          ]
        },
      ]
    },
    accessory: {
      label: '配件',
      sections: [
        { title: '配件咨询', open: true, items: [
            { title: '配件购买', text: '亲，配件可在店铺单独购买，或者告诉我需要什么型号~' },
            { title: '赠品说明', text: '本产品赠送充电线+保护套，请注意开箱查收~' },
          ]
        },
      ]
    },
    fault: {
      label: '故障',
      sections: [
        { title: '故障处理', open: true, items: [
            { title: '故障排查', text: '请先按说明书重启/重置设备，通常可以解决大部分问题~' },
            { title: '维修申请', text: '请提供订单号和故障描述，我马上为您申请售后工单~' },
          ]
        },
      ]
    },
  };

  // 套3-9 暂无内容
  var TEAM_SETS = { 0: TEAM_0, 1: TEAM_1, 2: TEAM_2 };

  // 个人话术
  var PERSONAL_CATS = {
    myPhrase: {
      label: '常用',
      sections: [
        { title: '我的常用', open: true, items: [
            { title: '感谢购买', text: '感谢您的购买！收到商品后如有问题，随时联系我~' },
            { title: '礼品备注', text: '已为您包裹内附上贺卡，祝收礼方收礼愉快！🎁' },
            { title: '催好评',   text: '亲，收到商品满意的话，欢迎给个五星好评哦~' },
          ]
        },
      ]
    },
    memo: {
      label: '待办',
      sections: [
        { title: '待跟进事项', open: true, items: [
            { title: '到货通知', text: '已记录您的需求，到货后第一时间通知您~' },
            { title: '换货跟进', text: '您的换货申请已处理，预计明天发出新品，请注意查收~' },
          ]
        },
      ]
    },
  };

  // 本地文件
  var LOCAL_FILES = [
    { icon: '📊', name: '话术模板2024.xlsx',   size: '23 KB',  date: '2024-03-15' },
    { icon: '📝', name: '服务规范手册.docx',   size: '45 KB',  date: '2024-02-01' },
    { icon: '📋', name: '产品卖点整理.pdf',    size: '156 KB', date: '2024-01-10' },
    { icon: '📊', name: '客诉处理案例.xlsx',   size: '38 KB',  date: '2023-12-20' },
  ];

  // ══════════════════════════════════════════════════
  //  状态变量
  // ══════════════════════════════════════════════════

  var currentScope  = 'team';   // 'team' | 'personal' | 'local'
  var currentSetNum = 0;        // 0-9
  var currentCat    = 'presale';
  var sendCount     = 0;
  var isBusy        = false;
  var searchMode    = false;

  var CUSTOMER_REPLIES = [
    '运费险有吗？不满意可以退换吗？',
    '好的，那就放心了。现在有优惠活动吗？',
    '好！我比较急，今天下单能当天发货吗？',
    '明白了，已经拍下！麻烦帮我备注一下是送人的礼物～',
    '收到货啦！质量很不错，跟描述完全一致，很满意！😊',
    '好评已给！感谢你们的耐心服务，下次还来～🌟',
  ];

  // ══════════════════════════════════════════════════
  //  工具函数
  // ══════════════════════════════════════════════════

  function el(id) { return document.getElementById(id); }

  function safe(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function getCurrentCatMap() {
    if (currentScope === 'team')     return TEAM_SETS[currentSetNum] || {};
    if (currentScope === 'personal') return PERSONAL_CATS;
    return {};
  }

  function getCurrentCatOrder() {
    return Object.keys(getCurrentCatMap());
  }

  function getSetLabel(num) {
    return num === 0 ? '默认话术' : '第' + num + '套话术';
  }

  // ══════════════════════════════════════════════════
  //  渲染函数
  // ══════════════════════════════════════════════════

  // 更新范围标签高亮
  function renderScopeTabs() {
    document.querySelectorAll('.demo-scope-btn').forEach(function (btn) {
      var s = btn.getAttribute('data-scope');
      if (s) {
        btn.classList.toggle('demo-scope-btn--active', s === currentScope);
      }
    });
  }

  // 更新套号高亮，并控制套号栏显示（本地文件时隐藏）
  function renderSetNums() {
    var row = document.querySelector('.demo-setnum-row');
    if (row) row.style.display = currentScope === 'local' ? 'none' : '';
    document.querySelectorAll('.demo-setnum').forEach(function (span) {
      var n = parseInt(span.getAttribute('data-set'), 10);
      span.classList.toggle('demo-setnum--active', n === currentSetNum);
    });
  }

  // 分类 Chip 行
  function renderChips() {
    var row = el('demo-chips-row');
    if (!row) return;
    if (currentScope === 'local') { row.style.display = 'none'; return; }
    row.style.display = '';
    var catOrder = getCurrentCatOrder();
    row.innerHTML = catOrder.map(function (catId) {
      var cat    = getCurrentCatMap()[catId];
      var active = catId === currentCat && !searchMode ? ' demo-cat-chip--active' : '';
      return '<button class="demo-cat-chip' + active + '" data-cat="' + safe(catId) + '">'
        + safe(cat.label) + '</button>';
    }).join('');
    row.querySelectorAll('.demo-cat-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        clearSearch();
        currentCat = btn.getAttribute('data-cat');
        renderChips();
        renderAccordion();
      });
    });
  }

  // 折叠树
  function renderAccordion() {
    searchMode = false;
    var container = el('demo-accordion');
    if (!container) return;

    if (currentScope === 'local') { renderLocalFiles(); return; }

    var catMap = getCurrentCatMap();
    var cat    = catMap[currentCat];
    if (!cat) {
      container.innerHTML = '<div class="demo-empty-state">暂无话术</div>';
      return;
    }

    // 套话术标题提示
    var titleHtml = currentScope === 'team'
      ? '<div class="demo-set-title">' + safe(getSetLabel(currentSetNum)) + '</div>'
      : '';

    container.innerHTML = titleHtml + cat.sections.map(function (sec, sIdx) {
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
        cat.sections[sIdx].open = !cat.sections[sIdx].open;
        renderAccordion();
      });
    });

    container.querySelectorAll('.demo-phrase-item').forEach(function (itemEl) {
      // 单击：选中高亮（与真实软件一致，单击不发送）
      itemEl.addEventListener('click', function () {
        container.querySelectorAll('.demo-phrase-item--selected')
          .forEach(function (el) { el.classList.remove('demo-phrase-item--selected'); });
        itemEl.classList.add('demo-phrase-item--selected');
      });
      // 双击：发送
      itemEl.addEventListener('dblclick', function () {
        var sIdx = parseInt(itemEl.getAttribute('data-sec'), 10);
        var iIdx = parseInt(itemEl.getAttribute('data-item'), 10);
        sendPhrase(cat.sections[sIdx].items[iIdx], itemEl);
      });
      itemEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var sIdx = parseInt(itemEl.getAttribute('data-sec'), 10);
          var iIdx = parseInt(itemEl.getAttribute('data-item'), 10);
          sendPhrase(cat.sections[sIdx].items[iIdx], itemEl);
        }
      });
    });
  }

  // 本地文件视图
  function renderLocalFiles() {
    var container = el('demo-accordion');
    if (!container) return;
    container.innerHTML = LOCAL_FILES.map(function (f) {
      return '<div class="demo-file-item">'
        + '<span class="demo-file-icon">' + safe(f.icon) + '</span>'
        + '<div class="demo-file-info">'
        + '<span class="demo-file-name">' + safe(f.name) + '</span>'
        + '<span class="demo-file-meta">' + safe(f.size) + ' · ' + safe(f.date) + '</span>'
        + '</div></div>';
    }).join('');
  }

  // ══════════════════════════════════════════════════
  //  搜索
  // ══════════════════════════════════════════════════

  function clearSearch() {
    var input = el('demo-search-input');
    if (input) input.value = '';
    searchMode = false;
  }

  function onSearchInput(query) {
    var q = String(query || '').trim().toLowerCase();
    if (!q) { searchMode = false; renderChips(); renderAccordion(); return; }
    searchMode = true;
    renderChips();

    var results = [];
    // 在当前范围内搜索（本地文件不参与）
    var scopeSets = currentScope === 'team'
      ? [TEAM_SETS[currentSetNum] || {}]
      : currentScope === 'personal' ? [PERSONAL_CATS] : [];

    scopeSets.forEach(function (catMap) {
      Object.keys(catMap).forEach(function (catId) {
        var cat = catMap[catId];
        cat.sections.forEach(function (sec) {
          sec.items.forEach(function (item) {
            if ((item.title + ' ' + item.text).toLowerCase().indexOf(q) !== -1) {
              results.push({ catLabel: cat.label, item: item });
            }
          });
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

    var cache = results;
    container.innerHTML = results.map(function (r, idx) {
      return '<div class="demo-phrase-item" data-ridx="' + idx + '" role="button" tabindex="0">'
        + '<span class="demo-phrase-item-icon"></span>'
        + '<span class="demo-result-cat">' + safe(r.catLabel) + '</span>'
        + '<span class="demo-phrase-item-title">' + safe(r.item.title) + '</span>'
        + '<span class="demo-phrase-item-preview">' + safe(r.item.text) + '</span>'
        + '</div>';
    }).join('');

    container.querySelectorAll('.demo-phrase-item').forEach(function (itemEl) {
      itemEl.addEventListener('click', function () {
        container.querySelectorAll('.demo-phrase-item--selected')
          .forEach(function (el) { el.classList.remove('demo-phrase-item--selected'); });
        itemEl.classList.add('demo-phrase-item--selected');
      });
      itemEl.addEventListener('dblclick', function () {
        var idx = parseInt(itemEl.getAttribute('data-ridx'), 10);
        sendPhrase(cache[idx].item, itemEl);
      });
    });
  }

  // ══════════════════════════════════════════════════
  //  发送话术（公共）
  // ══════════════════════════════════════════════════

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
            if (sendCount >= CUSTOMER_REPLIES.length && resetBtn) resetBtn.hidden = false;
          }, 1100);
        }, 450);
      } else {
        isBusy = false;
      }
    }, 650);
  }

  // ══════════════════════════════════════════════════
  //  聊天工具
  // ══════════════════════════════════════════════════

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
    row.id = 'demo-typing-row';
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

  // ══════════════════════════════════════════════════
  //  重置
  // ══════════════════════════════════════════════════

  function resetDemo() {
    sendCount  = 0;
    isBusy     = false;
    searchMode = false;
    currentScope  = 'team';
    currentSetNum = 0;
    currentCat    = 'presale';

    // 重置折叠状态
    [TEAM_0, TEAM_1, TEAM_2, PERSONAL_CATS].forEach(function (catMap) {
      Object.keys(catMap).forEach(function (catId) {
        catMap[catId].sections.forEach(function (sec, i) { sec.open = i === 0; });
      });
    });

    var area = el('demo-messages-area');
    if (area) {
      area.innerHTML = '<div class="demo-msg demo-msg--customer demo-msg--new">'
        + '<div class="demo-msg-bubble">老板，这款产品质量怎么样，是正品吗？🤔</div>'
        + '</div>';
    }

    var countTag = el('demo-count-tag');
    var resetBtn = el('demo-reset-btn');
    var searchInput = el('demo-search-input');
    if (countTag)    countTag.hidden = true;
    if (resetBtn)    resetBtn.hidden = true;
    if (searchInput) searchInput.value = '';

    renderScopeTabs();
    renderSetNums();
    renderChips();
    renderAccordion();
  }

  // ══════════════════════════════════════════════════
  //  初始化
  // ══════════════════════════════════════════════════

  function init() {
    if (!el('demo-accordion')) return;

    // 范围标签点击
    document.querySelectorAll('.demo-scope-btn').forEach(function (btn) {
      var scope = btn.getAttribute('data-scope');
      if (!scope) return;
      btn.addEventListener('click', function () {
        clearSearch();
        currentScope = scope;
        if (currentScope === 'team') {
          var cats = Object.keys(TEAM_SETS[currentSetNum] || {});
          currentCat = cats[0] || '';
        } else if (currentScope === 'personal') {
          currentCat = Object.keys(PERSONAL_CATS)[0] || '';
        }
        renderScopeTabs();
        renderSetNums();
        renderChips();
        renderAccordion();
      });
    });

    // 套号点击
    document.querySelectorAll('.demo-setnum').forEach(function (span) {
      var num = parseInt(span.getAttribute('data-set'), 10);
      span.addEventListener('click', function () {
        if (currentScope !== 'team') return;
        clearSearch();
        currentSetNum = num;
        var cats = Object.keys(TEAM_SETS[num] || {});
        currentCat = cats[0] || '';
        renderSetNums();
        renderChips();
        renderAccordion();
      });
    });

    // 搜索输入
    var searchInput = el('demo-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function () { onSearchInput(searchInput.value); });
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { searchInput.value = ''; onSearchInput(''); }
      });
    }

    // 重置
    var resetBtn = el('demo-reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', resetDemo);

    renderScopeTabs();
    renderSetNums();
    renderChips();
    renderAccordion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
