// 404.html：GitHub Pages 在任何不存在的地址下原样返回这张页面（地址栏不变）。
// 页面里的资源和链接都是相对路径，必须用 <base href="/"> 钉到站点根，否则在 /a/b/ 下全部失效。
import { siteData } from "../site-data.mjs";

export const notFoundPage = {
  outputFile: "404.html",
  navLabel: "页面不存在",
  head: `<base href="/" />
<title>页面不存在 - 话术精灵</title>
<meta name="robots" content="noindex" />`,
  main: `<div class="wrap">
  <section class="hero">
    <p class="eyebrow">404</p>
    <h1>这个页面<span class="hl">不存在</span></h1>
    <p class="lead">可能是链接打错了，或者页面已经换了地址。</p>
    <div class="actions">
      <a class="btn btn--primary" href="index.html">回首页</a>
      <a class="btn btn--ghost" href="index.html#demo">试用演示</a>
      <a class="btn btn--ghost" href="${siteData.downloadUrl}" target="_blank" rel="noopener">下载 Windows 版</a>
    </div>
  </section>
</div>`,
};
