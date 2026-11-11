# 异托邦 · 循着水声，回家

根据《异托邦 V6 完整剧本》制作的完整视觉小说。81 场、两条主线、四个王裔结局，以及完成两条路线后展开的“归来”。正文保留原著，对白与叙述共约 5.6 万字。

在线游玩：**[https://wujikei.github.io/heterotopia/](https://wujikei.github.io/heterotopia/)**。手机、平板和电脑均可用现代浏览器直接打开。声音在首次点击后启用；进度保存在当前设备的浏览器里，换设备可通过导出、导入存档继续。

## 开始游玩

双击根目录的 **开始游戏.cmd**，或者直接用 Chrome、Edge 打开 **异托邦.html**。这是包含全部画面、字体、剧情和声音的单文件离线版，不需要安装依赖，也不需要启动 ComfyUI。

进度自动保存在当前浏览器中。另有六个手动存档位；在“阅读设置”里可导出、导入 JSON 存档。换浏览器或设备前，请先导出存档。同一份游戏通过不同网址或文件位置打开时，浏览器可能使用不同的存储空间。

## 阅读操作

点击画面、按空格或 Enter 继续；文字尚未显示完时，先显示全文。左方向键打开回看，H 隐藏界面，F 全屏，S 存档，L 读档，Esc 打开菜单。支持自动阅读、仅已读快进、字号与速度调整、静音及减弱动态。

“行迹”只允许回到已经到达的场景；人物志、绘卷与结局页随实际阅读解锁。

## 剧本规则

回到 1-12 时直接落在选择处。路线经历与“已追问旧队名简”跨轮保留，实物回到这一夜原样；“问名”仍需在本轮取得三玉。完成任一王裔结局与完整昆仑线后才能进入终章。B-12 起名牌显示沈辞，归还身体前立绘仍采用戌。

## 美术、声音与授权

主视觉、场景与人物由本机 ComfyUI / Qwen-Image 2.1 制作。人物采用透明背景 WebP；完整提示词与任务记录见 `art-prompts.json`。配乐与环境声为本作 Web Audio 原创合成。无角色配音。

中文字体为 Noto Serif SC，遵循 SIL Open Font License；授权全文见 `字体授权-OFL.txt`。原著剧本由用户提供，保存在 `public/原著剧本-V6.txt`。源稿 SHA-256 记录于 `src/data/story.json`。

## 开发与重新构建

已安装 Node.js 时：`npm install`，然后 `npm run dev`。生产构建：`npm run build`；单文件打包：`npm run portable`。

`npm test` 验证分支、四个王裔结局、两种路线顺序、条件记忆及物件重置。先运行开发服务器，再执行 `npm run test:browser` 可检查桌面、窄屏、存读档与设置。

生成离线包后，运行 `npm run test:portable` 可在断网浏览器中检查全部内嵌美术与字体、存档导入导出、立绘、窄屏选项及终章入口。测试使用独立浏览器环境与临时模拟进度，不会修改玩家存档；验证截图位于 `artifacts/`。

修改原著后，运行 `python scripts/import_story.py` 重新导入。`scripts/collect_art.py` 只收集此项目已提交的本机生成任务；游玩不会调用生成服务。

## 网站发布

仓库：[wujikei/heterotopia](https://github.com/wujikei/heterotopia)。推送至 `main` 后，GitHub Actions 会安装依赖、验证剧情分支、构建静态文件并发布至 GitHub Pages。也可在仓库的 Actions 页面手动运行发布工作流。

网站使用 GitHub 提供的 HTTPS，不依赖本机服务器。所有画面、字体和声音均随网站提供；部署配置位于 `.github/workflows/pages.yml`。发布状态可在仓库的 Actions 与 Environments 页面查看。

可通过 `VN_TEST_URL` 指定生产网址，`VN_TEST_BROWSER` 选择 `chromium`、`firefox` 或 `webkit`，再运行 `npm run test:browser` 检查桌面、手机、平板和横屏布局。浏览器未提供音频接口时，游戏仍可静默阅读。
