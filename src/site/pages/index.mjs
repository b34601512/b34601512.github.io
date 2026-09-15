// index.html 的页面专属内容。公共结构由 layout 生成，公共信息由 site-data 提供。
import { siteData } from "../site-data.mjs";

const title = siteData.siteTitle;
const share =
  "话术精灵是一款 Windows 客服话术软件：团队话术、个人话术、离线话术统一管理，一套话术可拆成 0–9 十个独立模块精准定位；双击把话术贴进聊天输入框、回车发送，内容存在本机，本地永久免费。";

const faq = [
  {
    q: "适合哪些平台？",
    a: "天猫、京东、拼多多、抖音等电商客服场景，微信、企业微信的聊天窗口也能用。话术是贴到当前聊天窗口的输入框，能打字的窗口都能用。",
  },
  {
    q: "多个店铺的话术能一次改完吗？",
    a: "可以。话术收在一个团队话术库里维护，改一次就会同步给所有工号，不用像平台自带的快捷短语那样一个店铺改一次。",
  },
  {
    q: "团队话术和个人话术有什么区别？",
    a: "团队话术由团队统一维护、所有工号共享（需开通云同步）；个人话术只有自己看得到，适合放自己的习惯用语和常用句子。",
  },
  {
    q: "话术太多找不到怎么办？",
    a: "一套话术可以拆成 0–9 共 10 个套话术分别存放，搜索范围能锁在某一套里，Alt+Q 定位搜索框后一键精准定位，比在上千条里翻快得多。",
  },
  {
    q: "可以整理什么内容？",
    a: "售前咨询、成交跟进、售后处理、安抚表达等团队常用话术，也可以给话术配图片、PDF、表格等附件。",
  },
  {
    q: "新客服怎么上手？",
    a: "Alt+Q 搜关键词，双击贴进输入框，点左侧箭头直接发送，不用先翻一遍历史聊天记录。",
  },
  {
    q: "数据存在哪里？",
    a: "默认保存在本机，保存和删除前自动留档并按天备份；开通云端后，团队话术会在多台电脑之间同步。",
  },
];

