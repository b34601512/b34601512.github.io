(function () {
  function printTrace(fileLine, action, moduleName, subAction) {
    // 统一输出调试链路日志，确保页面初始化每一步都能在控制台定位。
    const now = new Date().toISOString();
    console.log(
      `[${now}][${fileLine}][主线:${action}][${moduleName}][${subAction}]`
    );
  }

  function requireElement(id) {
    // 强制校验关键节点存在，避免静默失败导致线上行为不可预测。
    const node = document.getElementById(id);
    if (!node) {
      throw new Error(`页面缺少按钮：未找到 id=${id}`);
    }
    return node;
  }

  printTrace("index-page.js:1", "初始化", "首页教程按钮", "读取站点配置");
  const cfg = window.SOFTTALK_SITE_CONFIG || {};
  const tutorialUrl = cfg.tutorialUrl;
  if (!tutorialUrl) {
    throw new Error("站点配置缺失：请在 site.config.js 中配置「tutorialUrl」");
  }

  printTrace("index-page.js:2", "初始化", "首页教程按钮", "绑定跳转地址");
  const tutorialButton = requireElement("btn-tutorial");
  tutorialButton.href = tutorialUrl;

  printTrace("index-page.js:3", "初始化", "首页教程按钮", "初始化完成");
})();
