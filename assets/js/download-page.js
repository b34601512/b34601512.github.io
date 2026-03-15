(async function () {
  function printTrace(fileLine, action, moduleName, subAction) {
    // 统一输出调试链路日志，出现异常时可以直接定位到初始化步骤。
    const now = new Date().toISOString();
    console.log(
      `[${now}][${fileLine}][主线:${action}][${moduleName}][${subAction}]`
    );
  }

  function requireElement(id) {
    // 强制校验关键 DOM 节点存在，避免下载区块静默失效。
    const node = document.getElementById(id);
    if (!node) {
      throw new Error(`下载页结构缺失：未找到 id=${id}`);
    }
    return node;
  }

  function resolvePrimaryAsset(release) {
    // 从 release 里选择主安装包资源，确保按钮永远指向真实资产。
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const primary = assets.find(
      (item) =>
        typeof item.browser_download_url === "string" &&
        item.browser_download_url
    );
    if (!primary) {
      throw new Error(`发布资产缺失：${release.tag_name || "未知版本"} 没有可下载文件`);
    }
    return primary;
  }

  function formatDate(dateText) {
    // 统一把 GitHub 时间戳转为 YYYY-MM-DD 文案，保证展示一致。
    const date = new Date(dateText);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`发布时间格式无效：${dateText}`);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function buildInstallFileName(assetName) {
    // 通过 zip 包名推导安装程序名称，保持页面提示与下载文件一致。
    if (typeof assetName !== "string" || !assetName) {
      throw new Error("发布资产名称无效：无法推导安装程序文件名");
    }
    return assetName.replace(/\.zip$/i, ".exe");
  }

  printTrace("download-page.js:1", "初始化", "下载页", "读取站点配置");
  const cfg = window.SOFTTALK_SITE_CONFIG || {};
  const source = cfg.releaseSource;
  if (!source || !source.owner || !source.repo) {
    throw new Error(
      "站点配置缺失：请在 site.config.js 中配置「releaseSource.owner/repo」"
    );
  }

  const historyLimit = Number(source && source.historyLimit);
  if (!Number.isInteger(historyLimit) || historyLimit < 1) {
    throw new Error(
      "站点配置错误：releaseSource.historyLimit 必须是大于等于 1 的整数"
    );
  }

  const apiUrl = `https://api.github.com/repos/${source.owner}/${source.repo}/releases?per_page=20`;
  printTrace("download-page.js:2", "初始化", "下载页", "请求 GitHub 发布列表");
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) {
    throw new Error(`获取发布列表失败：HTTP ${response.status}`);
  }

  const releaseList = await response.json();
  if (!Array.isArray(releaseList)) {
    throw new Error("GitHub 返回格式异常：releases 不是数组");
  }

  const onlineReleases = releaseList.filter(
    (item) => item && item.draft === false && item.prerelease === false
  );
  if (onlineReleases.length === 0) {
    throw new Error("发布列表为空：当前仓库没有可用正式版");
  }

  printTrace("download-page.js:3", "初始化", "下载页", "渲染最新版下载信息");
  const latestRelease = onlineReleases[0];
  const latestAsset = resolvePrimaryAsset(latestRelease);
  const latestVersionNode = requireElement("latest-version");
  const latestLinkNode = requireElement("latest-download-link");
  const latestDateNode = requireElement("latest-release-date");
  const latestSetupNode = requireElement("latest-setup-name");
  latestVersionNode.textContent = latestRelease.tag_name;
  latestLinkNode.href = latestAsset.browser_download_url;
  latestDateNode.textContent = formatDate(
    latestRelease.published_at || latestRelease.created_at
  );
  latestSetupNode.textContent = buildInstallFileName(latestAsset.name);

  printTrace("download-page.js:4", "初始化", "下载页", "渲染历史版本列表");
  const historyTitleNode = requireElement("history-title");
  const historyListNode = requireElement("history-list");
  const historyReleases = onlineReleases.slice(1, 1 + historyLimit);
  historyTitleNode.textContent = `历史版本下载（最近 ${historyReleases.length} 个旧版本）`;
  historyListNode.innerHTML = "";

  for (const release of historyReleases) {
    const asset = resolvePrimaryAsset(release);
    const link = document.createElement("a");
    link.href = asset.browser_download_url;
    link.download = "";
    link.textContent = `下载 ${release.tag_name}（${formatDate(
      release.published_at || release.created_at
    )}）`;
    historyListNode.appendChild(link);
  }

  printTrace("download-page.js:5", "初始化", "下载页", "初始化完成");
})().catch((error) => {
  const now = new Date().toISOString();
  console.error(
    `[${now}][download-page.js:999][主线:异常][下载页][初始化失败] ${error.message}`
  );
  throw error;
});
