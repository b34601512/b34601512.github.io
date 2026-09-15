// why.html 的页面专属内容：用最短篇幅说清「为什么需要话术管理软件」，承接长尾关键词。
import { pageUrl, siteData } from "../site-data.mjs";

const url = pageUrl("why.html");
const title = "为什么需要话术管理软件_多店铺话术统一更新 - 话术精灵";
const share =
  "平台自带的快捷短语按店铺存放，20 个店铺就要改 20 次；客服真正要的是快。话术精灵把一套话术拆成 0–9 十个独立模块，一键精准定位。";

const problems = [
  {
    h: "店铺越多，维护越贵",
    p: "平台自带的快捷短语按店铺存，改一句就得挨个后台改，20 个店铺就是 20 次。",
  },
  {
    h: "客服只要一个字：快",
    p: "话术太多、翻目录比打字还慢，客服最后只能凭记忆手打。",
  },
  {
    h: "客服会把团队话术复制进个人话术",
    p: "不是要改措辞，是团队话术太多、不好定位，自己存的那份他知道在哪。",
  },
];

const compare = [
  ["改一条话术", "每个店铺各改一次", "团队话术改一次，所有工号同步"],
  ["找一句话术", "一套话术，不容易定位", "30 套话术，快速定位"],
];
export const whyPage = {
  outputFile: "why.html",
  navLabel: "解决什么问题",
  head: `<title>${title}</title>
<meta name="description" content="${share}" />
<meta name="keywords" content="${siteData.keywords}" />
<meta name="robots" content="index,follow" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="${siteData.siteName}" />
<meta property="og:locale" content="zh_CN" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${share}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${new URL(siteData.ogImage, siteData.siteUrl).href}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${share}" />
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "name": "${title}",
      "url": "${url}",
      "inLanguage": "zh-CN",
      "description": "${share}",
      "isPartOf": { "@type": "WebSite", "name": "${siteData.siteName}", "url": "${siteData.siteUrl}" },
      "primaryImageOfPage": { "@type": "ImageObject", "url": "${new URL(siteData.ogImage, siteData.siteUrl).href}" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "首页", "item": "${siteData.siteUrl}" },
        { "@type": "ListItem", "position": 2, "name": "解决什么问题", "item": "${url}" }
      ]
    }
  ]
}
</script>`,
  main: `<div class="wrap">
  <section class="hero">
    <p class="eyebrow">解决什么问题</p>
    <h1>为什么客服团队需要一个<span class="hl">话术管理软件</span></h1>
    <p class="lead">店铺一多，问题就从「有没有话术」变成「多快能找到那句对的话」。</p>
    <div class="actions">
      <a class="btn btn--primary" href="${siteData.downloadUrl}" target="_blank" rel="noopener">下载 Windows 版</a>
      <a class="btn btn--ghost" href="index.html#demo">先看演示</a>
      <a class="btn btn--ghost" href="pricing.html">价格</a>
    </div>
  </section>

  <section class="section">
    <h2>三个真实问题</h2>
    <div class="points">
      ${problems
        .map(
          (item) => `<article class="point">
        <h3>${item.h}</h3>
        <p>${item.p}</p>
      </article>`,
        )
        .join("\n      ")}
    </div>
  </section>

  <section class="section">
    <h2>解法：30 套话术，快速定位</h2>
    <p class="section-sub">团队、个人、离线三个话术库各拆成 0–9 共 10 套话术，合计 30 套，分开存放、各自分类；搜索范围能锁在其中某一套里，不用在整套里翻。</p>
    <table class="compare">
      <thead>
        <tr><th scope="col">对比项</th><th scope="col">平台自带快捷短语</th><th scope="col">话术精灵 SoftTalk</th></tr>
      </thead>
      <tbody>
        ${compare
          .map(
            (row) => `<tr><th scope="row">${row[0]}</th><td>${row[1]}</td><td class="compare-win">${row[2]}</td></tr>`,
          )
          .join("\n        ")}
      </tbody>
    </table>
    <p class="section-more"><a class="text-link" href="index.html#demo">先去演示里动手试一遍 →</a></p>
  </section>
</div>`,
};
