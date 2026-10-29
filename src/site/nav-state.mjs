// 右侧目录的展开状态（GitHub issue #12：目录挂到右侧、持久展开）。
// 只有宽屏（≥ 1280px，右边腾得出 240px 还放得下 1000px 内容区）才是常驻侧栏并记住开合；
// 窄屏一律收起，目录退回顶栏按钮，不占正文宽度。
// navStartsOpen 是纯函数：layout.mjs 把它的源码原样内联进页面（首屏绘制前定好开合），nav.js 通过
// window.softtalkNav 复用同一份，Node 测试直接 import。
export const NAV_STORAGE_KEY = "softtalk-nav";
export const NAV_WIDE_QUERY = "(min-width: 1280px)";

export function navStartsOpen(stored, wide) {
  return wide && stored !== "closed";
}
