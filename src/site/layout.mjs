// 该文件用于生成全站公共 HTML 结构，让页面内容只关注自身主体。
import { siteData } from "./site-data.mjs";

export function renderPage(pageDefinition) {
  // 组装单个静态页面，保持 GitHub Pages 最终输出仍是普通 HTML。
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
${renderCommonHead()}
${replaceSiteTokens(pageDefinition.head).trim()}
<link rel="stylesheet" href="assets/css/site.css" />
</head>
<body>
${renderNav(pageDefinition)}

${replaceSiteTokens(pageDefinition.main).trim()}

${renderFooter()}
${renderBodyEnd(pageDefinition)}
</body>
</html>
`;
}

function renderCommonHead() {
  // 输出三页共享的基础 head 元信息。
  return `<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="author" content="${siteData.authorName}" />`;
}

function renderNav(pageDefinition) {
  // 根据当前页面生成高亮导航，公共链接只从配置读取。
  const links = siteData.navItems.map((item) => renderNavLink(item, pageDefinition.outputFile)).join("\n            ");
  return `<header class="nav">
    <div class="nav-inner">
        <div class="brand">${pageDefinition.brand}</div>
        <div class="nav-actions">
            ${links}
        </div>
    </div>
</header>`;
}

function renderNavLink(item, currentOutputFile) {
  // 渲染单个导航项，外链和当前页态由数据决定。
  const href = item.href === "downloadUrl" ? siteData.downloadUrl : item.href;
  const isCurrent = href === currentOutputFile;
  const className = isCurrent ? "nav-link nav-link--current" : "nav-link";
  const currentAttribute = isCurrent ? ' aria-current="page"' : "";
  const externalAttributes = item.external ? ' target="_blank" rel="noopener"' : "";
  return `<a class="${className}" href="${href}"${currentAttribute}${externalAttributes}>${item.label}</a>`;
}

function renderFooter() {
  // 渲染全站唯一页脚来源，备案和联系方式不再散落维护。
  return `<footer class="footer">
    <div class="footer-line">${siteData.copyrightChinese}</div>
    <div class="footer-line footer-line--en">${siteData.copyrightEnglish}</div>
    <div class="footer-line footer-records">
        <a class="footer-link" href="${siteData.icpUrl}" target="_blank" rel="noopener">${siteData.icpText}</a>
        <a class="footer-link footer-security-link" href="${siteData.policeRecordUrl}" target="_blank" rel="noreferrer">
            <img class="footer-security-icon" src="${siteData.policeIconPath}" alt="公安备案图标" />
            <span>${siteData.policeRecordText}</span>
        </a>
    </div>
    <div class="footer-line">作者微信：${siteData.authorWechat}</div>
</footer>`;
}

function replaceSiteTokens(markup) {
  // 把页面模板中的公共占位符替换为单一配置源，避免公共数据双写。
  return markup
    .replaceAll("{{siteUrl}}", siteData.siteUrl)
    .replaceAll("{{downloadUrl}}", siteData.downloadUrl)
    .replaceAll("{{tutorialUrl}}", siteData.tutorialUrl)
    .replaceAll("{{authorWechat}}", siteData.authorWechat)
    .replaceAll("{{customerWechat}}", siteData.customerWechat);
}

function renderBodyEnd(pageDefinition) {
  // 输出页面专属脚本，公共脚本不在页面里重复维护。
  return pageDefinition.bodyEnd ? `\n${replaceSiteTokens(pageDefinition.bodyEnd).trim()}` : "";
}
