# 话术精灵 SoftTalk · 官网项目档案

> 更新时间：2026-09-15（演示区按真实客户端复刻 + 全站提亮配色）
> 项目目录：`D:\SoftTalk官网`

## 项目目标

商业项目「话术精灵 SoftTalk」的官方网站，用来介绍 Windows 客户端、公开价格、提供联系方式，并把访客引向下载页与知识库教程。

三张正式页面：

- `index.html`：首页。极简介绍 + 可交互演示（紧跟首屏）；不写功能罗列、不放截图、不放常见问题。
- `why.html`：问题与解法页（SEO 长尾主阵地，**短页**：三个真实问题一句话一条 + 解法一段 + 对比表两行）。
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
│     ├─ why.mjs             解决什么问题页（短页：三条问题 + 十套模块解法 + 对比表）
│     ├─ pricing.mjs         定价页 head + 价格表
│     └─ contact.mjs         联系页 head + 复制脚本
├─ scripts\
│  ├─ build-site.mjs         生成根目录四张 HTML 与 sitemap.xml
│  ├─ check-site.mjs         站点自检（见“自动检查”）
│  ├─ optimize-images.py     图片压缩（仅本地需要 Pillow，站点运行不依赖 Python）
│  └─ build-og-image.py      生成分享缩略图 assets/og.png（1200×630）
├─ assets\
│  ├─ css\site.css           全站唯一样式入口（变量/基础/导航/组件/区块/页脚/响应式）
│  ├─ css\demo.css           首页交互演示样式（复刻客户端白色主题）
│  ├─ js\demo-data.js        演示话术数据 + 话术行/分类树标记（浏览器与构建脚本共用一份）
│  ├─ js\demo.js             首页演示交互（渲染 + 模拟发送，数据从 demo-data.js 取）
│  ├─ logo.png               168×187 调色板 PNG（1.3 KB）
│  ├─ favicon.png            128×128 调色板 PNG（2.2 KB）
│  ├─ type-text.png          28×28 话术类型角标（纯文本）
│  ├─ type-image.png         28×28 话术类型角标（带图片）
│  ├─ type-pdf.png           28×28 话术类型角标（带文件）
│  ├─ og.png                 1200×630 微信/QQ 分享缩略图（96 KB）
│  └─ beian.png              公安备案图标（16px 显示）
├─ index.html / why.html / pricing.html / contact.html   构建产物
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
- 首页首屏下方直接是可交互演示（主界面 + 聊天窗口 + 底部吸附栏），之后就是页脚（不再有「三步用起来」、截图、功能卡与常见问题）。加内容优先往演示区里做，不要再往首屏下塞过渡性小节或复述型文案。
- 区块用 `.section`（顶部 1px 细线 + 上下留白）分隔，内容包在 `.wrap` 里；区块标题上方有一道橙色短线（`.section h2::before`）。
- 正文以白/浅灰为主，橙色只做强调：小标签、标题关键词、选中态、按钮；不要用它铺大面积色块。
- 正文里的小字提示（如「点击复制」）用橙色，比灰色更容易看见。
- 首页演示（`demo.css` + `demo.js`）的类名、元素 ID 是一套契约：改一边必须改另一边；`check-site.mjs` 会拦住不一致。
- 动效只用一次性的轻微上浮（`@keyframes rise`）与消息入场（`@keyframes msg-in`），并尊重 `prefers-reduced-motion`。

### 演示区＝客户端复刻

首页演示区不是自创 UI，而是客户端主界面的复刻，配色与结构以客户端代码为准，改之前先看客户端：

