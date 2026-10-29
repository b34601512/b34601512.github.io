// 右侧目录开合判据（issue #12）：宽屏默认展开、记住收起；窄屏永远收起。
// 运行：node --test tests/
import assert from "node:assert/strict";
import { test } from "node:test";
import { NAV_STORAGE_KEY, NAV_WIDE_QUERY, navStartsOpen } from "../src/site/nav-state.mjs";

test("宽屏没记过或记的是展开就展开，记了收起就收起", () => {
  assert.equal(navStartsOpen(null, true), true);
  assert.equal(navStartsOpen("open", true), true);
  assert.equal(navStartsOpen("closed", true), false);
  assert.equal(navStartsOpen("乱写的值", true), true);
});

test("窄屏不管记了什么都收起，不占正文宽度", () => {
  for (const stored of [null, "open", "closed"]) assert.equal(navStartsOpen(stored, false), false);
});

test("键名与断点固定（改了要同步说明文档）", () => {
  assert.equal(NAV_STORAGE_KEY, "softtalk-nav");
  assert.equal(NAV_WIDE_QUERY, "(min-width: 1280px)");
});

test("navStartsOpen 的源码能原样内联进页面（不依赖模块作用域里的其他名字）", () => {
  const inlined = new Function(`return (${navStartsOpen})`)();
  assert.equal(inlined(null, true), true);
  assert.equal(inlined("closed", true), false);
});
