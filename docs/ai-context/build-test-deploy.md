# 官网构建、测试与部署

> 从原根 CLAUDE.md 按主题拆出；只在本主题发生变化时读取和修改。

## 数据流

构建时：

1. `scripts/build-site.mjs` 依次读取 `indexPage`、`pricingPage`、`contactPage`。
2. 每个页面模块从 `site-data.mjs` 取公共数据，拼出自己的 `head` 与 `main`。
3. `layout.mjs` 用页面清单生成导航（当前页高亮 `aria-current="page"`）、页脚与完整 HTML。
4. 构建脚本写出 `allPages` 的全部 HTML，并按 `sitemapPages` 生成 `sitemap.xml`（首页用站点根地址，其余用绝对地址）。
5. 博客：`posts.mjs` 读 `content/blog/slugs.json` 登记的 md → 标题到第一条 `---` 之间是内部备注（只取日期/摘要，不发布）→ `markdown.mjs` 渲染正文 → `pages/blog.mjs` 生成列表页与文章页 → 作为 `blogPages` 进 sitemap。博客页面在子目录里，带 `root: "/"`，`layout.mjs` 给站内地址加根前缀。

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

打开 <http://localhost:8000/> 。注意 Python 3.10 的 `http.server` 不认 `.webp`，本地预览会以 `application/octet-stream` 返回，浏览器仍能正常显示；GitHub Pages 会返回正确的 `image/webp`。

### 用 headless Chrome 探针复核演示行为

- 演示的「发送」有 **520ms 延迟**（`sendText` 里 `setTimeout`，模拟客户端插入+回车）：断言气泡数量前至少等 600ms，否则上一条气泡会落在下一段测里，看起来像「多发了一条」。
- 探针要像陌生人：只用真实键鼠事件（`KeyboardEvent`/`MouseEvent`/`PointerEvent`），检查可见结果（标签文字、`.bubble` 文本、`hidden`、焦点），不要读页面内部变量。
- 一次按键引发的连锁（切套重画列表、发送延迟、客户回复延迟）都要 `await` 到位再断言。
- headless Chrome 的**最小视口是 500px**：`--window-size=375` 也会被当成 500（`--force-device-scale-factor` 也压不下去）。手机宽度就用 500 测——它和 375 落在同一个 `≤520px` CSS 分支里。
- 量溢出时别拿气泡的 `scrollWidth` 说事：气泡有一个 9px 宽的右侧小三角，天然比 `clientWidth` 大 9px；要看外层容器或 `document.documentElement.scrollWidth`。
- 对照行为只能以客户端源码为准；探针失败先怀疑探针，再怀疑代码，最后才改代码。

### 浏览器验收清单

