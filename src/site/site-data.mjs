// 全站唯一数据源：域名、产品信息、下载与教程入口、联系方式、备案信息。
// 页面模块直接 import 这里的字段拼 HTML，不再使用占位符替换。
export const siteData = {
  siteUrl: "https://luyao2089.cc/",
  siteName: "话术精灵 SoftTalk",
  siteTitle: "话术精灵 SoftTalk｜客服话术软件与团队知识库",
  authorName: "黎路遥",
  authorWechat: "luyao2089",
  authorEmail: "576798643@qq.com",
  downloadUrl: "https://www.kdocs.cn/l/cvnglmckRGBu",
  tutorialUrl: "https://www.kdocs.cn/l/crEfTnE6toV0",
  copyright: "© 2025–2026 黎路遥 · 话术精灵 SoftTalk",
  icp: {
    text: "粤ICP备2025481646号-2",
    url: "https://beian.miit.gov.cn/",
  },
  police: {
    text: "粤公网安备44030002012053号",
    url: "https://beian.mps.gov.cn/#/query/webSearch?code=44030002012053",
    icon: "assets/beian.png",
  },
};

// 把页面文件名解析成绝对地址，供 canonical、og:url 和 sitemap 共用。
export function pageUrl(file) {
  return new URL(file, siteData.siteUrl).href;
}
