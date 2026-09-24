// 白天 / 黑夜切换。首屏主题由 head 里的内联脚本先定好，这里只负责按钮和记住选择。
// 支持 View Transitions 的浏览器从按钮位置圆形铺开新主题，其余浏览器直接切换颜色。
(() => {
  const STORAGE_KEY = "softtalk-theme";
  const THEME_COLOR = { dark: "#000000", light: "#faf8f5" };
  const root = document.documentElement;
  const button = document.getElementById("theme-toggle");
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (!button) return;

  const current = () => (root.dataset.theme === "dark" ? "dark" : "light");

  function render(theme) {
    const label = theme === "dark" ? "切换到白天模式" : "切换到黑夜模式";
    button.setAttribute("aria-label", label);
    button.title = label;
    if (themeColorMeta) themeColorMeta.content = THEME_COLOR[theme];
  }

  function apply(theme) {
    root.dataset.theme = theme;
    render(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // 隐私模式等场景写不进去，只影响下次打开，不影响本次切换。
    }
  }

  function reveal(theme) {
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const transition = document.startViewTransition(() => apply(theme));
    transition.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 520, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    });
  }

  button.addEventListener("click", () => {
    const next = current() === "dark" ? "light" : "dark";
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (document.startViewTransition && !calm) reveal(next);
    else apply(next);
  });

  // 访客没手动选过时，页面开着也跟着系统切换（比如 Windows 定时切深色）。
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
    let chosen = null;
    try {
      chosen = localStorage.getItem(STORAGE_KEY);
    } catch {
      // 读不到就当没选过。
    }
    if (chosen) return;
    root.dataset.theme = event.matches ? "dark" : "light";
    render(current());
  });

  render(current());
})();
