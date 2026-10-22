// 全站唯一数据源：域名、产品信息、下载与教程入口、联系方式、备案信息。
// 页面模块直接 import 这里的字段拼 HTML，不再使用占位符替换。
export const siteData = {
  siteUrl: "https://luyao2089.cc/",
  siteName: "话术精灵 SoftTalk",
  siteTitle: "客服话术软件_微信销售话术管理工具 - 话术精灵 SoftTalk",
  keywords:
    "客服话术软件,话术软件,话术管理软件,客服话术管理软件,微信销售话术软件,客户话术软件,电商客服话术软件,快捷回复软件,团队话术共享,话术精灵",
  ogImage: "assets/og.png",
  authorName: "黎路遥",
  authorWechat: "luyao2089",
  authorEmail: "576798643@qq.com",
  downloadUrl: "https://www.kdocs.cn/l/cvnglmckRGBu",
  // PySide6（Qt 6）不支持 Windows 10 以前的系统，安装包只有 64 位。
  platform: "Windows 10 / 11（64 位）",
  tutorialUrl: "https://www.kdocs.cn/l/crEfTnE6toV0",
  copyright: "© 2025–2026 黎路遥 · 话术精灵 SoftTalk",
  // 工信部 ICP 备案：2026-10-18 撤下。站点托管在 GitHub Pages（境外），本域名与
  // 页脚原写的「-2」子号在工信部备案系统均查无记录（主体号只有 -1），
  // 挂着不存在的备案号属于虚假标注，风险高于不标，故整条撤掉。
  // 恢复条件：域名在国内接入商完成备案后，把 text/url 填回来即可（页脚自动出现）。
  icp: null,
  // 公安联网备案：2026-10-18 撤下（老板批准）。
  // 理由：本备案号挂在深圳的服务器侧（api.kefuhaohaoshuohua.cn 在 120.76.159.42，
  // 440300 为深圳区划代码），而本站是 GitHub Pages 境外托管、未在该号名下登记，
  // 挂它属于错标。不影响服务器侧备案本身（那个千万不能丢）。
  // 恢复条件：若将来官网完成公安联网备案，把 text/url/icon 填回来即可（页脚自动出现）。
  police: null,
};

// 把页面文件名解析成绝对地址，供 canonical、og:url 和 sitemap 共用。
export function pageUrl(file) {
  return new URL(file, siteData.siteUrl).href;
}
