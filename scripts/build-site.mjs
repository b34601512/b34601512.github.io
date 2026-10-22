// 从模块化源文件生成 GitHub Pages 可直接托管的静态 HTML 与 sitemap.xml。
import { execSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { withAssetVersions } from "../src/site/asset-versions.mjs";
import { renderPage } from "../src/site/layout.mjs";
import { allPages, sitePages, sitemapPages } from "../src/site/pages.mjs";
import { pageUrl, siteData } from "../src/site/site-data.mjs";

const renderedByFile = new Map();

for (const page of allPages) {
  const rendered = withAssetVersions(renderPage(page, sitePages));
  // 博客页面在 blog/ 与 blog/<slug>/ 下，目录要先建出来。
  await mkdir(dirname(page.outputFile), { recursive: true });
  await writeFile(page.outputFile, rendered, "utf8");
  console.log(`[build-site] 生成 ${page.outputFile}`);
  renderedByFile.set(page.outputFile, rendered);
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

// 优先级：导航页面按顺序 1.0、0.9…递减；页面自带 sitemap 设置（博客列表 0.6、文章 0.5）时以它为准。
const entries = sitemapPages
  .map((page) => {
    const loc = page.outputFile === "index.html" ? siteData.siteUrl : pageUrl(page.outputFile);
    const priority = page.sitemap?.priority ?? (1 - sitePages.indexOf(page) * 0.1).toFixed(1);
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmodFor(page.outputFile, renderedByFile.get(page.outputFile))}</lastmod>
    <changefreq>${page.sitemap?.changefreq ?? "weekly"}</changefreq>
    <priority>${priority}</priority>
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