- 所有页面都能打开，「目录」是竖排分组清单（了解 / 上手 / 价格与联系，`navGroup`），当前页左侧一道橙线；宽屏（≥1280px）展开时是贴在页面右侧的常驻侧栏（issue #12，开合记在 `localStorage` 的 `softtalk-nav`，判据 `src/site/nav-state.mjs`），点外面不收起；窄屏仍是右上角「目录」下拉，不记开合，Esc 与点外面都能收起；图片与样式完整。
- SEO：每页恰一个 H1；title/description 各页互不重复且含各自主关键词；`meta keywords`、canonical、og:image（指向 `assets/og.png`）齐备；JSON-LD 能被 `JSON.parse` 解析且没有 `aggregateRating`；`sitemap.xml` 含五个页面；内链：`why.html` → 首页演示/定价/下载、`pricing.html` → `why.html`。
- `why.html`：一个 H1、没有正文小节；竖屏短片封面停在问题帧，播放 40 秒到底变「再看一遍」；桌面上短片不超过一屏高。
- 聊天窗：真 `<textarea>`（回车发送、Shift+Enter 换行、多行气泡保留换行、输入法合成中的回车不发送、空输入与纯空格不发送、超长无空格文本换行不撑破窗口、消息变多时聊天窗高度不变只内部滚动并自动滚到底、连发多条每一条都有回复且不并发）
- 首页演示：切团队/个人/离线话术（页签蓝线跟动）、点套号与一级分类切换、二级分类展开收起（一次只展开一个）、搜索（命中带来源、无结果时「没有匹配结果」、Esc 退出并把焦点交回列表）、**搜索框按 Tab 出序号后按数字直接发送、小键盘数字同样有效**、**Alt+Q 定位搜索框（和客户端快捷键一致：任何位置按都能跳到搜索框，演示区不在视野内先滚过去）**、单击选中（不贴话术）、双击把话术贴进聊天输入框（不直接发送、输入框获得焦点）、双击后手动改字再发送发的是改后的内容、输入框回车发送 / Shift+Enter 换行 / 多行自动长高、点话术行左侧纸飞机直接发送并出现绿色气泡与客户回复、常用短语直接发送、连发多条不会丢消息也不会重复回复、聊天窗口发送按钮能发出输入框里的内容、重置后回到初始状态且没有残留气泡。
- 首页底部吸附栏：与聊天窗同宽同左边缘、顶边贴聊天窗底边、结果向上展开盖住聊天窗口下半截（带 `搜索结果 · N`、提示语与 1–9/0 临时序号）、回车发送当前选中（没选中就是第一条）、焦点在结果行上按数字直接发送第 N 条、双击只贴入、用过一条后结果自动收起并把关键词记进「最近搜索」（**焦点在吸附栏里且输入框为空**才显示，超过 12 字显示成省略号）、点历史词能重新搜、清空按钮清掉历史、`›` 收起后只剩右下角 36×36 小按钮（`‹` 展开，右边缘仍与聊天窗对齐）、范围按钮与主界面同步且收起展开后不丢。
- 首页演示窗口在小屏（≤900px）改为上下堆叠（聊天窗在上、话术面板在下，高度 540/480px），仍可完整操作：500 / 768 / 1000 / 1280 四种宽度都没有横向溢出、面板与吸附栏都跟着聊天窗对齐、触屏单击能把话术贴进输入框、折叠态 36px 按钮不出界。
- 窄屏按数字键（或 Alt+Q）时，只有话术面板完全不在视野里才滚动，且滚到的是面板而不是演示区中心。
- 联系页点击微信/邮箱整行能复制并弹出「已复制」。
- 缩到手机宽度（约 375px）时无横向溢出。

## 图片管线

站点上的小精灵和话术类型角标都由客户端的手绘绘制代码导出（客户端 `sprite_art_pkg` / `hand_icons_pkg`，和客户端里同一套笔迹），产物已提交，客户端改了画法后重跑即可：

```powershell
python scripts\optimize-images.py brand D:\SoftTalk
python scripts\optimize-images.py type-icons D:\SoftTalk
python scripts\build-og-image.py
```

- **每张图按「显示尺寸 × 2」单独出图，不要一张大图给所有地方用**：手绘画师按「每个设计单位占几个物理像素」决定线条粗细和要不要画排线，大图让浏览器缩到 24px 会细成灰边。所以导航与演示区底栏用 `logo-small.png`，首屏用 `logo.png`。
- `logo.png`：112×126（首屏 56px），待机姿态、透明底、不画地面阴影，8.5 KB；分享图也用它。
- `logo-small.png`：52×58（导航 24px、演示区底栏 26px），小尺寸只描一道加粗主线，2.6 KB。
- `favicon.png`：64×64（标签页 32px），2.8 KB。
- `type-text.png` / `type-image.png` / `type-pdf.png`：28×28 PNG（显示 14px 的 2 倍图），共约 4 KB，由 `type-icons` 子命令调用客户端 `hand_icons_pkg` 现画导出（需要本地 PySide6），只给演示区话术行做类型角标。客户端改了角标画法后重跑一次即可。
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
