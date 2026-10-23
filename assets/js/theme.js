// 白天 / 黑夜切换。首屏主题由 head 里的内联脚本先定好，这里只负责按钮和记住选择。
// 支持 View Transitions 的浏览器从按钮位置圆形铺开新主题；不支持、系统要求减少动效、或过渡被浏览器
// 中途 abort（窗口被遮挡、切标签、连点）时，退化成 140ms 淡入，不再「啪」一下瞬切。
(() => {
  const FADE = { duration: 140, easing: "ease-out" };

  // 该走圆形铺开还是淡入：纯函数，Node 里也能直接测。
  const pickMotion = (supported, reduced) => (supported && !reduced ? "view-transition" : "fade");

  const STORAGE_KEY = "softtalk-theme";
  const THEME_COLOR = { dark: "#000000", light: "#faf8f5" };
  const root = document.documentElement;
  const button = document.getElementById("theme-toggle");
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  // check-motion.html 自检页用同一套逻辑跑点按测试。
  window.softtalkTheme = { pickMotion };
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

  // 先换主题，再让整页从淡到实。
  function fadeIn(theme) {
    if (current() !== theme) apply(theme);
    root.animate({ opacity: [0.55, 1] }, FADE);
  }

  // log(step, detail) 只给自检页用：start / ready / ready-failed / fallback / finished-failed。
  function reveal(theme, log) {
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const fallback = (error) => {
      log("ready-failed", error);
      fadeIn(theme);
      log("fallback");
    };
    const startedAt = performance.now();
    let transition;
    try {
      transition = document.startViewTransition(() => apply(theme));
    } catch (error) {
      fallback(error);
      return;
    }
    log("start");
    transition.ready
      .then(() => {
        log("ready", Math.round(performance.now() - startedAt));
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 520, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
        );
      })
      .catch(fallback);
    // 只在更新回调抛错时才会 reject；记下来，不弹错。
    transition.finished.catch((error) => log("finished-failed", error));
  }

  function toggle(log = () => {}) {
    const next = current() === "dark" ? "light" : "dark";
    const supported = typeof document.startViewTransition === "function";
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (pickMotion(supported, reduced) === "view-transition") {
      reveal(next, log);
    } else {
      fadeIn(next);
      log("fallback");
    }
  }

  window.softtalkTheme.toggle = toggle;
  button.addEventListener("click", () => toggle());

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
