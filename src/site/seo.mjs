// 每页 head 里的 SEO 与分享元数据。四张页面只在标题、描述、地址和结构化数据上不同，公共部分只写这一份。
import { siteData } from "./site-data.mjs";

export const ogImageUrl = new URL(siteData.ogImage, siteData.siteUrl).href;

// via：首页与本页之间的上级页面 [{ name, url }]（如经验分享的某一期 → 「客服经验分享」列表页）。
export function breadcrumb(name, url, via = []) {
  const trail = [{ name: "首页", url: siteData.siteUrl }, ...via, { name, url }];
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: item.url })),
  };
}

export function seoHead({ title, description, url, ogType = "website", robots = "index,follow", jsonLd }) {
  return `<title>${title}</title>
<meta name="description" content="${description}" />
<meta name="keywords" content="${siteData.keywords}" />
<meta name="robots" content="${robots}" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="${ogType}" />
<meta property="og:site_name" content="${siteData.siteName}" />
<meta property="og:locale" content="zh_CN" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${ogImageUrl}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<script type="application/ld+json">
${JSON.stringify({ "@context": "https://schema.org", "@graph": jsonLd }, null, 2)}
</script>`;
}
