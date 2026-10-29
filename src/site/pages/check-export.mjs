// check-export.html：离线导出自检页（issue #15）。不进导航、不进 sitemap（pages.mjs 的 extraPages），noindex。
// 在真浏览器里把宣传片离线导出一遍，量墙钟时间、帧数、文件大小，再把文件拆开核对、整条解码一遍，结果打到控制台和页面上，
// 作者点一下就能把那段 JSON 贴回来。地址后面加 ?s=8 可以把宣传片压成 8 秒跑一遍快的（画面按时间等比压缩，只用来自检）。
export const checkExportPage = {
  outputFile: "check-export.html",
  navLabel: "导出自检",
  styles: ["assets/css/promo-film.css"],
  head: `<title>导出自检 - 话术精灵</title>
<meta name="robots" content="noindex" />`,
  main: `<div class="wrap">
  <section class="hero">
    <p class="eyebrow">自检</p>
    <h1>离线导出<span class="hl">自检</span></h1>
    <p class="lead">点下面的按钮，把宣传片离线导出一遍（不播放、不下载），量用了多久，再把文件拆开核对、整条解码一遍。结果同时打在控制台（F12）和下面的框里，整段复制回来就行。导出途中切到别的标签页也可以，回来看结果。</p>
    <div class="actions">
      <button class="btn btn--primary" id="export-run" type="button">开始自检</button>
      <a class="btn btn--ghost" id="export-file" hidden>存下这次导出的文件</a>
    </div>
  </section>

  <section class="section">
    <pre class="note" id="export-log" style="white-space: pre-wrap; overflow-wrap: anywhere" role="status" aria-live="polite">还没开始。</pre>
    <div class="promo" data-promo-film data-duration="32" data-tagline="一句话，就在手边"></div>
  </section>
</div>`,
  bodyEnd: `<script src="assets/js/mp4-mux.js" defer></script>
<script src="assets/js/mp4-inspect.js" defer></script>
<script src="assets/js/film-export.js" defer></script>
<script src="assets/js/film-engine.js" defer></script>
<script src="assets/js/check-export.js" defer></script>
<script src="assets/js/promo-film.js" defer></script>`,
};