- 配色唯一来源：`D:\SoftTalk\softtalk_shared\knowledge_main_visual_theme.py`（白色主题），映射到 `demo.css` 里的 `--w-*` 变量。
- 结构对应：标题栏（磁吸/置顶/最小化）→ 团队话术/个人话术/离线话术页签（云域页签底部蓝线 `--w-cloud`）→ 0-9 套号 → 一级分类标签（浅底胶囊 + 选中暗红下划线）→ 二级分类（`--w-lv2-bg` 蓝底行）→ 话术行（题红字 `--w-title-fg` + 灰答案）→ 常用短语 → 搜索行（`Alt+Q 定位搜索栏` + 范围按钮）→ 底栏官网文案 + 小精灵；聊天窗口下方是底部吸附搜索栏。
- 一级分类色板取自 `softtalk_knowledge_client/lv1_color_presets.py` 的浅色组；话术类型角标取自客户端 `platform_images/script-*.png`。
- 左侧聊天窗口按微信风格（`--wx-*` 变量）：灰底、白色收到的气泡、绿色 `#95ec69` 发出的气泡。
- **底部吸附搜索栏**（对应客户端 `ui/attached_search_bar_pkg`）：贴在聊天窗口底边上，宽 = 聊天窗宽。结构自上而下：结果区（向上展开、盖住聊天窗口下半截：`搜索结果 · N` + `按 Tab键，再按数字直接发送话术。` + × 关闭）→ 搜索行（输入框 + 框内 × 清除 + 范围按钮 + `›` 收起）→ 常用短语（标签 + 短语条，与主界面同一份短语）→ `最近搜索`（橙框、`清空`、chip 条）。
- 吸附栏行为：输入即搜（结果行带 1–9、0 临时序号与来源文案）、**回车发送当前选中（没选中就是第一条）**、**焦点在结果行上时按数字 1–9/0 直接发送第 N 条**（客户端 Tab 后数字直接发送）、双击/触屏点行只贴入聊天输入框、点纸飞机直接发送；**用过一条结果就收起结果并写进最近搜索**（客户端用完命中也是 `clear_query`）。搜索范围与主界面共用一份（两个范围按钮同步），搜索历史也是共用一份（最多 8 条，最近在前）。
- 折叠态：点 `›` 只剩聊天窗口右下角一个小按钮（`‹` 展开），与客户端折叠后 36×36 的形态一致。
- 演示区是假数据，但结构完整：**3 个话术域 × 0–9 十套 = 30 套**，每套自己的二级分类与话术（共 103 个二级分类、209 条话术），套号 0–9 全部可点、悬停显示套名，套号下方标题条显示「当前套名 · 第 N 套 / 共 10 套」。演示数据都写在 `demo.js` 的 `SCOPES` 里，一级分类配色只用 `lv1_color_presets.py` 浅色组。
- 演示操作路径（全部可点，看到就能用）：页签切话术域、**按数字键 0–9 切套（窗口级快捷键，不用先把光标点进演示区）**、点套号整套切换、点一级分类切分类、二级分类展开收起（同一时刻只展开一个）、单击选中、**双击贴话术到输入框**、点行左侧纸飞机直接发送（粘贴 + 回车，与客户端 `list_box.py` 的 `insert_dbl`/`send` 一致）、**手机上点一下话术即贴进输入框**（触屏没有双击，否则手机用户用不了）、聊天窗口自己的发送按钮发出、常用短语直发、**搜索框回车＝直接发出当前选中（没选中就是第一条）的命中**（与客户端搜索框 Enter 一致）、命中行下面带客户端格式的来源文案。
- **数字态只被「会改变文字」的按键打断**（客户端 `_deactivate_digit_selection_for_edit_key`：`event.text()` 非空、或 Backspace/Delete）：打字、退格、删除会退出；**方向键 / Home / End 不退出**（一按方向键序号就没了是 bug）；带 Ctrl/Alt/Meta 的按键在客户端不产生文字，所以 **Ctrl+1、Alt+1 既不发送也不退出**数字态。
- **数字态下结果不够时静默**（客户端 `key_for_digit` 越界返回空、`event.accept()`）：不发送、不退出数字态。
- **收起吸附栏会清空搜索**（客户端 `set_collapsed` → `clear_query`），顺带退出数字态，不会留下隐藏的带序号结果行。
- **Tab 数字选择态**（对应客户端 `search_result_digit_selection`，主搜索框与吸附栏共用同一套）：两个搜索框里输入关键词后按 **Tab**，前十条结果的临时序号（1–9、0）才会出现，再按数字＝**直接发送**第 N 条；继续打字/退格退出数字态，Esc 先退数字态、再按一次才是清空搜索。序号只在数字态显示（客户端 Tab 前也不显示）。
- **二级分类同一时刻只展开一个**（客户端 `expanded_level2_key` 是单个键）：点已展开的标题＝全收起，点其他标题＝只留这一个并收起上一个；切套/切话术域/切一级分类都回到「第一节展开」（客户端 `_resolve_level2_selection` 在目标键不存在时回落到首个）。演示里这个状态存在 `SCOPES` 的 `section.open` 上，靠 `resetSections()` 统一重置，别在别处再写一遍。
- **点列表空白处清除选中**（客户端 `PaintedListBox.mousePressEvent` 里 `clear_selection`）。
- **列表重建要把焦点还回去**：切套/切分类/数字发送都会重画话术列表，重建前记住「焦点在第几行」，重建后 `focus({preventScroll:true})` 还回同一位置；否则第二次按数字切套就没有目标（焦点掉到 body），表现为「只有第一次有效」。
- **数字键是窗口级快捷键，不要求先把光标点进演示区**（客户端用 `QKeySequence` + `Qt.WindowShortcut`）：刚打开页面、什么都没点时按数字也要切套；唯一让位条件是「正在打字」（`INPUT`/`TEXTAREA`/`contenteditable`）。别写成「必须先点演示区」，否则访客不点就没反应。演示不在视野时先 `scrollIntoView` 再切，让人看得见反应。
- **数字键顶部与小键盘都要认**（客户端 `QKeySequence("0".."9")` 两种键盘都匹配）：切套与数字发送都走同一个 `readDigit()`，别只判 `event.code === "DigitN"`，否则小键盘无效。
- **主搜索框提示语跟着焦点换**（客户端 `shortcut_discoverability`）：未聚焦 `Alt+Q 定位搜索栏`（idle），聚焦后 `按 Tab键，再按数字直接发送话术。`。
- **右下角范围按钮只有「全部 / 当前」两种**（客户端 `search_range_engine` 是 `all / current / custom`，标签 `全部 / 当前 / 自定义`）：`all` ＝三类话术全部 0–9 套，`current` ＝当前话术域 + 当前套号。演示不做「自定义」那个勾选弹窗，所以**不要造客户端没有的中间态**（曾经写过「当前话术域」，是错的）。主界面与吸附栏两个按钮共用同一份状态。
- **命中来源文案照抄客户端**（`search_result_source.py`）：`团队·默认｜售前 > 价格问题`（话术域·套号｜一级 > 二级，0 号套写「默认」，1–9 写「第N套」）。客户端把这段放在悬停预览气泡里，演示没有气泡，就直接跟在话术行下面。
- **搜索无结果文案＝客户端原文「没有匹配结果」**（`search_result_sections.py` 自动排序卡片的 `empty_text`）。
- **搜索框回车＝发送当前选中的那条命中**，没有选中才发第一条（客户端 `_handle_enter_key` 的 `current_key` 规则）；主界面回车也记一条搜索历史。**用户用了某条命中就会写进「最近搜索」**，两个搜索面共用一份。
- **Esc 退出搜索后不再停在输入框**（客户端 `_handle_escape_key` / `_exit_search_and_restore_focus`）：主界面把焦点交给话术列表**第一行**，二级分类全收起、列表里没有行时交给**列表控件本身**（`#demo-list` 带 `tabindex="-1"` 才能被脚本聚焦，客户端也是把焦点给列表控件），吸附栏把焦点还给聊天输入框；搜索框本来就是空的时按 Esc 不动作。
- **Alt+Q 定位搜索框**（任何位置按都生效，带一次橙色短高亮），行 `title` 提示「双击贴进输入框，点左侧纸飞机直接发送」。
- 客户自动回复、重置按钮照旧。凡是新加交互，优先做成"点一下就有反应"，不要加说明文字。
- 聊天输入框是真实的 `<textarea id="demo-input">`（不是假 div）：双击话术是填入而不是锁定，访客可以直接改字、自己打字；**回车发送（微信习惯）**、Shift+Enter 换行（要加 `isComposing`/`keyCode 229` 判断，否则中文输入法选词的回车会误发），多行时自动长高（上限取 CSS `max-height`，默认 70→140px 后内部滚动）。改样式时别把它写回固定高度或去掉 `resize: none`。

