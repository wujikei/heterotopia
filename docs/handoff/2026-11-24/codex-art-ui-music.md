# 《异托邦》Codex 最新完整移交任务书：美术、交互与现代线音乐

编制日期：2026-11-24，Asia/Shanghai，UTC+8。面向记忆停留在 PR #13 的 Codex。本文替代旧任务书的进度与优先级，不覆盖历史文件。

## 1. 直接粘贴给 Codex 的执行 brief

你的旧记忆停在 PR #13，基线为 `85792c5d755e14b0d637a29ad7c6fca08baf8faa`。不要从这个版本重新做现代卷。先保护本地未提交工作，再核实远端最新 `main` 与 PR #14、#15、#16、#17，建立独立工作分支。不要对用户现有目录做强制重置或替换。

先独立审查这四个阶段。对照提交、正文、原画、实际浏览器画面，判断哪些改动成立，哪些有回归，哪些只是旧报告的推测。给出有证据的优先问题清单，再做下一批。不要照抄本任务书的结论当作审查结果。

接下来主攻美术，其次是 UI、游玩体验、交互性表达，并实际制作和接入现代线原创音乐。用户会按逐图提示词自行制作更精美的画面。你负责复核方向、整理参考与规格、接收新作、同源导出、演出接入和回归，不擅自覆盖用户新作。UI 应服务阅读和叙事，交互要让人物行为有反馈，不把作品改成需要反复点击的小游戏。音乐要交付能循环、能实听、能入场景的音频，不止写策划。

每批只解决可验证的一组问题。先提交独立审查报告，再交付一组美术或交互改进与前后对照，再交付音乐小样、定稿与接入。每批报告测试结果、人工试玩范围、未测项、提交与回滚点。不要为了凑改动量全库重画。

必须保护原稿、沈辞原篇、双卷独立存档、页号场号和旧书签。图像提示词全部正向，负面字段为空或省略。继续使用本地 CLI 或隔离 worktree，不使用 Cursor 云代理。已授权的 PR #14 至 #17 合并与部署状态以第 2 节为准。下一批合并、公开发布、付费、采购授权另行确认。

## 2. 版本与部署状态：独立核对，不从旧任务书推断

仓库：https://github.com/wujikei/heterotopia  
生产入口：https://wujikei.github.io/heterotopia/  
技术栈：React 19、TypeScript、Vite 6，静态视觉小说。

<!-- T24_STATUS_START -->
代码发布基线核验于 **2026-11-24 13:36:20，Asia/Shanghai，UTC+8**。PR13 之后四轮代码均已正常合并，未 squash、rebase 或绕过 CI。

