// 竖屏短片共用的一份配色（issue #23）：原来写在 freight-film.js 里的 P（话术精灵客户端白色主题，取样自客户端实机截图，同 demo.css 的 --p-*）
// 与舞台的几种颜色，原样搬到这里，值一个没改。补运费短片与片头（film-brand-intro.js）都从这一份取，不再各抄一份。
// demo.css 的 --p-* 是给网页 CSS 用的（画布与 Node 测试读不到），这里是画布这一侧的唯一来源。
//
//   FilmPalette.P            话术精灵主界面的颜色
//   FilmPalette.ACCENT       品牌橙（舞台上：点击涟漪、贴入闪光、话术卡描边）
//   FilmPalette.ACCENT_HOT   亮一点的橙（舞台上的强调小字）
//   FilmPalette.FG           舞台上的主文字
//   FilmPalette.STAGE        舞台底色
(() => {
  const P = {
    frame: "#fbf6ec", paper: "#fffdf8", tab: "#f4eadb", peach: "#ffe4d1", ink: "#2a1a12", chip: "#f4ebde",
    muted: "#7f7b74", digit: "#8c7b6b", answer: "#4a3a2e", box: "#8d8279", base: "#75685f", tabLine: "#b3a79b",
    chipLine: "#d6cabb", lv2Line: "#645145", hover: "#fdf3e7", badge: "#fff3e7", hot: "#c2410c", focus: "#e07f4a", title: "#e53935",
  };
  globalThis.FilmPalette = Object.freeze({ P: Object.freeze(P), ACCENT: "#ff6b2c", ACCENT_HOT: "#ff9a5c", FG: "#f5f5f5", STAGE: "#0b0a09" });
})();