## SEO（关键词与元数据方案）

搜索引擎带来的访客主要靠「功能词 + 问题词」，因此每个页面背不同关键词，不抢同一个词。

### 关键词矩阵

| 类别 | 目标关键词 | 主攻页面 |
| --- | --- | --- |
| 核心词 | 客服话术软件、话术软件、话术管理软件、客服话术管理软件、客服话术工具 | `index.html` |
| 场景词 | 微信销售话术软件、微信话术软件、电商客服话术软件、淘宝客服话术软件、千牛快捷回复、客户话术软件、销售话术软件、快捷回复软件、团队话术共享 | `index.html` + `why.html` |
| 长尾问题词 | 多个店铺话术怎么统一更新、客服话术怎么管理、话术库怎么建、客服回复慢怎么办、团队话术和个人话术的区别、话术太多找不到怎么快速定位、平台自带快捷短语的缺点 | `why.html` + 联系页 FAQ |
| 品牌词 | 话术精灵、话术精灵官网、话术精灵下载、SoftTalk 话术软件 | 全部页面（title 尾巴） |

### 关键词→页面对照

| 页面 | 主关键词 | title | description 要点 | H1 |
| --- | --- | --- | --- | --- |
| `index.html` | 客服话术软件 | `客服话术软件_微信销售话术管理工具 - 话术精灵 SoftTalk` | 团队/个人/离线话术统一管理 + 一套话术拆 10 个模块 + 双击贴入回车发送 + 本地免费 | 把客服话术沉淀成团队知识库 |
| `why.html` | 话术管理软件（要解决什么） | `为什么需要话术管理软件_多店铺话术统一更新 - 话术精灵` | 20 个店铺要更新 20 次、客服只求快、客服复制团队话术到个人话术的真实原因、0–9 十套模块 | 为什么客服团队需要一个话术管理软件 |
| `pricing.html` | 话术软件多少钱 | `客服话术软件多少钱_话术软件价格 - 话术精灵` | 本地永久免费 + 云端按工号 48/78/98/168 元 + 含三项云能力 + 注册赠 1 个月会员 | 本地永久免费 云端按工号付费 |
| `contact.html` | 品牌词 | `联系话术精灵 - 微信、邮箱` | 作者微信与邮箱，使用/账号/续费都能问 | 联系我 |

