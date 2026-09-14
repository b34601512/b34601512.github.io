// index.html 的页面专属内容。公共结构由 layout 生成，公共信息由 site-data 提供。
import { siteData } from "../site-data.mjs";

const title = siteData.siteTitle;
const share = "面向电商客服团队的 Windows 话术管理工具：话术按场景整理，双击直接发送，内容保存在本机并按天自动备份。";

const faq = [
  {
    q: "适合哪些平台？",
    a: "天猫、京东、拼多多、抖音等电商客服场景，也适合任何高频客户咨询岗位。",
  },
  {
    q: "可以整理什么内容？",
    a: "售前咨询、成交跟进、售后处理、安抚表达、服务规范等团队常用内容。",
  },
  {
    q: "新客服怎么上手？",
    a: "按目录查找和检索即可，不必先翻一遍历史聊天记录。",
  },
  {
    q: "数据存在哪里？",
    a: "默认保存在本机，改动后按天自动备份；需要多人协同时可开通云端功能。",
  },
];

export const indexPage = {
  outputFile: "index.html",
  navLabel: "首页",
  styles: ["assets/css/demo.css"],
  head: `<title>${title}</title>
<meta name="description" content="${share}" />
<meta name="robots" content="index,follow,max-image-preview:large" />
<link rel="canonical" href="${siteData.siteUrl}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${siteData.siteName}" />
<meta property="og:locale" content="zh_CN" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${share}" />
<meta property="og:url" content="${siteData.siteUrl}" />
<meta name="twitter:card" content="summary" />
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
      "applicationCategory": "BusinessApplication",
      "applicationSubCategory": "客服话术软件",
      "operatingSystem": "Windows",
      "inLanguage": "zh-CN",
      "description": "${share}",
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
    <p class="lead">话术精灵 SoftTalk 是一款 Windows 桌面工具：常用话术按场景整理，双击直接发送，内容保存在本机。</p>
    <p class="hero-meta">适用于天猫、京东、拼多多、抖音等客服场景</p>
    <div class="actions">
      <a class="btn btn--primary" href="${siteData.downloadUrl}" target="_blank" rel="noopener">下载 Windows 版</a>
      <a class="btn btn--ghost" href="#demo">试用演示</a>
      <a class="btn btn--ghost" href="${siteData.tutorialUrl}" target="_blank" rel="noopener">使用教程</a>
    </div>
  </section>

  <section class="section">
    <h2>三步用起来</h2>
    <ol class="steps">
      <li class="step">
        <span class="step-num">01</span>
        <div>
          <h3>整理话术</h3>
          <p>按场景分类录入，一次整理长期受用。</p>
        </div>
      </li>
      <li class="step">
        <span class="step-num">02</span>
        <div>
          <h3>接待时呼出</h3>
          <p>面板悬浮在屏幕右侧，不遮挡聊天窗口。</p>
        </div>
      </li>
      <li class="step">
        <span class="step-num">03</span>
        <div>
          <h3>双击发送</h3>
          <p>双击话术卡片，内容自动填入并发送。</p>
        </div>
      </li>
    </ol>
  </section>

  <section class="section" id="demo">
    <h2>看一眼就会用</h2>
    <p class="section-sub">左边是客服聊天窗口，右边是话术精灵主界面：单击选中话术，双击直接发送。</p>

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
          <div class="chat-input" id="demo-input">
            <span class="chat-hint" id="demo-input-hint">双击右侧话术发送</span>
            <span id="demo-input-text"></span>
          </div>
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
    <p class="section-sub">下载安装后，面板悬浮在屏幕右侧，不遮挡聊天窗口。</p>
    <figure class="shot">
      <img src="assets/screenshot.webp" alt="话术精灵 SoftTalk 与聊天窗口并排使用截图" width="975" height="819" loading="lazy" decoding="async" />
    </figure>
  </section>

  <section class="section">
    <h2>功能</h2>
    <div class="grid-3">
      <article class="feature">
        <h3>场景分类</h3>
        <p>售前、成交、售后各自成目录，查找路径更短。</p>
      </article>
      <article class="feature">
        <h3>快速检索</h3>
        <p>输入关键词即可定位话术，也能搜本地文件。</p>
      </article>
      <article class="feature">
        <h3>本地备份</h3>
        <p>内容保存在本机，改动后按天自动备份，不依赖网络。</p>
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
