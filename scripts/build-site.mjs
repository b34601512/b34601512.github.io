// 从模块化源文件生成 GitHub Pages 可直接托管的静态 HTML 与 sitemap.xml。
import { writeFile } from "node:fs/promises";
import { renderPage } from "../src/site/layout.mjs";
import { pageUrl, siteData } from "../src/site/site-data.mjs";
import { contactPage } from "../src/site/pages/contact.mjs";
import { indexPage } from "../src/site/pages/index.mjs";
import { pricingPage } from "../src/site/pages/pricing.mjs";

const sitePages = [indexPage, pricingPage, contactPage];

for (const page of sitePages) {
  await writeFile(page.outputFile, renderPage(page, sitePages), "utf8");
  console.log(`[build-site] 生成 ${page.outputFile}`);
}

// sitemap.xml 由页面清单生成，避免手写清单与页面不同步。
const lastmod = new Date().toISOString().slice(0, 10);
const entries = sitePages
  .map((page, index) => {
    const loc = page.outputFile === "index.html" ? siteData.siteUrl : pageUrl(page.outputFile);
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${(1 - index * 0.1).toFixed(1)}</priority>
  </url>`;
  })
  .join("\n");

await writeFile(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`,
  "utf8",
);
console.log("[build-site] 生成 sitemap.xml");
