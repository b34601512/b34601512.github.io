# 官网对照的产品事实

> 从原根 CLAUDE.md 按主题拆出；只在本主题发生变化时读取和修改。

## 已知事项

- 对外文案（首页卖点、定价页权益）必须与客户端实际行为一致，改动前先看客户端：
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
- 老板 2026-10-22 令：官网不设常见问题/FAQ——页面、联系页问答、结构化数据、演示数据里的分类名都已撤，**不要改个名字再加回来**。
- 目前没有自动化测试框架，`check-site.mjs` 就是回归测试入口；改动演示后建议按上面的验收清单在浏览器里跑一遍。
