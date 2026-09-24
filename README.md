# 话术精灵 SoftTalk 官网

极简纯黑风格的静态官网，部署在 GitHub Pages。

- 线上地址：https://luyao2089.cc
- 源码仓库：https://github.com/b34601512/b34601512.github.io
- 页面：首页 `index.html`、解决什么问题 `why.html`、定价 `pricing.html`、联系 `contact.html`

## 本地预览

```powershell
cd 'D:\SoftTalk官网'
python -m http.server 8000
```

然后打开 http://localhost:8000/ （按 `Ctrl+C` 停止）。

## 修改与生成

根目录的四张 HTML 是构建结果，不要直接手改；改 `src/site/` 后重新生成。

```powershell
node .\scripts\build-site.mjs   # 生成四张 HTML 与 sitemap.xml
node .\scripts\check-site.mjs   # 自检：类名、元素 ID、资源路径、构建一致性
```

- 文案与页面结构：`src/site/pages/*.mjs`
- 公共信息（域名、链接、联系方式、备案）：`src/site/site-data.mjs`
- 样式：`assets/css/site.css`；首页交互演示：`assets/css/demo.css`
- 首页演示逻辑：`assets/js/demo.js`（演示区按真实客户端主界面复刻，配色取自客户端主题文件）
- SEO：关键词与元数据方案写在 `CLAUDE.md` 的「SEO」小节（关键词矩阵 → 页面对照、title/description 规则）

## 图片

站点上的小精灵（`logo.png` / `logo-small.png` / `favicon.png`）与话术类型角标 `type-*.png` 用客户端的手绘绘制代码导出，共约 18 KB；分享缩略图 `og.png` 约 100 KB。
需要重新生成时使用 `scripts/optimize-images.py brand|type-icons D:\SoftTalk`（依赖本地 PySide6）与 `scripts/build-og-image.py`（分享图，依赖本地 Pillow），站点运行不依赖 Python。
