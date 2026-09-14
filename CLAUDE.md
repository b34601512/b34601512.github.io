# 话术精灵 SoftTalk · 官网项目档案

> 更新时间：2026-09-15（演示区按真实客户端复刻 + 全站提亮配色）
> 项目目录：`D:\SoftTalk官网`

## 项目目标

商业项目「话术精灵 SoftTalk」的官方网站，用来介绍 Windows 客户端、公开价格、提供联系方式，并把访客引向下载页与知识库教程。

三张正式页面：

- `index.html`：首页。极简介绍 + 可交互演示 + 真实界面截图 + 功能 + 常见问题。
- `pricing.html`：定价页。本地免费与云端按工号付费的价格表、云端包含的能力。
- `contact.html`：联系页。作者微信与邮箱，点击整行复制。

内容原则（重构时定下的基调，后续新增内容也要遵守）：

- 极简、纯黑、少即是多。宁可删掉一块，也不要再堆一块。
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

## 模块结构

```text
D:\SoftTalk官网
├─ src\site\
│  ├─ site-data.mjs          全站唯一数据源：域名、产品名、下载/教程链接、联系方式、版权、备案
│  ├─ layout.mjs             公共骨架：head 基础项、导航、页脚；导航由页面清单自动生成
│  └─ pages\
│     ├─ index.mjs           首页 head（SEO/JSON-LD）+ 主体 + 演示脚本引用
│     ├─ pricing.mjs         定价页 head + 价格表
│     └─ contact.mjs         联系页 head + 复制脚本
├─ scripts\
│  ├─ build-site.mjs         生成根目录三张 HTML 与 sitemap.xml
│  ├─ check-site.mjs         站点自检（见“自动检查”）
│  └─ optimize-images.py     图片压缩（仅本地需要 Pillow，站点运行不依赖 Python）
├─ assets\
│  ├─ css\site.css           全站唯一样式入口（变量/基础/导航/组件/区块/页脚/响应式）
│  ├─ css\demo.css           首页交互演示样式（复刻客户端白色主题）
│  ├─ js\demo.js             首页演示数据 + 渲染 + 模拟发送
│  ├─ logo.png               168×187 调色板 PNG（1.3 KB）
│  ├─ favicon.png            128×128 调色板 PNG（2.2 KB）
│  ├─ screenshot.webp        975×819 有损 WebP，质量 82（64 KB）
│  ├─ type-text.png          28×28 话术类型角标（纯文本）
│  ├─ type-image.png         28×28 话术类型角标（带图片）
│  ├─ type-pdf.png           28×28 话术类型角标（带文件）
│  └─ beian.png              公安备案图标（16px 显示）
├─ index.html / pricing.html / contact.html   构建产物
├─ sitemap.xml               构建产物，由页面清单生成
├─ robots.txt                抓取规则，指向 sitemap
├─ CNAME                     GitHub Pages 自定义域名
├─ README.md                 对外说明（预览、修改、图片）
└─ CLAUDE.md                 本文件
```

页面模块写 HTML 时直接 `import { siteData }` 拼字符串，**不使用占位符替换**（旧版的 `{{downloadUrl}}` 机制已移除，不要再引入）。

## 设计规范

设计变量集中在 `assets/css/site.css` 顶部，改色只改这里：

| 变量 | 值 | 用途 |
| --- | --- | --- |
| `--bg` | `#000` | 页面背景，纯黑 |
| `--surface` / `--surface-2` | `#0d0c0b` / `#1a1815` | 面板与控件底色（微暖，和纯黑背景拉开层次） |
| `--fg` | `#f5f5f5` | 主文字 |
| `--fg-muted` / `--fg-dim` | `#b8b8b8` / `#8c8c8c` | 次级文字、说明与占位（小字提示必须 ≥ `--fg-dim`，否则看不清） |
| `--line` / `--line-strong` | `#262626` / `#3f3f3f` | 细线分隔、可交互描边 |
| `--accent` / `--accent-soft` | `#ff6b2c` / `rgba(255,107,44,.1)` | 品牌橙：标题高亮、小标签、主按钮底、选中态、焦点圈、价格推荐档 |
| `--ok` | `#3ddc84` | 仅用于状态点（客户端演示区的在线绿点） |
| `--width` | `1000px` | 内容最大宽度 |
| `--mono` | 系统等宽字体 | 价格、编号、套号 |

约定：

