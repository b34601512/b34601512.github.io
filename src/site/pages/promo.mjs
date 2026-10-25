// promo.html：话术精灵宣传片（画面 Canvas 现画、声音 Web Audio 现合成，见 assets/js/promo-film.js）。
// 暂不进导航和 sitemap（登记在 pages.mjs 的 extraPages），老板看过再决定挂到哪里。
import { seoHead } from "../seo.mjs";
import { pageUrl, siteData } from "../site-data.mjs";

const url = pageUrl("promo.html");
const title = "话术精灵宣传片_客服话术软件 - 话术精灵";
const share =
  "半分钟看懂话术精灵：顾客消息刷屏时按 Alt+Q，搜索、Tab、按数字，回答一键发出；0–9 十套话术精准定位，搜索栏吸附在聊天窗口下面，云端改一次全团队同步。";

export const promoPage = {
  outputFile: "promo.html",
  navLabel: "宣传片",
  styles: ["assets/css/promo-film.css"],
  head: seoHead({ title, description: share, url, ogType: "video.other", jsonLd: [{ "@type": "WebPage", name: title, url, inLanguage: "zh-CN" }] }),
  main: `<div class="wrap">
  <section class="hero">
    <p class="eyebrow">宣传片</p>
    <h1>一句话，就在<span class="hl">手边</span></h1>
  </section>

  <section class="section">
    <div class="promo" data-promo-film data-duration="32" data-tagline="一句话，就在手边"></div>
    <noscript><p class="note">宣传片是浏览器现场画出来的，需要执行 JavaScript。</p></noscript>
    <div class="actions">
      <a class="btn btn--primary" href="${siteData.downloadUrl}" target="_blank" rel="noopener">下载 Windows 版</a>
      <a class="btn btn--ghost" href="index.html#demo">自己点一点演示</a>
    </div>
  </section>
</div>`,
  bodyEnd: `<script src="assets/js/film-engine.js" defer></script>
<script src="assets/js/promo-film.js" defer></script>`,
};
