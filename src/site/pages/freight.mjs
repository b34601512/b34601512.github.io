// freight.html：推广视频「补运费登记案例」（知识分享第一期，剧本见 GitHub issue #4）。
// 竖屏 1080×1920（issue #9），画面 Canvas 现画、声音 Web Audio 现合成（assets/js/freight-film.js），播放器与宣传片共用 film-engine.js 和 promo-film.css。
// 「客服经验分享」系列的第一期：登记在 src/site/experience.mjs 的 episodes 里，由那里进页面清单、导航与 sitemap。
import { backToListing, experienceListing } from "../experience-series.mjs";
import { breadcrumb, seoHead } from "../seo.mjs";
import { pageUrl, siteData } from "../site-data.mjs";

const url = pageUrl("freight.html");
const title = "补运费登记案例_客服话术实战分享 - 话术精灵";
const share =
  "客服知识分享第一期：顾客要退运费，客服问一句、顾客等一阵才回，整个流程花费非常长；一条话术一次问齐收款方式、姓名和截图，再把顾客的追问一条条补进话术，从此顾客一次性回「好的谢谢」。";

export const freightPage = {
  outputFile: "freight.html",
  navLabel: "补运费登记案例",
  styles: ["assets/css/promo-film.css"],
  head: seoHead({
    title,
    description: share,
    url,
    ogType: "video.other",
    jsonLd: [
      { "@type": "WebPage", name: title, url, inLanguage: "zh-CN" },
      breadcrumb("补运费登记案例", url, [{ name: experienceListing.name, url: pageUrl(experienceListing.outputFile) }]),
    ],
  }),
  main: `<div class="wrap">
  <section class="hero">
    ${backToListing}
    <p class="eyebrow">知识分享 01</p>
    <h1>补运费登记<span class="hl">案例</span></h1>
  </section>

  <section class="section">
    <div class="promo promo--tall" data-freight-film></div>
    <noscript><p class="note">视频是浏览器现场画出来的，需要执行 JavaScript。</p></noscript>
    <div class="actions">
      <a class="btn btn--primary" href="${siteData.downloadUrl}" target="_blank" rel="noopener">下载 Windows 版</a>
      <a class="btn btn--ghost" href="contact.html">加微信聊聊</a>
    </div>
  </section>
</div>`,
  bodyEnd: `<script src="assets/js/mp4-mux.js" defer></script>
<script src="assets/js/film-export.js" defer></script>
<script src="assets/js/film-engine.js" defer></script>
<script src="assets/js/platform-chat.js" defer></script>
<script src="assets/js/freight-film.js" defer></script>`,
};
