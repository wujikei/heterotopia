# 沈辞新版 R2 · 工作日志与接手说明

## 范围

- 以最新作者 Word 的前六卷作为沈辞国内线供稿；保留 V6 与林越正文。运行时 308 场、4,670 个正文数据页；23 个长场增加阅读分节，最长数据小节 31 页。分节不另插章卡，不改剧情跳转方式。
- 沿用 PR #20 的音频引擎。沈辞入楚地时用《高台千灯》，河边用《七夜问河》，解开风囊后进入《风囊开了》。风停只留水声，两次返校都给教室留白。市集保留《街角的小岔子》，摊铺环境换用风声与脚步。
- 采用 11 个参考镜头，拆分双联图并裁剪、登记母版和 WebP/AVIF；未改已有立绘。海外暖调默认合照采用用户提供的修订图，原浅／深配色仍使用对应版本。

## 接手操作

| 工作 | 入口 |
| --- | --- |
| 核对原文与重新生成 | `python scripts/import_shenci.py` 读取 `public/原著剧本-沈辞新版.txt`，生成序章、主卷与索引，对应 `src/data/shenci-{opening,story,index}.json`。 |
| 分节与切镜 | `scripts/shenci_polish.py`、`src/shenci.ts`；场景 ID 与选择条件不要因改画面而变。 |
| 配乐 | `scripts/shenci_polish.py`、`src/score.ts`；拨弦可用 `python scripts/build_shenci_playful.py`（依赖 FFmpeg）重建。海外仍走 `src/data/overseasScore.ts`。 |
| 美术 | `docs/art/shenci-r2-source.json` 保存来源校验值和裁剪口径；成品母版在 `resources/art-src/shenci-r2/`。 |
| 构建与验收 | `npm test`、`npm run assets:check`、`npm run build`、`npm run portable`；重点离线回归用 `node --import tsx scripts/test-shenci-preview.mjs 异托邦.html`，可设 `VN_CHROMIUM_EXE`。 |

用正常操作复核道士问梦转宋嘉树打岔、市场「看鸡」、风停、浅滩、登山递水及林越快门。未做全卷逐页人工听审。国殇专用五镜仍可先用现有素材。

## 登山递水与快门

- 沈辞的场次按原稿切换八张画面。唐瑾递水后回到山路。到观景台先交代台阶和石栏的位置，再切到碰栏、捡起、认出女孩、接回瓶子、邀同行和回头。透明瓶、蓝盖与斜向白痕贯穿后几镜。碰栏前退掉登山配乐，保留山风。沈辞说完「好。」后，女孩回头时进入《回头一笑》。
- 林越在原稿的快门页由落日切入定稿三人合影。浅、暖、深三套配色各有同源方形构图供手机竖屏使用。快门音效等待合影解码，音乐在快门和下一页压低。阅读中可点「看合影」并在同一页返回。直接续读快门书签时只恢复照片和配乐。
- 图像提示词、种子、来源散列和取景见 [画面记录](../art/summit-art-source.json)。用 `python scripts/prepare_summit_art.py <ComfyUI 输出目录>` 重新导出像素核验过的无损原画和轻量图。配乐生成记录在 [音频提示词](../../audio-prompts.json)，碰栏音效可用 `python scripts/produce_audio.py --modern-foley` 重建。

## 与配乐修正版的整合

- `277d3f0` 是 GitHub 上 R2 `0ddec36` 的祖先。R2 新增的沈辞配乐沿用 PR #20 的音频引擎，按实际段落衔接入楚、高台、七夜、风暴和返校。林越入楚、递面和快门复测了原有切换与音效时机。
- 序章播放时显示梦船位置，闹钟后切到卧室。清理浅滩 `C-3`、课堂镜头指令及选择里残留的制作标注。非塌城路线从睁眼接回教室，旧 R2 书签落在被隐藏的句子时接到后面的可读页。
- 844 × 390 横屏两列容纳六个选项。610 × 330 下可用 Tab 将第六项滚入视野并继续选择。
- 网页首次启程先请求序章，再在阅读初期载入其余章节。限速 1.6 Mbit/s、延迟 120 ms，各测 5 次，从点击「启程」到首句的中位数由 3.73 秒降至 1.04 秒。保留原画与音频文件。

## 旧版、存档与回退

- 发布前主线：[`277d3f0`](https://github.com/wujikei/heterotopia/tree/277d3f0d583ce8c1a196d70afd04dd09f705473a)，这是已含 PR #20 的真实远程基线。远端已保存 [回退标签](https://github.com/wujikei/heterotopia/tree/rollback-pre-shenci-r2-277d3f0) 和 [备份分支](https://github.com/wujikei/heterotopia/tree/backup/pre-shenci-r2-277d3f0)。更早的原始交付基线：[`c0a1a63`](https://github.com/wujikei/heterotopia/tree/c0a1a63e211cb61dde1ff7f1c6ba83860ff0bb26)。
- 上一轮沈辞 R1 本地预览包独立保存，本地标签 `rollback-shenci-preview-r1`。远端 [R1 源码标签](https://github.com/wujikei/heterotopia/tree/archive-shenci-r1-source) 保存集成版 R1 源码（当时提交的根目录离线成品仍为旧正式版）。发布分支另保留按顺序整合的 R1、R2 提交，便于比较；不能把 R1 离线书签解释为 R2 的同页。
- 首页保留「沈辞 · 原篇 V6」。V6 与林越存档键保持不变，沈辞 R1 使用 `shenci` 命名空间，R2 使用 `shenci-r2`。跨目录或网站与离线之间请先导出同版本 JSON；回退源码不会搬迁浏览器存档。
- 需要继续旧版开发时，从基线新建分支；需要撤回已发布内容时用独立修复分支和可审查的 revert，重新构建两种离线版并复核 Pages。不强推、不改写 `main` 历史，不清除玩家本机存档。

## Pages 发布与离线回归

Pages 需通过网页回归及分片离线检查。单文件离线版在独立、保留失败状态的 `offline-single` 任务中验收，不作为网页版前置条件。首次整合在 Linux CI 单文件刷新后未保住轻量设置，未将其标为已通过；独立任务会保留复现证据。

本地 Windows Chromium 已验证 R2 网页和两种离线构建，覆盖返校留白、书签刷新、横屏选择和合照。两种离线构建也通过了原画与轻量模式切换、存档导入导出和 62 个音频文件的断网验证。远端 `0ddec36` 的 Pages 网页已发布，独立 Linux 单文件任务仍报失败。 [GitHub Actions](https://github.com/wujikei/heterotopia/actions/runs/45866857566)
