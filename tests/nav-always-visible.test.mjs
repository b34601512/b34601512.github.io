// 目录常驻（issue #12）：顶栏不再有「目录」按钮，每张页面打开就带着完整目录，不靠 JS、不能收起。
// 读的是已提交的构建产物（根目录 HTML），check-site.mjs 另外保证产物与源文件一致。
// 运行：node --test tests/
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { extraPages, sitePages } from "../src/site/pages.mjs";

const allPages = [...sitePages, ...extraPages];

const repo = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(resolve(repo, file), "utf8");
const navOf = (html) => html.match(/<nav class="nav-links"[^>]*>([\s\S]*?)<\/nav>/)?.[1];

test("每张页面都有目录，且目录不在任何可收起的容器里", () => {
  for (const page of allPages) {
    const html = read(page.outputFile);
    assert.ok(navOf(html), `${page.outputFile} 缺 .nav-links`);
    assert.doesNotMatch(html, /nav-menu-toggle|<summary|<details class="nav-menu"|id="nav-menu"/, page.outputFile);
    assert.doesNotMatch(html, /softtalk-nav|softtalkNav|assets\/js\/nav\.js/, page.outputFile);
    // 目录在 <header> 外面、在 <main> 前面：键盘顺序是 品牌 → 主题 → 目录 → 正文
    const header = html.indexOf("</header>");
    const nav = html.indexOf('<nav class="nav-links"');
    assert.ok(header < nav && nav < html.indexOf('<main class="main">'), page.outputFile);
  }
});

test("目录链接齐全：每个导航页一条、当前页标 aria-current、下载在最后一组", () => {
  const listed = sitePages.filter((item) => !item.navUnder);
  for (const page of allPages) {
    const nav = navOf(read(page.outputFile));
    for (const item of listed) assert.ok(nav.includes(`href="${item.outputFile}"`), `${page.outputFile} 缺 ${item.outputFile}`);
    if (listed.includes(page)) {
      assert.match(nav, new RegExp(`href="${page.outputFile}" aria-current="page"`), page.outputFile);
    }
    const groups = nav.split('<div class="nav-group">').slice(1);
    assert.ok(groups.at(-1).includes(">下载</a>"), `${page.outputFile} 下载不在最后一组`);
    assert.equal(nav.split(">下载</a>").length, 2, page.outputFile);
  }
});

test("旧的开合脚本与判据已删除", () => {
  assert.equal(existsSync(resolve(repo, "assets/js/nav.js")), false);
  assert.equal(existsSync(resolve(repo, "src/site/nav-state.mjs")), false);
  assert.doesNotMatch(read("assets/css/site.css"), /nav-menu/);
});