- 主按钮是「橙底黑字」（`.btn--primary`），次级按钮是细描边（`.btn--ghost`，hover 变橙描边橙字）。
- 区块用 `.section`（顶部 1px 细线 + 上下留白）分隔，内容包在 `.wrap` 里；区块标题上方有一道橙色短线（`.section h2::before`）。
- 正文以白/浅灰为主，橙色只做强调：小标签、标题关键词、选中态、按钮；不要用它铺大面积色块。
- 正文里的小字提示（如「点击复制」）用橙色，比灰色更容易看见。
- 首页演示（`demo.css` + `demo.js`）的类名、元素 ID 是一套契约：改一边必须改另一边；`check-site.mjs` 会拦住不一致。
- 动效只用一次性的轻微上浮（`@keyframes rise`）与消息入场（`@keyframes msg-in`），并尊重 `prefers-reduced-motion`。

### 演示区＝客户端复刻

首页演示区不是自创 UI，而是客户端主界面的复刻，配色与结构以客户端代码为准，改之前先看客户端：

- 配色唯一来源：`D:\SoftTalk\softtalk_shared\knowledge_main_visual_theme.py`（白色主题），映射到 `demo.css` 里的 `--w-*` 变量。
- 结构对应：标题栏（磁吸/置顶/最小化）→ 团队话术/个人话术/离线话术页签（云域页签底部蓝线 `--w-cloud`）→ 0-9 套号 → 一级分类标签（浅底胶囊 + 选中暗红下划线）→ 二级分类（`--w-lv2-bg` 蓝底行）→ 话术行（题红字 `--w-title-fg` + 灰答案）→ 常用短语 → 搜索行（`Alt+Q 定位搜索栏` + 范围按钮）→ 底栏官网文案 + 小精灵。
- 一级分类色板取自 `softtalk_knowledge_client/lv1_color_presets.py` 的浅色组；话术类型角标取自客户端 `platform_images/script-*.png`。
- 左侧聊天窗口按微信风格（`--wx-*` 变量）：灰底、白色收到的气泡、绿色 `#95ec69` 发出的气泡。
- 演示区仍是假数据，只用于展示操作路径：页签切换话术域、套号/分类切换、二级分类展开收起、单击选中、双击贴话术到输入框、点行左侧纸飞机直接发送（粘贴 + 回车，与客户端 `list_box.py` 的 `insert_dbl`/`send` 一致）、聊天窗口自己的发送按钮发出、常用短语直发、搜索（全部范围，结果带路径）、客户自动回复、重置。
- 聊天输入框是真实的 `<textarea id="demo-input">`（不是假 div）：双击话术是填入而不是锁定，访客可以直接改字、自己打字；回车换行、Ctrl/Cmd+Enter 发送，多行时自动长高（最高 76px 后内部滚动）。改样式时别把它写回固定高度或去掉 `resize: none`。

## 数据流

构建时：

1. `scripts/build-site.mjs` 依次读取 `indexPage`、`pricingPage`、`contactPage`。
2. 每个页面模块从 `site-data.mjs` 取公共数据，拼出自己的 `head` 与 `main`。
3. `layout.mjs` 用页面清单生成导航（当前页高亮 `aria-current="page"`）、页脚与完整 HTML。
4. 构建脚本写出三张 HTML，并按页面清单生成 `sitemap.xml`（首页用站点根地址，其余用绝对地址）。

浏览器运行时（没有任何后端请求）：

- 首页加载 `demo.js`：演示数据都在文件内，切换团队/个人/离线话术、切套号与一级分类、折叠二级分类、搜索、单击选中回显、双击或回车发送、常用短语直发、模拟客户回复、重置，全部只改当前页面内存。
- 联系页点击整行调用 `navigator.clipboard` 复制；失败时提示手动选中（非安全上下文下会失败，属预期）。
- 下载、教程、备案是普通外链。

## 运行测试

### 生成与自检

```powershell
cd 'D:\SoftTalk官网'
node .\scripts\build-site.mjs
node .\scripts\check-site.mjs
```

`check-site.mjs` 检查这些内容，任何一条不通过就以非 0 退出：

1. 三张 HTML 与源文件的生成结果完全一致（防止手改产物）。
2. 没有残留的 `{{占位符}}`。
3. HTML/JS 用到的类名都在对应 CSS 里有定义（防止新旧样式混用导致的裸奔元素）。
4. CSS 里定义的类名都被用到（防止旧设计的死规则残留，只有警告不算错误）。
5. JS 里 `getElementById`/`$()` 引用的 ID 在 HTML 或 JS 动态创建中存在。
6. `assets/` 引用都存在。
7. `sitemap.xml` 覆盖所有页面。

### 语法检查

```powershell
$files = @(
  '.\scripts\build-site.mjs', '.\scripts\check-site.mjs',
  '.\src\site\layout.mjs', '.\src\site\site-data.mjs',
  '.\src\site\pages\index.mjs', '.\src\site\pages\pricing.mjs', '.\src\site\pages\contact.mjs',
  '.\assets\js\demo.js'
)
foreach ($file in $files) { node --check $file; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
```

