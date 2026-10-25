// diff.html：用一条竖屏短片讲清「话术精灵跟普通话术软件有什么不同」（GitHub issue #7）。
// 两点不同：0–9 十套 × 团队/个人/离线三类 = 30 套话术分开存；能连本机 AI 助手一起整理、调用话术。
// 画面 Canvas 现画、声音 Web Audio 现合成（assets/js/diff-film.js），播放器与宣传片共用 film-engine.js 和 promo-film.css。
// 爬虫不执行 JS，所以短片讲的事在 noscript 里留一段原文，搜索引擎照样有正文可索引。
import { breadcrumb, ogImageUrl, seoHead } from "../seo.mjs";
import { pageUrl, siteData } from "../site-data.mjs";

const url = pageUrl("diff.html");
const title = "话术软件有什么不同_30套话术与AI协作 - 话术精灵";
const share =
  "话术上千条，找一句翻半天？话术精灵把团队、个人、离线话术各分 0–9 十套，共 30 套分开存，按数字切套一秒定位；还能连本机 AI 助手优化、新增、整理话术。";

export const diffPage = {
  outputFile: "diff.html",
  navLabel: "有什么不同",
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
      breadcrumb("有什么不同", url),
    ],
  }),
  main: `<div class="wrap">
  <section class="hero">
    <p class="eyebrow">有什么不同</p>
    <h1>同样是话术软件，<span class="hl">话术精灵</span>有什么不同</h1>
  </section>

  <section class="section">
    <div class="promo promo--tall" data-diff-film></div>
    <noscript><p class="note">话术上千条，找一句翻半天？普通话术软件把所有话术挤在一套里，一级分类越堆越多，售前、售后、图片、文件全混着。话术精灵不一样：第一，团队话术、个人话术、离线话术各有 0–9 十套，共 30 套话术分开存，售前一套、售后一套、图片一套、文件一套，每套只有自己的分类，按数字切套，一下就找到。第二，普通话术软件只能人用，话术精灵还能在设置里「连接 AI」，让本机 AI 助手（如 Claude Code、Codex）帮你优化、新增、整理话术，或从话术精灵里调话术来回答；删除和导入仍要你在客户端批准。人和 AI 共用一套话术。节约时间，快速高效率。想用、想问，加我微信 ${siteData.authorWechat}。（短片是浏览器现场画出来的，需要执行 JavaScript。）</p></noscript>
    <div class="actions">
      <a class="btn btn--primary" href="${siteData.downloadUrl}" target="_blank" rel="noopener">下载 Windows 版</a>
      <a class="btn btn--ghost" href="index.html#demo">先看演示</a>
      <a class="btn btn--ghost" href="pricing.html">价格</a>
    </div>
  </section>
</div>`,
  bodyEnd: `<script src="assets/js/film-engine.js" defer></script>
<script src="assets/js/diff-film.js" defer></script>`,
};
