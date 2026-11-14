# 四语译本约定

中文原著保持不变。英语、日语与德语译本是阅读层，使用原场景和页码；路线、物品、表情、演出、条件记忆和存档仍以中文原稿为准。

## 文风

保留克制的口语、温暖的日常细节、重复的水与归路意象，以及未说完的话。不要解释留白、增加设定或删改段落。戌的口吃、芈以手势交流、雩蒙眼和媭独臂等叙事事实必须准确保留。

## 人名

英语与德语采用：沈辞 Shen Ci、唐瑾 Tang Jin、宋嘉树 Song Jiashu、戌 Xu、媭 Xua、雩 Yu、芈 Mi、沅 Yuan、荼 Tu、屈衡 Qu Heng、巫阳 Wuyang、棠 Tang、阿媪 Amao、阿禾 Ahe、老觋 the elder shaman / der alte Schamane。戌与媭在原文同音；Xua 是本译本用于区分两人的编辑译名，不是汉语拼音。日语保留原作人物汉字，必要时使用自然的日语称谓。日语正文中的短呼名可原样保留，以保持角色名字的写法和停顿。

楚 Chu、昆仑 Kunlun、宜昌 Yichang、秭归 Zigui、寿春 Shouchun。作品名称采用 Heterotopia / 異托邦 / Heterotopia。人名保持姓在前。

## 数据

`story.json`：实际阅读页的稳定 ID → 完整译文，所有条件分支都需覆盖。`ui.json`：中文源文案 → 译文。`{0}`、`{1}` 等占位符的数量和编号须保留；JSON 键不可更改，值中不得残留待译占位符。

翻译源由 `node --import tsx scripts/export-translations.ts` 导出至忽略目录 `artifacts/i18n/source/`；`context.json` 提供每页的场景、章节、说话人和情绪。原始完整剧本见 `src/data/story.json`。
