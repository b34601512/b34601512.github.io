// 站点自检：构建结果、占位符、类名、元素 ID、资源路径和 sitemap 一致性。
// 只用 Node 内置能力，运行方式：node scripts/check-site.mjs
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { withAssetVersions } from "../src/site/asset-versions.mjs";
import { renderPage } from "../src/site/layout.mjs";
import { sitePages } from "../src/site/pages.mjs";
import { pageUrl, siteData } from "../src/site/site-data.mjs";

const errors = [];
const warnings = [];

const CLASS_TOKEN = /^[a-z][a-z0-9]*(?:--?[a-z0-9]+)*$/;
const uniq = (values) => [...new Set(values)];
const matchAll = (text, pattern, group = 1) => [...text.matchAll(pattern)].map((match) => match[group]);

// CSS 里定义的类名（先去掉注释，避免注释文字被当成类名）。
function classesInCss(css) {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, " ");
  return matchAll(source, /\.([a-zA-Z][\w-]*)/g);
}

// 页面真正用到的类：HTML 的 class 属性，加上 JS 明确写入 class 的字符串。
function usedClassesInHtml(html) {
  return matchAll(html, /class="([^"]*)"/g)
    .flatMap((value) => value.trim().split(/\s+/))
    .filter(Boolean);
}

function usedClassesInJs(js) {
  const plain = js.replace(/\$\{[^}]*\}/g, " ");
  const values = [
    ...matchAll(plain, /class="([^"]*)"/g),
    ...matchAll(plain, /\.className\s*=\s*[`'"]([^`'"]*)[`'"]/g),
    ...matchAll(plain, /classList\.(?:add|remove|toggle)\(([^)]*)\)/g).flatMap((args) =>
      matchAll(args, /[`'"]([^`'"]+)[`'"]/g),
    ),
  ];
  return values.flatMap((value) => value.trim().split(/\s+/)).filter((token) => CLASS_TOKEN.test(token));
}

// 反向检查用的宽松集合：JS 中出现过的类名样式片段都算“可能用到”，避免误报未使用。
function mentionedClassesInJs(js) {
  const plain = js.replace(/[`'"]/g, " ").replace(/\$\{/g, " ").replace(/\}/g, " ");
  return matchAll(plain, /([a-z][a-z0-9]*(?:--?[a-z0-9]+)*)/g).filter((token) => CLASS_TOKEN.test(token));
}

const definedClasses = new Set();
const usedClasses = new Set();
const mentionedClasses = new Set();

for (const page of sitePages) {
  const file = page.outputFile;
  const html = await readFile(file, "utf8").catch(() => null);

  if (!html) {
    errors.push(`${file} 不存在，请先运行 node scripts/build-site.mjs`);
    continue;
  }

  if (html !== withAssetVersions(renderPage(page, sitePages))) {
    errors.push(`${file} 与源文件生成结果不一致，请重新运行 node scripts/build-site.mjs`);
  }

  const leftover = html.match(/\{\{\w+\}\}/g);
  if (leftover) errors.push(`${file} 存在未替换的占位符：${uniq(leftover).join(" ")}`);

  for (const target of matchAll(html, /(?:src|href)="([^"]+)"/g)) {
    // 带内容指纹的 CSS/JS 要去掉 ?v= 查询串再判断文件是否存在。
    if (target.startsWith("assets/") && !existsSync(target.split("?")[0])) {
      errors.push(`${file} 引用了不存在的资源：${target}`);
    }
  }

  const stylesheets = matchAll(html, /<link rel="stylesheet" href="([^"]+)"/g);
  // 样式表引用带内容指纹（?v=哈希），读文件时去掉查询串。
  const css = (
    await Promise.all(stylesheets.map((href) => readFile(href.split("?")[0], "utf8").catch(() => "")))
  ).join("\n");
  classesInCss(css).forEach((name) => definedClasses.add(name));
  usedClassesInHtml(html).forEach((name) => usedClasses.add(name));

  const htmlIds = new Set(matchAll(html, /\sid="([\w-]+)"/g));
  const scripts = [
    ...matchAll(html, /<script src="([^"]+)"/g).map((src) => ({ name: src, code: null, src })),
    ...matchAll(html, /<script>([\s\S]*?)<\/script>/g).map((code) => ({
      name: `${file} 内联脚本`,
      code,
    })),
  ];

  for (const script of scripts) {
    // 脚本 src 可能带内容指纹（?v=哈希），读文件时要去掉查询串。
    const js = script.code ?? (await readFile(script.src.split("?")[0], "utf8"));
    usedClassesInJs(js).forEach((name) => usedClasses.add(name));
    mentionedClassesInJs(js).forEach((name) => mentionedClasses.add(name));

    const referenced = uniq(matchAll(js, /(?:getElementById|\$)\(\s*[`'"]([\w-]+)[`'"]\s*\)/g));
    const created = new Set(matchAll(js, /\.id\s*=\s*[`'"]([\w-]+)[`'"]/g));
    for (const id of referenced) {
      if (!htmlIds.has(id) && !created.has(id)) errors.push(`${script.name} 绑定的 #${id} 在 ${file} 中不存在`);
    }
  }
}

for (const name of usedClasses) {
  if (!definedClasses.has(name)) errors.push(`使用了样式里不存在的类：${name}`);
}
for (const name of definedClasses) {
  if (!usedClasses.has(name) && !mentionedClasses.has(name)) warnings.push(`样式里的类没有被使用：${name}`);
}

const sitemap = await readFile("sitemap.xml", "utf8").catch(() => "");
const sitemapLocs = matchAll(sitemap, /<loc>([^<]+)<\/loc>/g);
for (const page of sitePages) {
  const loc = page.outputFile === "index.html" ? siteData.siteUrl : pageUrl(page.outputFile);
  if (!sitemap.includes(`<loc>${loc}</loc>`)) errors.push(`sitemap.xml 缺少 ${loc}`);
}
// sitemap 只能列页面清单里的地址：多列、重复、或 lastmod 不是 YYYY-MM-DD 都报错，
// 否则错一个字符搜索引擎就当成无效条目静默丢掉。
for (const loc of sitemapLocs) {
  const known =
    loc === siteData.siteUrl || sitePages.some((page) => pageUrl(page.outputFile) === loc);
  if (!known) errors.push(`sitemap.xml 里有页面清单之外的地址：${loc}`);
}
if (new Set(sitemapLocs).size !== sitemapLocs.length) errors.push("sitemap.xml 里有重复的 <loc>");
for (const value of matchAll(sitemap, /<lastmod>([^<]*)<\/lastmod>/g)) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) errors.push(`sitemap.xml 的 lastmod 不是 YYYY-MM-DD：${value}`);
}
if (sitemapLocs.length !== sitePages.length) {
  errors.push(`sitemap.xml 的地址数量是 ${sitemapLocs.length}，页面清单是 ${sitePages.length}`);
}

warnings.forEach((message) => console.warn(`[warn] ${message}`));
errors.forEach((message) => console.error(`[error] ${message}`));
console.log(
  errors.length
    ? `自检未通过：${errors.length} 个错误，${warnings.length} 个提示`
    : `自检通过：${sitePages.length} 个页面，${warnings.length} 个提示`,
);
process.exitCode = errors.length ? 1 : 0;
