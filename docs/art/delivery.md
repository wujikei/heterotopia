# ui-fix-3 美术交付与来源

来源为本机 ComfyUI / Qwen-Image 2.1。`source-manifest.json` 直接从原始 PNG 元数据提取实际 prompt、seed、模型、参考图输入和 SHA-256；`generation-plan.json` 的 prompt 是修订后的美术约束，planningSeed 是原计划值，不能当作最终生成参数。

原始输出目录：`D:/Comfy-Desktop/ComfyUI-Shared/output/Qwen2.1/Codex`。CG 与配角的文件映射由 `scripts/process-ui3-art.py` 读取；表达差分由 `scripts/compose-expressions.py` 配准并只替换面部，八份 composition 记录均保持透明通道一致、面部范围外零改动。

源图就绪、导出齐全和游戏登记独立核验。只有 `AVAILABLE`、`AVAILABLE_EXTRAS` 或 CG 非空 `file` 登记后才会在游戏中显示；导出齐全要求 generation-plan 列出的全部母版和网页衍生文件存在。

## 表情差分

28 张新增差分 + 8 张原有平静立绘 = 36 个重点角色表情状态。当前 28/28 导出齐全、28/28 已登记。

| 角色 | 新增 / 原有平静 | ComfyUI 源文件 | 实际种子 |
|---|---:|---|---:|
| 沈辞 | 5 / 1 | edit_00002_.png | 1113001 |
| 戌 | 5 / 1 | edit_00003_.png | 1113002 |
| 屈衡 | 3 / 1 | edit_00004_.png | 1113003 |
| 媭 | 3 / 1 | edit_00005_.png | 1113004 |
| 雩 | 3 / 1 | edit_00006_.png | 1113005 |
| 阿媪 | 3 / 1 | edit_00007_.png | 1113006 |
| 唐瑾 | 3 / 1 | edit_00008_.png | 1113007 |
| 沅 | 3 / 1 | edit_00009_.png | 1113008 |

雩始终是蒙眼少女；差分保留蒙眼布，仅使用下半张脸表达情绪。媭缺失的右臂保持空袖。芈已有原立绘，本批登记五个明确在场页，其中三页显示立绘、两页由 CG 演出；另有下列独立 CG。不把旧立绘计入新增配角数量。

## CG：六结局与八个关键瞬间

| ID / 名称 | 原文来源 | ComfyUI 源文件 | 实际种子 | 交付 |
|---|---|---|---:|---|
| e1-blade / 天亮以前 | A-E1-2 | multiref_00015_.png | 9140090 | 导出齐全；已登记 |
| e2-mercy / 亭外无人 | A-E2-4 | multiref_00001_.png | 9140001 | 导出齐全；已登记 |
| e3-leave / 我叫戌 | A-E3-3 | multiref_00003_.png | 9140002 | 导出齐全；已登记 |
| e4-names / 没有说完的名字 | A-H-1 | multiref_00004_.png | 9140003 | 导出齐全；已登记 |
| e5-kunlun / 两片夜之间 | B-13 | multiref_00005_.png | 9140004 | 导出齐全；已登记 |
| e6-home / 再添半碗 | 终-5 | multiref_00016_.png | 9140095 | 导出齐全；已登记 |
| s01-dream-boat / 船底的敲击 | 0-1:3:0—0-1:4:0 | multiref_00007_.png | 9140006 | 导出齐全；已登记 |
| s02-first-crossing / 河拐弯以前 | B-1:21:0—B-1:22:3 | multiref_00008_.png | 9140007 | 导出齐全；已登记 |
| s03-ritual / 也叫他们 | A-8:8:1—A-8:11:1 | multiref_00009_.png | 9140008 | 导出齐全；已登记 |
| s04-old-names / 旧箱与断笛 | A-6a:3:0—A-6a:6:0 | multiref_00010_.png | 9140009 | 导出齐全；已登记 |
| s05-mi-flute / 没吹完的一声笛 | B-13:8:2 | multiref_00011_.png | 9140010 | 导出齐全；已登记 |
| s06-snow-hands / 不松 | B-12-2:3:1—B-12-2:9:7 | multiref_00012_.png | 9140011 | 导出齐全；已登记 |
| s07-light-river / 把旅程留下 | B-13:3:1—B-13:3:2 | multiref_00013_.png | 9140012 | 导出齐全；已登记 |
| s08-farewell / 掌心的两下 | 终-1:22:2 / 终-1:27:1 | multiref_00014_.png | 9140013 | 导出齐全；已登记 |

CG 原始 PNG 母版保存在 `resources/art-src/cgs/`；网页使用高品质 AVIF/WebP 与独立缩略图。轻量模式只切换场景背景，CG 不随模式改变。

## 五位配角新增立绘

| 角色 | ComfyUI 源文件 | 实际种子 | 交付 |
|---|---|---:|---|
| 母亲 | txt2img_00043_.png | 9150000 | 导出齐全；已登记 |
| 狗子 | txt2img_00044_.png | 9150001 | 导出齐全；已登记 |
| 周老师 | txt2img_00045_.png | 9150002 | 导出齐全；已登记 |
| 道士 | txt2img_00046_.png | 9150003 | 导出齐全；已登记 |
| 阿蘅 | txt2img_00047_.png | 9150004 | 导出齐全；已登记 |

绿幕源图经抠像后成为透明 PNG 母版，保存在 `resources/art-src/extras/`；桌面和手机 AVIF/WebP、人物志头像在 `public/art/`。

## 原文约束与生成历史

雪夜 CG 当前约束明确为“三个孩子”，其中雩为蒙眼少女；原始源 PNG 历史 prompt 使用“三个楚地少年”，同一句也明确“蒙眼少女”。源元数据保持原样，不把历史用词当作角色性别设定。

校门口旁白称道士为“老人”，当前约束已移除无依据的 40–50 岁限定。现有立绘观感介于中年与偏年长；原始 PNG 元数据仍保留生成时的旧年龄 prompt，未用修订文案覆盖历史。后续美术验收应以“老人”的剧情设定判断是否需要重绘。

本批芈立绘接入属于演出呈现，不修改剧情文本。CG 触发定义位于 `src/data/cgs.ts`，清单内同时记录对应原文及触发条件。

复现来源快照：`python scripts/report-art-sources.py`（需要本机 ComfyUI 输出和 composition 记录）；刷新导出状态、登记状态及覆盖统计：`node --import tsx scripts/report-expressions.mjs`。
