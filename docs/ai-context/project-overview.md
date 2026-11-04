# 官网目标、技术形态与模块结构

> 从原根 CLAUDE.md 按主题拆出；只在本主题发生变化时读取和修改。

## 项目目标

商业项目「话术精灵 SoftTalk」的官方网站，用来介绍 Windows 客户端、公开价格、提供联系方式，并把访客引向下载页与知识库教程。

三张正式页面：

- `index.html`：首页。极简介绍 + 可交互演示（紧跟首屏）；不写功能罗列、不放截图、不放常见问题。
- `why.html`：问题与解法页（SEO 长尾主阵地）。issue #6 起正文砍掉、换成一条 40 秒竖屏短片（`assets/js/why-film.js`，1080×1920，Canvas 现画 + Web Audio 现合成）：多平台多店铺、改一句话术每家店都要改 → 话术精灵只改一次、所有店铺都能用 →「节约时间，快速高效率」→ 片尾作者微信。第 0 帧就是问题「改一句话术，要改 20 次？」（刷短视频的人 1 秒内要知道讲什么）；远景/特写靠镜头关键帧切换，手机上字要读得清。爬虫看的是 `noscript` 里那段原文。不要再把三条问题、对比表这类正文加回来。
- `pricing.html`：定价页。本地免费与云端按工号付费的价格表、云端包含的能力。
- `guide.html`：怎么用。45 秒操作演示短片，外加同样五步的文字。
- `contact.html`：联系页。作者微信与邮箱，点击整行复制。
- `404.html`：未知地址。

内容原则（重构时定下的基调，后续新增内容也要遵守）：

- 极简、少即是多。黑夜是纯黑底，白天是暖白纸面。宁可删掉一块，也不要再堆一块。
- 一个信息只说一次：首页讲产品与演示，定价页讲价格，联系页讲联系方式，页脚只留版权与备案。
- 不用 emoji 当图标，不用卡片阴影、渐变、光斑、多层圆角。分隔靠 1px 细线。
- 数字、链接入口必须可点、可复制；不要在页面上放不可交互的装饰。

## 技术形态

- 静态站点：HTML5 + CSS3 + 原生 JavaScript（ES2022），无框架、无构建工具链。
- 构建脚本：Node.js ES Module（`.mjs`），只用 Node 自带模块，无第三方依赖。
- 没有 `package.json`、锁文件和 `node_modules`，克隆后不需要 `npm install`。
- 没有后端、数据库、接口请求、登录或服务端存储。
- 发布：GitHub Pages，域名 `https://luyao2089.cc`（`CNAME` 绑定），仓库根目录即发布目录。
- 已验证环境：Node.js `v24.19.0`；本地预览用 Python `3.10.11` 的静态文件服务器。

根目录三张 HTML 与 `sitemap.xml` 都是构建产物，**不要手改**；改 `src/site/` 后运行构建脚本。

`404.html` 也是构建产物（`src/site/pages/not-found.mjs`，登记在 `pages.mjs` 的 `extraPages`：生成、自检，但不进导航和 sitemap）。GitHub Pages 会在任意错误地址下原样返回它，所以它的 head 必须保留 `<base href="/">`，否则在 `/a/b/` 这类路径下相对资源全部失效。

## 模块结构

```text
D:\SoftTalk官网
├─ src\site\
│  ├─ site-data.mjs          全站唯一数据源：域名、产品名、下载/教程链接、联系方式、版权、备案
│  ├─ pages.mjs              页面清单：sitePages（导航+sitemap）/ blogPages / extraPages / allPages / sitemapPages
│  ├─ blog\
│  │  ├─ markdown.mjs        博客用的 Markdown 子集解析（零依赖）
│  │  └─ posts.mjs           读 content/blog/ + slugs.json，解析文章头、摘要、排序
│  ├─ seo.mjs                每页 head 的 SEO/分享元数据与 JSON-LD（对象经 JSON.stringify 输出，不手拼 JSON）
│  ├─ layout.mjs             公共骨架：head 基础项、首屏主题脚本、导航（含主题切换按钮）、页脚
│  └─ pages\
│     ├─ index.mjs           首页 head（SEO/JSON-LD）+ 主体 + 演示脚本引用
│     ├─ why.mjs             解决什么问题页（H1 + 竖屏短片 + 三个按钮；noscript 里留短片原文）
│     ├─ pricing.mjs         定价页 head + 价格表
│     ├─ blog.mjs            博客列表页 + 文章页模板（root: "/"，站内链接走根路径）
│     └─ contact.mjs         联系页 head + 复制脚本
├─ scripts\
│  ├─ build-site.mjs         生成根目录四张 HTML 与 sitemap.xml
│  ├─ check-site.mjs         站点自检（见“自动检查”）
│  ├─ optimize-images.py     用客户端手绘绘制代码导出 logo/favicon/类型角标（仅本地需要 PySide6）
│  └─ build-og-image.py      生成分享缩略图 assets/og.png（1200×630）
├─ assets\
│  ├─ css\site.css           全站唯一样式入口（变量/基础/导航/组件/区块/页脚/响应式）
│  ├─ css\demo.css           首页交互演示样式（复刻客户端白色主题）
│  ├─ js\demo-data.js        演示话术数据 + 话术行/分类树标记（浏览器与构建脚本共用一份）
│  ├─ js\demo.js             首页演示交互（渲染 + 模拟发送，数据从 demo-data.js 取）
│  ├─ js\theme.js            白天/黑夜切换按钮（记住选择、圆形铺开动画）
│  ├─ js\guide-film.js       「怎么用」页的 45 秒演示短片（DOM 舞台 + 按秒驱动的时间线；播放器是与宣传片共用的 film-engine.js）
│  ├─ css\guide.css          「怎么用」页播放器与步骤样式
│  ├─ css\guide-film.css     演示短片舞台：聊天窗/主界面/吸附栏（数值照抄 demo.css）、鼠标、按键提示、字幕
│  ├─ js\contact.js          联系页点击复制
│  ├─ logo.png               112×126 手绘小精灵（首屏 56px，8.5 KB）
│  ├─ logo-small.png         52×58 手绘小精灵（导航 24px、演示区底栏 26px，2.6 KB）
│  ├─ favicon.png            64×64 手绘小精灵（2.8 KB）
│  ├─ type-text.png          28×28 话术类型角标（纯文本）
│  ├─ type-image.png         28×28 话术类型角标（带图片）
│  ├─ type-pdf.png           28×28 话术类型角标（带文件）
│  ├─ og.png                 1200×630 微信/QQ 分享缩略图（96 KB）
│  └─ beian.png              公安备案图标（16px 显示）
├─ content\blog\            博客原稿 .md + slugs.json（文件名→slug）+ README.md（给钟灵的说明）
├─ blog\                    构建产物：blog/index.html 与 blog/<slug>/index.html
├─ index.html / why.html / pricing.html / contact.html   构建产物
├─ sitemap.xml               构建产物，由页面清单生成
├─ robots.txt                抓取规则，指向 sitemap
├─ CNAME                     GitHub Pages 自定义域名
├─ README.md                 对外说明（预览、修改、图片）
└─ CLAUDE.md                 本文件
```

页面模块写 HTML 时直接 `import { siteData }` 拼字符串，**不使用占位符替换**（旧版的 `{{downloadUrl}}` 机制已移除，不要再引入）。
