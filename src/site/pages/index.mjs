// index.html 的页面专属内容。公共结构由 layout 生成，公共信息由 site-data 提供。
import demoData from "../../../assets/js/demo-data.js";
import { siteData } from "../site-data.mjs";

const title = siteData.siteTitle;
const share =
  "话术精灵是一款 Windows 客服话术软件：团队话术、个人话术、离线话术统一管理，一套话术可拆成 0–9 十个独立模块精准定位；双击把话术贴进聊天输入框、回车发送，内容存在本机，本地永久免费。";

// 没有 JavaScript 时（爬虫、禁用 JS 的浏览器）把演示数据换成可读文字：列出三个话术域、
// 每套话术和它的一级分类。内容和演示里是同一份数据，不是另写一套。
function noscriptOverview() {
  return Object.values(demoData.SCOPES)
    .map(
      (scope) =>
        `      <p><strong>${scope.label}</strong>（0–9 十套）：${scope.sets
          .map((set) => `${set.name}（${set.categories.map((category) => category.label).join("、")}）`)
          .join("；")}</p>`,
    )
    .join("\n");
}

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
    <h2>可交互界面实操试用</h2>
    <p class="section-sub">左边客服聊天窗口，右边话术精灵主界面，直接上手点一点。</p>

    <div class="demo">
      <div class="chat-wrap">
        <!-- 底部吸附搜索栏：贴在聊天窗口底边，结果向上展开、常用短语与最近搜索向下展开（对应客户端 attached_search_bar）。 -->
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

        <div class="attached" id="demo-attached">
          <div class="attached-results" id="demo-attached-results" hidden>
            <div class="attached-head">
              <span class="attached-title" id="demo-attached-title">搜索结果 · 0</span>
              <button class="attached-close" id="demo-attached-close" type="button" title="关闭搜索结果（Esc）" aria-label="关闭搜索结果">×</button>
            </div>
            <p class="attached-hint">按 Tab键，再按数字直接发送话术。</p>
            <div class="attached-list" id="demo-attached-list"></div>
          </div>
          <div class="attached-row">
            <span class="attached-field">
              <input class="attached-input" id="demo-attached-input" type="search" placeholder="按 Tab键，再按数字直接发送话术。" autocomplete="off" />
              <button class="attached-clear" id="demo-attached-clear" type="button" title="清空搜索" aria-label="清空搜索" hidden>×</button>
            </span>
            <button class="attached-range" id="demo-attached-range" type="button">全部</button>
            <button class="attached-toggle" id="demo-attached-toggle" type="button" title="收起吸附栏" aria-label="收起吸附栏">›</button>
          </div>
          <div class="attached-phrases" id="demo-attached-phrases">
            <span class="attached-label">常用短语：</span>
            <div class="attached-chips" id="demo-attached-quick"></div>
          </div>
          <div class="attached-history" id="demo-attached-history" hidden>
            <div class="attached-history-head">
              <span class="attached-label attached-label--strong">最近搜索</span>
              <button class="attached-history-clear" id="demo-attached-history-clear" type="button">清空</button>
            </div>
            <div class="attached-chips" id="demo-attached-history-chips"></div>
          </div>
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
        <div class="app-set" id="demo-set"></div>
        <div class="app-digits" id="demo-digits"></div>
        <div class="app-lv1"><div class="app-chips" id="demo-chips"></div></div>
        <div class="app-tree" id="demo-list">${demoData.initialTreeHtml()}</div>
        <div class="app-common" id="demo-quick"></div>
        <div class="app-search">
          <input class="app-search-input" id="demo-search" type="search" placeholder="Alt+Q 定位搜索栏" autocomplete="off" />
          <span class="app-range" id="demo-range" role="button" tabindex="0">全部 ▾</span>
        </div>
        <div class="app-foot">
          <span class="app-brand">话术精灵 官网: luyao2089.cc</span>
          <img class="app-settings" src="assets/logo.png" alt="" />
        </div>
      </div>
    </div>

    <noscript>
      <p>演示需要浏览器执行 JavaScript。下面是演示里内置的话术，装好客户端后就是这些内容。</p>
${noscriptOverview()}
    </noscript>

    <div class="demo-status">
      <span class="demo-count" id="demo-count" hidden>已发送 <b id="demo-count-num">0</b> 条</span>
      <button class="demo-reset" id="demo-reset" type="button" hidden>重置演示</button>
    </div>
  </section>
</div>`,
  bodyEnd: `<script src="assets/js/demo-data.js"></script>
<script src="assets/js/demo.js"></script>`,
};
