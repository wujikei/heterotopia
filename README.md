# 异托邦 · 循着水声，回家

根据《异托邦 V6 完整剧本》制作的完整视觉小说。81 场、两条主线、四个王裔结局，以及完成两条路线后展开的“归来”。正文保留原著，对白与叙述共约 5.6 万字。

在线游玩：**[https://wujikei.github.io/heterotopia/](https://wujikei.github.io/heterotopia/)**。手机、平板和电脑均可用现代浏览器直接打开。声音在首次点击后启用；进度保存在当前设备的浏览器里，换设备可通过导出、导入存档继续。

## 开始游玩

双击根目录的 **开始游戏.cmd**，或者直接用 Chrome、Edge 打开 **异托邦.html**。这是包含全部画面、字体、剧情和声音的单文件离线版，不需要安装依赖，也不需要启动 ComfyUI。

进度自动保存在当前浏览器中。另有六个手动存档位；在“阅读设置”里可导出、导入 JSON 存档。换浏览器或设备前，请先导出存档。同一份游戏通过不同网址或文件位置打开时，浏览器可能使用不同的存储空间。

## 阅读操作

点击画面、按空格或 Enter 继续；文字尚未显示完时，先显示全文。左方向键、PageUp 或滚轮向上打开回看；点亮的历史句子可回到当前场景中、最近一次选择之后重读。A 切换自动阅读，按住 Ctrl 跳过已读，数字 1–6 选择纸签；H 隐藏界面，F 全屏，S 存档，L 读档，Esc 打开菜单或逐层返回。删除、覆盖书签都需要第二次确认。首次阅读有可关闭的操作提示，完整快捷键可在阅读设置中查看。支持字号与速度调整、静音及减弱动态。

“行迹”只允许回到已经到达的场景；人物志、绘卷与结局页随实际阅读解锁。

标题左下角、暂停菜单与阅读设置中的“听水集”可重听已解锁的原声，并下载 MP3。试听可暂停、继续，关闭后恢复当前故事的配乐。配乐、环境声和音效可分别调节；切到其他标签页时声音暂停。

## 原声与演出

11 首本机生成的器乐配乐贯穿两条路线：从《那张未谈完的便签》的日常，到《高台千灯》的祭礼、《未说完的一声笛》的风雪，最后回到《灯下有人等》。琴、箫、低音弦乐与克制的钢琴形成主要音色。

配乐经过小节交叠循环和双遍响度处理，场景间自然交叉渐变；相同主题继续播放，不因翻页重新开始。12 层环境声与 28 种音效随剧本音效标记触发，包括船底叩击、铜铃三响、纸页、椅脚、石门、断笛与归路车铃。重要告别处逐步撤去配乐，保留静默与远水。读档、章节跳转和已读快进不会重放剧情动作音效。

## 剧本规则

回到 1-12 时直接落在选择处。路线经历与“已追问旧队名简”跨轮保留，实物回到这一夜原样；“问名”仍需在本轮取得三玉。完成任一王裔结局与完整昆仑线后才能进入终章。B-12 起名牌显示沈辞，归还身体前立绘仍采用戌。

## 美术、声音与授权

主视觉、场景、人物表情差分与叙事 CG 由本机 ComfyUI / Qwen-Image 2.1 制作；人物采用透明背景 WebP。生成依据、来源元数据、交付和表情覆盖记录见 `docs/art/generation-plan.json`、`docs/art/source-manifest.json`、`docs/art/delivery.md`、`docs/art/expression-usage.md` 与 `art-prompts.json`。11 首器乐配乐由本机 ComfyUI / ACE-Step 1.5 Turbo 生成，提示词、种子与任务记录见 `audio-prompts.json`。环境声与音效由本作程序化声音设计制作，源码见 `scripts/produce_audio.py`；没有使用第三方声音采样或角色配音。

背景默认呈现与原 PNG 像素逐点相同的无损 WebP 原画；在“阅读设置”开启“轻量模式”后使用 AVIF/WebP 压缩图。原画随网站提供，并在实际选择时才下载和缓存；安装站点缓存不会预先拉取整套原画。人物立绘与表情差分同时提供桌面版和 640×960 移动版。离线单文件会内嵌原画和压缩图，因此体积明显大于仅含轻量资源的版本。`npm run art:compress` 用 Pillow 从已登记的原画生成轻量变体，`npm run art:originals` 将原画转为像素完全一致的无损 WebP 并更新清单；`npm run fonts:prepare` 用 fontTools 从字形相同的母版生成互不重叠的首页、场景标题与正文字体。这些命令仅在修改对应资源时执行，CI 使用已提交的编码产物。

网站使用 44.1 kHz 立体声 MP3，配乐为 192 kbps，目标约 -18 LUFS；技术数据与来源见 `public/audio/manifest.json`。游玩和重听均不需要启动 ComfyUI。音频按场景加载，解码缓存设有容量上限，避免一次加载整张原声。

中文字体为 Noto Serif SC，遵循 SIL Open Font License；授权全文见 `字体授权-OFL.txt`。原著剧本由用户提供，保存在 `public/原著剧本-V6.txt`。源稿 SHA-256 记录于 `src/data/story.json`。

## 开发与重新构建

已安装 Node.js 时：`npm install`，然后 `npm run dev`。生产构建：`npm run build`；单文件打包：`npm run portable`。

`npm test` 验证分支、四个王裔结局、两种路线顺序、条件记忆、物件重置、安全重读、借身立绘和书签地点。先执行 `npm run build`，再执行 `npm run test:browser` 可检查桌面、窄屏、存读档与设置；`npm run test:interactions` 检查弹窗、焦点、删除确认、回看、翻页、章节卡、快进、选择及 320px 至横屏布局。`npm run test:sprites` 检查解码后出场、旁白保留、换人、慢图与缺图、手机按钮对齐及梦船书签。浏览器测试自动启动、关闭预览服务，使用独立的临时进度。

`npm run test:audio` 同样自动启动预览，检查首次手势、场景音效去重、闹钟切断、三个音量通道、试听暂停继续、下载、慢请求取消、快进抑制与播放器窄屏布局。`npm run test:perf -- <标签>` 以 Chromium 测量无限速、4G、Fast3G 的首屏和立绘，结果与对比截图保存在 `artifacts/perf/`。使用 `VN_TEST_URL` 时连接已有服务器。

`test:sprites` 默认在本机 Chromium 检查 250ms 人物恢复、300ms 缓存换人门限。共享 CI 设置 `VN_TEST_TIMINGS=record` 记录实际帧时，并继续检查过渡时长和全部功能，避免共享机器负载影响验收。

`npm run assets:check` 审计动态和静态资源引用、原画、表情、配角和 CG；`npm run test:assets` 检查手机图、透明边缘、缺失 AVIF 的 WebP 回退及剧情下载失败。`npm run test:ui-polish` 检查人物志、书签、回看、绘卷沉浸浏览与六个结局的桌面/手机排版；可用 `VN_TEST_BROWSER=firefox` 或 `webkit` 重复检查。普通浏览器回归阻止 Service Worker，独立的 `npm run test:cache` 用真实 `/heterotopia/` 子路径与临时持久化浏览器，验证 HTTP 缓存过期后的重开、断网续读、音频 Range、版本更新和紧急注销。

生成离线包后，运行 `npm run test:portable` 可在断网浏览器中检查全部内嵌美术与字体、51 个音频的实际解码、存档导入导出、立绘、窄屏选项及终章入口。测试使用独立浏览器环境与临时模拟进度，不会修改玩家存档；验证截图位于 `artifacts/`。

重新处理声音需要 Python、numpy 与 FFmpeg：将 11 首同名 FLAC 母带放入忽略的 `artifacts/audio-masters/`，执行 `python scripts/produce_audio.py`。母带留在本机；Git 只包含处理后的游戏音频、提示记录与可复现的声音设计脚本。

修改原著后，运行 `python scripts/import_story.py` 重新导入。`scripts/collect_art.py` 只收集此项目已提交的本机生成任务；游玩不会调用生成服务。

## 网站发布

仓库：[wujikei/heterotopia](https://github.com/wujikei/heterotopia)。GitHub Actions 在 PR 和 `main` 上验证剧情、构建、Chromium 阅读交互与立绘；检查通过的 `main` 才发布至 GitHub Pages。也可在仓库的 Actions 页面手动运行发布工作流。

网站使用 GitHub 提供的 HTTPS，不依赖本机服务器。所有画面、字体和声音均随网站提供；部署配置位于 `.github/workflows/pages.yml`。发布状态可在仓库的 Actions 与 Environments 页面查看。

线上版在首屏之后安装版本化缓存：HTML 优先联网，程序、图片、字体和完整音频复用缓存。新版本下载完成后显示“刷新 / 稍后”，由玩家决定何时刷新；不会自动打断阅读。最近一代旧缓存保留给已打开的页面。缓存故障的恢复步骤见 `docs/reviews/perf-1.md`。单文件版不注册 Service Worker。本机遗留的 `public/audio.zip` 不进入发布包。

可通过 `VN_TEST_URL` 指定生产网址，`VN_TEST_BROWSER` 选择 `chromium`、`firefox` 或 `webkit`，再运行 `npm run test:browser` 或 `npm run test:audio`。浏览器未提供 Web Audio 时尝试原生媒体播放；完全不支持音频时仍可静默阅读。

开发改动在独立分支上完成，改动前后各保留一组 tag 与 `backup/` 分支。通过测试后提交 PR；用户明确确认合并后才进入 `main` 并触发上线。
