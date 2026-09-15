// contact.html 的页面专属内容。公共结构由 layout 生成，公共信息由 site-data 提供。
import { pageUrl, siteData } from "../site-data.mjs";

const url = pageUrl("contact.html");
const title = "联系话术精灵 - 微信、邮箱";
const share = `使用、账号、续费相关问题，可联系微信 ${siteData.authorWechat} 或邮箱 ${siteData.authorEmail}。`;

export const contactPage = {
  outputFile: "contact.html",
  navLabel: "联系",
  head: `<title>${title}</title>
<meta name="description" content="${share}" />
<meta name="keywords" content="${siteData.keywords}" />
<meta name="robots" content="index,follow" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="website" />
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
  "@type": "ContactPage",
  "name": "${title}",
  "url": "${url}",
  "inLanguage": "zh-CN",
  "isPartOf": { "@type": "WebSite", "name": "${siteData.siteName}", "url": "${siteData.siteUrl}" }
}
</script>`,
  main: `<div class="wrap">
  <section class="hero">
    <p class="eyebrow">联系</p>
    <h1>联系我</h1>
    <p class="lead">使用、账号、续费相关问题，微信或邮箱都可以，我看到就会回。</p>
  </section>

  <section class="section">
    <div class="copy-rows">
      <button class="copy-row" type="button" data-copy="${siteData.authorWechat}">
        <span class="copy-label">微信</span>
        <span class="copy-value">${siteData.authorWechat}</span>
        <span class="copy-hint">点击复制</span>
      </button>
      <button class="copy-row" type="button" data-copy="${siteData.authorEmail}">
        <span class="copy-label">邮箱</span>
        <span class="copy-value">${siteData.authorEmail}</span>
        <span class="copy-hint">点击复制</span>
      </button>
    </div>
  </section>
</div>`,
  bodyEnd: `<script>
(() => {
  const toast = (message) => {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  };

  document.querySelectorAll(".copy-row").forEach((row) => {
    row.addEventListener("click", async () => {
      const value = row.dataset.copy;
      try {
        await navigator.clipboard.writeText(value);
        toast("已复制 " + value);
      } catch {
        toast("复制失败，请手动选中");
      }
    });
  });
})();
</script>`,
};
