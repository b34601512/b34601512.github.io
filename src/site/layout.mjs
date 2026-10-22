// 公共页面骨架：head 基础项、导航、页脚。公共信息只从 site-data.mjs 读取。
import { siteData } from "./site-data.mjs";

const DOWNLOAD_LINK = { label: "下载", href: siteData.downloadUrl, external: true };

// 首屏绘制前就定下主题，否则白天模式的访客每次打开都会先闪一下黑。
// 访客点过切换就按他的选择；没点过就跟随系统设置；系统没明确要深色（或读不到）就是白天。键名与 theme.js 共用。
const THEME_BOOT = `<script>
try { const t = localStorage.getItem("softtalk-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); if (t === "dark") document.documentElement.dataset.theme = "dark"; } catch {}
</script>`;

// 页面定义需要提供：outputFile、navLabel、head、main、可选 styles 与 bodyEnd。
// 可选 root：站内地址前缀。根目录页面默认 ""（相对路径）；blog/ 下的页面在子目录里，设 "/" 改用根路径。
// styles 由这里加前缀；bodyEnd 是页面自己写的 HTML，子目录页面要自己写根路径。
// 可选 navHref：导航里的地址（默认 outputFile），如博客列表页写 "blog/"。
export function renderPage(page, sitePages) {
  const root = page.root ?? "";
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
<link rel="icon" href="${root}assets/favicon.png" />
<link rel="stylesheet" href="${root}assets/css/site.css" />${renderPageStyles(page)}
<script src="${root}assets/js/theme.js" defer></script>
</head>
<body>
${renderNav(page, sitePages)}

<main class="main">
${page.main.trim()}
</main>

${renderFooter(root)}${renderBodyEnd(page)}
</body>
</html>
`;
}

function renderPageStyles(page) {
  return (page.styles ?? []).map((href) => `\n<link rel="stylesheet" href="${page.root ?? ""}${href}" />`).join("");
}

function renderNav(page, sitePages) {
  const root = page.root ?? "";
  const links = sitePages
    .map((item) => ({
      label: item.navLabel,
      href: `${root}${item.navHref ?? item.outputFile}`,
      current: item.outputFile === page.outputFile,
    }))
    .concat(DOWNLOAD_LINK)
    .map(renderNavLink)
    .join("\n      ");

  return `<header class="nav">
  <div class="nav-inner">
    <a class="brand" href="${root}index.html">
      <img class="brand-logo" src="${root}assets/logo-small.png" alt="" />
      <span>${siteData.siteName}</span>
    </a>
    <nav class="nav-links" aria-label="站点导航">
      ${links}
    </nav>
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
    link.current ? 'aria-current="page"' : "",
    link.external ? 'target="_blank" rel="noopener"' : "",
  ].filter(Boolean);

  return `<a ${attributes.join(" ")}>${link.label}</a>`;
}

function renderFooterRecords(root) {
  // 备案条目可选：某个字段置 null 就不渲染那一条，不留下空链接或空 <p>。
  const links = [];
  if (siteData.icp) {
    links.push(`<a class="footer-link" href="${siteData.icp.url}" target="_blank" rel="noopener">${siteData.icp.text}</a>`);
  }
  if (siteData.police) {
    links.push(`<a class="footer-link" href="${siteData.police.url}" target="_blank" rel="noopener">
        <img class="footer-icon" src="${root}${siteData.police.icon}" alt="" />${siteData.police.text}
      </a>`);
  }
  return links.length ? `<p class="footer-records">${links.join("\n      ")}</p>` : "";
}

function renderFooter(root) {
  // 备案段为空时连换行一起省掉，不在页脚留空行。
  const records = renderFooterRecords(root);
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