export const indexPage = {
  outputFile: "index.html",
  navLabel: "首页",
  styles: ["assets/css/demo.css"],
  head: `<title>${title}</title>
<meta name="description" content="${share}" />
<meta name="keywords" content="${siteData.keywords}" />
<meta name="robots" content="index,follow,max-image-preview:large" />
<link rel="canonical" href="${siteData.siteUrl}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${siteData.siteName}" />
<meta property="og:locale" content="zh_CN" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${share}" />
<meta property="og:url" content="${siteData.siteUrl}" />
<meta property="og:image" content="${new URL(siteData.ogImage, siteData.siteUrl).href}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${share}" />
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "name": "${siteData.siteName}",
      "url": "${siteData.siteUrl}",
      "inLanguage": "zh-CN"
    },
    {
      "@type": "SoftwareApplication",
      "name": "${siteData.siteName}",
      "alternateName": "话术精灵",
      "applicationCategory": "BusinessApplication",
      "applicationSubCategory": "客服话术软件",
      "operatingSystem": "Windows",
      "inLanguage": "zh-CN",
      "description": "${share}",
      "featureList": [
        "团队话术、个人话术、离线话术三套话术库",
        "一套话术拆成 0–9 十个独立模块，一键精准定位",
        "双击把话术贴进聊天输入框，点左侧箭头直接发送",
        "Alt+Q 定位搜索框、Alt+W 显示隐藏、Alt+R 磁吸聊天窗口",
        "Excel 导入话术，按天自动备份（话术表格与完整恢复包）"
      ],
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "CNY",
        "description": "本地使用永久免费；云端按工号付费，1 年 48 元、2 年 78 元、3 年 98 元、100 年 168 元"
      },
      "url": "${siteData.siteUrl}",
      "downloadUrl": "${siteData.downloadUrl}",
      "publisher": { "@type": "Person", "name": "${siteData.authorName}" }
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        ${faq
          .map(
            (item) => `{
          "@type": "Question",
          "name": "${item.q}",
          "acceptedAnswer": { "@type": "Answer", "text": "${item.a}" }
        }`,
          )
          .join(",\n        ")}
      ]
    }
  ]
}
</script>`,
  main: `<div class="wrap">
  <section class="hero">
    <img class="hero-logo" src="assets/logo.png" alt="" />
    <p class="eyebrow">电商客服话术工具</p>
    <h1>把客服话术<br />沉淀成<span class="hl">团队知识库</span></h1>
    <p class="lead">话术精灵 SoftTalk 是一款 Windows 桌面工具：团队话术、个人话术、离线话术分开管理，双击把话术贴进聊天输入框，点左侧箭头直接发送，内容保存在本机。</p>
    <div class="actions">
      <a class="btn btn--primary" href="${siteData.downloadUrl}" target="_blank" rel="noopener">下载 Windows 版</a>
      <a class="btn btn--ghost" href="#demo">试用演示</a>
      <a class="btn btn--ghost" href="${siteData.tutorialUrl}" target="_blank" rel="noopener">使用教程</a>
    </div>
  </section>

  <section class="section" id="demo">
    <h2>看一眼就会用</h2>
    <p class="section-sub">左边是客服聊天窗口，右边是话术精灵主界面：双击话术会贴进输入框，点左侧箭头直接发送。</p>

    <div class="demo">
      <div class="chat">
        <div class="chat-head">
          <span class="chat-avatar">晓</span>
          <span class="chat-who"><strong>客户 晓明</strong><em>天猫咨询 · 在线</em></span>
        </div>
        <div class="chat-log" id="demo-log">
          <div class="msg msg--in"><p class="bubble">老板，这款产品质量怎么样，是正品吗？</p></div>
        </div>
        <div class="chat-foot">
          <textarea class="chat-input" id="demo-input" rows="1" placeholder="双击右侧话术贴进来，也可以直接打字，回车发送" spellcheck="false"></textarea>
          <button class="chat-send" id="demo-send-btn" type="button">发送</button>
        </div>
      </div>

      <div class="app">
        <img class="app-sprite" src="assets/logo.png" alt="" />
        <div class="app-bar">
          <span class="app-tag">演示</span>
          <span class="app-wins">
            <svg class="app-win" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v5a3 3 0 0 0 6 0v-5" /><path d="M5 3.5h1.6M9.4 3.5H11" /></svg>
            <svg class="app-win" viewBox="0 0 16 16" aria-hidden="true"><path d="M6.3 3.6h3.4" /><path d="M6.9 3.6 6.4 7.4h3.2l-.5-3.8" /><path d="M8 7.4v5.6" /></svg>
            <svg class="app-win" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 8h8" /></svg>
          </span>
        </div>
        <div class="app-tabs" id="demo-tabs">
          <button class="app-tab" type="button" data-scope="team">团队话术</button>
          <button class="app-tab" type="button" data-scope="personal">个人话术</button>
          <button class="app-tab" type="button" data-scope="local">离线话术</button>
        </div>
        <div class="app-digits" id="demo-digits"></div>
        <div class="app-lv1"><div class="app-chips" id="demo-chips"></div></div>
        <div class="app-tree" id="demo-list"></div>
        <div class="app-common" id="demo-quick"></div>
        <div class="app-search">
          <input class="app-search-input" id="demo-search" type="search" placeholder="Alt+Q 定位搜索栏" autocomplete="off" />
          <span class="app-range">全部 ▾</span>
        </div>
        <div class="app-foot">
          <span class="app-brand">话术精灵 官网: luyao2089.cc</span>
          <img class="app-settings" src="assets/logo.png" alt="" />
        </div>
      </div>
    </div>

    <div class="demo-status">
      <span class="demo-count" id="demo-count" hidden>已发送 <b id="demo-count-num">0</b> 条</span>
      <button class="demo-reset" id="demo-reset" type="button" hidden>重置演示</button>
    </div>
  </section>

  <section class="section">
    <h2>真实界面</h2>
    <p class="section-sub">下载安装后，面板吸附在聊天窗口旁边，不遮挡对话内容。</p>
    <figure class="shot">
      <img src="assets/screenshot.webp" alt="客服话术管理软件话术精灵的主界面与聊天窗口并排使用截图" width="975" height="819" loading="lazy" decoding="async" />
    </figure>
  </section>

  <section class="section">
    <h2>它解决什么问题</h2>
    <p class="section-sub">话术不是不够，是太多、太散、太难找——这几件事正在悄悄吃掉客服的响应速度。</p>
    <div class="points">
      <article class="point">
        <h3>20 个店铺，改一条话术就要改 20 次</h3>
        <p>平台自带的快捷短语按店铺、按账号存放，改一句话术得挨个登录后台改，漏一个店铺就会出现两种答复。话术精灵把话术收在一个团队话术库里，改一次，所有工号同步。</p>
      </article>
      <article class="point">
        <h3>客服的痛点只有一个字：快</h3>
        <p>团队话术上千条堆在一起，翻目录的时间比打字还长，客服干脆凭记忆手打。最新版本把一套话术拆成 0–9 十个独立模块，搜索范围可以锁在某一套里，一键精准定位，比在整套里翻快得多。</p>
      </article>
      <article class="point">
        <h3>客服为什么把团队话术复制进个人话术</h3>
        <p>不是为了改措辞，而是因为团队话术太多、不好定位：换成自己存的那一份，他知道自己放在哪。把话术拆成套、把范围缩到最小，就不用靠复制来提速了。</p>
      </article>
    </div>
    <p class="section-more"><a class="text-link" href="why.html">看看我们怎么解决这三个问题 →</a></p>
  </section>

  <section class="section">
    <h2>功能</h2>
    <div class="grid-3">
      <article class="feature">
        <h3>三套话术库</h3>
        <p>团队话术、个人话术、离线话术分开管理，一级分类配色可以自己配，已有话术表支持 Excel 导入。</p>
      </article>
      <article class="feature">
        <h3>呼出与检索</h3>
        <p>Alt+Q 跳到搜索框，可按全部、当前分类或自定义范围搜索；Alt+W 显示或隐藏面板，Alt+R 磁吸到聊天窗口旁边。</p>
      </article>
      <article class="feature">
        <h3>本地备份</h3>
        <p>内容存在本机，保存和删除前自动留档，按天备份话术表格与完整恢复包，保留份数可设。</p>
      </article>
    </div>
  </section>

  <section class="section">
    <h2>常见问题</h2>
    <div>
      ${faq
        .map(
          (item) => `<div class="faq-item">
        <h3>${item.q}</h3>
        <p>${item.a}</p>
      </div>`,
        )
        .join("\n      ")}
    </div>
  </section>
</div>`,
  bodyEnd: `<script src="assets/js/demo.js"></script>`,
};
