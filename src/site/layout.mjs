// 公共页面骨架：head 基础项、导航、页脚。公共信息只从 site-data.mjs 读取。
import { siteData } from "./site-data.mjs";

const DOWNLOAD_LINK = { label: "下载", href: siteData.downloadUrl, external: true };

// 首屏绘制前就定下主题，否则白天模式的访客每次打开都会先闪一下黑。
// 访客点过切换就按他的选择；没点过就跟随系统设置；系统没明确要深色（或读不到）就是白天。键名与 theme.js 共用。
const THEME_BOOT = `<script>
try { const t = localStorage.getItem("softtalk-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); if (t === "dark") document.documentElement.dataset.theme = "dark"; } catch {}
</script>`;

// 页面定义需要提供：outputFile、navLabel、head、main、可选 styles、bodyEnd 与 navUnder。
export function renderPage(page, sitePages) {
  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark light" />
<meta name="theme-color" content="#faf8f5" />
<meta name="author" content="${siteData.authorName}" />
${THEME_BOOT}
${page.head.trim()}
<link rel="icon" href="assets/favicon.png" />
<link rel="stylesheet" href="assets/css/site.css" />${renderPageStyles(page)}
<script src="assets/js/theme.js" defer></script>
<script src="assets/js/nav.js" defer></script>
</head>
<body>
${renderNav(page, sitePages)}

<main class="main">
${page.main.trim()}
</main>

${renderFooter()}${renderBodyEnd(page)}
</body>
</html>
`;
}

function renderPageStyles(page) {
  return (page.styles ?? []).map((href) => `\n<link rel="stylesheet" href="${href}" />`).join("");
}

// 导航是一个竖排目录（GitHub issue #7：页面越来越多，横排放不下）：<details> 展开，没开 JS 也能用；
// 页面按 navGroup 分组，组的先后按 sitePages 里第一次出现的顺序；「下载」挂在最后一组。
// nav.js 只补「点外面 / 按 Esc / 点了链接就收起」。
function renderNav(page, sitePages) {
  const groups = new Map();
  sitePages
    .filter((item) => !item.navUnder)
    .forEach((item) => {
      const name = item.navGroup ?? "";
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push({
        label: item.navLabel,
        href: item.outputFile,
        // 上级页面不是「本页」，aria-current 用 true（当前所在的栏目）而不是 page
        current: item.outputFile === page.outputFile ? "page" : item.outputFile === page.navUnder ? "true" : "",
      });
    });
  [...groups.values()].at(-1).push(DOWNLOAD_LINK);

  const here = sitePages.find((item) => item.outputFile === (page.navUnder ?? page.outputFile));
  const sections = [...groups]
    .map(
      ([name, links]) => `<div class="nav-group">${name ? `
          <p class="nav-group-name">${name}</p>` : ""}
          ${links.map(renderNavLink).join("\n          ")}
        </div>`,
    )
    .join("\n        ");

  return `<header class="nav">
  <div class="nav-inner">
    <a class="brand" href="index.html">
      <img class="brand-logo" src="assets/logo-small.png" alt="" />
      <span>${siteData.siteName}</span>
    </a>
    <details class="nav-menu" id="nav-menu">
      <summary class="nav-menu-toggle">
        <svg class="nav-menu-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4h11M2.5 8h11M2.5 12h11" /></svg>
        <span>目录</span>${here ? `<span class="nav-menu-here">${here.navLabel}</span>` : ""}
      </summary>
      <nav class="nav-links" aria-label="站点目录">
        ${sections}
      </nav>
    </details>
    ${THEME_TOGGLE}
  </div>
</header>`;
}

// 黑夜模式显示太阳（点了去白天），白天模式显示月亮；文案由 theme.js 按当前主题改写。
const THEME_TOGGLE = `<button class="theme-toggle" id="theme-toggle" type="button" aria-label="切换到白天模式" title="切换到白天模式">
      <svg class="theme-icon theme-icon--sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.55 1.55M17.15 17.15l1.55 1.55M5.3 18.7l1.55-1.55M17.15 6.85l1.55-1.55" /></svg>
      <svg class="theme-icon theme-icon--moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 14.6A8.5 8.5 0 0 1 9.4 3.8a8.5 8.5 0 1 0 10.8 10.8Z" /></svg>
    </button>`;

function renderNavLink(link) {
  const attributes = [
    `class="nav-link${link.current ? " nav-link--current" : ""}"`,
    `href="${link.href}"`,
    link.current ? `aria-current="${link.current}"` : "",
    link.external ? 'target="_blank" rel="noopener"' : "",
  ].filter(Boolean);

  return `<a ${attributes.join(" ")}>${link.label}</a>`;
}

function renderFooterRecords() {
  // 备案条目可选：某个字段置 null 就不渲染那一条，不留下空链接或空 <p>。
  const links = [];
  if (siteData.icp) {
    links.push(`<a class="footer-link" href="${siteData.icp.url}" target="_blank" rel="noopener">${siteData.icp.text}</a>`);
  }
  if (siteData.police) {
    links.push(`<a class="footer-link" href="${siteData.police.url}" target="_blank" rel="noopener">
        <img class="footer-icon" src="${siteData.police.icon}" alt="" />${siteData.police.text}
      </a>`);
  }
  return links.length ? `<p class="footer-records">${links.join("\n      ")}</p>` : "";
}

function renderFooter() {
  // 备案段为空时连换行一起省掉，不在页脚留空行。
  const records = renderFooterRecords();
  const recordsLine = records ? `\n    ${records}` : "";
  return `<footer class="footer">
  <div class="footer-inner">
    <p>${siteData.copyright}</p>${recordsLine}
  </div>
</footer>
`;
}

function renderBodyEnd(page) {
  return page.bodyEnd ? `\n${page.bodyEnd.trim()}\n` : "\n";
}