首页 H2 落点：只有「可交互界面实操试用」。**不放产品截图、不写功能罗列小节、不放常见问题**——演示区能直接操作，再用文字复述就是废话（用户先后砍掉截图、三张功能卡与整段 FAQ）。

### 写作规则

- title ≤ 30 汉字，品牌放末尾用 ` - 话术精灵` 结尾（首页可用 `_` 分隔主关键词与场景词）；**四页 title 不得重复**。
- description 控制在 75–85 汉字，含主关键词一次 + 一个具体事实（数字/动作/术语），不堆关键词。
- 每页恰一个 H1；H2/H3 自然带词，不塞关键词堆。
- 一个关键词在 title、description、H1、正文各出现一次即可，正文以真实场景叙述为主。
- 图 `alt` 写内容，装饰性图片用 `alt=""`（现存的图都是 logo/角标/备案图标这类装饰图，产品截图已于早前根据作者要求删除）。
- 内链：`why.html` 页尾 → 首页演示、顶部按钮 → 下载/定价；`pricing.html` → `why.html`；页脚与导航由 `sitePages` 自动带上新页面。

### 结构化数据

- `index.html`：`SoftwareApplication`（Windows、BusinessApplication、offers 价格区间、featureList）。
- `why.html`：`WebPage` + `BreadcrumbList`（首页 → 为什么需要话术管理软件）。
- `pricing.html`：`Service`/`Offer` 已有价格表 JSON-LD；`contact.html`：`ContactPage` + `FAQPage`（常见问题跟着「需要问人」的场景放在联系页）。
- **不要伪造 `aggregateRating`（无真实评价）**，也不要写产品里没有的能力（见「已知事项」事实清单）。

### 还需作者本人操作

- 百度搜索资源平台 / 必应站长工具提交 `https://luyao2089.cc/sitemap.xml`（需作者账号，网站侧已备好 `robots.txt` 与 sitemap）。
- 可选：百度统计代码；微信/QQ 分享缩略图靠已生成的 `assets/og.png`。

## 数据流

构建时：

