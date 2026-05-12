(function () {
  // 模拟话术数据：按分类整理，还原真实客服知识库结构
  var PHRASES = {
    presale: [
      { title: '欢迎问候', text: '亲，您好！欢迎光临，有什么可以帮到您的吗？😊' },
      { title: '正品保证', text: '这款是正品保证，假一赔十，请放心购买~' },
      { title: '无忧退换', text: '支持7天无理由退换，全程运费险，请放心~' },
      { title: '现货速发', text: '现货充足，今天下单明天就能发货哦~' },
    ],
    conversion: [
      { title: '爆款推荐', text: '这款已累计卖出5000+件，好评率99.8%，品质有保障！' },
      { title: '活动促单', text: '今天活动最后一天，下单还有精美礼品，数量有限哦~' },
      { title: '关怀跟进', text: '亲还在考虑吗？有任何疑问随时问我，帮您选最合适的~' },
    ],
    aftersale: [
      { title: '道歉先行', text: '非常抱歉给您带来了不好的体验！我马上帮您处理！' },
      { title: '核实问题', text: '麻烦您把问题的照片发给我看一下，我来帮您确认~' },
      { title: '退款通知', text: '已为您申请退款，预计1-3个工作日到账，请注意查收~' },
      { title: '补发通知', text: '已为您安排补发，快递单号稍后发给您，请注意查收~' },
    ],
    comfort: [
      { title: '共情理解', text: '非常理解您的心情，给您造成不便真的很抱歉~' },
      { title: '承诺到底', text: '您放心，这个问题我一定帮您妥善解决，绝不让您吃亏！' },
      { title: '感谢理解', text: '感谢您的理解和包容，我们会继续努力做得更好~' },
    ],
    standard: [
      { title: '开场白',   text: '您好，我是本店客服小A，很高兴为您服务！有什么可以帮到您？' },
      { title: '稍候提示', text: '感谢您的耐心等待，正在帮您优先处理，请稍等一下哦~' },
      { title: '结束语',   text: '感谢惠顾！祝您购物愉快，欢迎下次再来！⭐' },
    ],
  };

  // 客户顺序回复（每发一条话术，客户回复下一条）
  var CUSTOMER_REPLIES = [
    '运费险有吗？不满意可以退换吗？',
    '好的，那我就放心了，现在有优惠活动吗？',
    '明白了，那我决定下单了！帮我备注送礼用~',
    '嗯嗯，谢谢！我去付款了～',
  ];

  var sendCount = 0;
  var isBusy = false;

  function el(id) {
    return document.getElementById(id);
  }

  function renderPhrases(catId) {
    var list = el('demo-phrases-list');
    if (!list) return;
    var phrases = PHRASES[catId] || [];
    list.innerHTML = phrases.map(function (p, i) {
      return '<div class="demo-phrase-card" data-cat="' + catId + '" data-idx="' + i + '" role="button" tabindex="0">'
        + '<span class="demo-phrase-card-title">' + p.title + '</span>'
        + '<span class="demo-phrase-card-action">点击发送 →</span>'
        + '<span class="demo-phrase-card-text">' + p.text + '</span>'
        + '</div>';
    }).join('');

    list.querySelectorAll('.demo-phrase-card').forEach(function (card) {
      card.addEventListener('click', function () { onPhraseClick(card); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPhraseClick(card); }
      });
    });
  }

  function scrollToBottom() {
    var area = el('demo-messages-area');
    if (area) area.scrollTop = area.scrollHeight;
  }

  function addMessage(text, type) {
    var area = el('demo-messages-area');
    if (!area) return;
    var row = document.createElement('div');
    row.className = 'demo-msg demo-msg--' + type + ' demo-msg--new';
    row.innerHTML = '<div class="demo-msg-bubble">' + escapeHtml(text) + '</div>';
    area.appendChild(row);
    scrollToBottom();
  }

  function showTyping() {
    var area = el('demo-messages-area');
    if (!area) return;
    var row = document.createElement('div');
    row.id = 'demo-typing-indicator';
    row.className = 'demo-msg demo-msg--customer demo-msg--new';
    row.innerHTML = '<div class="demo-msg-bubble demo-typing-bubble">'
      + '<span class="demo-dot"></span>'
      + '<span class="demo-dot"></span>'
      + '<span class="demo-dot"></span>'
      + '</div>';
    area.appendChild(row);
    scrollToBottom();
  }

  function hideTyping() {
    var row = el('demo-typing-indicator');
    if (row) row.remove();
  }

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function onPhraseClick(card) {
    if (isBusy) return;
    var cat = card.getAttribute('data-cat');
    var idx = parseInt(card.getAttribute('data-idx'), 10);
    var phrase = (PHRASES[cat] || [])[idx];
    if (!phrase) return;

    isBusy = true;
    card.classList.add('sending');

    var inputBox  = el('demo-input-box');
    var inputText = el('demo-input-text');
    var inputHint = el('demo-input-hint');
    var sendBtn   = el('demo-send-btn');

    // 话术填入输入框
    if (inputHint) inputHint.style.display = 'none';
    if (inputText) inputText.textContent = phrase.text;
    if (inputBox)  inputBox.classList.add('demo-input-box--active');
    if (sendBtn)   sendBtn.classList.add('ready');

    // 650ms 后自动发送
    setTimeout(function () {
      card.classList.remove('sending');
      if (inputHint) inputHint.style.display = '';
      if (inputText) inputText.textContent = '';
      if (inputBox)  inputBox.classList.remove('demo-input-box--active');
      if (sendBtn)   sendBtn.classList.remove('ready');

      addMessage(phrase.text, 'agent');
      sendCount++;

      var countTag  = el('demo-count-tag');
      var countNum  = el('demo-send-count');
      var resetBtn  = el('demo-reset-btn');

      if (countTag) countTag.hidden = false;
      if (countNum) countNum.textContent = sendCount;

      // 客户打字并回复
      var replyText = CUSTOMER_REPLIES[Math.min(sendCount - 1, CUSTOMER_REPLIES.length - 1)];
      if (replyText && sendCount <= CUSTOMER_REPLIES.length) {
        setTimeout(function () {
          showTyping();
          setTimeout(function () {
            hideTyping();
            addMessage(replyText, 'customer');
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

  function resetDemo() {
    sendCount = 0;
    isBusy = false;

    var area = el('demo-messages-area');
    if (area) {
      area.innerHTML = '<div class="demo-msg demo-msg--customer demo-msg--new">'
        + '<div class="demo-msg-bubble">老板，这款产品质量怎么样，是正品吗？🤔</div>'
        + '</div>';
    }

    var countTag = el('demo-count-tag');
    var resetBtn = el('demo-reset-btn');
    if (countTag) countTag.hidden = true;
    if (resetBtn) resetBtn.hidden = true;

    // 重置到第一个分类
    document.querySelectorAll('.demo-tab').forEach(function (t) { t.classList.remove('active'); });
    var firstTab = document.querySelector('.demo-tab');
    if (firstTab) {
      firstTab.classList.add('active');
      renderPhrases(firstTab.getAttribute('data-cat'));
    }
  }

  function init() {
    if (!el('demo-messages-area')) return;

    // 分类标签切换
    document.querySelectorAll('.demo-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.demo-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        renderPhrases(tab.getAttribute('data-cat'));
      });
    });

    // 重置演示
    var resetBtn = el('demo-reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', resetDemo);

    // 初始渲染
    renderPhrases('presale');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