### 本地预览

```powershell
python -m http.server 8000
```

打开 http://localhost:8000/ 。注意 Python 3.10 的 `http.server` 不认 `.webp`，本地预览会以 `application/octet-stream` 返回，浏览器仍能正常显示；GitHub Pages 会返回正确的 `image/webp`。

### 浏览器验收清单

- 三张页面都能打开，导航互相跳转，当前页有下划线，图片与样式完整。
- 首页演示：切团队/个人/离线话术（页签蓝线跟动）、点套号与一级分类切换、二级分类展开收起、搜索（结果带路径、无结果提示、Esc 退出）、单击选中（不贴话术）、双击把话术贴进聊天输入框（不直接发送、输入框获得焦点）、双击后手动改字再发送发的是改后的内容、输入框回车换行 / Ctrl+Enter 发送 / 多行自动长高、点话术行左侧纸飞机直接发送并出现绿色气泡与客户回复、常用短语直接发送、连发多条不会丢消息也不会重复回复、聊天窗口发送按钮能发出输入框里的内容、重置后回到初始状态且没有残留气泡。
- 首页演示窗口在小屏（≤900px）改为上下堆叠，仍可完整操作，无横向溢出。
- 首页截图（WebP）正常显示，无横向滚动条。
- 联系页点击微信/邮箱整行能复制并弹出「已复制」。
- 缩到手机宽度（约 375px）时无横向溢出。

## 图片管线

`scripts/optimize-images.py`（本地 Pillow）负责压图，产物已提交，日常改版不需要重跑：

```powershell
git show <旧提交>:assets/logo.png > logo-src.png
git show <旧提交>:assets/screenshot2.png > shot-src.png
python scripts\optimize-images.py logo-src.png shot-src.png D:\SoftTalk\platform_images
```

- `logo.png`：168×187（显示最大 56px，约 3 倍图），32 色调色板，343 KB → 1.3 KB。
- `favicon.png`：128×128，居中留白，2.2 KB。
- `screenshot.webp`：975×819，质量 82，172 KB → 64 KB；截图里的文字在 2 倍放大下与原图无可辨差异。
- `type-text.png` / `type-image.png` / `type-pdf.png`：28×28 调色板 PNG，共约 2 KB，取自客户端 `platform_images/script-*.png`，只给演示区话术行做类型角标。
- 首页截图直接引用 `.webp`，不提供 PNG 回退（现代浏览器均支持）。若将来必须兼容老浏览器，用 `<picture>` 加一条 PNG 源，不要改成双份 `<img>`。
- 截图 `<img>` 必须保留 `width`/`height` 与 `loading="lazy"`，避免布局抖动。

## 部署

仓库内没有 CI/CD 配置，GitHub Pages 的分支与目录在仓库设置里，不在代码里。流程：

1. `node scripts/build-site.mjs`（生成产物）
2. `node scripts/check-site.mjs`（必须通过）
3. 本地预览确认
4. 提交并推送 `main`，等待 Pages 自动重新发布

## 已知事项

- 对外文案（首页卖点、定价页权益、FAQ）必须与客户端实际行为一致，改动前先看客户端：
  - 双击话术行 = **仅粘贴到聊天输入框**（客户端的 `insert_dbl`）；点话术行左侧纸飞机 = **直接发送（粘贴 + 回车）**。不要写成「双击直接发送」。
  - 全局快捷键默认 Alt+Q 定位搜索框、Alt+W 显示/隐藏话术库、Alt+R 磁吸（见客户端 `config_store_pkg/models.py`）。
  - 三个话术域叫「团队话术 / 个人话术 / 离线话术」（`sync_scope_constants.py`）；云端权益是云同步、工号协作、云附件（`membership_access.py`）。
  - 注册团队账号赠送 1 个月会员（`key/register_dialog_pkg/constants.py` 的 `REGISTER_GIFT_MONTHS`）。
  - 下载/更新页与使用帮助链接以客户端 `softtalk_shared/source_config.py` 的 `APP_UPDATE_URL`/`APP_USAGE_HELP_URL` 为准。
- `.claude/worktrees/elastic-mendel-b22c35` 是历史工具留下的 git worktree（旧版网站副本），不是当前源码；`.claude/`、`.pi/` 已加入 `.gitignore`，不要提交。
- `assets/js/demo.js` 里的客服话术、分类、文件全是演示假数据，与真实客户端数据无关；但界面结构与配色要和客户端保持一致（见「演示区＝客户端复刻」）。
- 首页 FAQ 文案与 JSON-LD 里的 `FAQPage` 必须保持一致；改一处要同步另一处。
- 目前没有自动化测试框架，`check-site.mjs` 就是回归测试入口；改动演示后建议按上面的验收清单在浏览器里跑一遍。