1. `scripts/build-site.mjs` 依次读取 `indexPage`、`pricingPage`、`contactPage`。
2. 每个页面模块从 `site-data.mjs` 取公共数据，拼出自己的 `head` 与 `main`。
3. `layout.mjs` 用页面清单生成导航（当前页高亮 `aria-current="page"`）、页脚与完整 HTML。
4. 构建脚本写出三张 HTML，并按页面清单生成 `sitemap.xml`（首页用站点根地址，其余用绝对地址）。

浏览器运行时（没有任何后端请求）：

- 首页演示先加载 `demo-data.js`（话术数据 + 话术行/分类树标记），再加载 `demo.js`（交互）：切换团队/个人/离线话术、切套号与一级分类、折叠二级分类、搜索、单击选中、双击贴入输入框、点左侧纸飞机发送、常用短语直发、模拟客户回复、重置，全部只改当前页面内存。
- **首页静态预渲染**：`index.mjs` 在构建时 import `demo-data.js`，用同一个 `initialTreeHtml()` 把默认那套话术直接写进 `index.html` —— 爬虫不执行 JS，首页才有可索引正文（可见正文 386 字 + `noscript` 里 570 字的 30 套话术清单）。运行时 `demo.js` 用同一个 `treeHtml()` 渲染，两边逐字节一致，所以不会闪、不会重复。给搜索引擎看的 `noscript` 清单也是从 `SCOPES` 生成的，不是另写一套。
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
  '.\src\site\pages\index.mjs', '.\src\site\pages\why.mjs', '.\src\site\pages\pricing.mjs', '.\src\site\pages\contact.mjs',
  '.\assets\js\demo-data.js', '.\assets\js\demo.js'
)
foreach ($file in $files) { node --check $file; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
```

### 本地预览

```powershell
python -m http.server 8000
```

打开 http://localhost:8000/ 。注意 Python 3.10 的 `http.server` 不认 `.webp`，本地预览会以 `application/octet-stream` 返回，浏览器仍能正常显示；GitHub Pages 会返回正确的 `image/webp`。

### 浏览器验收清单

- 四张页面都能打开，导航互相跳转，当前页有下划线，图片与样式完整。
- SEO：每页恰一个 H1；title/description 四页互不重复且含各自主关键词；`meta keywords`、canonical、og:image（指向 `assets/og.png`）齐备；JSON-LD 能被 `JSON.parse` 解析且没有 `aggregateRating`；联系页 FAQ 条数与 JSON-LD `FAQPage` 一致；`sitemap.xml` 含四个页面；内链：`why.html` → 首页演示/定价/下载、`pricing.html` → `why.html`。
- `why.html`：正文约 400 字，两个 H2，对比表 2 行。
- 首页演示：切团队/个人/离线话术（页签蓝线跟动）、点套号与一级分类切换、二级分类展开收起（一次只展开一个）、搜索（命中带来源、无结果时「没有匹配结果」、Esc 退出并把焦点交回列表）、**搜索框按 Tab 出序号后按数字直接发送、小键盘数字同样有效**、**Alt+Q 定位搜索框（和客户端快捷键一致：任何位置按都能跳到搜索框，演示区不在视野内先滚过去）**、单击选中（不贴话术）、双击把话术贴进聊天输入框（不直接发送、输入框获得焦点）、双击后手动改字再发送发的是改后的内容、输入框回车发送 / Shift+Enter 换行 / 多行自动长高、点话术行左侧纸飞机直接发送并出现绿色气泡与客户回复、常用短语直接发送、连发多条不会丢消息也不会重复回复、聊天窗口发送按钮能发出输入框里的内容、重置后回到初始状态且没有残留气泡。
- 首页底部吸附栏：输入关键词后结果向上展开盖住聊天窗口下半截（带 `搜索结果 · N`、提示语与 1–9/0 临时序号）、回车发送当前选中（没选中就是第一条）、焦点在结果行上按数字直接发送第 N 条、双击只贴入、用过一条后结果自动收起并把关键词记进「最近搜索」、点历史词能重新搜、清空按钮清掉输入、`›` 收起后只剩右下角小按钮（`‹` 展开）、范围按钮与主界面的同步。
- 首页演示窗口在小屏（≤900px）改为上下堆叠，仍可完整操作，无横向溢出（吸附栏与聊天窗口同宽跟随）。
- 联系页点击微信/邮箱整行能复制并弹出「已复制」。
- 缩到手机宽度（约 375px）时无横向溢出。

## 图片管线

`scripts/optimize-images.py`（本地 Pillow）负责压图，产物已提交，日常改版不需要重跑：

```powershell
git show <旧提交>:assets/logo.png > logo-src.png
python scripts\optimize-images.py logo-src.png D:\SoftTalk\platform_images
```

- `logo.png`：168×187（显示最大 56px，约 3 倍图），32 色调色板，343 KB → 1.3 KB。
- `favicon.png`：128×128，居中留白，2.2 KB。
- `type-text.png` / `type-image.png` / `type-pdf.png`：28×28 调色板 PNG，共约 2 KB，取自客户端 `platform_images/script-*.png`，只给演示区话术行做类型角标。
- `og.png`：1200×630 分享缩略图（黑底 + 右上橙色光晕 + 品牌名 + 三行卖点），由 `python scripts\build-og-image.py` 生成，四张页面都通过 `og:image` 指向它；改文案后重跑一次即可。

## 缓存与产物指纹

- `build-site.mjs` 会给 CSS/JS 引用自动加内容指纹（`assets/js/demo.js?v=xxxxxxxx`）：文件内容一变，URL 就变，访客的浏览器不会再拿旧脚本（Alt+Q 这类新功能上线后看不到，基本都是旧缓存导致）。
- 图片不加指纹：`og:image` 与 favicon 要保持稳定 URL，避免搜索引擎与分享缓存重复抓取。
- `check-site.mjs` 校验资源时会剥掉 `?v=` 再判断文件，一致性对比也用同一套指纹函数（`src/site/asset-versions.mjs`），两边不会打架。

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
- **话术组织模型（写 SEO/卖点文案必须用对）**：
  - 术语是「**套话术**」和「**套号**」，编号 **0–9 共 10 套**（`phrase_set.py`：`PHRASE_SET_NUMBERS = tuple(range(10))`，`DEFAULT_PHRASE_SET_NO = 0`）；套号 0 在产品里叫「默认话术」口径（`search_result_source.py`）。宣传时说「一套话术可拆成 10 份独立模块存放」。
  - 每个套话术有备注名（可重命名，见 `storage/sqlite_store_pkg/store_core_pkg/phrase_set_rename.py`），一级分类和话术都挂在「话术域 + 套号」下，所以套与套的内容互不堆积。
  - 搜索目标只由「**话术域 + 套号**」组成（`search_range_engine.py` 文件头注释：「一个搜索目标只由『话术域 + 套号』组成」），界面上的「全部 / 当前 / 自定义」最终都解析成这一种目标集合——因此能把搜索锁在某一套里，比在一整套上千条里翻更快（这就是「一键精准定位话术」的依据，不要说成 AI 语义搜索）。
  - 主界面 0–9 数字按钮兼作套号快捷键与悬停预览（`ui/main_window_pkg/lv1_group_digit_ui_state.py`）。
  - Excel 导入支持带套号列（`excel_io/phrase_xlsx_io_pkg/import_row_normalizer.py`：「带套号列时以文件逐行套号为准」）。
  - 不可核实项，保持作者原值、不要自行发明数字：云端价格 48 / 78 / 98 / 168 元每工号（客户端与后台无价格表，只有月亮-试用/地球 plus/太阳 pro 三档等级），以及「天猫 / 京东 / 拼多多 / 抖音」平台清单（代码里只找到企业微信兼容注释）。
- `.claude/worktrees/elastic-mendel-b22c35` 是历史工具留下的 git worktree（旧版网站副本），不是当前源码；`.claude/`、`.pi/` 已加入 `.gitignore`，不要提交。
- `assets/js/demo.js` 里的客服话术、分类、文件全是演示假数据，与真实客户端数据无关；但界面结构与配色要和客户端保持一致（见「演示区＝客户端复刻」）。
- 联系页 FAQ 文案与它 JSON-LD 里的 `FAQPage` 必须保持一致；改一处要同步另一处。
- 目前没有自动化测试框架，`check-site.mjs` 就是回归测试入口；改动演示后建议按上面的验收清单在浏览器里跑一遍。
