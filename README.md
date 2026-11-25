# 异托邦 · 循着水声，回家

根据《异托邦 V6 完整剧本》制作的完整视觉小说。81 场、两条主线、四个王裔结局，以及完成两条路线后展开的“归来”。正文保留原著，对白与叙述共约 5.6 万字。

首页现可切换“林越 · 现代新卷”：从海外旧街的问字摊出发，经历王裔与昆仑两条旅程、两次现代返场，再进入山顶落日尾声。新卷独立收录 281 场、2,932 页，使用单独的自动存档、六个手动书签和解锁记录。林越在古代借用戌的身体，现代场景恢复林越的身份与立绘。新卷正文目前为简体中文，英文、日文和德文译本仍仅覆盖 V6 原篇。

在线游玩：**[https://wujikei.github.io/heterotopia/](https://wujikei.github.io/heterotopia/)**。手机、平板和电脑均可用现代浏览器直接打开。声音在首次点击后启用；进度保存在当前设备的浏览器里，换设备可通过导出、导入存档继续。

## 开发历程

每批改动在独立分支验证，经确认合并后发布。以下日期为北京时间。

| 日期 | 批次 | 实际交付 |
| --- | --- | --- |
| 2026-11-13 | [#1](https://github.com/wujikei/heterotopia/pull/1)–[#2](https://github.com/wujikei/heterotopia/pull/2) | 确立水墨卷轴、灯火与朱印的界面；重排人物志、行迹、手记、听水集及结局页。 |
| 2026-11-13 | [#3](https://github.com/wujikei/heterotopia/pull/3)–[#4](https://github.com/wujikei/heterotopia/pull/4) | 修复阅读焦点与书签确认，改善手机操作、立绘衔接和移动构图。 |
| 2026-11-13 | [#5](https://github.com/wujikei/heterotopia/pull/5) | 压缩资源，拆分首页字体与剧情，加入版本化离线缓存。 |
| 2026-11-14 | [#6](https://github.com/wujikei/heterotopia/pull/6)–[#7](https://github.com/wujikei/heterotopia/pull/7) | 默认原画与可选轻量模式；表情差分、配角和叙事 CG；手机阅读、自动阅读、沉浸绘卷与声音交互完善。 |
| 2026-11-14 | [#8](https://github.com/wujikei/heterotopia/pull/8) · 美术精修第一批 | 重做关键 CG，增加七张手机专用构图。 |
| 2026-11-14 | [#9](https://github.com/wujikei/heterotopia/pull/9) · 第二批 | 补齐现代与古代场景服装、芈的交流姿态，改善平板演出。 |
| 2026-11-14 | [#10](https://github.com/wujikei/heterotopia/pull/10)–[#11](https://github.com/wujikei/heterotopia/pull/11) · 第三批 | 为旅途旧物制作物笺，接入正文与手记，并修复离线设置刷新检查。 |
| 2026-11-14 | [#12](https://github.com/wujikei/heterotopia/pull/12) · 第四批 | 六张时段背景、三首约 146 秒长配乐、关键段落表情与自动停留；提供分片离线版和完整单文件。已合并并发布。 |
| 2026-11-14 | 四语版本 | 设置内可切换中文、English、日本語、Deutsch；每种译本覆盖 1,603 页剧情与 970 条界面文案，保留已有路线和存档，并支持离线阅读。 |
| 2026-11-23 | 林越海外现代线 | 独立故事卷、两条路线与现代返场、山顶尾声；新增林越立绘与现代场景，接入 Qwen-Image 2.1 素材，支持网页和离线两种版本。 |
| 2026-11-24 | [现代卷精修第一轮](docs/reviews/modern-polish-20261124.md) | 重绘海外旧街、问字摊与寿春夜城墙，增加「何」字玉扣物笺和两首开篇配乐。 |
| 2026-11-24 | [现代卷精修第二轮](docs/reviews/modern-polish-r2-20261124.md) | 补齐两次返场及山顶尾声的四首配乐，接入「不译。」和导师批注，调整矮窗首页和结局布局。 |
| 2026-11-25 | [剧本演出与启动优化](docs/reviews/continuity-startup-20261125.md) | 按原稿场景与页码校正切镜，修正登山服装、河岸尾声及取景顺序。标题按卷预取原画，图片回退与离线缓存支持两卷。 |

游戏默认中文，语言偏好保存在本机。切换后正文、选项、人物志、回看、书签和界面文案同步更新；四种语言共用原场景编号与阅读进度，已有存档无需重开。英语、德语和日语字体随游戏本地提供。译名与文风约定见 [翻译说明](docs/translation-guide.md)。

## 开始游玩

双击根目录的 **开始游戏.cmd**，或者直接用 Chrome、Edge 打开 **异托邦.html**。请将它与同目录的 **离线资源/** 文件夹一起保留。全部画面、字体、剧情和声音均可断网使用，无需安装依赖或启动 ComfyUI。需要复制一个文件带走时，执行 `npm run portable:single`，生成 `artifacts/portable/异托邦-单文件.html`。单文件把完整图片和音频嵌入页面，用到哪一份再读取那一份。

进度自动保存在当前浏览器中。另有六个手动存档位；在“阅读设置”里可导出、导入 JSON 存档。换浏览器或设备前，请先导出存档。同一份游戏通过不同网址或文件位置打开时，浏览器可能使用不同的存储空间。

## 阅读操作

点击画面、按空格或 Enter 继续；文字尚未显示完时，先显示全文。左方向键、PageUp 或滚轮向上打开回看；点亮的历史句子可回到当前场景中、最近一次选择之后重读。A 切换自动阅读，按住 Ctrl 跳过已读，数字 1–6 选择纸签；H 隐藏界面，F 全屏，S 存档，L 读档，Esc 打开菜单或逐层返回。删除、覆盖书签都需要第二次确认。首次阅读有可关闭的操作提示，完整快捷键可在阅读设置中查看。支持字号与速度调整、静音及减弱动态。

“行迹”只允许回到已经到达的场景；人物志、绘卷与结局页随实际阅读解锁。

标题左下角、暂停菜单与阅读设置中的“听水集”可重听已解锁的原声，并下载 MP3。试听可暂停、继续，关闭后恢复当前故事的配乐。配乐、环境声和音效可分别调节；切到其他标签页时声音暂停。

## 原声与演出

原篇有 11 首本机生成的器乐配乐，从《那张未谈完的便签》的日常，到《高台千灯》的祭礼、《未说完的一声笛》的风雪，最后回到《灯下有人等》。琴、箫、低音弦乐与克制的钢琴形成主要音色。

现代卷另有 6 首曲目。《异乡街角》和《何的回声》随旧街问字及宿舍异变登场。《留一碗面》和《留白里的「何」》对应两次返场。《从这里上去》贯穿登山，接着由《半规落日》陪伴合照与尾声。走过相应场景后可在该卷「听水集」重听。[开篇生成记录](docs/art/modern-polish-generation.json) · [返场及尾声生成记录](docs/art/modern-polish-r2-generation.json)

行舟、雪夜与光河三首主题使用约 146 秒的长段版本，减少慢读时的短循环。开场、阿媪送行、雪夜和告别有逐页表情注释；少量关键句在自动阅读中额外停留 0.45–1.4 秒，手动翻页与已读快进保持即时。白昼教室、晨间卧室、早餐厨房、食堂、傍晚卧室和雪夜洞穴随原文的时段切换；梦醒后的背景和书签地点也相应更新。

配乐经过小节交叠循环和双遍响度处理，场景间自然交叉渐变；相同主题继续播放，不因翻页重新开始。12 层环境声与 28 种音效随剧本音效标记触发，包括船底叩击、铜铃三响、纸页、椅脚、石门、断笛与归路车铃。重要告别处逐步撤去配乐，保留静默与远水。读档、章节跳转和已读快进不会重放剧情动作音效。

## 剧本规则

回到 1-12 时直接落在选择处。路线经历与“已追问旧队名简”跨轮保留，实物回到这一夜原样；“问名”仍需在本轮取得三玉。完成任一王裔结局与完整昆仑线后才能进入终章。B-12 起名牌显示沈辞，归还身体前立绘仍采用戌。

## 美术、声音与授权

主视觉、场景、人物表情差分与叙事 CG 由本机 ComfyUI / Qwen-Image 2.1 制作；人物采用透明背景 WebP。生成依据、来源元数据、交付和表情覆盖记录见 `docs/art/generation-plan.json`、`docs/art/source-manifest.json`、`docs/art/delivery.md`、`docs/art/expression-usage.md` 与 `art-prompts.json`。11 首器乐配乐由本机 ComfyUI / ACE-Step 1.5 Turbo 生成，提示词、种子与任务记录见 `audio-prompts.json`。环境声与音效由本作程序化声音设计制作，源码见 `scripts/produce_audio.py`；没有使用第三方声音采样或角色配音。

第四批时段背景和长配乐的实际提示、种子、任务 ID、源文件校验和与加工验收记录在 `docs/art/art-direction-4-*.json`，交付说明见 `docs/reviews/art-direction-4.md`。历史短版配乐的生成记录仍保留在 `audio-prompts.json`；本批用相同主题音色、速度和调性重新作曲，没有输入旧曲的音频参考。

默认原画采用与母版像素一致的无损 WebP。网站提供 92 份主画幅原画与 11 份移动原画，并在用到时下载与缓存。阅读设置里的轻量模式提供 AVIF/WebP 变体。竖屏原画缺失时，游戏先使用同一张图的横版原画。两种离线版都收录原画、轻量图和全部 57 个音频文件。仓库版用同目录的数据分片适配 GitHub 的单文件大小限制，完整单文件保存在构建产物中。[本轮美术来源与无损导出](docs/art/modern-continuity-20261125.json)

`npm run art:compress` 用 Pillow 从已登记的原画生成轻量变体。`npm run art:originals` 将原画转为像素一致的无损 WebP 并更新清单。`npm run fonts:prepare` 从相同母版生成首页、场景标题与正文的字形子集，还会生成英语、德语衬线体和离线日文字体。字体来源、OFL 授权及文件校验值见 `public/fonts/locales-manifest.json`。CI 使用已提交的编码产物。

网站使用 44.1 kHz 立体声 MP3，配乐为 192 kbps，目标约 -18 LUFS；技术数据与来源见 `public/audio/manifest.json`。游玩和重听均不需要启动 ComfyUI。音频按场景加载，解码缓存设有容量上限，避免一次加载整张原声。

中文与拉丁文字体 Noto Serif SC 遵循 SIL Open Font License；日文 Noto Serif CJK 亦遵循 SIL Open Font License。完整授权见 `字体授权-OFL.txt`、`public/fonts/NotoSerifJP-OFL.txt`。原著剧本由用户提供，保存在 `public/原著剧本-V6.txt`。源稿 SHA-256 记录于 `src/data/story.json`。

## 开发与重新构建

已安装 Node.js 时：`npm install`，然后 `npm run dev`。生产构建：`npm run build`；仓库离线版打包：`npm run portable`；完整单文件打包：`npm run portable:single`。发布工作流会验证两种离线版，并在回归附件中保留完整单文件。

`npm test` 验证分支、四个王裔结局、两种路线顺序、条件记忆、物件重置、安全重读、借身立绘和书签地点。先执行 `npm run build`，再执行 `npm run test:browser` 可检查桌面、窄屏、存读档与设置；`npm run test:interactions` 检查弹窗、焦点、删除确认、回看、翻页、章节卡、快进、选择及 320px 至横屏布局。`npm run test:sprites` 检查解码后出场、旁白保留、换人、慢图与缺图、手机按钮对齐及梦船书签。浏览器测试自动启动、关闭预览服务，使用独立的临时进度。

`npm run test:audio` 同样自动启动预览，检查首次手势、场景音效去重、闹钟切断、三个音量通道、试听暂停继续、下载、慢请求取消、快进抑制与播放器窄屏布局。`npm run test:perf -- <标签>` 以 Chromium 测量无限速、4G、Fast3G 的首屏和立绘，结果与对比截图保存在 `artifacts/perf/`。使用 `VN_TEST_URL` 时连接已有服务器。

`test:sprites` 默认在本机 Chromium 检查 250ms 人物恢复、300ms 缓存换人门限。共享 CI 设置 `VN_TEST_TIMINGS=record` 记录实际帧时，并继续检查过渡时长和全部功能，避免共享机器负载影响验收。

`npm run assets:check` 审计动态和静态资源引用、原画、表情、配角和 CG；`npm run test:assets` 检查手机图、透明边缘、缺失 AVIF 的 WebP 回退及剧情下载失败。`npm run test:ui-polish` 检查人物志、书签、回看、绘卷沉浸浏览与六个结局的桌面/手机排版；可用 `VN_TEST_BROWSER=firefox` 或 `webkit` 重复检查。普通浏览器回归阻止 Service Worker，独立的 `npm run test:cache` 用真实 `/heterotopia/` 子路径与临时持久化浏览器，验证 HTTP 缓存过期后的重开、断网续读、音频 Range、版本更新和紧急注销。

生成离线包后，运行 `npm run test:portable` 可在断网浏览器中检查本地数据文件的哈希、缺失资源提示、全部美术与字体、音频清单里的全部文件能否解码、存档导入导出、立绘、窄屏选项及终章入口。指定 `VN_PORTABLE_FILE=artifacts/portable/异托邦-单文件.html` 可验证完整单文件。`npm run test:scene-direction` 验证时段边界、关键表情、原画回退和自动/手动停留，支持 Chromium 与 WebKit。测试使用独立浏览器环境与临时模拟进度，验证截图位于 `artifacts/`。

重新处理声音需要 Python、numpy 与 FFmpeg：将 11 首同名 FLAC 母带放入忽略的 `artifacts/audio-masters/`，执行 `python scripts/produce_audio.py`。母带留在本机；Git 只包含处理后的游戏音频、提示记录与可复现的声音设计脚本。

若重新处理历史短版全套声音，随后执行 `python scripts/process-long-score.py` 恢复三首长主题；所需的 `*-long.flac` 母带路径和 SHA-256 在第四批音乐任务记录中。单独重做本批背景使用 `python scripts/process-time-of-day.py`，会校验源图哈希和无损像素一致性。

修改原著后，运行 `python scripts/import_story.py` 重新导入。`scripts/collect_art.py` 只收集此项目已提交的本机生成任务；游玩不会调用生成服务。

现代卷使用 `python scripts/import_modern.py` 从 `最新/异托邦_完整剧情_人称标注版.txt` 与 `最新/异托邦_海外版现代线_独立卷.txt` 导入，生成独立的 `modern-story.json` 和 `modern-index.json`，保留 V6 数据。`npm run test:modern` 验证新卷入口、开篇美术、资料页与分卷存档隔离；`npm test` 还会验证两种路线顺序及两次返场到尾声的完整流程。现代卷美术来源及生成参数见 `docs/art/modern-line-assets.json` 和 `docs/art/modern-line-generation.json`。

现代卷的已审校适配位于 `scripts/modern-adaptations.json`：逐场号、段落号保存完整原文锚点与修正理由，不改两份供稿。运行 `npm run import:modern` 可重复生成；原文漂移时会停止并要求重审，不模糊替换。第一轮连续性修复与验收边界见 `docs/reviews/modern-continuity-r1.md`。

## 网站发布

仓库：[wujikei/heterotopia](https://github.com/wujikei/heterotopia)。GitHub Actions 在 PR 和 `main` 上验证剧情、构建、Chromium 阅读交互与立绘；检查通过的 `main` 才发布至 GitHub Pages。也可在仓库的 Actions 页面手动运行发布工作流。

网站使用 GitHub 提供的 HTTPS，不依赖本机服务器。所有画面、字体和声音均随网站提供；部署配置位于 `.github/workflows/pages.yml`。发布状态可在仓库的 Actions 与 Environments 页面查看。

首次打开网页时，标题壁纸按所选故事卷预取，正文与正文字体延后加载。350 毫秒延迟、375 KiB/s 和 4 倍 CPU 降速的 Chromium 冷缓存测试中，现代卷 1366×768 的标题原画解码中位数从 8.14 秒降到 5.85 秒，原篇桌面和竖屏从约 5.55 秒降到约 4.18 秒。图片文件和像素尺寸相同。[测量方法与首屏各项时间](docs/reviews/continuity-startup-20261125.md)

网页在首屏之后安装版本化缓存。HTML 优先联网，程序、图片、字体和完整音频复用缓存。新版本下载完成后显示“刷新 / 稍后”，由玩家决定何时刷新。最近一代旧缓存保留给已打开的页面。缓存故障的恢复步骤见 [站点缓存记录](docs/reviews/perf-1.md)。单文件版不注册 Service Worker。本机遗留的 `public/audio.zip` 不进入发布包。

可通过 `VN_TEST_URL` 指定生产网址，`VN_TEST_BROWSER` 选择 `chromium`、`firefox` 或 `webkit`，再运行 `npm run test:browser` 或 `npm run test:audio`。浏览器未提供 Web Audio 时尝试原生媒体播放；完全不支持音频时仍可静默阅读。

开发改动在独立分支上完成，改动前后各保留一组 tag 与 `backup/` 分支。通过测试后提交 PR；用户明确确认合并后才进入 `main` 并触发上线。
