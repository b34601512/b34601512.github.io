// 顶部「目录」：<details> 本身就能开合（没开 JS 也能用），这里只补三件事——
// 点目录外面收起、按 Esc 收起并把焦点还给「目录」按钮、点了目录里的链接就收起（同页锚点不会自己关）。
(() => {
  const menu = document.getElementById("nav-menu");
  if (!menu) return;
  const toggle = menu.querySelector("summary");

  document.addEventListener("click", (event) => {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !menu.open) return;
    menu.open = false;
    toggle.focus();
  });
  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) menu.open = false;
  });
})();
