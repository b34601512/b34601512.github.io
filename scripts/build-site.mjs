// 从模块化源文件生成 GitHub Pages 可直接托管的静态 HTML 与 sitemap.xml。
import { execSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { withAssetVersions } from "../src/site/asset-versions.mjs";
import { renderPage } from "../src/site/layout.mjs";
import { extraPages, sitePages } from "../src/site/pages.mjs";
import { pageUrl, siteData } from "../src/site/site-data.mjs";

const orderedEntries = [];

for (const [index, page] of sitePages.entries()) {
  const rendered = withAssetVersions(renderPage(page, sitePages));
  await writeFile(page.outputFile, rendered, "utf8");
  console.log(`[build-site] 生成 ${page.outputFile}`);
  orderedEntries.push({ page, index, rendered });
}

for (const page of extraPages) {
  await writeFile(page.outputFile, withAssetVersions(renderPage(page, sitePages)), "utf8");
  console.log(`[build-site] 生成 ${page.outputFile}`);
}

// sitemap.xml 由页面清单生成，避免手写清单与页面不同步。
// lastmod 一律按 UTC 日期写：「今天」和「沿用的提交日期」必须走同一个换算，
// 否则本地时区与 UTC 不在同一天时（如北京时间早上 8 点前），构建→提交→再构建会在两天之间来回翻。
// 不用 git 的 %cs：它是提交者本地时区的日期；改取 %ct（Unix 秒，与时区无关）再按 UTC 换算。
function utcDate(date) {
  return date.toISOString().slice(0, 10);
}

function commitDateUtc(file) {
  const seconds = execSync(`git log -1 --format=%ct -- "${file}"`, {
    stdio: ["ignore", "pipe", "ignore"],
  })
    .toString()
    .trim();
  return seconds ? utcDate(new Date(Number(seconds) * 1000)) : "";
}

const today = utcDate(new Date());

// lastmod 不能写死「今天」：那样每次构建都会假装四个页面刚更新过，搜索引擎会当成噪声。
// 规则：内容相对上一次提交真的变了才写今天，否则沿用这个文件上次发布的日期。
function lastmodFor(outputFile, rendered) {
  try {
    const published = execSync(`git show HEAD:${outputFile}`, {
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 32 * 1024 * 1024,
    }).toString();
    if (published !== rendered) return today;
    return commitDateUtc(outputFile) || today;
  } catch {
    return today;
  }
}

// 优先级按清单顺序递减，最低 0.1（经验分享一期期加下去，不能减成 0 或负数）。
const entries = orderedEntries
  .map(({ page, index, rendered }) => {
    const loc = page.outputFile === "index.html" ? siteData.siteUrl : pageUrl(page.outputFile);
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmodFor(page.outputFile, rendered)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${Math.max(0.1, 1 - index * 0.1).toFixed(1)}</priority>
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
