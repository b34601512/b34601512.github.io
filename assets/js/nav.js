// 目录：<details> 本身就能开合（没开 JS 也能用）。首屏开合由 layout.mjs 内联的启动脚本按
// window.softtalkNav（src/site/nav-state.mjs）定好，这里补两种形态下的行为：
// 宽屏（≥ 1280px）是右侧常驻侧栏——访客开合一次就记进 localStorage，换页、刷新都保持；点外面、点链接不收起。
// 窄屏是顶栏下拉——点外面、按 Esc（焦点还给「目录」按钮）、点了链接都收起，也不记开合，下一页照旧收起。
(() => {
  const menu = document.getElementById("nav-menu");
  const nav = window.softtalkNav;
  if (!menu || !nav) return;
  const toggle = menu.querySelector("summary");
  const wide = matchMedia(nav.query);
  const read = () => {
    try {
      return localStorage.getItem(nav.key);
    } catch {
      return null;
    }
  };
  let syncing = false;
  const sync = () => {
    syncing = true;
    menu.open = nav.startsOpen(read(), wide.matches);
  };

  menu.addEventListener("toggle", () => {
    // 程序改的开合（初始化、跨断点）不算访客的选择
    if (syncing) {
      syncing = false;
      return;
    }
    if (!wide.matches) return;
    try {
      localStorage.setItem(nav.key, menu.open ? "open" : "closed");
    } catch {}
  });
  // 窗口拉宽拉窄跨过断点：宽了按记住的摊开，窄了收起（窄屏下拉会盖住正文）
  wide.addEventListener("change", () => {
    if (menu.open !== nav.startsOpen(read(), wide.matches)) sync();
  });

  document.addEventListener("click", (event) => {
    if (!wide.matches && menu.open && !menu.contains(event.target)) menu.open = false;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || wide.matches || !menu.open) return;
    menu.open = false;
    toggle.focus();
  });
  menu.addEventListener("click", (event) => {
    if (!wide.matches && event.target.closest("a")) menu.open = false;
  });
})();
