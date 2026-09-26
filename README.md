# 话术精灵 SoftTalk 官网

静态官网，部署在 GitHub Pages。

- 线上地址：https://luyao2089.cc
- 源码仓库：https://github.com/b34601512/b34601512.github.io
- 页面：首页 `index.html`、解决什么问题 `why.html`、怎么用 `guide.html`、定价 `pricing.html`、联系 `contact.html`，另有 `404.html`
- 配色有两套：黑夜是纯黑底，白天是暖白纸面。演示区仍按客户端主界面复刻。

## 本地预览

```powershell
cd 'D:\SoftTalk官网'
python -m http.server 8000
```

然后打开 http://localhost:8000/ 。

## 修改与生成

根目录的 HTML 是构建结果，不要直接手改。改 `src/site/` 后重新生成。

```powershell
node .\scripts\build-site.mjs
node .\scripts\check-site.mjs
```

- 文案与页面结构：`src/site/pages/*.mjs`
- 公共信息（域名、链接、联系方式、备案）：`src/site/site-data.mjs`
- 样式：`assets/css/site.css`；首页交互演示：`assets/css/demo.css`
- 首页演示：`assets/js/demo.js`
- 没有 `package.json`，不需要 `npm install`

## 图片

站点上的小精灵和话术类型角标用客户端的手绘代码导出。需要重新生成时使用 `scripts/optimize-images.py`（依赖本地 PySide6）与 `scripts/build-og-image.py`（依赖本地 Pillow）。站点运行不依赖 Python。
