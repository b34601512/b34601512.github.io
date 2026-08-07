# 话术精灵·官网项目档案

> 建档时间：2026-08-07 11:34:06 +08:00（Asia/Shanghai）
> 项目目录：`D:\SoftTalk官网`

## 项目目标

这是商业项目「话术精灵 SoftTalk」的官方网站，用来向电商客服团队介绍产品、展示实际使用效果、公开价格和联系方式，并把访客引导到 Windows 客户端下载页与知识库教程。

网站现在有三张正式页面：

- `index.html`：首页，介绍产品、功能、常见问题，并提供一个纯浏览器交互演示。
- `pricing.html`：定价页，说明免费功能、云端协作功能和各档价格。
- `contact.html`：联系页，展示作者与客服微信号，点击卡片可以复制微信号。

## 技术形态

- 项目形态：静态官网，不是前后端分离项目，也没有后端服务。
- 页面技术：HTML5、CSS3、原生 JavaScript，没有 React、Vue 等前端框架。
- 构建技术：Node.js 的 ES Module（`.mjs`）脚本，只使用 Node 自带模块，没有第三方依赖。
- 依赖管理：没有 `package.json` 和锁文件，第一次运行不需要执行 `npm install`。
- 数据能力：没有数据库、登录、接口请求或服务端存储。首页演示数据都写在 `assets/js/demo.js` 中，只存在当前浏览器页面的内存里，刷新页面就会复原。
- 发布方式：`README.md` 说明网站由 GitHub Pages 托管，线上域名是 `https://luyao2089.cc`，`CNAME` 负责绑定该域名。
- 部署配置：仓库里没有 GitHub Actions、Docker、Vercel、Netlify 等部署配置，也没有单独的部署命令。GitHub Pages 使用哪个分支和目录发布，需要到仓库的 Pages 设置中确认。
- 当前已验证环境：Node.js `v22.17.1`；本地预览使用 Python `3.10.11` 自带的静态文件服务器。

根目录的三张 HTML 是构建结果，不是首选维护入口。改文案、页面结构或公共信息时，应先改 `src/site/`，再运行构建脚本生成 HTML；不要长期同时手改源文件和生成后的 HTML，否则两边会不一致。

## 模块结构

```text
D:\SoftTalk官网
├─ src\site\
│  ├─ site-data.mjs          全站公共数据：域名、下载/教程链接、微信号、备案和导航
│  ├─ layout.mjs             公共页面骨架：head、导航、页脚、占位符替换
│  └─ pages\
│     ├─ index.mjs           首页内容和 SEO 信息
│     ├─ pricing.mjs         定价页内容和 SEO 信息
│     └─ contact.mjs         联系页内容、SEO 信息和复制微信号脚本
├─ scripts\
│  └─ build-site.mjs         把页面源文件生成到根目录三张 HTML
├─ assets\
│  ├─ css\
│  │  ├─ site.css            全站样式总入口，继续导入基础、组件、页面和响应式样式
│  │  └─ demo.css            首页交互演示专用样式
│  ├─ js\demo.js             首页演示数据、页面状态、搜索、切换和模拟发送逻辑
│  ├─ logo.png               产品标志
│  ├─ screenshot.png         客户端截图
│  └─ screenshot2.png        客户端与聊天窗口并排截图
├─ index.html                构建生成的首页，也是 GitHub Pages 默认入口
├─ pricing.html              构建生成的定价页
├─ contact.html              构建生成的联系页
├─ CNAME                     GitHub Pages 自定义域名
├─ robots.txt                搜索引擎抓取规则
├─ sitemap.xml               三张正式页面的站点地图
├─ 备案图标.png              页脚公安备案图标
└─ README.md                 项目和线上地址的简要说明
```

补充说明：

- `assets/css/site.css` 是公共样式入口；首页还会额外加载 `assets/css/demo.css`。
- `.claude/worktrees/` 是工具留下的辅助工作树，不是当前官网的正式源码，摸底和维护时不要把里面的旧文件当成主项目文件。
- `全仓代码重构审计索引.txt` 是历史审计记录，其中提到的个别旧文件已经不在当前主项目里，不能把它当成现在的运行清单。

## 数据流

构建时的数据流很简单：

1. `src/site/site-data.mjs` 提供全站共用的域名、导航、下载地址、教程地址、联系方式和备案信息。
2. `src/site/pages/*.mjs` 分别提供三张页面自己的标题、SEO 信息、主体内容和页面专属脚本。
3. `src/site/layout.mjs` 把公共数据、公共导航、页脚和单页内容拼成完整 HTML，并替换 `{{siteUrl}}`、`{{downloadUrl}}` 等占位符。
4. `scripts/build-site.mjs` 调用公共布局，把结果写成根目录的 `index.html`、`pricing.html` 和 `contact.html`。
5. GitHub Pages 直接把根目录 HTML、CSS、JavaScript 和图片作为静态文件交给浏览器。

浏览器运行时没有后端数据流：

- 首页加载 `assets/js/demo.js` 后，在浏览器内存中维护演示状态；分类切换、搜索、模拟发送和重置都只改当前页面，不会上传或保存数据。
- 联系页调用浏览器的剪贴板能力复制微信号，不会把信息提交到服务器。
- 下载、教程和备案入口只是普通外链，分别跳往金山文档或备案网站。
- 定价页是纯展示页，没有下单、支付或账号接口。

## 运行测试

### 本地生成页面

在 PowerShell 中进入项目目录后运行：

```powershell
cd 'D:\SoftTalk官网'
node .\scripts\build-site.mjs
```

这条命令会直接覆盖根目录的三张 HTML。只改 `src/site/` 后再运行它；如果只是预览当前已有页面，可以跳过这一步。

### 本地打开网站

不要直接双击 HTML，建议在项目根目录启动本地静态服务器：

```powershell
cd 'D:\SoftTalk官网'
python -m http.server 8000
```

然后用浏览器打开 `http://localhost:8000/`。预览结束后，在运行命令的窗口按 `Ctrl+C` 停止服务器。这里的 Python 只负责把静态文件送给浏览器，不是项目后端。

### 自动检查

项目目前没有自动化测试框架。可以先用 Node 自带的语法检查确认所有脚本能解析：

```powershell
$files = @(
  '.\scripts\build-site.mjs',
  '.\src\site\layout.mjs',
  '.\src\site\site-data.mjs',
  '.\src\site\pages\index.mjs',
  '.\src\site\pages\pricing.mjs',
  '.\src\site\pages\contact.mjs',
  '.\assets\js\demo.js'
)

foreach ($file in $files) {
  node --check $file
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
```

2026-08-07 建档时，上述脚本全部通过语法检查，三张根目录 HTML 也都与源文件的生成结果完全一致。

### 浏览器验收

本地打开后至少检查这些内容：

- 首页、定价页、联系页都能打开，导航能互相跳转，图片和样式没有丢失。
- 首页演示能切换团队话术、个人话术、本地文件和不同套号；搜索、单击选中、双击发送、快捷短语、重置都能工作。
- 定价、下载、教程、备案信息和外链内容正确。
- 联系页点击两个微信卡片都能复制，并出现“已复制”提示。
- 缩窄浏览器窗口后，导航、卡片、按钮和首页演示仍能正常显示。

### 部署

当前仓库没有可执行的部署命令。正式页面是根目录的三张 HTML，发布前应先运行构建和本地验收；之后由仓库外部的 GitHub Pages 设置负责上线。
