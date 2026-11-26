# 沈辞新版 R2 · 工作日志与接手说明

## 范围

- 以最新作者 Word 的前六卷作为沈辞国内线供稿；保留 V6 与林越正文。运行时 308 场、4,670 个正文数据页；23 个长场增加阅读分节，最长数据小节 31 页。分节不另插章卡，不改剧情跳转方式。
- 参考两卷音乐处理原则按页调度：轻拨弦《街角的小岔子》、风暴与风停、浅滩静默等。发布整合保留上游 PR #20 的古楚夜河和风暴音轨、海外演出及音频引擎改动。
- 采用 11 个参考镜头，拆分双联图并裁剪、登记母版和 WebP/AVIF；未改已有立绘。海外暖调默认合照采用用户提供的修订图，原浅／深配色仍使用对应版本。

## 接手操作

| 工作 | 入口 |
| --- | --- |
| 核对原文与重新生成 | `public/原著剧本-沈辞新版.txt` → `python scripts/import_shenci.py` → `src/data/shenci-{story,index}.json`；不要手改生成 JSON。 |
| 分节与切镜 | `scripts/shenci_polish.py`、`src/shenci.ts`；场景 ID 与选择条件不要因改画面而变。 |
| 配乐 | `scripts/shenci_polish.py`、`src/score.ts`；拨弦可用 `python scripts/build_shenci_playful.py`（依赖 FFmpeg）重建。海外仍走 `src/data/overseasScore.ts`。 |
| 美术 | `docs/art/shenci-r2-source.json` 保存来源校验值和裁剪口径；成品母版在 `resources/art-src/shenci-r2/`。 |
| 构建与验收 | `npm test`、`npm run assets:check`、`npm run build`、`npm run portable`；重点离线回归用 `node --import tsx scripts/test-shenci-preview.mjs 异托邦.html`，可设 `VN_CHROMIUM_EXE`。 |

用正常操作复核道士问梦转宋嘉树打岔、市场「看鸡」、风停、浅滩、登山递水及林越快门。未做全卷逐页人工听审。黄外套女孩递水与国殇专用五镜仍可先用现有素材，不与译本或分支改稿混批。

## 旧版、存档与回退

- 发布前主线：[`277d3f0`](https://github.com/wujikei/heterotopia/tree/277d3f0d583ce8c1a196d70afd04dd09f705473a)，这是已含 PR #20 的真实远程基线。远端已保存 [回退标签](https://github.com/wujikei/heterotopia/tree/rollback-pre-shenci-r2-277d3f0) 和 [备份分支](https://github.com/wujikei/heterotopia/tree/backup/pre-shenci-r2-277d3f0)。更早的原始交付基线：[`c0a1a63`](https://github.com/wujikei/heterotopia/tree/c0a1a63e211cb61dde1ff7f1c6ba83860ff0bb26)。
- 上一轮沈辞 R1 本地预览包独立保存，本地标签 `rollback-shenci-preview-r1`。远端 [R1 源码标签](https://github.com/wujikei/heterotopia/tree/archive-shenci-r1-source) 保存集成版 R1 源码（当时提交的根目录离线成品仍为旧正式版）。发布分支另保留按顺序整合的 R1、R2 提交，便于比较；不能把 R1 离线书签解释为 R2 的同页。
- 首页保留「沈辞 · 原篇 V6」。V6 与林越存档键保持不变，沈辞 R1 使用 `shenci` 命名空间，R2 使用 `shenci-r2`。跨目录或网站与离线之间请先导出同版本 JSON；回退源码不会搬迁浏览器存档。
- 需要继续旧版开发时，从基线新建分支；需要撤回已发布内容时用独立修复分支和可审查的 revert，重新构建两种离线版并复核 Pages。不强推、不改写 `main` 历史，不清除玩家本机存档。

## Pages 发布与离线回归

Pages 需通过网页回归及分片离线检查。单文件离线版在独立、保留失败状态的 `offline-single` 任务中验收，不作为网页版前置条件。首次整合在 Linux CI 单文件刷新后未保住轻量设置，未将其标为已通过；独立任务会保留复现证据。
