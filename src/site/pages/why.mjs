// why.html：用一条竖屏短片讲清「为什么需要话术管理软件」（GitHub issue #6：正文砍掉，换成视频）。
// 画面 Canvas 现画、声音 Web Audio 现合成（assets/js/why-film.js），播放器与宣传片共用 film-engine.js 和 promo-film.css。
// 爬虫不执行 JS，所以短片讲的事在 noscript 里留一段原文，搜索引擎照样有正文可索引。
import { breadcrumb, ogImageUrl, seoHead } from "../seo.mjs";
import { pageUrl, siteData } from "../site-data.mjs";

const url = pageUrl("why.html");
const title = "为什么需要话术管理软件_多店铺话术统一更新 - 话术精灵";
const share =
  "开了很多家店的客服：平台自带的快捷短语按店铺存，改一句话术，20 家店就要改 20 次。40 秒短片讲清话术精灵的解法：话术只改一次，所有店铺都能用，节约时间，快速高效率。";

export const whyPage = {
  outputFile: "why.html",
  navLabel: "解决什么问题",
  navGroup: "了解",
  styles: ["assets/css/promo-film.css"],
  head: seoHead({
    title,
    description: share,
    url,
    ogType: "video.other",
    jsonLd: [
      {
        "@type": "WebPage",
        name: title,
        url,
        inLanguage: "zh-CN",
        description: share,
        isPartOf: { "@type": "WebSite", name: siteData.siteName, url: siteData.siteUrl },
        primaryImageOfPage: { "@type": "ImageObject", url: ogImageUrl },
      },
      breadcrumb("解决什么问题", url),
    ],
  }),
  main: `<div class="wrap">
  <section class="hero">
    <p class="eyebrow">解决什么问题</p>
    <h1>为什么客服团队需要一个<span class="hl">话术管理软件</span></h1>
  </section>

  <section class="section">
    <div class="promo promo--tall" data-why-film></div>
    <noscript><p class="note">我们开了很多店：京东、天猫、拼多多、抖音，每个平台都有好几家店。平台自带快捷短语，可话术要经常优化——改一句，就得每家店都重新编辑一遍，工作量太大，而且完全没必要。所以我做了话术精灵，专门管理话术：话术只改一次，所有店铺都能用。节约时间，快速高效率。想用、想问，加我微信 ${siteData.authorWechat}。（短片是浏览器现场画出来的，需要执行 JavaScript。）</p></noscript>
    <div class="actions">
      <a class="btn btn--primary" href="${siteData.downloadUrl}" target="_blank" rel="noopener">下载 Windows 版</a>
      <a class="btn btn--ghost" href="index.html#demo">先看演示</a>
      <a class="btn btn--ghost" href="pricing.html">价格</a>
    </div>
  </section>
</div>`,
  bodyEnd: `<script src="assets/js/film-engine.js" defer></script>
<script src="assets/js/platform-chat.js" defer></script>
<script src="assets/js/why-film.js" defer></script>`,
};
