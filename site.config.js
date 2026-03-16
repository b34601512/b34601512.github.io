// 站点可配置项：后续只改这个文件即可，不用到处找代码
// 注意：这是静态站点配置，直接挂到 window 上，避免引入构建工具
window.SOFTTALK_SITE_CONFIG = {
  // 「话术精灵使用教程」按钮跳转地址
  tutorialUrl: "https://www.kdocs.cn/l/crEfTnE6toV0",
  // 下载页发布源配置：用于自动读取 GitHub Release，避免手工改错版本号。
  releaseSource: {
    owner: "b34601512",
    repo: "b34601512.github.io",
    historyLimit: 7,
  },
};
