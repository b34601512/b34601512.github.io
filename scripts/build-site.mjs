// 从模块化源文件生成 GitHub Pages 可直接托管的静态 HTML 与 sitemap.xml。
import { execSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { withAssetVersions } from "../src/site/asset-versions.mjs";
import { renderPage } from "../src/site/layout.mjs";
import { pageUrl, siteData } from "../src/site/site-data.mjs";
import { contactPage } from "../src/site/pages/contact.mjs";
import { indexPage } from "../src/site/pages/index.mjs";
import { pricingPage } from "../src/site/pages/pricing.mjs";
import { whyPage } from "../src/site/pages/why.mjs";

const sitePages = [indexPage, whyPage, pricingPage, contactPage];
const orderedEntries = [];

for (const [index, page] of sitePages.entries()) {
  const rendered = withAssetVersions(renderPage(page, sitePages));
  await writeFile(page.outputFile, rendered, "utf8");
  console.log(`[build-site] 生成 ${page.outputFile}`);
  orderedEntries.push({ page, index, rendered });
}

// sitemap.xml 由页面清单生成，避免手写清单与页面不同步。
const today = new Date().toISOString().slice(0, 10);

// lastmod 不能写死「今天」：那样每次构建都会假装四个页面刚更新过，搜索引擎会当成噪声。
// 规则：内容相对上一次提交真的变了才写今天，否则沿用这个文件上次发布的日期。
function lastmodFor(outputFile, rendered) {
  try {
    const published = execSync(`git show HEAD:${outputFile}`, {
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 32 * 1024 * 1024,
    }).toString();
    if (published !== rendered) return today;
    const date = execSync(`git log -1 --format=%cs -- "${outputFile}"`, {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return date || today;
  } catch {
    return today;
  }
}

const entries = orderedEntries
  .map(({ page, index, rendered }) => {
    const loc = page.outputFile === "index.html" ? siteData.siteUrl : pageUrl(page.outputFile);
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmodFor(page.outputFile, rendered)}</lastmod>
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