| PR | 实际整合 head | 合并提交 | 已核验结果 |
|---|---|---|---|
| [#14](https://github.com/wujikei/heterotopia/pull/14) | `5b520b67feee8c8dc9b0c02d013304e0df21fc1f` | `301909f11ea69a47e881bfd469b55d8235210155` | PR CI 45219487416 与 main 45320833013 成功 |
| [#15](https://github.com/wujikei/heterotopia/pull/15) | `3e5ba69970b3fb0efdbb4c6881af0b6a032e5094` | `8bc6816661e8ab756a6ff49a0d8933f899c444cc` | PR CI 45320926355 与 main 45323213682 成功 |
| [#16](https://github.com/wujikei/heterotopia/pull/16) | `397b8c2dc318f735c2dcf5a6fe12b6d6c870869a` | `1078f30f910c6865fbdf49c678105bef28ca1372` | PR CI 45326054842 成功。其首次 main 45328851006 在离线测试失败，未发布。后续 #17 的完整 main 流水线已验证并发布其全部祖先代码 |
| [#17](https://github.com/wujikei/heterotopia/pull/17) | `6eff449789337b37bebb3a7994503c1c00a88ed3` | `6a87cc1378ca47f2054f3e36b01f8d14e596dd82` | [PR CI 45331085274](https://github.com/wujikei/heterotopia/actions/runs/45331085274) 成功；[main 构建与 Pages 部署 45332916466](https://github.com/wujikei/heterotopia/actions/runs/45332916466) 全部成功 |

- 已发布代码基线为 `6a87cc1378ca47f2054f3e36b01f8d14e596dd82`。已用 Git 祖先检查确认原始四个阶段 head 均包含在内。
- 线上 https://wujikei.github.io/heterotopia/ 的 JS、CSS、service worker 与本地已验构建逐字节一致。三张关键现代线图片也逐字节一致。证据见同目录 `published-runtime-verification.json`。这不是仅检查 HTTP 200。
- 集成补修 `6eff449` 没有改变剧情或回滚不透明立绘。旧 sprite 测试仍等待旁白立绘透明度 0.55，与 r4 的不透明、滤镜变暗契约冲突。现要求透明度不低于 0.99 且实际亮度降低，保留同一 DOM 节点与恢复发言检查。
- 离线测试另有 reload 后立刻读取续梦按钮的就绪竞态，现等待原有按钮可用再断言。此前 CI 的轻量设置 reload 超时未取得唯一根因，不能称为偶发或已定位产品 bug。保持原持久化、断网、双版本、音频与存档断言；本地双版本、12 次设置重载、PR CI 和 main 全流程均已通过。新增导航设置诊断便于复发时定位，没有盲加超时或跳测试。
- 整栈改前 tag `rollback-pre-stack-merge-20261124` 与 backup `backup/pre-stack-merge-20261124-main-85792c5` 指向 `85792c5d755e14b0d637a29ad7c6fca08baf8faa`。
- 整栈代码改后 tag `rollback-post-stack-merge-20261124-1320` 与 backup `backup/post-stack-merge-20261124-1320-main-6a87cc1` 指向 `6a87cc1378ca47f2054f3e36b01f8d14e596dd82`。各轮旧引用均保留。
- 本任务书与完整提示词、库存、接触表另作资料入库。仓库根目录离线 HTML 也同步到上述代码基线，已在真正断网的 file:// 环境复验。资料归档提交不改变本节已验证网页运行代码。接手时仍读取实际 `origin/main`，不要把代码发布基线误当成永远不变的最新提交。
<!-- T24_STATUS_END -->


### 2.1 状态使用规则

- `head`、合并提交、工作分支和线上构建是不同对象。读完最终检查点再记录当前 `origin/main`。
- 四阶段原始 head 分别为 `5b520b6`、`0ef0535`、`1a60086`、`81981bb`。后续整合 main 会产生新 head，不能因短 SHA 变了就重复实现旧改动。
- 历史 stacked PR 的零项 Checks 不是 CI 通过。最终合并前后的真实运行、最终 main 的部署与线上实际资源应分别核对。
- 本任务书的美术库存和接触表固定于 `81981bbe4be51b26ed302f6ecf5ee50552273c25`，用于复现审查。接手时用最终 main 再核一遍。
- 本文不把本地预览端口当作公共试玩链接。外部 Codex 无法访问旧容器的 `/workspace/`、`localhost:4193` 或内部 Page。代码从仓库取得，配套证据从随附 ZIP 取得。

## 3. PR #13 以后完成了什么

### 3.1 PR #14：现代卷身份、连续性与返场回声

PR：https://github.com/wujikei/heterotopia/pull/14  
原始阶段提交：`5b520b67feee8c8dc9b0c02d013304e0df21fc1f`。

- `scripts/modern-adaptations.json` 新增 107 条原文锚点适配，覆盖 43 场。`scripts/import_modern.py` 强校验并生成现代剧情数据。
- 修正大巫祝对林越的颈间和发言错指、戌名替换成“你”、自我跟随等主体错误。去掉 `modern-o-4-1` 返场首句重复“睁开眼”。
- `modern-c-1-13` 马车回忆承接实际经历过的第七夜《离骚》。不能凭空让林越拥有未走过支线的记忆。
- `src/modern.ts` 的物品规则分开现代与古代。现代持有 `questionJade`，古代段为木匣三件，返场清古代物并恢复玉扣。移除了无来源地图和脚踝墨。
- `choices[MODERN_RETURN_ENDING]` 记本次王裔结局，返场按结局给回声。旧档缺标记时保留中性玉扣回声，不升级存档格式。
- 结局水纹原先保留 `scale(14)` 结束态，扩大页面滚动边界。`src/styles/ink-ending.css` 将装饰放入独立裁切层，保留短屏正文真实滚动。

审查重点：逐条确认适配未改变原稿含义，旧档仍可进入返场，回声不串支线，结局裁切不截正文。

### 3.2 PR #15 第一批：三张叙事 CG 与同空间宿舍序列

PR：https://github.com/wujikei/heterotopia/pull/15  
第一批提交：`40b345081d776451853a8c0a073d416d1483eb18`。第二批原始 head：`0ef053590b25a2886fb92f9cc4e24dba59dc78ba`。

实际新增为 3 张关键 CG、2 张连续性背景和 2 个同源照明派生，共 7 个运行状态。不要写成“新增 7 张独立 CG”。

| 资产 | 内容与叙事作用 |
|---|---|
| `cg-modern-jade-palm-r2` | 黄昏摊前交接掌心小玉扣，明确通孔和“何”字 |
| `cg-modern-dorm-unease-r2` | 宿舍第三声与抬头，托玉手和投影墙保持空间连续 |
| `cg-modern-dorm-carving-r2` | 同空间手刻，短金属刻刀、平整竹片、竹屑与“何”字 |
| `modern-dorm-quiet-r2` | 宿舍日常母版，空桌不提前出现玉扣 |
| `modern-street-arrival-r2` | 开篇旧街远景。目前仍列重制，原因见逐图清单 |
| `cg-modern-dorm-dark-r2` | 由手刻母版导出的灯灭照明状态 |
| `cg-modern-jade-light-r2` | 由手刻母版导出的玉扣微亮状态 |

场景接入采用 `beatId`，不是整场一张图。开篇先街景，蹲下切旧问字摊，拿起与塞入切掌心，离开切回街景。宿舍先日常、第三声不安、手刻、灯灭、玉扣微亮。页面显示序号和原始 beat 后缀并非相同数字，精确定位以合成档 manifest 和正文核对为准。

原图和母版在 `resources/art-src/modern-r2/`，导出脚本是 `scripts/process-modern-r2-art.py`。新图不能只替换桌面 WebP 而漏掉 AVIF、移动版、原画和清单。

### 3.3 PR #15 第二批：两角色六态分层与窄窗稳定性

- 林越和室友各 6 态。12 张 864×1152 透明运行 PNG 由统一身体与配准表情层导出。两张基础、两张区域蒙版、10 个不规则羽化表情层可重建母版。
- `resources/art-src/modern-characters-r2/` 包含生成源、分层、运行母版、接触表与来源记录。`scripts/check-modern-characters-r2.py` 检查身体、外轮廓和表情重建。
- 林越保留圆框眼镜、灰蓝开衫、白圆领 T 恤和军绿背包。室友沿用分面 CG 右侧卷发、暖肤、米色衣服的设定。原稿未命名，不能补民族和国籍。
- 实际正文调用林越平静、思考、困惑、微笑。警觉注记位于 CG 段，被演出规则隐藏。惊愕备用。
- 室友正文主要调用返场“想家了？”的关切。平静兼人物志，其余表情备用。宿舍危机呼喊保持画外，不在刻刀、竹简、玉扣上叠立绘。不要说两人六态均已全线演过。
- 返场“夜里，室友……”切回宿舍母版，修正背景仍留图书馆。
- 窄窗安全区测量改为随真实页、已加载 URL 与字体就绪更新，未布局节点不算零高。窄窗不把几何变化与 opacity 动画叠加，宽屏保留短淡入。

历史黑帧仍未证实唯一根因。后来同原浏览器正常 UI 和自动非黑像素检查均未复现，不能据此写成根因已完全查明。

### 3.4 PR #16：阅读、存档保护与入口误触

PR：https://github.com/wujikei/heterotopia/pull/16  
原始阶段 head：`1a60086ddf1137ae4a4b879e7e8f1676c842a60e`。

1. 标题页已有 `game` 进度时，重开先显示“再点一次…”和覆盖警告。点空白、失焦、开弹窗、切卷复位。无存档一点进入。
2. 打开弹窗和导入统一关闭自动与快进。导入还重置隐藏正文、章节开场和上一场状态。选中反馈过渡缩至 0.12 秒，触屏不套用鼠标 hover，顶部状态同步。
3. `start()`、`resume()`、`jump()` 记录入口坐标。260 毫秒内拦截距离入口小于 56px 的同位误触，保留正常正文点击和键盘推进。
4. 矮横屏字号改用 `clamp(17px, calc(var(--dialogue-size) * 0.85), 22px)`，双卷入口触区至少 44px。收紧小屏标题布局。
5. 标题页说明两卷独立、各自留存。补齐中文和 en、ja、de UI 文案。

阶段后续整合还含一次 inline relic 自动阅读修复，最终 head 为 `397b8c2dc318f735c2dcf5a6fe12b6d6c870869a`，不是原始 `1a60086`。此前 `test:relics` 曾失败。最终 `openModal({ keepAuto })` 让正文 `.relic-cue` 研究入口按原契约保留自动阅读，其余弹窗仍停止自动。请审查这个明确例外，不要把“所有弹窗统一暂停”再次泛化覆盖它。核对最终合并差异和真实 CI，不只检查原阶段提交。

此前 `07`、`08` 合成档入口短句错页已在本轮得到机制修补和正常 UI 精确复验。`07` 单点续梦落 27/28。`08` 对续梦做约 100ms 同位双击仍落 9/28 的“何。”，随后点正文和 Enter 正常推进。不要把旧任务书的待查描述直接当作当前仍未修复的同一问题。此前线上自动阅读多翻页的唯一因果链仍未被完整证明，也不能归咎玩家多点。

### 3.5 PR #17：海外线人物、构图与短屏结局

PR：https://github.com/wujikei/heterotopia/pull/17  
原始审查 head：`81981bbe4be51b26ed302f6ecf5ee50552273c25`。最终合并使用的 head 见版本状态节。

- 修正 idle 人物半透明穿底。静止人物身体仍应实心，不能让投影、窗光和背景穿过胸口。
- 对旧现代 CG 的竖屏显示采用完整画幅策略，避免递面、递稿、合照等关键双人表情与手部动作被裁掉。
- 调整人物与场景光色、顶部文字和姓名对比度，保留办公室相对稳定的构图。
- 调整矮横屏结局布局与人物顶部间距。
- 修正古代山坡被昆仑等背景规则误判的问题。古代段不能因“坡”一类通用词提前泄露后段异象。

原 `4193` 无痕正常浏览器复玩确认人物不再透底，递面双脸、手和碗可见，递稿与合照动作完整。实际仍有取舍：竖屏上下暗留白偏多，手稿批注在小屏偏小，约 662×375 CSS px 结局按钮首屏只显示部分，需要滚动。完整画幅保住了信息，但不等于竖屏构图已经最优。不要以重新裁掉脸和动作换回铺满。

### 3.6 最新美术全局审查是报告，不是新一批已实施修图

审查覆盖现代卷背景、CG、立绘与头像，以及现代段共用的古代背景和立绘。固定基线为 `81981bb`。

共 82 条记录：7 项重制、12 项微调、57 项保留、5 项历史归档，以及 1 项可选玉扣道具图。另列 5 个移动衍生画幅，不重复算主项。库存细分为现代背景 8、CG 主项 35、现代立绘头像 15、共用古代背景 10、共用立绘 13，以及可选道具 1。

这不是全线人工通关。编译图谱审查报告记为 281 场中 175 场可达、106 场无入边。这个数字描述该基线的编译连接，不表示可以删除剩余场，也不表示那些场的剧情错误。Codex 必须重跑并说明图谱起点、边规则与条件处理。

## 4. 先做独立审查，第一份交付只回答可证的问题

1. 对账 PR #13 至最新 main 的提交、文件与改动范围。区分原阶段提交和合并整合修复。
2. 运行基线测试，再从标题页实际玩开篇、宿舍异变、返场宿舍、图书馆、办公室、山道、山顶和结局。用合成入口覆盖后段，另走一段连续真实流程验证上下文。
3. 按 P0、P1、P2 列问题。每项写场景与页、视口、当前截图、复现步骤、根因证据、最小建议、受影响卷和验收办法。
4. 把本报告逐项判为确认、已过时、证据不足或不采纳。对不采纳项给实际画面或运行证据。
5. 先报告再实施下一批。小批修改不要求等用户批准每个像素，但剧情歧义、新增大分支、付费服务、公开发布和破坏性 Git 操作必须停下确认。

### 4.1 首轮必须复核的代码与原稿问题

| 问题 | 已有线索 | 审查后再决定 |
|---|---|---|
| 106 场无入边 | 某些 `modern-r-*`、`modern-k-*` 节点不在主干可达图 | 确认是有意保留、漏接还是导入问题。不能批量接通或删除 |
| 4 张 CG 注册后被遮蔽 | `cg-modern-fork` 对 `modern-c-1-13`，`cg-modern-feast` 对 `modern-r-A-4`，`cg-modern-battle` 对 `modern-r-C-11`，`cg-modern-donghuang` 对 `modern-k-F-5` | 首句“村口”“楚宫”“城墙”“天开了”等背景规则覆盖。先确定演出意图，再修优先级和测实际上屏 |
| `last-geese` 误绑 | 同时用于 `modern-r-D-1` 夜城头对话和 `modern-r-E1-6` 战死望雁 | 新战死图原则上只服务正确终局。夜城头独立选合适背景，需逐句复核 |
| 山道到山顶服装 | `modern-o-5-4` 原文和立绘是蓝白高中校服，傍晚山顶与合照为休闲外套 | 交作者决定跨场服装连续性，不因两张成熟图擅改原稿 |
| `modern-k-N-1` | 渊持涂的小衣服、跛腿与“你（戌）”混用 | 逐段列主体歧义，交作者确认 |
| `modern-k-N-5` | 渊的牵手、递食与“你给你”混用 | 同上 |
| `modern-k-Z-6` | 终章夹有“彩蛋接口”、现代药铺与归舟段 | 确认删留及段落边界 |
| 第六夜文化圈选择、第三夜字源 | 与固定留学生身份或字源论断存在待核处 | 先给证据与选项，不擅自做文化改写 |
| T 支线旧钟与梦境 | 已保留谜面，只做明显现代错指适配 | 不用新设定填平谜面 |

## 5. 美术总方向与用户新作接收规则

画面应保持文学视觉小说的自然写实厚涂、可辨笔触、克制电影光线与现代生活质感。海外线靠砖墙、玻璃、旧桌、投影、便利店夜光与人物动作建立异地生活。文化交汇靠具体物件和人的选择，不靠泛化的异国装饰。古代段保留泥土、布料、木器、水汽和人的疲惫，异象服务对应剧情。

### 5.1 固定角色、空间和物件

- 林越以 R2 立绘为主身份参考。圆框金属镜、自然黑短发、灰蓝开衫、白圆领 T 恤、军绿双肩包在连续场次一致。
- 室友保持原分面 CG 与 R2 立绘身份。不要画成另一个林越。
- 何字玉扣是与指节相当的小巧青白圆扣，约 3cm 是美术对齐建议，不是新增原文设定。中心是可透背景的小圆孔，表面阴刻“何”。各张统一厚度、颜色和持握尺度。
- 宿舍日常、不安、手刻、灯灭与发光使用同一空间和机位。投影中是短刻刀在平竹片刻字，并有竹屑。照明变体随母版同步导出。
- 办公室沿用暖气管、茶杯、微蔫绿植与稿纸。图书馆沿用窗框、木长桌和书架。不要换图时把房间重建成另一个地方。
- 古代六童的年龄、服装、雩的蒙眼、芈的颈伤与骨笛、沅的体型、媭的空左袖、荼的左颊胎记、戌的视角应逐图核对原文。不要把现代林越服装带入戌身。

### 5.2 接收用户新作

1. 保存用户原文件和版本名，先做副本。记录 SHA256、尺寸、色彩空间和角色参考来源。
2. 做接触表，逐张对照剧情与同场前后镜头。把偏离点列给用户，而不是直接覆盖新作。
3. 对汉字“何”“问字，不问命”“不译。”和稿纸批注，用单独墨迹或文字层精修。生成模型画出的伪字不能算已验收。
4. 建议横版母图 1536×864 或同等 16:9 更高分辨率。保留可编辑文字、光效、前景、人物和背景层。立绘保留透明 alpha 与表情分层。
5. 建议中心 45% 至 55% 放核心动作，但按具体图安排。双人手递物不能机械挤在一个窄条内。底部字幕区保持低对比，最终以 UI 实测框为准。
6. 确需竖版时另做同源构图或独立安全画幅。先验脸、手、道具、动作方向和阅读区域，再决定 contain、背景延展或重构。不要只做破坏性中心裁切。
7. 统一导出运行格式与清单。检查 WebP、AVIF、回退源、移动衍生、原画、缓存版本和离线包。新文件接入必须重新跑解码与实机画面验证。

## 6. 七项重制：独立提示词与验收

以下完整保留最新审查的制作方向，并把提示词随文移交。每张附运行相对路径、固定原图链接、剧情锚点、继承参考、尺寸和验收。剧情锚点是制作定位，不替代原文全文。接手先核最终编译页与原稿，提示词出现的机位、尺度和安全区是制作建议。

提示词代码块均为正向画面描述。`negative prompt` 为空或省略。不要把“问题原因”复制到生成提示词里。文字可后期分层精修，不能为追求一次出字准确牺牲人物与构图。

### 6.1 modern-street-arrival-r2，P1

- 画面：1. modern-street-arrival-r2（背景 · 海外旧街黄昏）
- 剧情锚点：modern-o-0-1「字在街上」（开篇旧街、奶茶店、涂鸦墙、修鞋摊）
- 运行路径：art/modern-street-arrival-r2.webp
- 原图固定链接：https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/modern-street-arrival-r2.webp
- 制作尺寸：建议制作尺寸 1536×864（16:9 横屏主画幅；非引擎硬性限制，兼顾窄屏中心 45% 景深走廊安全区）
- 连续性参考：继承现有 modern-street-arrival-r2 的黄昏斜阳色调、左店铺右摊位纵深构图，以及 R2 portrait-linyue-modern 的林越背影与绿背包外观
- 重制原因：现图仅 973×720（4:3），且左侧以中式古镇仿古木匾写「奶茶店」配青石板路，缺少海外窄旧街与「中文字、英文字与异国字符叠刷涂鸦墙」的在场感。

可复制提示词：

```text
自然写实厚涂插画风格，克制写实电影质感，低饱和暖灰黄昏光线。一座海外大学城边缘的老旧窄街黄昏时分，天空微暗带淡琥珀夕照余温，斜斜的暖橘日光穿过街口楼宇缝隙，在略微潮旧的沥青与红砖便道上拉出修长温和的投影。街巷左侧是一间贴近街面的小型日常饮品铺，深灰木框透明玻璃橱窗里透出微弱暖黄室内灯光，门楣挂着一块朴素小巧的日常灯箱招牌，其上可辨清晰的现代双语小字「奶茶 · Tea」；店铺旁延伸出斑驳的红砖与灰水泥老墙，墙面上叠刷着不同年代留下的褪色喷漆涂鸦，可辨叠在一起的中文旧字迹、英文手写喷漆字母以及几笔陌生难辨的异国文字笔画，色调陈旧融入墙皮。街道右侧前景支着一个老式修鞋摊，木架上摆着几双待修的皮鞋、旧鞋楦与小铁锤，几盆略显陈旧的小盆栽靠在砖墙根。中远景的窄街深处，一名身着浅灰蓝针织开衫、背着军绿色帆布双肩包的东亚男大学生正抱着一叠书缓缓走向街尾，只留背影与侧肩轮廓。画面质感以细腻笔触还原风化红砖、玻璃反光、木质鞋摊与落日尘埃感，整体构图采用 16:9 宽幅平视街道透视，街心人物与修鞋摊收束在中央 45% 宽幅安全区内以适配竖屏显示，画面下方前景地面保持大面积沉静平滑的暖灰阴影区以便于白色文字与字幕清晰阅读。
```

验收清单：

- [ ] 输出为 16:9（建议 1536×864）且与现代宿舍/图书馆一致的克制厚涂自然写实风格
- [ ] 街道呈现海外旧城边缘或大学城旁老砖窄街生活气息，左侧小饮品店采用玻璃橱窗与克制日常小招牌
- [ ] 砖墙或墙角可见多层褪色中文涂鸦、英文手写喷漆与几枚辨认不出的异国字符叠印
- [ ] 右前景可见修鞋摊木架与鞋具，中景远处有抱着几本厚书、背绿双肩包走过的林越背影，底部路面保留平滑暖灰暗区供两行对话叠字
- [ ] 在宽屏和窄屏实际运行，脸、手、核心物件和动作完整，正文与姓名清楚。
- [ ] 与前后图的角色、空间和物件一致。提交可编辑原图、导出图和对照截图。

### 6.2 cg-modern-word-stall，P0

- 画面：2. cg-modern-word-stall（CG · 问字摊初遇玉扣）
- 剧情锚点：modern-o-0-1「蹲了下去」— 问字不问命、四枚小圆玉扣、一摞翻旧竹签
- 运行路径：art/cg-modern-word-stall.webp
- 原图固定链接：https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-word-stall.webp
- 制作尺寸：建议制作尺寸 1536×864（16:9；林越、老太太与矮桌玉扣收敛于中央 50% 安全区）
- 连续性参考：继承 R2 cg-modern-jade-palm-r2 的 3cm 青白小圆玉扣尺度与「何」字刻痕，继承 portrait-linyue-modern 服装眼镜，继承原 cg-modern-word-stall 的白发老太太温和神态与对坐关系
- 重制原因：原图将 4 枚玉扣画成 7-9cm 杯垫级巨饼，与下一秒掌心小玉扣完全割裂；玉字模糊；缺核心招牌「问字，不问命」与「一摞翻旧竹签」。

可复制提示词：

```text
自然写实厚涂插画风格，克制温暖电影感，黄昏斜阳暖冷对照光影。海外旧街墙根下的一个简陋小摊位，中近景微俯视双人构图。左侧蹲坐在矮塑料凳上的是二十岁出头的东亚男大学生林越，微蓬自然黑短发，架着纤细圆框金属眼镜，身穿浅灰蓝针织开衫内搭洁白圆领 T 恤，肩上背着军绿色帆布双肩包，他微倾身体，神情克制好奇地盯着桌面。右侧矮木凳上坐着一位穿洗旧棕灰棉外套、梳整洁灰白发髻的温和老太太，俯身右手食指轻点桌上一枚小玉扣，眼神平淡通透。两人之间是一张磨损的旧折叠小木桌，桌面上只占一小块位置地摆着四枚小巧温润的青白老玉扣，每枚直径约 3 厘米（与手指指节相当的真实小圆扣尺度），中心穿小圆孔，温润包浆；老太太手边正指着的那枚略朝镜头微倾，表面可辨清秀深邃的阴刻「何」字（如求字迹极致锐利，可在生成后用独立透明图层补绘「何」字及手写招牌细节）；玉扣一旁散放着一小摞边缘翻旧起毛、自然陈旧米黄色的竹签。小木桌靠砖墙一侧立着一块略微起皱的手写旧纸板招牌，用蓝黑马克笔工整写着「问字，不问命」五个手写汉字，「问」字最后一笔带着微微上挑的笔锋。后景是斑驳的海外红砖墙一角与局部叠层褪色喷漆涂鸦，斜阳余晖打在老太太白发与木桌边缘，画面下方桌腿与阴影地面保持均匀低对比暗部供 UI 字幕阅读，重要人物与桌面道具聚拢在中央 50% 宽度安全区。
```

验收清单：

- [ ] 桌上 4 枚玉扣尺寸统一收敛为约 3 厘米真实小圆扣（指尖可轻捏尺度），中心有圆润通孔，与掌心版无缝衔接
- [ ] 正对林越的一枚或近景偏侧玉扣表面可辨清晰「何」字阴刻，另 3 枚隐约可辨或呈温润玉质光泽（复杂汉字建议出图后以独立补绘层精修）
- [ ] 摊位桌侧或墙根可见一块手写旧硬纸板或素木小牌，上面写着「问字，不问命」，其中「问」字末笔微挑；桌角有一小摞翻旧卷边的米黄竹签
- [ ] 林越为微蓬黑短发、细圆框金属眼镜、浅灰蓝开衫内搭圆领白 T 恤、军绿帆布双肩包；背景保留海外老砖墙涂鸦与修鞋摊一角
- [ ] 在宽屏和窄屏实际运行，脸、手、核心物件和动作完整，正文与姓名清楚。
- [ ] 与前后图的角色、空间和物件一致。提交可编辑原图、导出图和对照截图。

### 6.3 cg-modern-translation，P1

- 画面：3. cg-modern-translation（CG · 图书馆写下「不译。」）
- 剧情锚点：modern-o-4-2「最后，你在右边……写下两个字。不译。」
- 运行路径：art/cg-modern-translation.webp
- 原图固定链接：https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-translation.webp
- 制作尺寸：建议制作尺寸 1536×864（16:9；开本笔记本与持笔右手位于中央微偏左，兼顾竖屏构图）
- 连续性参考：继承 modern-library 的高窗午后光线、木质长桌与远景书架，继承 cg-modern-jade-palm-r2 的 3cm 小玉扣与 portrait-linyue-modern 灰蓝开衫前襟
- 重制原因：现图笔记本左右两页全白，未体现「左原文、右大面积留白落笔『不译。』」的叙事爆发点；桌角玉扣过大；林越穿成套头毛衣缺少开衫前襟。

可复制提示词：

```text
自然写实厚涂插画风格，克制沉静电影感，午后图书馆靠窗淡金与冷灰平衡自然光。海外高校图书馆安静角落的深色木质长桌前，采用过肩斜俯视中近景机位（镜头从林越左后侧约 45 度俯望桌面摊开的书本与笔记本）。画面前景偏左侧可见林越的侧脸与肩背轮廓：微蓬自然黑短发、纤细圆框金属眼镜、穿浅灰蓝针织开衫配白色圆领内搭（前襟纽扣开衫袖口质感清晰），椅子旁靠放着军绿色帆布双肩包，他神色沉静笃定，右手执一支黑色细钢笔停落在右页纸面。桌面正中央摊开一本微黄厚实纸张的笔记本或对照稿纸：左半页整齐印着竖排与横排交错的古典文献微缩铅字排版纹理，右半页是一大片干净留白，在行首处落着端正克制的两个深黑手写汉字「不译。」（出图时预留清晰平展白纸与执笔瞬间，后期可叠加精细手写墨迹图层定稿）。纸页右侧的深色桌面边缘静静放着一枚约 3 厘米的小巧青白圆玉扣，中心穿通透圆孔，玉面可辨精微阴刻「何」字，在午后光线下泛着温润内敛的玉泽。中远景柔焦虚化出高大明亮的图书馆窗框、窗外淡绿枯荣枝叶与一排安静的木书架。整体色调沉着素雅，纸张纤维、开衫针织肌理与木桌划痕真实可见，底部木桌面保持平滑深褐阴影区以保证对话字幕清晰可读。
```

验收清单：

- [ ] 能明显看出左侧书页印有克制整齐的《天问》古籍原文段落排版纹理，右侧白纸大面积留白处停笔写着「不译。」（可配后期墨迹精修层）
- [ ] 桌角或书脊旁静置一枚 3cm 小巧通孔「何」字青白玉扣，尺度与指尖相当，与掌心版一致
- [ ] 能分辨林越微蓬黑短发、细圆框眼镜、浅灰蓝针织开衫袖口与前襟细节、圆领白 T 领口及身旁军绿双肩包
- [ ] 午后冷暖平衡的窗光打在纸页肌理上，下方深色木桌面留有柔和暗区供底部正文叠放
- [ ] 在宽屏和窄屏实际运行，脸、手、核心物件和动作完整，正文与姓名清楚。
- [ ] 与前后图的角色、空间和物件一致。提交可编辑原图、导出图和对照截图。

### 6.4 cg-modern-paper，P1

- 画面：4. cg-modern-paper（CG · 导师办公室满页批注退稿）
- 剧情锚点：modern-o-5-1「他把那叠纸推回来。满页都是批注。红笔、蓝笔、铅笔。」
- 运行路径：art/cg-modern-paper.webp
- 原图固定链接：https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-paper.webp
- 制作尺寸：建议制作尺寸 1536×864（16:9；桌面批注稿纸占据视觉中心，兼顾窄屏焦点可读性）
- 连续性参考：继承 modern-office 的铸铁暖气管、叶角微蔫的绿植、白陶瓷茶杯、半合蓝灰笔记本与窗外冬日树影，修正林越圆领白 T 恤连续性
- 重制原因：现图林越穿成翻领白衬衫；平视角使论文纸只占极小斜角，4193 实测反映「批注太小不可读」，无法传达「满页红蓝铅笔字批你这个人」的压迫感。

可复制提示词：

```text
自然写实厚涂插画风格，克制现实主义电影感，冬日午后清冷透亮的室内窗光。高校导师办公室木桌前，采用林越侧前方约 40 度过肩微俯视近景机位，将视觉重心牢牢落在被推回桌中央的那叠 A4 打印论文稿纸上。桌面中央偏前的大幅位置摊着几页白纸黑字打印文稿，上面密密麻麻布满红笔批改圈线、蓝笔旁注段落、铅笔删改斜线以及页边距密实的手写批注笔迹质感，纸角微微卷起，传达出直击内心的犀利审阅分量（稿纸保留真实密集排版与手写笔迹肌理，如需特定清晰字句可在后期透明图层手写补全）。画面右侧入画一位年长东亚男导师着灰褐色针织衫的双手与半身轮廓，指尖刚将纸堆往前轻推一寸，桌边摆着两只盛着微凉茶水的白陶瓷杯和一本深蓝灰笔记本。画面左侧前景入画林越微低的侧脸与肩臂：微蓬黑短发、细圆框金属眼镜、浅灰蓝针织开衫内搭洁净圆领白 T 恤，左手轻搭桌缘，目光凝固在满页红蓝批注之上。背景柔焦延续办公室原有陈设：墙角白色旧铸铁暖气管、明亮大窗、窗台上那盆叶片边缘微蔫的绿植以及窗外稀疏淡黄枝影。画面下部深色桌沿留出平稳暗调阅读区，重要稿纸与人物互动集中在中央 50% 宽度内。
```

验收清单：

- [ ] 镜头拉近并压高俯角，让桌前推回的 A4 打印论文稿纸占据核心前景，一眼可辨红笔圈画、蓝笔眉批与铅笔划线满页感
- [ ] 林越内搭统一为圆领白 T 恤 + 浅灰蓝针织开衫 + 细圆框眼镜，神情微怔克制
- [ ] 办公室背景保留暖气管、窗台绿植、两只白陶瓷杯与半合蓝灰笔记本，连续性无缝
- [ ] 在宽屏和窄屏实际运行，脸、手、核心物件和动作完整，正文与姓名清楚。
- [ ] 与前后图的角色、空间和物件一致。提交可编辑原图、导出图和对照截图。

### 6.5 cg-modern-xiangjun，P0

- 画面：5. cg-modern-xiangjun（CG · 湘君断桨与参差）
- 剧情锚点：modern-k-E-3「手中一支桨，拦腰折断；怀里一支参差（排箫）……把好好的桨，都折成了两截」
- 运行路径：art/cg-modern-xiangjun.webp
- 原图固定链接：https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-xiangjun.webp
- 制作尺寸：建议制作尺寸 1536×864（16:9；湘君立于舟头居中，断桨两截横跨胸前安全区）
- 连续性参考：继承昆仑水路篇统一的冷青蓝江雾水色（与 cg-modern-cloud-lord / xiangfuren / siming 一致），升级人物风霜神态与先秦材质
- 重制原因：原图画成双手捧着两小片像竹牌/碎木块的短板，与「完整长木桨拦腰折断」尺寸矛盾；怀里完全缺少「参差（排箫）」；舟尾多出另一条空船角。

可复制提示词：

```text
中国古风厚涂水墨写实插画风格，克制苍凉神话电影感，冷青蓝江雾天光。茫茫无际的清冷青蓝江水之上，轻雾低垂，水波微泛细浪。一叶古朴粗糙的原木独木小舟静浮江心，舟头迎风立着湘君：一位面容清瘦、眉眼带着漫长等待与沧桑风霜感的先秦青年男子，乌发以素木或青玉笄简单束起，几缕碎发被湿冷江风吹散，身着宽大层叠的灰青与月白素麻深衣，衣褶厚重质朴。他双手横握在胸前，正持着一根完整真实尺寸的古代长木桨拦腰折断后的两截——左手握着带着宽大磨损木质桨叶的下半截，右手握着修长的上半截木杆，两段木桨在胸前断口相对，断裂处呈现出新鲜粗糙的木纤维劈裂茬口，尺度真实厚重。他左胸怀抱的衣襟腰带间，斜插着一具由十几根长短依次递减的细竹管麻绳编缀而成的先秦参差（古代竹排箫），竹节色泽温润泛旧。小舟周围江面开阔空灵，远处水天相连溶入淡青灰色浓雾，隐约可见几笔淡墨远山影。整体笔触沉稳凝重，突出麻布肌理、旧木湿气与水雾漫射光感，构图将人物与断桨收于中央 45% 安全区，底部深青江水与船底保留平滑暗区供正文叠字。
```

验收清单：

- [ ] 湘君双手实实在在握着一根真实尺寸木桨拦腰折断后的两截（一截保留宽阔船桨桨叶与磨旧木柄，另一截为长木杆，断茬木纹劈裂清晰）
- [ ] 怀中或腰带间清晰斜插着一排长短递减的古代竹制参差（排箫）
- [ ] 单人独木舟立于雾茫冷蓝大江之上，人物具先秦古风沉郁风霜感与厚涂水墨油画肌理，构图干净
- [ ] 在宽屏和窄屏实际运行，脸、手、核心物件和动作完整，正文与姓名清楚。
- [ ] 与前后图的角色、空间和物件一致。提交可编辑原图、导出图和对照截图。

### 6.6 cg-modern-last-geese，P0

- 画面：6. cg-modern-last-geese（CG · 戌战死荒原望七雁南飞）
- 剧情锚点：modern-r-E1-6「天要暗了。有七只大雁，排成一字，从头上飞过去……眼皮重了，合上」
- 运行路径：art/cg-modern-last-geese.webp
- 原图固定链接：https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-last-geese.webp
- 制作尺寸：建议制作尺寸 1536×864（16:9；高远天空七雁斜阵与地面仰卧少年构成天地呼应）
- 连续性参考：继承 portrait-xu（戎装/麻袍少年「戌」的面容轮廓与发髻）以及 cg-modern-city 的战国灰褐城墙与克制写实色调
- 重制原因：现图鼻梁有金属反光片伪影、左手手指肿胀畸变、白麻袍下摆糊着高饱和宝蓝色矩形块；同时代码曾错误将该图提前绑定于夜城头 modern-r-D-1。

可复制提示词：

```text
先秦战国写实厚涂电影插画风格，克制悲怆肃穆质感，战后黄昏将尽的灰褐琥珀余晖。昔日楚国古城外开阔荒凉的沙土荒原，天色正在沉入暮暗，低沉铅灰与暗淡暖褐云层交错，远处剪影般屹立着残破古城墙垛口，几缕灰烟缓慢升起。前景地面泥沙碎石之上，身着粗糙旧米白麻布交领短袍与深褐绑腿的少年「戌」仰面静静倒卧在地面（继承人物「戌」的清瘦东亚少年面庞，黑发散落半束，面颊干净舒展，带着战后泥灰擦痕，双目安静轻阖，神情归于疲惫后的平淡与释然）。他右手自然收放在胸腹一侧，左手掌与五指解剖比例准确、舒展垂落于荒草沙石之间，衣襟与下摆麻布纹理完整连贯，仅见泥尘摩擦痕迹与克制暗沉的干涸血渍，浑然融入大地色调。高远苍茫的暮色天空中，七只姿态舒展的野雁排成一字微斜的行列，正迎着最后一丝微弱天光向南高飞远去，翅膀姿态各具微差。整体采用低机位广角仰平视角，下方半幅地面沙石荒原呈现低对比度暗灰褐阴影区供下方文字清楚显示，高空雁阵与仰卧少年身躯上下呼应。
```

验收清单：

- [ ] 人物面部自然洁净、双手五指比例正确舒展、粗糙米白/灰褐麻布短袍衣褶连贯且只有克制泥灰暗血迹，色彩统一
- [ ] 时间准确落在城外战后黄昏余晖（天地将暗），远处残破古城垛口烟尘低垂
- [ ] 高空七只大雁排成自然舒展的一字/人字斜阵南飞，具有呼吸感而非机械直线复制
- [ ] 提示词配套建议：另须同步把该 CG 从 modern-r-D-1（夜城头吃橘子）解绑，只保留于 modern-r-E1-6
- [ ] 在宽屏和窄屏实际运行，脸、手、核心物件和动作完整，正文与姓名清楚。
- [ ] 与前后图的角色、空间和物件一致。提交可编辑原图、导出图和对照截图。

### 6.7 cg-modern-kunlun-light，P1

- 画面：7. cg-modern-kunlun-light（CG · 昆仑无影青蓝天光）
- 剧情锚点：modern-k-F-1「这里没有黑夜……蓝太亮了，亮得没有影子。连他自己的影子，都没了」
- 运行路径：art/cg-modern-kunlun-light.webp
- 原图固定链接：https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-kunlun-light.webp
- 制作尺寸：建议制作尺寸 1536×864（16:9；六童横列或浅弧立于蓝水浅滩，面向远方洁净过分的青蓝天光）
- 连续性参考：继承 cg-modern-storm 里六个孩童的准确外貌与伤痕特征（戌、雩、芈、沅、媭、荼），继承 light-river 的青蓝昆仑色相
- 重制原因：原文核心异象是「蓝太亮了，亮得没有影子」，而现图画成暖白大白天鹅卵石滩，且每个孩子脚下都有清晰深色投影，背影也难以分辨六人各自体征。

可复制提示词：

```text
中国古风奇幻写实厚涂插画风格，克制清冷抽离的诡异静谧感，均匀全向漫射的清亮青蓝天光。仿佛到达昆仑的岸边浅滩，天空与宽阔江水呈现奇异通透、饱和却洁净过分的青蓝色，宛如永远悬在半空的均匀天光笼罩天地四方。全向漫射的清亮青蓝光线温柔而周全均匀地包裹一切物体，人物脚下、碎石滩面与草屋边缘均呈现出统一清透的浅蓝反光与柔和漫射水色，天地间一片澄明匀净。水际停泊着一叶空木小舟，浅滩与岸边草地上面向远方站立或半侧着六个饱经风霜的先秦布衣孩童，各自外貌体征清楚可辨：蒙着白布双眼的少女「雩」静立在侧；颈侧带着旧伤痕迹、手抱洁白骨笛的哑童「芈」站在中间；年纪最小的微胖稚童「沅」紧挨着大家；左衣袖空空折起垂落的独臂少女「媭」站姿微偏；左面颊带着一块淡紫红色胎记的少女「荼」略微仰头；以及站在最靠前、回首或侧望众人的少年「戌」。他们粗糙灰褐与旧米白的麻布衣衫，与远方过分整洁的青绿草屋、笔直饱满挂果的树木和光洁岸石形成冷峻对比，带着一丝疏离尘世的甜腻静态感。画面采用略低平视角广角构图，六名孩童聚集在中央 55% 宽幅安全区内，近景浅蓝水波底部自然渐变柔和，供剧情字幕清楚读取。
```

验收清单：

- [ ] 天地呈现奇异通透的高亮度青蓝漫射天光（非暖黄阳光），四面匀亮柔和，人物脚下与岸石呈纯净漫射反光水色，视觉上呈现「亮得失却阴影」的诡异澄澈感
- [ ] 岸边 6 名孩子特征全部清晰可辨：蒙白布眼的女孩「雩」、颈间留疤抱洁净骨笛的短发「芈」、最小矮胖「沅」、左袖空垂叠折独臂少女「媭」、左颊生暗紫胎记少女「荼」，以及站在稍侧或靠前的少年「戌」
- [ ] 远处可见过分整齐洁净的浅水、直立果树与草屋，带着一丝非人间烟火的甜腻静态感
- [ ] 在宽屏和窄屏实际运行，脸、手、核心物件和动作完整，正文与姓名清楚。
- [ ] 与前后图的角色、空间和物件一致。提交可编辑原图、导出图和对照截图。

## 7. 微调、保留、归档与可选增补的完整清单

本节与第 6 节共同覆盖 82 条库存记录。每项的 `art/` 是相对运行路径，在仓库中对应 `public/art/`。固定链接均取审查基线；原图不随本文重做。优先级是制作队列，不是已确认的线上故障等级。

### 7.1 十二项微调，优先保留原图

R2 宿舍四个变体按独立资产计数，但应先修共同母版再一次导出，不是分别生成四张新画。`cg-modern-donghuang` 当前被规则覆盖，先确认是否恢复上屏，再决定微调，避免做完仍看不到。

| 资产与原图 | 运行路径 | 场景 | 微调内容与边界 |
|---|---|---|---|
| [modern-dorm](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/modern-dorm.webp) | `art/modern-dorm.webp` | modern-k-E-7 | 1536x864(16:9)；经代码核实在modern-k-E-7第5段闪回时实际切换上屏，但左下书桌仍保留旧版凸心玉扣，同源覆盖为R2空桌即可。 |
| [modern-library](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/modern-library.webp) | `art/modern-library.webp` | modern-o-4-1, modern-o-4-2 | 1536x864(16:9)；整体窗光、厚涂油画质感极佳；仅右下桌面小玉扣中心呈浅凹坑而非通透小圆孔，局部修补圆孔即可。 |
| [cg-modern-dorm-unease-r2](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-dorm-unease-r2.webp) | `art/cg-modern-dorm-unease-r2.webp` | modern-o-0-2 | 1280x720(+720x960)；整体光影与投影框极佳，唯手举玉扣左下表面留有一小块旧版涂抹残灰斑且口径略大，同源局部清斑微收尺度即可。 |
| [cg-modern-dorm-carving-r2](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-dorm-carving-r2.webp) | `art/cg-modern-dorm-carving-r2.webp` | modern-o-0-2 | 1280x720(+720x960)；刻刀与竹简「何」字精准，仅继承上述同源玉扣左下角浅灰残痕，局部随母版清洁即可。 |
| [cg-modern-dorm-dark-r2](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-dorm-dark-r2.webp) | `art/cg-modern-dorm-dark-r2.webp` | modern-o-0-2 | 1280x720(+720x960)；同源暗场照明，4189实测20/28暗区阅读良好；若修母版玉扣左下残痕需同步导出。 |
| [cg-modern-jade-light-r2](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-jade-light-r2.webp) | `art/cg-modern-jade-light-r2.webp` | modern-o-0-2 | 1280x720(+720x960)；同源玉扣微亮变体，4189实测27/28聚焦良好；随母版同步清洁左下残痕即可。 |
| [cg-modern-summit](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-summit.webp) | `art/cg-modern-summit.webp` | modern-o-5-6 | 1536x864；林越、沈辞、唐瑾、宋嘉树站位与落日山顶极佳；仅林越左后方出现一名同样绿背包+圆框眼镜+黑发撞脸路人背影，局部Inpaint替换路人即可。（注：三人休闲外套与o-5-4校服差异已单列原稿/服装连续性说明） |
| [cg-modern-dongjun](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-dongjun.webp) | `art/cg-modern-dongjun.webp` | modern-k-E-7 | 1536x864；金波游鱼极佳，唯左上龙车与右上树冠带轻度矢量描边感，局部水墨雾气柔化即可。 |
| [cg-modern-reed-boat](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-reed-boat.webp) | `art/cg-modern-reed-boat.webp` | modern-r-A-6, modern-k-G-1, modern-k-G-2 | 1536x864；灰白芦苇岸与村人站位极好，仅六具幼躯过于整齐，局部在布边点绘糖纸残片/红绳小纸船/草茎遗物即可。 |
| [cg-modern-donghuang](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-donghuang.webp) | `art/cg-modern-donghuang.webp` | modern-k-F-5(被首句/天开了/覆盖) | 1536x864；当前仅见2童且蒙眼布错戴于男孩而非少女雩，若未来代码启用需补齐六童轮廓与蒙眼雩。 |
| [portrait-linyue-face](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-linyue-face.webp) | `art/portrait-linyue-face.webp` | portraitFace() | 240x264；仍裁切自R1旧版portrait-linyue而非R2林越立绘，同源重裁R2头部替换即可。 |
| [portrait-roommate-face](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-roommate-face.webp) | `art/portrait-roommate-face.webp` | portraitFace() | 256x256；顶部发丝边缘留有明显白色锯齿杂边，同源重裁clean alpha即可。 |

### 7.2 五十七项保留，只有新证据才调整

保留表示目前没有足够收益支持重画，不表示每张都经过全线人工实玩。共用古代图还服务沈辞原篇，更不能为了现代卷无条件替换。服装跨场次等争议见第 4 节。

| 资产与原图 | 分类及使用状态 | 场景 | 运行路径 |
|---|---|---|---|
| [modern-dorm-quiet-r2](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/modern-dorm-quiet-r2.webp) | 背景，实用 | modern-o-0-2, modern-o-4-1, modern-o-4-2 | `art/modern-dorm-quiet-r2.webp` |
| [modern-office](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/modern-office.webp) | 背景，实用 | modern-o-5-1, modern-o-5-2 | `art/modern-office.webp` |
| [modern-mountain-path](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/modern-mountain-path.webp) | 背景，实用 | modern-o-5-3, modern-o-5-4, modern-o-5-5 | `art/modern-mountain-path.webp` |
| [modern-sunset](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/modern-sunset.webp) | 背景，实用 | title, modern-o-5-6, modern-o-5-7, modern-home | `art/modern-sunset.webp` |
| [cg-modern-jade-palm-r2](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-jade-palm-r2.webp) | CG，实用(+ -m) | modern-o-0-1 | `art/cg-modern-jade-palm-r2.webp` |
| [cg-modern-selection](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-selection.webp) | CG，实用 | modern-o-0-4 | `art/cg-modern-selection.webp` |
| [cg-modern-noodles](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-noodles.webp) | CG，实用 | modern-o-4-1 | `art/cg-modern-noodles.webp` |
| [cg-modern-glance](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-glance.webp) | CG，实用 | modern-o-5-5 | `art/cg-modern-glance.webp` |
| [cg-modern-photo](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-photo.webp) | CG，实用 | modern-o-5-7 | `art/cg-modern-photo.webp` |
| [cg-modern-ritual](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-ritual.webp) | CG，实用 | modern-r-C-6, modern-r-C-7 | `art/cg-modern-ritual.webp` |
| [cg-modern-city](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-city.webp) | CG，实用 | modern-r-C-12 | `art/cg-modern-city.webp` |
| [cg-modern-storm](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-storm.webp) | CG，实用 | modern-k-D-5, modern-k-D-6 | `art/cg-modern-storm.webp` |
| [cg-modern-cloud-lord](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-cloud-lord.webp) | CG，实用 | modern-k-E-1 | `art/cg-modern-cloud-lord.webp` |
| [cg-modern-xiangfuren](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-xiangfuren.webp) | CG，实用 | modern-k-E-4 | `art/cg-modern-xiangfuren.webp` |
| [cg-modern-siming](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-siming.webp) | CG，实用 | modern-k-E-5 | `art/cg-modern-siming.webp` |
| [cg-modern-shaosiming](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-shaosiming.webp) | CG，实用 | modern-k-E-6 | `art/cg-modern-shaosiming.webp` |
| [cg-modern-mountain-spirit](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-mountain-spirit.webp) | CG，实用 | modern-k-E-8 | `art/cg-modern-mountain-spirit.webp` |
| [cg-modern-river-lord](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-river-lord.webp) | CG，实用 | modern-k-E-9 | `art/cg-modern-river-lord.webp` |
| [cg-modern-gods-rite](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-gods-rite.webp) | CG，实用 | modern-k-E-12 | `art/cg-modern-gods-rite.webp` |
| [cg-modern-fork](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-fork.webp) | CG，代码屏蔽未触发 | modern-c-1-13(被首句/村口/覆盖) | `art/cg-modern-fork.webp` |
| [cg-modern-feast](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-feast.webp) | CG，代码屏蔽未触发 | modern-r-A-4(被首句/楚宫/覆盖) | `art/cg-modern-feast.webp` |
| [cg-modern-battle](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-battle.webp) | CG，代码屏蔽未触发 | modern-r-C-11(被首句/城墙/覆盖) | `art/cg-modern-battle.webp` |
| [portrait-linyue-modern](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-linyue-modern.webp) | 立绘与头像，实用 | modern-o-0-1, modern-o-0-2, modern-o-4-1, modern-o-4-2, modern-o-5-1..5 | `art/portrait-linyue-modern.webp` |
| [portrait-linyue-modern-thoughtful](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-linyue-modern-thoughtful.webp) | 立绘与头像，实用 | modern-o-0-1, modern-o-0-2, modern-o-4-1, modern-o-4-2, modern-o-5-2 | `art/portrait-linyue-modern-thoughtful.webp` |
| [portrait-linyue-modern-smile](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-linyue-modern-smile.webp) | 立绘与头像，实用 | modern-o-0-1, modern-o-5-2, modern-o-5-4 | `art/portrait-linyue-modern-smile.webp` |
| [portrait-linyue-modern-puzzled](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-linyue-modern-puzzled.webp) | 立绘与头像，实用 | modern-o-0-1, modern-o-0-2, modern-o-4-1 | `art/portrait-linyue-modern-puzzled.webp` |
| [portrait-linyue-modern-alert](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-linyue-modern-alert.webp) | 立绘与头像，备用 | modern-o-0-1:25(CG激活隐藏) | `art/portrait-linyue-modern-alert.webp` |
| [portrait-linyue-modern-surprised](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-linyue-modern-surprised.webp) | 立绘与头像，备用 |  | `art/portrait-linyue-modern-surprised.webp` |
| [portrait-roommate-modern](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-roommate-modern.webp) | 立绘与头像，备用(含人物志) | 人物志 | `art/portrait-roommate-modern.webp` |
| [portrait-roommate-modern-concerned](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-roommate-modern-concerned.webp) | 立绘与头像，实用 | modern-o-4-1 | `art/portrait-roommate-modern-concerned.webp` |
| [portrait-roommate-modern-focused](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-roommate-modern-focused.webp) | 立绘与头像，备用 |  | `art/portrait-roommate-modern-focused.webp` |
| [portrait-roommate-modern-puzzled](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-roommate-modern-puzzled.webp) | 立绘与头像，备用 |  | `art/portrait-roommate-modern-puzzled.webp` |
| [portrait-roommate-modern-smile](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-roommate-modern-smile.webp) | 立绘与头像，备用 |  | `art/portrait-roommate-modern-smile.webp` |
| [portrait-roommate-modern-surprised](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-roommate-modern-surprised.webp) | 立绘与头像，备用 |  | `art/portrait-roommate-modern-surprised.webp` |
| [hut](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/hut.webp) | 共用古代背景，实用(跨卷共用) | modern-k-A-1, modern-k-A-8, modern-k-F-2, modern-o-0-5, modern-o-0-8 | `art/hut.webp` |
| [light-river](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/light-river.webp) | 共用古代背景，实用(跨卷共用) | modern-k-D-13, modern-k-F-1, modern-k-F-5, modern-k-F-6 | `art/light-river.webp` |
| [mountain](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/mountain.webp) | 共用古代背景，实用(跨卷共用) | modern-k-A-9, modern-k-B-1, modern-r-L-4 | `art/mountain.webp` |
| [palace](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/palace.webp) | 共用古代背景，实用(跨卷共用) | modern-k-A-1, modern-r-A-4, modern-r-B-12, modern-r-B-13, modern-r-B-4, modern-r-B-7a, modern-r-B-9a, modern-r-C-10, modern-r-C-1a, modern-r-C-4a, modern-r-C-9, modern-r-L-1 | `art/palace.webp` |
| [ritual](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/ritual.webp) | 共用古代背景，实用(跨卷共用) | modern-k-D-2, modern-k-D-3, modern-o-0-3, modern-r-A-7, modern-r-B-6, modern-r-C-1, modern-r-C-2, modern-r-C-5 | `art/ritual.webp` |
| [river](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/river.webp) | 共用古代背景，实用(跨卷共用) | modern-c-1-13, modern-k-A-10, modern-k-A-11, modern-k-A-12, modern-k-A-2, modern-k-A-3, modern-k-A-4, modern-k-A-5, modern-k-A-6, modern-k-A-7, modern-k-A-8, modern-k-B-10, modern-k-B-11, modern-k-B-12, modern-k-B-13, modern-k-B-14, modern-k-B-15, modern-k-B-4, modern-k-B-5, modern-k-B-6, modern-k-B-7, modern-k-B-8, modern-k-B-9, modern-k-C-1, modern-k-C-2, modern-k-C-3, modern-k-C-4, modern-k-C-5, modern-k-C-6, modern-k-D-1, modern-k-D-10, modern-k-D-11, modern-k-D-12, modern-k-D-2, modern-k-D-3, modern-k-D-4, modern-k-D-5, modern-k-D-6, modern-k-D-7, modern-k-D-8, modern-k-D-9, modern-k-E-1, modern-k-E-10, modern-k-E-11, modern-k-E-12, modern-k-E-2, modern-k-E-5, modern-k-E-6, modern-k-E-8, modern-k-E-9, modern-k-F-3, modern-k-F-4, modern-k-F-6, modern-k-G-1, modern-k-G-2, modern-k-G-3, modern-k-G-4, modern-o-0-7, modern-o-2-1, modern-o-2-2, modern-o-2-3, modern-o-2-4, modern-o-2-5, modern-o-2-6, modern-o-2-7, modern-r-A-1, modern-r-A-6a, modern-r-B-11, modern-r-D-11, modern-r-D-6, modern-r-E2-5, modern-r-E2-7, modern-r-F-6, modern-r-L-3 | `art/river.webp` |
| [ruins](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/ruins.webp) | 共用古代背景，实用(跨卷共用) | modern-k-B-15, modern-k-C-1, modern-r-C-11, modern-r-C-1a, modern-r-D-1, modern-r-D-11, modern-r-E1-2, modern-r-E1-5 | `art/ruins.webp` |
| [study](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/study.webp) | 共用古代背景，实用(跨卷共用) | modern-r-A-2, modern-r-A-3, modern-r-A-5, modern-r-B-12, modern-r-B-14, modern-r-B-5a, modern-r-C-1a, modern-r-D-7, modern-r-F-3 | `art/study.webp` |
| [tomb](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/tomb.webp) | 共用古代背景，实用(跨卷共用) | modern-r-B-1, modern-r-B-2, modern-r-B-8 | `art/tomb.webp` |
| [village](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/village.webp) | 共用古代背景，实用(跨卷共用) | modern-c-1-13, modern-c-1-13a, modern-c-1-13b, modern-k-B-10, modern-k-B-13, modern-k-B-2, modern-k-B-3, modern-o-0-6, modern-r-A-1, modern-r-A-3a, modern-r-A-8, modern-r-B-10, modern-r-B-11, modern-r-B-3, modern-r-B-5, modern-r-B-7, modern-r-B-9, modern-r-C-3, modern-r-C-4, modern-r-C-8, modern-r-D-10, modern-r-D-12, modern-r-D-2, modern-r-D-3, modern-r-D-4, modern-r-D-5, modern-r-D-6, modern-r-D-8, modern-r-D-9, modern-r-E1-1, modern-r-E1-3, modern-r-E1-4, modern-r-E1-7, modern-r-E2-1, modern-r-E2-2, modern-r-E2-3, modern-r-E2-4, modern-r-E2-6, modern-r-F-1, modern-r-F-2, modern-r-F-5, modern-r-L-2, modern-r-L-5, modern-r-L-6, modern-r-L-7, modern-r-L-8 | `art/village.webp` |
| [xu](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-xu.webp) | 共用立绘，实用(跨卷共用) | modern-k-A-2, modern-k-A-3, modern-k-A-8, modern-k-B-12, modern-k-B-4, modern-k-B-6, modern-k-B-7, modern-k-C-1, modern-k-D-10, modern-k-F-4, modern-k-G-3, modern-o-0-5, modern-o-0-7, modern-o-0-8, modern-o-2-5, modern-o-2-6, modern-o-2-7, modern-r-A-1, modern-r-A-2, modern-r-A-3, modern-r-A-4, modern-r-A-5, modern-r-A-6a, modern-r-A-7, modern-r-A-8, modern-r-B-1, modern-r-B-10, modern-r-B-11, modern-r-B-12, modern-r-B-13, modern-r-B-14, modern-r-B-2, modern-r-B-3, modern-r-B-4, modern-r-B-5, modern-r-B-5a, modern-r-B-6, modern-r-B-7, modern-r-B-7a, modern-r-B-8, modern-r-B-9, modern-r-B-9a, modern-r-C-1, modern-r-C-10, modern-r-C-11, modern-r-C-1a, modern-r-C-2, modern-r-C-3, modern-r-C-4, modern-r-C-5, modern-r-C-8, modern-r-C-9, modern-r-D-1, modern-r-D-10, modern-r-D-12, modern-r-D-2, modern-r-D-3, modern-r-D-4, modern-r-D-5, modern-r-D-6, modern-r-D-7, modern-r-D-8, modern-r-D-9, modern-r-E1-1, modern-r-E1-3, modern-r-E1-4, modern-r-E2-1, modern-r-E2-2, modern-r-E2-4, modern-r-E2-5, modern-r-E2-7, modern-r-F-1, modern-r-F-2, modern-r-F-5, modern-r-L-1, modern-r-L-3, modern-r-L-4, modern-r-L-5, modern-r-L-7, modern-r-L-8 | `art/portrait-xu.webp` |
| [amao](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-amao.webp) | 共用立绘，实用(跨卷共用) | modern-o-0-5 | `art/portrait-amao.webp` |
| [elder](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-elder.webp) | 共用立绘，实用(跨卷共用) | modern-r-D-3 | `art/portrait-elder.webp` |
| [gouzi](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-gouzi.webp) | 共用立绘，实用(跨卷共用) | modern-o-0-7, modern-r-C-2, modern-r-D-8 | `art/portrait-gouzi.webp` |
| [quheng](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-quheng.webp) | 共用立绘，实用(跨卷共用) | modern-c-1-13, modern-r-A-1, modern-r-A-5, modern-r-A-6a, modern-r-B-12, modern-r-B-2, modern-r-B-5a, modern-r-C-4, modern-r-D-2, modern-r-D-4, modern-r-E2-5, modern-r-L-1 | `art/portrait-quheng.webp` |
| [wuyang](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-wuyang.webp) | 共用立绘，实用(跨卷共用) | modern-c-1-13, modern-k-A-11, modern-k-B-1, modern-k-B-15, modern-k-C-1, modern-k-C-2, modern-k-C-6, modern-k-E-10, modern-o-0-3, modern-r-A-1, modern-r-A-6a, modern-r-A-8, modern-r-C-1, modern-r-D-5 | `art/portrait-wuyang.webp` |
| [chang](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-chang.webp) | 共用立绘，实用(跨卷共用) | modern-r-A-2, modern-r-A-3, modern-r-A-3a, modern-r-B-12, modern-r-B-14, modern-r-B-5, modern-r-C-3, modern-r-D-1, modern-r-D-7, modern-r-D-9, modern-r-E1-7, modern-r-E2-3 | `art/portrait-chang.webp` |
| [yu](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-yu.webp) | 共用立绘，实用(跨卷共用) | modern-k-A-2, modern-k-A-5, modern-k-A-7, modern-k-B-1, modern-k-B-14, modern-k-D-12, modern-k-D-7, modern-k-F-4 | `art/portrait-yu.webp` |
| [xua-v3](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-xua-v3.webp) | 共用立绘，实用(跨卷共用) | modern-k-A-1, modern-k-A-6, modern-k-A-8, modern-k-B-1, modern-k-B-15, modern-k-B-3, modern-k-B-5, modern-k-C-1, modern-k-D-10, modern-k-D-7, modern-k-E-6, modern-r-D-9 | `art/portrait-xua-v3.webp` |
| [yuan](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-yuan.webp) | 共用立绘，实用(跨卷共用) | modern-k-A-3, modern-k-B-3, modern-k-D-8, modern-k-F-1, modern-r-D-6 | `art/portrait-yuan.webp` |
| [tu-v2](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-tu-v2.webp) | 共用立绘，实用(跨卷共用) | modern-k-A-2 | `art/portrait-tu-v2.webp` |
| [song](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-song.webp) | 共用立绘，实用(跨卷共用) | modern-o-5-4 | `art/portrait-song.webp` |
| [tang](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-tang.webp) | 共用立绘，实用(跨卷共用) | modern-o-5-4 | `art/portrait-tang.webp` |

### 7.3 五项归档，不重制也不直接删文件

以下是审查基线里的历史未使用图。它们不属于当前重制工作量。删除前须确认人物志、画廊、离线版、旧存档和其他卷引用。

| 资产与原图 | 运行路径 | 归档依据 |
|---|---|---|
| [modern-projection](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/modern-projection.webp) | `art/modern-projection.webp` | 1536x864(16:9)；未被assets.ts引用（钢笔竹简旧版），已被cg-modern-dorm-carving-r2取代。 |
| [cg-modern-projection](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-projection.webp) | `art/cg-modern-projection.webp` | 1536x864；R2前钢笔竹简旧版，未启用。 |
| [cg-modern-friends](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-friends.webp) | `art/cg-modern-friends.webp` | 1536x864；校园圆桌四同学图，与cg-modern-campus-friends像素完全重复且无场景引用。 |
| [cg-modern-campus-friends](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/cg-modern-campus-friends.webp) | `art/cg-modern-campus-friends.webp` | 1536x864；与cg-modern-friends完全同图且无场景引用。 |
| [portrait-linyue](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/art/portrait-linyue.webp) | `art/portrait-linyue.webp` | 768x1152；R1旧版遗留文件，assets:check报unreferenced。 |

### 7.4 一项可选增补，不当作现有破图

`prop-question-jade (questionJade)`：当前src/data/world.ts仅文字定义「何字玉扣」，src/data/relics.ts未收录现代物笺且无prop-*图文件；属可选增量建议，非现有损坏文件。 若做物笺或观察交互，可新增同源正反视图和通孔细节。先确认是否需要这个交互，再制作，不阻塞七项重制。

配套 `全局美术审查库存.json` 保留每项原尺寸、使用状态、证据、场景和固定原图链接。接触表位于 `report_sheets/`。

## 8. UI、游玩体验和交互性表达

### 8.1 先读得舒服，再增加交互

| 方向 | 本批可以做什么 | 怎样验收 |
|---|---|---|
| 文字与画面主次 | 按场景调整正文底层、行宽、姓名和顶部状态，保住明暗与笔触 | 最大字号、长句、浅色高光背景下仍可读，不遮关键眼神和手势 |
| 竖屏构图 | 为双人递物、稿纸、群像制定同源安全画幅 | 390×844、415×687 看清两张脸、递物手、碗或稿，画面不过小。对比 contain 与同源竖构图 |
| 矮横屏 | 修结局操作区、标题、弹窗、字号上限的拥挤 | 662×375、844×390 和 320×568 下长句加最大字号可读。可滚动内容有明确线索，按钮可达且不叠字 |
| 自动与快进 | 状态即时可辨，开关反馈与真正推进同步 | 开关、暂停、恢复、弹窗、导入、未读停、内联物笺例外都准确，不因动画误认为未响应 |
| 存读档与回看 | 清楚显示卷、场和页，保护自动档与旧档 | 重开确认可取消，双卷独立，导入后精确页，回看用真实历史重读，不产生误翻页 |
| 输入与可访问性 | 保留键盘、触屏、焦点、44px 触区和减弱动态 | 鼠标、Enter、Space、Esc、键盘焦点与触控均可走完整入口。触屏不残留 hover，减弱动态仍传达状态 |

任何调整都应核对宽屏、竖屏、矮横屏。不要用全局缩小字号解决局部遮挡，不用提高人物透明度解决文字冲突，不以越来越厚的纯黑遮罩抹掉画面。

### 8.2 让交互表达叙事行为

第一批选一处验证，不一次加入全套系统。推荐在下列方案中独立比较后选最合适的一处：

- 问字摊观察玉扣。点击或键盘聚焦刻痕，出现局部细节与一个短回应。玩家看见“何”和通孔，完成一次观察，不增加无意义的强制点击。
- 图书馆翻译。让“留白”和写下“不译。”成为一次可感知的停顿或落笔反馈。正文可正常继续，自动和快进不被锁死。是否提供选择需尊重现有原稿。
- 办公室稿纸。点开同源高分辨率批注层，聚焦一处真实可读的修改痕迹，关闭后准确返回原页。不要把论文阅读变成像素找物。

每个交互都要有动作、可见或可听反馈、回到阅读的路径，以及键盘和触屏替代。只读与自动模式应有等价的叙事信息。没有剧情依据就不要加数值好感、收集任务、成就刷取和新结局。

## 9. 现代线音乐：实际生产、接入和听审

### 9.1 先盘现有音轨，不假设现代线完全无音乐

仓库已经有 `public/audio/`、`public/audio/manifest.json`、`src/audio.ts`、`src/score.ts`、`src/data/soundtrack.json`、`audio-prompts.json`。可见曲目包含 `music-old-jade.mp3`、`music-light-in-kitchen.mp3`、`music-under-current.mp3`、`music-small-goodbyes.mp3`。文件存在不等于适合现代卷，也不等于每场已经正确触发。

盘点每条现代场景实际触发的曲目、氛围与音效。列出入点、出点、循环点、跨场延续、自动阅读和回看时的行为。记录时长、采样率、响度、峰值、来源、授权依据与现有用途。先保留旧卷音轨，不把现代配乐覆盖到同名共用文件。

现有 manifest 声明部分音乐来源为 Local ACE-Step 1.5，母带策略记为约 -18 LUFS、峰值 -2 dBTP。这是仓库历史元数据，不是本次听审结果，也不是工具现在仍可用或授权已完成核实的证明。历史 `docs/art/art-direction-4-music-jobs.json` 可作流程参考，不能把旧路径当成当前可运行服务。

### 9.2 原创现代主题和 cue sheet 建议

先给两段约 30 至 45 秒方向小样供比较，再制作第一组完整可循环成品。以下是候选组织，不要求机械制作六首。先对照剧情和现有音轨，确定保留、改编和新作的边界。

共同主题可用原创的三音上行问句与未完全解决的回落，音符和节奏由本次作曲确认。日常、问字、归返与结局保留同一动机，不拼贴不同曲库。音乐为连续阅读留空间，文化交汇体现在音色、句法和场景呼应，不能用泛民族标签或模仿在世艺人替代作品方向。

| 候选 cue | 场景与功能 | 音乐建议 | 循环和过渡建议 |
|---|---|---|---|
| M01 异乡街角 | `modern-o-0-1` 的海外日常和接近摊位 | 68 至 76 BPM，稀疏软钢琴或柔和电钢、轻拨弦、低密度木质声，带一点行走感 | 约 90 至 150 秒，柔和开放尾。进问字时抽掉日常脉冲 |
| M02 何的回声 | 问字、宿舍第三声、手刻、灯灭和玉扣亮 | 延展日常问句，低弦或温暖低频纹理、克制泛音、安静的停顿 | 可做主循环与稀疏异变层。灯灭和亮玉按实际 beat 变化，不堆惊吓爆点 |
| M03 一碗热面 | `modern-o-4-1` 返场宿舍与室友对话 | 60 至 68 BPM，近距离软钢琴与木吉他泛音，生活声另设氛围层 | 约 120 秒，段落变化慢。盛面、对话处给空间，不能每页重启 |
| M04 留白与批注 | `modern-o-4-2` 图书馆、`modern-o-5-1` 与 `5-2` 办公室 | 极稀疏钢琴、低中弦长音，问句逐渐有稳定回答 | 约 120 至 180 秒。“不译。”和接稿动作允许短暂音乐留白，继续阅读后自然延续 |
| M05 山路上的人 | `modern-o-5-3` 至 `5-5` 山行与擦肩 | 72 至 84 BPM，原声拨弦和柔软弦乐，保留朋友同行的呼吸 | 约 120 秒，层次稍开。黄衣女孩的瞬间只作轻微色彩偏移，避免强行揭谜 |
| M06 江面余光 | `modern-o-5-6`、`5-7`、`modern-home` 和现代结局 | 前述问句在更开阔和声中回落，柔和钢琴、弦乐和少量木管呼吸 | 约 150 至 180 秒，结局可以独立尾奏或稳定循环。进入菜单不突切高响度曲目 |

### 9.3 可直接制作的现代主题音乐提示词

这是新作方向提示，不是已生成或已听审音频。先核可用工具、权限、生成上限和模型授权，再按实际生成器语法调整。音乐提示也采用正向描述。

```text
为中文文学视觉小说《异托邦》的现代海外篇创作原创纯器乐室内电影配乐。音乐表现异乡大学生在旧街、宿舍、图书馆和江边山路逐渐理解自身归属的过程。约72 BPM，舒展的四拍子，温暖而克制，适合长时间安静阅读。以三音上行的短问句作为原创主题，回应句轻缓回落，保留开放的和声余韵。音色以柔软近距离钢琴、细腻木吉他泛音、温暖低音弦乐和少量有呼吸感的木管组成，音符之间留有充足空间，旋律短而清楚，声部密度低，动态平稳，空间混响自然。编排约150秒，开始是稀疏日常的钢琴问句，中段拨弦与低弦轻轻加入，后段主题得到温和回应，尾部保留可与开头衔接的开放和声与自然余韵。提供可持续循环的纯器乐版本，以及主题、和声和氛围分轨，保持对白阅读的清晰度和现代生活的亲近感。
```

派生时分别写明场景动作、情绪转折、需要保留的共同动机、配器密度和循环方式。不要用更换曲名冒充新作。古代段与现代归返可做主题呼应，但先验证过渡，不把所有场景统一成古风器乐。

### 9.4 实际交付和工具不可用时的处理

1. 核查当前环境可调用的作曲、音频生成或 DAW 工具。已有本地工作流只作参考，不假定它仍在线。不新增付费订阅、不购买音源或样本授权。
2. 生产可试听小样，记录生成参数、seed、选用和弃用原因。用户选定方向后，制作首组完整成品，修掉接缝和突兀动态。
3. 交付无损母带 WAV 或 FLAC、运行音频、循环点与淡入淡出参数。保留可获得的工程或 stems。没有工程的生成器就交原始音频、参数与处理记录，不能伪称有分轨。
4. 交付 `modern-cue-sheet`、来源与授权清单、母带处理记录、文件 SHA256 和最终场景映射。命名避免覆盖旧卷共用文件。
5. 接入资源、音乐室、场景 cue、预载与缓存。具体登记点以代码盘点为准。替换音乐后更新离线构建并检查体积。
6. 若没有可用生产工具，明确停在未完成。提交能实际执行的生产路径、所需工具和权限、逐 cue 可复制音乐提示词及导出规格，让用户能直接生产。只写计划不能标成“现代线音乐已完成”。测试蜂鸣、单振荡器和临时占位不能充当审美成品。

### 9.5 技术验收和真实听审分开记录

- 建议无损母带保留 44.1kHz 或 48kHz、24-bit。实际以工具原生输出与播放兼容决定，不能对低质量源上采样后宣称质量提高。
- 响度可从现有约 -18 LUFS、峰值不高于 -2 dBTP 的基准开始。要测量再填写数值，以连续阅读不抢正文为最终判断，不把建议当实测。
- 用耳机和扬声器真实听至少三个完整循环。记录循环接缝、低频、刺耳频段、动态、压缩失真、单声道兼容，以及长期阅读疲劳。
- 在真实游戏听街景到宿舍、灯灭到玉亮、古代到归返、宿舍到图书馆、办公室到山行、山顶到结局。确认淡入淡出、并发层数和环境声比例。
- 测静音、音量记忆、浏览器手势解锁、切页和切卷、隐藏标签页、回看、读档、自动与快进。避免同曲每页重新播放，快进不累积短音效。
- 自动音频测试可验证播放状态与资源，但不能代替听审。不能声称没听过的音频已听审。本次前序轮次没有完成真实音频听审。

## 10. 文件地图与固定版本入口

下列链接固定于美术审查基线 `81981bb`，便于对照历史。接手后的实现必须读最终 main 的同名文件，尤其是 `App.tsx` 中 PR #16 后续的内联物笺例外。不要用旧链接覆盖新 main。

| 工作 | 入口 |
|---|---|
| 现代卷编译、背景与图像绑定 | [`src/modern.ts`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/src/modern.ts) |
| 现代页级人物与演出 | [`src/data/modernPerformance.ts`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/src/data/modernPerformance.ts) |
| 现代故事生成物 | [`src/data/modern-story.json`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/src/data/modern-story.json) |
| 场次索引 | [`src/data/modern-index.json`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/src/data/modern-index.json) |
| 原文适配规则 | [`scripts/modern-adaptations.json`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/scripts/modern-adaptations.json) |
| 现代原文导入 | [`scripts/import_modern.py`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/scripts/import_modern.py) |
| 应用入口、存档与阅读交互 | [`src/App.tsx`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/src/App.tsx) |
| 引擎推进与状态 | [`src/engine.ts`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/src/engine.ts) |
| 存档命名空间 | [`src/storage.ts`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/src/storage.ts) |
| 自动阅读时序 | [`src/autoReading.ts`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/src/autoReading.ts) |
| 画面测量与合成 | [`src/components/Atmosphere.tsx`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/src/components/Atmosphere.tsx) |
| 角色层 | [`src/components/ActorLayer.tsx`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/src/components/ActorLayer.tsx) |
| 资源解析 | [`src/assets.ts`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/src/assets.ts) |
| 资源登记 | [`src/data/art-manifest.json`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/src/data/art-manifest.json) |
| 现代布局 | [`src/styles/modern.css`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/src/styles/modern.css) |
| 结局布局 | [`src/styles/ink-ending.css`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/src/styles/ink-ending.css) |
| 人物待机 | [`src/idle.ts`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/src/idle.ts) |
| 音乐 cue 与场景配乐 | [`src/score.ts`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/src/score.ts) |
| 播放、音量与混音 | [`src/audio.ts`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/src/audio.ts) |
| 音乐室目录 | [`src/data/soundtrack.json`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/src/data/soundtrack.json) |
| 音频产物元数据 | [`public/audio/manifest.json`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/public/audio/manifest.json) |
| R2 CG 导出 | [`scripts/process-modern-r2-art.py`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/scripts/process-modern-r2-art.py) |
| 角色分层导出 | [`scripts/process-modern-characters-r2.py`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/scripts/process-modern-characters-r2.py) |
| 角色分层校验 | [`scripts/check-modern-characters-r2.py`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/scripts/check-modern-characters-r2.py) |
| CG 源交付说明 | [`docs/art/modern-r2-round1.md`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/docs/art/modern-r2-round1.md) |
| 角色与窄窗交付说明 | [`docs/art/modern-r2-round2.md`](https://github.com/wujikei/heterotopia/blob/81981bbe4be51b26ed302f6ecf5ee50552273c25/docs/art/modern-r2-round2.md) |

源目录为 `resources/art-src/modern-r2/` 和 `resources/art-src/modern-characters-r2/`。工作流请读取最终 main 的 `.github/workflows/`，不要假定 Draft、堆叠分支和 main 使用相同触发条件。

原稿保护对象为 `最新/异托邦_完整剧情_人称标注版.txt`、`最新/异托邦_海外版现代线_独立卷.txt`。沈辞原篇数据 `src/data/story.json` 和旧卷 `heterotopia.v1.*` 存档契约不能连带改写。现代卷场号、页号、分支条件和书签不能为了换图随意重排。若必须迁移，先提交兼容方案与旧档验证。

## 11. 基线、试玩与交付验收

### 11.1 在新工作分支验证

以下命令供接手者执行。本次写任务书没有运行它们，也没有改仓库。先查看工作区。发现用户未提交内容时保留现场，用独立 worktree，不自动 stash、清理或切走用户分支。

```bash
git status --short
git branch --show-current
git log -1 --format='%H %s'
git fetch origin --prune
git log -1 origin/main --format='%H %s'
git log --oneline 85792c5d755e14b0d637a29ad7c6fca08baf8faa..origin/main
git diff --stat 85792c5d755e14b0d637a29ad7c6fca08baf8faa..origin/main
```

确认最终 main 后，在唯一命名的新工作分支或 worktree 安装依赖并验证：

```bash
npm ci
npm test
npm run build
npm run assets:check
npm run test:modern
npm run test:interactions
npm run test:modern-staging
npm run test:modern-characters
npm run test:cgs
npm run test:assets
npm run test:actor-variants
npm run test:endings
npm run test:relics
npm run test:browser
npm run test:localization
npm run test:audio
npm run test:reading-audio
```

这些是实际 package scripts。浏览器测试需要 Playwright 浏览器，按锁文件与报错安装，不升级整个依赖栈。默认 `with-preview` 包装器管理预览。只有确有独立预览时才设置 `VN_TEST_URL`，不要误测旧端口。

人物分层修改后补跑 `npm run art:modern-characters`。这个命令导出产物，必须先记录工作树，不在用户脏目录里尝试。离线包输出到独立位置，保护用户旧 `异托邦.html`：

```bash
VN_PORTABLE_OUTPUT=/tmp/heterotopia-codex-review/异托邦.html npm run portable
VN_PORTABLE_FILE=/tmp/heterotopia-codex-review/异托邦.html npm run test:portable
```

手测先构建，再用 `npm run preview -- --port 4198`。选择自己的空闲端口。该地址是接手者本机预览，不是旧容器 4193，也不是公共部署。

### 11.2 历史结果和验证边界

- R2 记录为 122/122 单元测试、73 个非黑像素观察、30 个 staging 观察和 12 态校验通过。不是 73 次人工通关。
- R3 记录为 122/122 单元测试，交互 14/14，结局布局 100 个观察，另有现代、图片、音频状态、本地化测试通过。
- R4 记录为 125 个单元测试与相关自动化检查通过。这属于原阶段构建，不能代替最终 main 重新测试和远端 CI。
- 正常 UI 已实测宿舍连续手刻至玉亮、真实 history 回看、07/08 精确入口、室友和办公室部分演出，以及 R4 的不透底、递面、递稿、合照构图。
- 未完成真机手机、全分支人工通关和真实听音。没有在页面直接核对构建 SHA。最终 CI、部署和资源 HTTP 检查由第 2 节单独记录，不能补写成已完成的人工验收。
- 最小矮横屏、最大字号和长句需要重新完整验证。R3 只验过部分短句。R4 约 662×375 仍有结局按钮需滚动的取舍。
- 历史黑帧若再发生，先保留截图、正文、beat、视口、DPR、URL、尺寸、opacity、mask 和加载状态。诊断触发重绘后的恢复不能当修复证据。

### 11.3 合成验收档与普通存档隔离

配套 `acceptance-saves-r2/` 与 `acceptance-saves-r4/` 是测试入口，不是全线真实历史。不能导入用户日常浏览器覆盖普通档，也不能用来证明已通关。

1. 打开无痕窗口或全新隔离 profile。
2. 选“林越 · 现代新卷”，从阅读设置导入 JSON。
3. 等待成功并关闭，只点一次“续梦”。没有额外章节卡需要再点“进入”。
4. 按 manifest 核对正文、场景、beat 和页，再看画面。
5. 用从入口真实推进产生的 history 验回看。后段入口不冒充古代全通关历史。

| R2 文件 | 用途 |
|---|---|
| `05-carving.json` | 16/28 起连续手刻、灯灭、玉亮，优先复验黑帧 |
| `06-blackout.json` | 20/28 灯灭 |
| `07-jade-light.json` | 27/28 玉亮，核入口不误翻 |
| `08-three-questions.json` | 9/28“何。”，连续到抬头和手刻 |
| `09-roommate-return.json` | 室友“想家了？”及递面 |
| `10-linyue-resolve.json` | 办公室微笑与思考 |

| R4 文件 | 用途 |
|---|---|
| `11-word-stall.json` | 蹲下切问字摊 |
| `12-dorm-idle-to-noodles.json` | 返场 idle 人物至递面 |
| `13-bilingual-translation.json` | 图书馆“不译。”前后 |
| `14-office-paper.json` | 导师推稿和批注 |
| `15-mountain-friends.json` | 山道朋友 |
| `16-glance-passby.json` | 黄衣女孩擦身 |
| `17-summit-and-ending.json` | 山顶到结局 |
| `18-sunset-photo.json` | 日落合照 |
| `19-ancient-selection.json` | 古代选童和布局回归 |
| `20-kunlun-light.json` | 昆仑青蓝天光 |
| `21-kunlun-mountain.json` | 山坡野果，核没有误切异象 |

### 11.4 每批交付能独立审阅

- 提供改前改后同场、同页、同视口截图。记录分辨率、DPR、字号、画质档和减弱动态。
- 提供文件、运行 ID、场景与 beat 映射。修图交源文件和导出记录，交互交操作复现，音乐交音频与听审记录。
- 分别列自动化、正常 UI、真机、听审和未测项。失败也要写。
- 记录精确 HEAD、main、分支、PR、CI run 与部署对象，区分未合并、已合并未部署、已部署未人工验收。
- 用户新画面和音乐定稿先存不可变副本。确认预览正在运行本次构建，不是上一批。

## 12. 工作批次与回滚规则

### 12.1 按可验收批次推进

1. A 批先交独立审查和基线复玩结果，列接受与不接受的旧结论。
2. B 批先做 P0 问字摊和主道具连续性，接收第一批用户新图。代码改绑单独提交，不把代码问题归为图片问题。
3. C 批做海外旧街、图书馆、导师稿纸与高收益同源微调，合并宽窄屏画面验收，保留办公室已有优点。
4. D 批做古代关键 CG，先确定 last-geese 与被覆盖 CG 的演出意图，作者歧义单列。
5. E 批验证一个叙事交互，先判断有无表达价值，再扩大。
6. 音乐在 A 批并行盘点，B 批给方向小样，选定后分组生产、混音、接入和听审。不要等全部美术结束，也不要把全部音频混入一次大提交。

Codex 可根据证据调整小批顺序并说明原因。工作重心是美术、UI、游玩体验、交互性表达和现代线音乐，不是无限扩写剧情。

### 12.2 已存在阶段 refs

整栈改前 tag 为 `rollback-pre-stack-merge-20261124`，分支为 `backup/pre-stack-merge-20261124-main-85792c5`，都指向 `85792c5d755e14b0d637a29ad7c6fca08baf8faa`。整栈改后 refs 以第 2 节为准，未确认不编造。

历史名称中的 `JST` 是不可改写的引用名称，不是本文报告时间。本文叙述时间均为 Asia/Shanghai，UTC+8。

| 阶段 | 目标 | tag | backup 分支 |
|---|---|---|---|
| r1 改前 | `85792c5` | `rollback-modern-r1-before-20261124-0052` | `backup/modern-r1-before-20261124-0052` |
| r1 初修 | `77ce12f` | `rollback-modern-r1-after-20261124-011140` | `backup/modern-r1-after-20261124-011140` |
| r1 收尾 | `5b520b6` | `rollback-modern-r1-closeout-after-20261124-003857` | `backup/modern-r1-closeout-after-20261124-003857` |
| r2 改前 | `5b520b6` | `rollback-modern-art-r2-before-20261124T1734Z` | `backup/modern-art-r2-before-20261124T1734Z` |
| r2 第一批后 | `40b3450` | `rollback-modern-art-r2-round1-after-20261124-030832-JST` | `backup/modern-art-r2-round1-after-20261124-030832-JST` |
| r2 第二批前 | `40b3450` | `rollback-modern-art-r2-round2-before-20261124-031230-JST` | `backup/modern-art-r2-round2-before-20261124-031230-JST` |
| r2 第二批后 | `0ef0535` | `rollback-modern-art-r2-round2-after-20261124-040937-JST-79ece0` | `backup/modern-art-r2-round2-after-20261124-040937-JST-79ece0` |
| r3 改前 | `0ef0535` | `rollback-ux-r3-before-20261124-1016-JST` | `backup/ux-r3-before-20261124-1016-JST` |
| r3 改后 | `1a60086` | `rollback-ux-r3-after-20261124-1055-JST` | `backup/ux-r3-after-20261124-1055-JST` |

这些是前序报告与恢复检查点保留的引用。接手须读远端验证，annotated tag 以剥离 commit 为准。它们供比较与恢复，不是要求倒回 main。r4 的阶段 refs 从远端匹配 `rollback-*` 和 `backup/*` 后核对实际是否指向 `81981bb`，不要猜名字。

每批改前改后创建唯一新引用，不覆盖旧名称。不强推、不跳 hook、不 rebase 已推送提交、不 `reset --hard`。破坏性操作先说明覆盖范围并取得明确确认。正式 main 需要回退时，优先做可审阅的 revert 分支与测试，不重写历史。存档、新图和音乐母带不随代码回滚删除。

## 13. 随附资料与本次文档验收

本文可独立交给 Codex。七套提示词、82 条库存处理、阶段历史、约束、验收与音乐任务均在文内，不依赖旧聊天或内部 Page。

轻量 ZIP 含本文同版副本、`七项重制完整提示词.json`、`全局美术审查库存.json`、五张 `report_sheets/` 接触表、R2 与 R4 合成验收 JSON 和各自 manifest，以及 `交付文件校验.json` 的大小和 SHA256。ZIP 不含整库、node_modules、用户普通档、登录信息或凭据。源图、分层和运行资源以仓库为准。

本任务书不包含新图或新音乐成品。集成测试修复、Git 合并和部署事实见第 2 节。不要把自动化测试通过当作完整人工通读、真实手机测试或音乐听审。

历史参考仅供补查：

- 原评审 Page：https://cursor.com/canvas/store-c0edadf2-61bb-4df8-9a19-c1714021f2c1/8012db90-4e9d-419e-8bd5-a3a48f0813d5
- 美术审查 Page：https://cursor.com/canvas/store-c0edadf2-61bb-4df8-9a19-c1714021f2c1/2c0b5241-e799-42f9-8a2f-2eaa3913fafc

外部 Codex 即使打不开这些 Page，也能用本文、配套资料和 Git 仓库接手。旧任务书里的“main 仍是 PR13”“14 至 17 待合并”“07/08 尚未精确人工复验”不能覆盖本文第 2 节和相应阶段的最新事实。
