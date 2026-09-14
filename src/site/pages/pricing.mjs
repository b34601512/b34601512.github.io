// pricing.html 的页面专属内容。公共结构由 layout 生成，公共信息由 site-data 提供。
import { pageUrl, siteData } from "../site-data.mjs";

const url = pageUrl("pricing.html");
const title = "定价｜话术精灵 SoftTalk";
const share = "本地离线知识库永久免费；云同步、团队共享、云端备份按「工号」购买，新用户首月免费体验。";

const plans = [
  { term: "1 年", price: "48", note: "先试一年，决策门槛最低。" },
  { term: "2 年", price: "78", note: "确认长期使用，省去频繁续费。" },
  { term: "3 年", price: "98", note: "稳定团队长期部署，价格更平滑。" },
  { term: "100 年", price: "168", note: "一次开通，不再续费。", pick: true },
];

const cloud = [
  { name: "云同步", text: "多端同步知识库内容，资料不再只留在单台电脑。" },
  { name: "团队共享", text: "多人围绕同一套知识库协作，减少版本分散和重复整理。" },
  { name: "云端备份", text: "在本地按天备份之外，再加一层云端保护。" },
];

export const pricingPage = {
  outputFile: "pricing.html",
  navLabel: "定价",
  head: `<title>${title}</title>
<meta name="description" content="${share}" />
<meta name="robots" content="index,follow" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${siteData.siteName}" />
<meta property="og:locale" content="zh_CN" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${share}" />
<meta property="og:url" content="${url}" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${share}" />
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "首页", "item": "${siteData.siteUrl}" },
        { "@type": "ListItem", "position": 2, "name": "定价", "item": "${url}" }
      ]
    },
    {
      "@type": "SoftwareApplication",
      "name": "${siteData.siteName}",
      "applicationCategory": "BusinessApplication",
      "applicationSubCategory": "客服话术软件",
      "operatingSystem": "Windows",
      "inLanguage": "zh-CN",
      "url": "${siteData.siteUrl}",
      "offers": {
        "@type": "AggregateOffer",
        "priceCurrency": "CNY",
        "lowPrice": "48",
        "highPrice": "168",
        "offerCount": "4"
      }
    }
  ]
}
</script>`,
  main: `<div class="wrap">
  <section class="hero">
    <p class="eyebrow">定价</p>
    <h1>本地永久免费<br />云端按工号付费</h1>
    <p class="lead">本地知识库可以长期免费用。需要云同步、团队共享、云端备份时，按「工号」购买，新用户首月免费体验。</p>
    <div class="actions">
      <a class="btn btn--primary" href="${siteData.downloadUrl}" target="_blank" rel="noopener">下载体验</a>
      <a class="btn btn--ghost" href="contact.html">咨询购买</a>
    </div>
  </section>

  <section class="section">
    <h2>云端协作价格</h2>
    <div class="plans">
      ${plans
        .map(
          (plan) => `<article class="plan${plan.pick ? " plan--pick" : ""}">
        <div class="plan-head">
          <h3 class="plan-term">${plan.term}</h3>
          ${plan.pick ? '<span class="plan-flag">推荐</span>' : ""}
        </div>
        <p class="plan-price">${plan.price}<span> 元 / 工号</span></p>
        <p class="plan-note">${plan.note}</p>
      </article>`,
        )
        .join("\n      ")}
    </div>
    <p class="note">收费单位是「工号」，有效期内可使用云同步、团队共享与云端备份。</p>
  </section>

  <section class="section">
    <h2>云端包含</h2>
    <div class="grid-3">
      ${cloud
        .map(
          (item) => `<article class="feature">
        <h3>${item.name}</h3>
        <p>${item.text}</p>
      </article>`,
        )
        .join("\n      ")}
    </div>
  </section>
</div>`,
};
