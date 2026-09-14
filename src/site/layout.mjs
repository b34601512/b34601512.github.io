// 公共页面骨架：head 基础项、导航、页脚。公共信息只从 site-data.mjs 读取。
import { siteData } from "./site-data.mjs";

const DOWNLOAD_LINK = { label: "下载", href: siteData.downloadUrl, external: true };

// 页面定义需要提供：outputFile、navLabel、head、main、可选 styles 与 bodyEnd。
export function renderPage(page, sitePages) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark" />
<meta name="theme-color" content="#000000" />
<meta name="author" content="${siteData.authorName}" />
${page.head.trim()}
<link rel="icon" href="assets/favicon.png" />
<link rel="stylesheet" href="assets/css/site.css" />${renderPageStyles(page)}
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

function renderNav(page, sitePages) {
  const links = sitePages
    .map((item) => ({
      label: item.navLabel,
      href: item.outputFile,
      current: item.outputFile === page.outputFile,
    }))
    .concat(DOWNLOAD_LINK)
    .map(renderNavLink)
    .join("\n      ");

  return `<header class="nav">
  <div class="nav-inner">
    <a class="brand" href="index.html">
      <img class="brand-logo" src="assets/logo.png" alt="" />
      <span>${siteData.siteName}</span>
    </a>
    <nav class="nav-links" aria-label="站点导航">
      ${links}
    </nav>
  </div>
</header>`;
}

function renderNavLink(link) {
  const attributes = [
    `class="nav-link${link.current ? " nav-link--current" : ""}"`,
    `href="${link.href}"`,
    link.current ? 'aria-current="page"' : "",
    link.external ? 'target="_blank" rel="noopener"' : "",
  ].filter(Boolean);

  return `<a ${attributes.join(" ")}>${link.label}</a>`;
}

function renderFooter() {
  return `<footer class="footer">
  <div class="footer-inner">
    <p>${siteData.copyright}</p>
    <p class="footer-records">
      <a class="footer-link" href="${siteData.icp.url}" target="_blank" rel="noopener">${siteData.icp.text}</a>
      <a class="footer-link" href="${siteData.police.url}" target="_blank" rel="noopener">
        <img class="footer-icon" src="${siteData.police.icon}" alt="" />${siteData.police.text}
      </a>
    </p>
  </div>
</footer>
`;
}

function renderBodyEnd(page) {
  return page.bodyEnd ? `\n${page.bodyEnd.trim()}\n` : "\n";
}
