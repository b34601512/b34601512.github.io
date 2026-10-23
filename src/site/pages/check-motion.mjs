// check-motion.html：主题切换动效自检页（#3670）。不进导航、不进 sitemap，noindex。
// 看三件事：系统动效偏好、浏览器是否支持视图过渡、真点一次圆形铺开时 ready 成功还是失败（失败打出错误名）。
// 点按测试走 theme.js 里同一条切换路径（window.softtalkTheme.toggle），兜底是否触发也是它报上来的。
export const checkMotionPage = {
  outputFile: "check-motion.html",
  navLabel: "动效自检",
  head: `<title>动效自检 - 话术精灵</title>
<meta name="robots" content="noindex" />`,
  main: `<div class="wrap">
  <section class="hero">
    <p class="eyebrow">自检</p>
    <h1>主题切换<span class="hl">动效自检</span></h1>
    <p class="note">内部排查页，非产品功能说明</p>
    <p class="lead">切换主题没有圆形铺开时，把这一页的三块内容截图发给我们。</p>
    <h2>动效偏好</h2>
    <pre id="motion-prefs">读取中…</pre>
    <h2>视图过渡</h2>
    <pre id="motion-support">读取中…</pre>
    <h2>点按测试</h2>
    <div class="actions">
      <button class="btn btn--primary" type="button" id="motion-test">跑一次切换</button>
    </div>
    <pre id="motion-log">还没跑。</pre>
  </section>
</div>`,
  bodyEnd: `<script>
(() => {
  const prefs = document.getElementById("motion-prefs");
  const support = document.getElementById("motion-support");
  const log = document.getElementById("motion-log");
  const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const darkQuery = matchMedia("(prefers-color-scheme: dark)");

  function showPrefs() {
    prefs.textContent = [
      "prefers-reduced-motion: " + (reducedQuery.matches ? "reduce" : "no-preference"),
      "prefers-color-scheme: " + (darkQuery.matches ? "dark" : "light"),
    ].join("\\n");
  }

  function showSupport() {
    support.textContent = [
      "typeof document.startViewTransition: " + typeof document.startViewTransition,
      "document.visibilityState: " + document.visibilityState,
      "navigator.userAgent: " + navigator.userAgent,
    ].join("\\n");
  }

  reducedQuery.addEventListener("change", showPrefs);
  darkQuery.addEventListener("change", showPrefs);
  document.addEventListener("visibilitychange", showSupport);
  showPrefs();
  showSupport();

  const LABEL = {
    start: "开始",
    ready: "ready 成功",
    "ready-failed": "ready 失败",
    fallback: "兜底触发：140ms 淡入",
    "finished-failed": "finished 失败",
  };

  document.getElementById("motion-test").addEventListener("click", () => {
    const theme = window.softtalkTheme;
    if (!theme || !theme.toggle) {
      log.textContent = "theme.js 没加载，无法测试。";
      return;
    }
    const lines = [];
    let fellBack = false;
    const write = () => {
      log.textContent = lines.concat("兜底是否触发：" + (fellBack ? "是" : "否")).join("\\n");
    };
    const supported = typeof document.startViewTransition === "function";
    lines.push("判据：" + theme.pickMotion(supported, reducedQuery.matches));
    theme.toggle((step, detail) => {
      let line = LABEL[step] || step;
      if (step === "ready") line += "（" + detail + " ms）";
      if (detail instanceof Error || (detail && detail.name)) line += "：" + detail.name + " / " + detail.message;
      if (step === "fallback") fellBack = true;
      lines.push(line);
      write();
    });
    write();
  });
})();
</script>`,
};
