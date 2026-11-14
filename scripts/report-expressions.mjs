import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { compileScene, newProfile, SCENES } from '../src/engine.ts';
import { loadStory } from '../src/story.ts';
import { characterFor, CHARACTERS } from '../src/data/world.ts';
import { BEAT_OVERRIDES, expressionForBeat, availableExpression, EXPRESSION_LABELS, AVAILABLE, portraitNameFor } from '../src/data/expressions.ts';
import { EXTRAS, AVAILABLE_EXTRAS, extraFor } from '../src/data/extras.ts';
import { CGS, cgForBeat } from '../src/data/cgs.ts';
import { PRESENCE } from '../src/data/presence.ts';
import { actorForBeat } from '../src/actors.ts';

await loadStory();
const output = new URL('../docs/art/', import.meta.url);
await mkdir(output, { recursive: true });
const entries = new Map();
for (const endings of [[], ['mercy', 'kunlun'], ['blade', 'names', 'kunlun']]) {
  const profile = { ...newProfile(), endings, oldNames: endings.length > 0 };
  for (const breakfast of ['A', 'B']) for (const scene of SCENES) {
    const state = { choices: { breakfast }, inventory: ['jadeHead', 'jadeBody', 'jadeTail', 'names'] };
    const beats = compileScene(scene.id, profile, state);
    for (const beat of beats) {
      if (beat.kind !== 'text') continue;
      const stage = actorForBeat(beat, scene, beats);
      const cg = cgForBeat(beat, scene.id)?.id ?? null;
      const portraitExpression = stage ? availableExpression(stage.character.key, stage.expression) : null;
      entries.set(beat.id, { id: beat.id, sceneId: scene.id, speaker: beat.speaker, mood: beat.mood, direction: beat.direction, expression: expressionForBeat(beat), portraitExpression, displayedExpression: cg ? null : portraitExpression, cg, stage: stage?.character.key ?? null, annotated: !!BEAT_OVERRIDES[beat.id], text: beat.text });
    }
  }
}
const rows = [...entries.values()];
const statistics = CHARACTERS.map(character => {
  const spoken = rows.filter(row => characterFor(row.speaker)?.key === character.key);
  const staged = rows.filter(row => row.stage === character.key);
  const visible = staged.filter(row => !row.cg);
  const expressions = Object.fromEntries(Object.keys(EXPRESSION_LABELS).map(expression => [expression, visible.filter(row => row.displayedExpression === expression).length]));
  const requestedExpressions = Object.fromEntries(Object.keys(EXPRESSION_LABELS).map(expression => [expression, staged.filter(row => row.expression === expression).length]));
  return { key: character.key, name: character.name, spokenPages: spoken.length, spokenBlocks: new Set(spoken.map(row => row.id.split(':').slice(0, 2).join(':'))).size, stagedPages: visible.length, resolvedActorPages: staged.length, cgCoveredPages: staged.length - visible.length, annotatedVisiblePages: visible.filter(row => row.annotated && row.expression === row.displayedExpression).length, emptyMoodPages: spoken.filter(row => !row.mood).length, expressions, requestedExpressions, fallbackPages: visible.filter(row => row.expression !== row.displayedExpression).length, available: AVAILABLE[character.key] ?? ['default'] };
});
const missing = new Map();
for (const row of rows) if (row.speaker && !characterFor(row.speaker) && !extraFor(row.speaker)) {
  const value = missing.get(row.speaker) ?? { speaker: row.speaker, pages: 0, blocks: new Set(), first: row.id, examples: [] };
  value.pages++; value.blocks.add(row.id.split(':').slice(0, 2).join(':'));
  if (value.examples.length < 3) value.examples.push({ id: row.id, text: row.text.slice(0, 48) });
  missing.set(row.speaker, value);
}
const missingRows = [...missing.values()].map(({ blocks, ...value }) => ({ ...value, blocks: blocks.size })).sort((a, b) => b.pages - a.pages);
const prompts = JSON.parse(await readFile(new URL('../art-prompts.json', import.meta.url), 'utf8'));
const provenance = JSON.parse(await readFile(new URL('source-manifest.json', output), 'utf8'));
const variants = {
  shen: ['default', 'smile', 'surprised', 'angry', 'sad', 'closed'],
  xu: ['default', 'smile', 'surprised', 'angry', 'sad', 'closed'],
  quheng: ['default', 'smile', 'surprised', 'sad'], xua: ['default', 'smile', 'surprised', 'sad'],
  yu: ['default', 'smile', 'surprised', 'sad'], amao: ['default', 'smile', 'surprised', 'sad'],
  tang: ['default', 'smile', 'surprised', 'sad'], yuan: ['default', 'smile', 'surprised', 'sad'],
};
const emotions = {
  default: '平静，放松而清醒，嘴唇自然闭合，保留人物原本气质。',
  smile: '一个克制、温暖、可以看清的微笑，嘴角轻轻上扬，面颊放松；不张嘴大笑，不改变年龄。',
  surprised: '短暂而真实的惊讶，眉峰微抬，眼睛稍睁大，嘴唇轻轻分开；不夸张变形，不改变头的角度。',
  angry: '克制的愤怒与不甘，眉间轻收，目光坚定，嘴唇收紧；不咆哮，不龇牙，不改变姿态。',
  sad: '悲伤但仍认真听人说话，眉尾稍落，眼眶微润，嘴角微微下垂；不嚎哭，不添加夸张泪流。',
  closed: '轻轻闭上双眼，保留原有眼睑位置与睫毛，眉间松开，嘴唇自然闭合；不低头，不改变头部轮廓。',
};
const expressionJobs = [];
for (const [key, expressions] of Object.entries(variants)) {
  const character = CHARACTERS.find(character => character.key === key);
  const reference = `public/art/${portraitNameFor(key)}.webp`;
  for (const expression of expressions) if (expression !== 'default') {
    expressionJobs.push({ key: `portrait-${key}-${expression}`, character: key, expression, reference, role: 'edit target; identity, composition and body lock', workflow: 'edit', state: 'planned', seed: 9130000 + expressionJobs.length,
      prompt: `仅编辑参考图中${character.name}面部的表情。目标情绪：${emotions[expression]}保留参考图的脸型、年龄、五官间距、头部角度、发型与发丝轮廓、身体、衣着、双手位置、道具、光照、笔触、人物位置、画布尺寸和透明轮廓完全不变，只改变必要的眉眼与嘴角像素。不要新增装饰、文字或水印。${key === 'yu' ? '她是蒙眼少女，米白蒙眼布永远完整保留，不画出双眼，不移动布条；仅用下半张脸、嘴角和布下眉骨的细小变化表达情绪。' : ''}${key === 'xua' ? '她没有右臂，画面左侧必须仍是原来束起的空袖，不补胳膊或手；唯一左手在画面右侧，必须完全不变。' : ''}背景沿用参考图，不新增景物。严格同一角色、同一姿势、同一服装的表情差分。`,
      sourceDescription: prompts.jobs.find(job => job.key === portraitNameFor(key))?.prompt ?? prompts.jobs.find(job => job.key === `portrait-${key}`)?.prompt,
    });
  }
}
const artDirection = '16:9视觉小说叙事CG，精致中国手绘厚涂与细腻水墨融合，可信人物结构、克制的电影构图和清晰手部；低饱和青黛、旧金、灰蓝、少量暖琥珀光，真实纸张与柔软笔触。叙事情绪细腻，不摆拍。下方三分之一保留暗色低细节空间供正文，右侧四分之一避免脸部主角以便竖排标题。无任何可读文字、字母、标志、签名、水印、边框，无夸张光效，无血腥创口。';
const cgScenes = {
  'e1-blade': ['A-E1-2', '寿春宗庙后巷的破晓。墙间只露一角苍白天光，手持小铜铃的十五岁楚地白衣少年被押送离开，镜头在远处，以背影和手部叙事，不展示伤口。巷口隐约有提菜筐的少女与逃离的人影，他们终于活到天亮。墙外粥铺的白汽上升，压住悲剧而保留日常。少年外观以戌参考图为准，绝不是现代校服。'],
  'e2-mercy': ['A-E2-4', '冷雨中的荒野废亭，十五岁楚地少年裹着旧冬衣安静坐在柱脚，十根旧竹名简在膝上，一根歪着，破骨笛与接雨的碎陶罐底放在手边。亭外空无一人，芦苇与黎明淡光从远处进入。以全景和人物侧背影表现无人再催他说话的寂静，不显示血、伤口或死亡特写。戌参考外貌、旧麻衣与白疤保持一致。'],
  'e3-leave': ['A-E3-3', '寿春护城河清晨，楚地少年穿普通旧巫衣站在灰白石岸，背影小而挺直，手腕的束绳只作远景暗示，绝不描绘痛苦或暴力。河上一只布鞋开口向上，接住一小片晨光，岸鸟掠过上方。远处登记的人与竹简虚化，焦点在少年抬起的头和真实河水；不是逃离庆功，不画热闹宫殿或胜利姿态。'],
  'e4-names': ['A-H-1', '宗庙西墙化入一条安静星河，暮色高台上三块拼合玉放在祭案，白衣楚地少年握着木鸟和卜骨，正走向河边低灯。蒙眼少女在船上侧头听脚步，为他把包袱挪开一个位置；老臣屈衡拄杖立在远处台阶。人物都以参考立绘为准，重点是留出的空位与微弱暖灯，不画文字显影。'],
  'e5-kunlun': ['B-13', '无时的光河，两片深蓝星空之间流着宽河，水底的星光柔和照亮一块坐得下许多人的平石。楚地孩子在岸边休息：蒙眼少女循笛声侧头，独臂少女用唯一左手编绳，幼小男孩蹲着捞星，一旁女孩护着双耳陶罐，白衣少年静静坐下。用中远景避免密集面部，身体完整自然，缺臂和蒙眼设定严格保留。'],
  'e6-home': ['终-5', '现代宜昌普通家庭夜晚厨房与餐桌，暖灯穿过排骨藕汤热气，母亲拿汤勺为十六岁蓝白校服男生再添半碗，父亲坐一旁剥蒜，低马尾校服女孩挑葱，桌边手机仅以模糊影像暗示家人通话，屏幕无文字。镜头平视略远，碗、手、蒸汽同一种暖。远处门缝内古图盒只留一点茶色纸边，不出现明确魔法。'],
  's01-dream-boat': ['0-1:3:0—0-1:4:0', '第一人称贴近一条夜航旧木船，湿衣袖与一只小手攥紧船沿，船底积水映出一张遥远的青铜脸，芦苇擦过低低船灯。船板缝间的水影像许多伸来的手，但不画断肢、伤口或血，未知感来自水纹、倾斜构图与远处的鼓影。深蓝黑与一盏旧金，光从船底缓慢透入。'],
  's02-first-crossing': ['B-1:21:0—B-1:22:3', '破晓渡口，鸟首旧木舟缓缓离岸。穿旧象牙白麻衣的十五岁少年扑在船尾，高举手臂向河岸挥；柳树旁的老妇阿媪夹着一只小陶罐，也举起手。河转弯前，两个人都没有放下。薄雾、低船灯、温灰蓝天光，中远景把河面距离作为画面核心，不画拥抱团圆。'],
  's03-ritual': ['A-8:8:1—A-8:11:1', '楚国宗庙大祭高台，瘦老臣屈衡跪在白衣少年旁，把一片旧名帛展开，祭案三玉在火光里微亮。台外老妇从人群中抬头，远处赤足的模糊人影从深处走来。火光压低、风突然安静，神秘来自空席和被认真叫到的名字，帛上仅抽象刻痕不能可读。老臣左手缺两指，不作恐怖特写。'],
  's04-old-names': ['A-6a:3:0—A-6a:6:0', '古朴书房夜灯，一只旧木箱打开，十根有水渍的竹名简在案上摊开，旧断笛与一卷写到半途的新简在旁。六十多岁清瘦老臣低头，缺指左手搁在一根名简边，白衣少年站在对面安静等他开口。用手部、灯、木纹与两个人的空隙表达迟来的追问，不画任何可读字。'],
  's05-mi-flute': ['B-13:8:2', '芈在光河岸上试吹一支缠过布的破骨笛。十四岁楚地少年黑发略蓬松、小发束，旧米白麻衣，嘴唇自然贴近笛口，笑意克制而认真；一群小乌鸦从两片星空之间落下，停在肩头和石边，仿佛愿意为每个漏音多等一会儿。蒙眼少女在旁伸手接他。没有血、舌头或创伤展示，身份以芈既有参考立绘为准。'],
  's06-snow-hands': ['B-12-2:3:1—B-12-2:9:7', '盐客旧洞雪夜，最后一段木头仅有一点暖红，三个孩子裹在同一件旧冬衣下依靠坐着：白衣少年居中，蒙眼少女与握破笛的少年从两侧靠进来，六只手轮着藏进尚暖处。洞外细雪和黎明淡光，景深柔和，重点是衣襟里没有松开的手。安静、有尊严，不显示死亡面孔，不煽情张口哭喊。'],
  's07-light-river': ['B-13:3:1—B-13:3:2', '视角从平凉的河岸石面抬起，脚下与头顶各一片星夜，宽河横在两片夜之间，光从水底慢慢长上来。一块平石坐得下许多人，幼小的沅在岸边把脚伸进水又拿出来，好奇看水从趾缝漏去；白衣少年刚坐起，只留侧背影。星光是水与纸上的轻光，不是霓虹或科幻光束。'],
  's08-farewell': ['终-1:22:2 / 终-1:27:1', '光河岸的近景，芈将破骨笛放低，伸手轻敲沈辞掌心两下，然后慢慢张开。两位少年的手是焦点；白衣戌在不远处蹲到石旁，为缺翅的小木鸟找垫石，蒙眼少女侧耳，其他孩子轮廓安静。现代校服沈辞与古代白衣戌此刻是两个人，不可画成同一人。没有文字或夸张哭泣，告别靠光和手的停顿。'],
};
const cgJobs = CGS.map((cg, index) => ({ key: `cg-${cg.id}`, cgId: cg.id, title: cg.title, source: cgScenes[cg.id][0], trigger: cg.trigger, references: [], workflow: 'multiref or txt2img after reference review', state: 'planned', seed: 9140000 + index, prompt: cgScenes[cg.id][1] + artDirection }));
const extrasPrompts = {
  mother: '现代中国普通母亲，四十岁上下为美术制作取值（原文未规定年龄），黑发简单扎起，穿家常长袖与旧围裙，刚端起一碗早餐，神情温暖而有生活劳累感；不要奢华装扮。原文依据：0-2立绘明确围裙；0-8搓洗校服；终-5拿汤勺。',
  gouzi: '战国楚地巫村少年，身材略高，晒过的皮肤，束起的乱黑发，朴素灰褐麻衣，手扶一支鱼叉，嘴快而带一点逞强的神情；年龄十五岁上下为制作取值。原文依据：1-3河滩少年群、扛鱼叉；1-7老觋叫狗子掌灯。',
  zhou: '现代中国高中女老师，三十多岁为制作取值，素色衬衫、深蓝开衫与长裤，手持课本和一小截粉笔，清醒而耐心的目光。原文依据：0-4课堂敲书；0-9讲楚地巫祭、在黑板敲归字，叙述使用她。不要在画面写字。',
  daoist: '现代中国校门外的邋遢年长男道士，能看出老人气质，略乱发髻、短胡茬，穿旧灰布道袍，下摆沾少许湿泥，一只手拿几颗旧螺丝，眼神清醒而随意，不神化、不加法术。原文依据：0-6低头收螺丝、0-8道袍下摆湿泥。',
  aheng: '战国楚地成年女采药人，背着比肩还宽的竹药篓，裤腿沾泥，腰边系一小串红果，旧长袖袖口被荆条拉出细线；头发实用扎起，笑意爽朗，身体有力量感。年龄三十岁上下为制作取值。原文依据：B-8:9:0—:11:1，女人、宽篓、泥裤腿、红果、荆条袖口。不要神仙服饰，不加兽耳。',
};
const extraJobs = EXTRAS.map((character, index) => ({ key: `portrait-${character.key}`, character: character.key, state: 'planned', workflow: 'txt2img', seed: 9150000 + index, prompt: extrasPrompts[character.key] + '竖版2:3视觉小说人物立绘，人物居中，膝上半身，头顶、手和道具完整。与现有立绘一致的中国手绘动画融合厚涂水彩风，真实可信结构、低饱和配色、左上方柔光。单个人物，服装完整。背景完全均匀鲜亮绿色#00FF00，禁止渐变、地面与投影，绿色不反光到人物。无文字、logo、水印、边框。' }));
async function recordDelivery(job, outputs, registered, generation, recordId) {
  job.outputs = outputs;
  job.registered = registered;
  job.planningSeed = job.seed;
  delete job.seed;
  if (generation) job.generation = {
    source: generation.source, sha256: generation.sha256,
    seed: generation.seed, workflow: generation.workflow,
    width: generation.width, height: generation.height,
    metadataRecord: `source-manifest.json#${recordId}`,
  };
  job.missingOutputs = [];
  for (const path of outputs) {
    try { await access(new URL(`../${path}`, import.meta.url)); }
    catch { job.missingOutputs.push(path); }
  }
  job.state = !job.missingOutputs.length ? 'exported' : generation ? 'source-ready' : 'planned';
}
for (const job of expressionJobs) {
  await recordDelivery(job, [
    `public/art/${job.key}.webp`, `public/art/${job.key}.avif`,
    `public/art/${job.key}-m.webp`, `public/art/${job.key}-m.avif`,
    `resources/art-src/expressions/${job.key}.png`,
  ], AVAILABLE[job.character]?.includes(job.expression) ?? false,
  provenance.expressions.find(row => row.character === job.character), `expressions/${job.character}`);
}
for (const job of cgJobs) {
  const cg = CGS.find(cg => cg.id === job.cgId);
  job.references = [`artifacts/ui-fix-3/cg-references/${job.cgId}-scene.png`, `artifacts/ui-fix-3/cg-references/${job.cgId}-cast.png`];
  await recordDelivery(job, [
    `public/art/${job.key}.webp`, `public/art/${job.key}.avif`,
    `public/art/${job.key}-thumb.webp`, `public/art/${job.key}-thumb.avif`,
    `resources/art-src/cgs/${job.cgId}.png`,
  ], !!cg.file, provenance.cgs.find(row => row.id === job.cgId), `cgs/${job.cgId}`);
}
for (const job of extraJobs) {
  await recordDelivery(job, [
    `public/art/${job.key}.webp`, `public/art/${job.key}.avif`,
    `public/art/${job.key}-m.webp`, `public/art/${job.key}-m.avif`,
    `public/art/${job.key}-face.webp`, `resources/art-src/extras/${job.key}.png`,
  ], AVAILABLE_EXTRAS.has(job.character), provenance.extras.find(row => row.character === job.character), `extras/${job.character}`);
}
const summarize = jobs => ({ total: jobs.length, sources: jobs.filter(job => job.generation).length, exported: jobs.filter(job => job.state === 'exported').length, registered: jobs.filter(job => job.registered).length });
const delivery = { expressions: summarize(expressionJobs), cgs: summarize(cgJobs), extras: summarize(extraJobs) };
const extraStatistics = EXTRAS.map(character => ({
  key: character.key, name: character.name, registered: AVAILABLE_EXTRAS.has(character.key),
  spokenPages: rows.filter(row => row.speaker === character.name || (character.key === 'daoist' && row.speaker === '邋遢道士')).length,
  stagedPages: rows.filter(row => row.stage === character.key && !row.cg).length,
}));
const report = { generatedAt: new Date().toISOString(), source: 'src/data/story.json; unique compiled text-page IDs across existing route conditions', textPages: rows.length, characters: statistics, extras: extraStatistics, delivery, missingPortraitSpeakers: missingRows, silentPresence: PRESENCE, examples: rows.filter(row => row.expression !== 'default') };
await writeFile(new URL('expression-usage.json', output), JSON.stringify(report, null, 2) + '\n');
const lines = [
  '# 剧本美术标注盘点', '',
  '按原剧情条件编译后对 beat ID 去重；“页”为实际点击页，“块”为原剧本发言块，不把同一块拆页误记为多句。自由舞台提示不等同表情。空 mood、轻声、内心及咬药包绳头都保留平静，逐句覆盖优先。', '',
  '表中是经过 `AVAILABLE` 回退且排除 CG 遮挡后的实际显示状态；原标注推导结果另存 JSON 的 `requestedExpressions`，不能把没有对应资产的情绪算作已显示。JSON 的 `portraitExpression` 保留有图可用的状态，`displayedExpression` 在 CG 页为 null。有效注释只计入有对应差分、实际演员可解析且未被 CG 遮挡的页面；逐条原文依据见 `expression-staging.md`。', '',
  '| 角色 | 发言页 / 块 | 实际立绘页 | CG 遮挡页 | 有效注释页 | 空 mood 页 | 平静 / 笑 / 惊 / 怒 / 悲 / 闭眼 | 回退页 |',
  '|---|---:|---:|---:|---:|---:|---|---:|',
  ...statistics.map(item => `| ${item.name} | ${item.spokenPages} / ${item.spokenBlocks} | ${item.stagedPages} | ${item.cgCoveredPages} | ${item.annotatedVisiblePages} | ${item.emptyMoodPages} | ${Object.values(item.expressions).join(' / ')} | ${item.fallbackPages} |`), '',
  '沈辞借身时计入沈辞发言，但画面计入戌。芈原有默认立绘，本批登记五个明确在场页，其中三页显示立绘、两页由 CG 演出；记忆、比较与仅仅提及不自动创建舞台人物。', '',
  '## 本批配角接入', '', '| 角色 | 发言页 | 实际立绘页 | 已登记 |', '|---|---:|---:|---|',
  ...extraStatistics.map(item => `| ${item.name} | ${item.spokenPages} | ${item.stagedPages} | ${item.registered ? '是' : '否'} |`), '',
  '## 尚无已交付立绘的发言者', '', '| 说话人 | 页 / 块 | 首次 beat |', '|---|---:|---|',
  ...missingRows.map(item => `| ${item.speaker} | ${item.pages} / ${item.blocks} | ${item.first} |`), '',
  '## 非平静标注与原文', '',
  ...report.examples.map(row => `- ${row.id} ${row.speaker || '旁白'} · 请求${EXPRESSION_LABELS[row.expression]}；${row.cg ? `CG 画面（${row.cg}），不计表情显示` : row.displayedExpression ? `显示${EXPRESSION_LABELS[row.displayedExpression]}` : '无实际演员，不计表情显示'}；原 mood「${row.mood || '空'}」：${row.text.slice(0, 70)}`), '',
  '## 资源数量口径', '',
  '沈辞和戌各六种、屈衡、媭、雩、阿媪、唐瑾、沅各四种：28 张新增差分 + 8 张原有平静立绘 = 36 个角色—表情状态。网页 AVIF/WebP、手机尺寸和母版是同一张图的派生文件，不另算新图。资源齐全不等于剧本每种表情都有标注；未标注处保留原有平静状态。', '',
  `新增差分：${delivery.expressions.sources} 张有生成来源、${delivery.expressions.exported} 张导出齐全、${delivery.expressions.registered} 张已登记。CG：6 个结局 + 8 个关键瞬间 = 14 张；${delivery.cgs.exported} 张导出齐全，${delivery.cgs.registered} 张已登记。五位配角新增立绘：${delivery.extras.exported} 张导出齐全，${delivery.extras.registered} 张已登记。芈不计入这五张新增立绘，他已有默认图，本批另有独立 CG「没吹完的一声笛」。`, '',
  '完整来源、实际生成种子与交付明细见 `delivery.md`、`source-manifest.json` 和 `generation-plan.json`。复现：先运行 `python scripts/report-art-sources.py`，再运行 `node --import tsx scripts/report-expressions.mjs`。', '',
];
await writeFile(new URL('expression-usage.md', output), lines.join('\n'));
await writeFile(new URL('generation-plan.json', output), JSON.stringify({
  tool: 'Local ComfyUI / Qwen-Image 2.1; original project portrait references',
  promptMeaning: 'prompt and planningSeed describe the revised art constraints. generation identifies the exact source PNG; its historical prompt and actual seed are preserved in source-manifest.json.',
  stateMeaning: 'planned: no recorded source; source-ready: source recorded but outputs incomplete; exported: all listed outputs exist. registered is the independent runtime delivery register.',
  expressionStatesIncludingOriginalDefaults: 36, existingDefaultCount: 8, newExpressionCount: expressionJobs.length,
  delivery, expressions: expressionJobs, cgs: cgJobs, extras: extraJobs,
}, null, 2) + '\n');
const sourceName = job => job.generation?.source.split('/').at(-1) ?? '待生成';
const status = job => `${job.state === 'exported' ? '导出齐全' : job.state === 'source-ready' ? '源图就绪，待导出' : '待生成'}；${job.registered ? '已登记' : '待登记'}`;
const deliveryLines = [
  '# ui-fix-3 美术交付与来源', '',
  '来源为本机 ComfyUI / Qwen-Image 2.1。`source-manifest.json` 直接从原始 PNG 元数据提取实际 prompt、seed、模型、参考图输入和 SHA-256；`generation-plan.json` 的 prompt 是修订后的美术约束，planningSeed 是原计划值，不能当作最终生成参数。', '',
  `原始输出目录：\`${provenance.sourceRoot}\`。CG 与配角的文件映射由 \`scripts/process-ui3-art.py\` 读取；表达差分由 \`scripts/compose-expressions.py\` 配准并只替换面部，八份 composition 记录均保持透明通道一致、面部范围外零改动。`, '',
  '源图就绪、导出齐全和游戏登记独立核验。只有 `AVAILABLE`、`AVAILABLE_EXTRAS` 或 CG 非空 `file` 登记后才会在游戏中显示；导出齐全要求 generation-plan 列出的全部母版和网页衍生文件存在。', '',
  '## 表情差分', '',
  `28 张新增差分 + 8 张原有平静立绘 = 36 个重点角色表情状态。当前 ${delivery.expressions.exported}/28 导出齐全、${delivery.expressions.registered}/28 已登记。`, '',
  '| 角色 | 新增 / 原有平静 | ComfyUI 源文件 | 实际种子 |', '|---|---:|---|---:|',
  ...provenance.expressions.map(record => `| ${CHARACTERS.find(character => character.key === record.character).name} | ${record.states.length} / 1 | ${record.source.split('/').at(-1)} | ${record.seed} |`), '',
  '雩始终是蒙眼少女；差分保留蒙眼布，仅使用下半张脸表达情绪。媭缺失的右臂保持空袖。芈已有原立绘，本批登记五个明确在场页，其中三页显示立绘、两页由 CG 演出；另有下列独立 CG。不把旧立绘计入新增配角数量。', '',
  '## CG：六结局与八个关键瞬间', '',
  '| ID / 名称 | 原文来源 | ComfyUI 源文件 | 实际种子 | 交付 |', '|---|---|---|---:|---|',
  ...cgJobs.map(job => `| ${job.cgId} / ${job.title} | ${job.source} | ${sourceName(job)} | ${job.generation?.seed ?? '—'} | ${status(job)} |`), '',
  'CG 原始 PNG 母版保存在 `resources/art-src/cgs/`；网页使用高品质 AVIF/WebP 与独立缩略图。轻量模式只切换场景背景，CG 不随模式改变。', '',
  '## 五位配角新增立绘', '',
  '| 角色 | ComfyUI 源文件 | 实际种子 | 交付 |', '|---|---|---:|---|',
  ...extraJobs.map(job => `| ${EXTRAS.find(character => character.key === job.character).name} | ${sourceName(job)} | ${job.generation?.seed ?? '—'} | ${status(job)} |`), '',
  '绿幕源图经抠像后成为透明 PNG 母版，保存在 `resources/art-src/extras/`；桌面和手机 AVIF/WebP、人物志头像在 `public/art/`。', '',
  '## 原文约束与生成历史', '',
  '雪夜 CG 当前约束明确为“三个孩子”，其中雩为蒙眼少女；原始源 PNG 历史 prompt 使用“三个楚地少年”，同一句也明确“蒙眼少女”。源元数据保持原样，不把历史用词当作角色性别设定。', '',
  '校门口旁白称道士为“老人”，当前约束已移除无依据的 40–50 岁限定。现有立绘观感介于中年与偏年长；原始 PNG 元数据仍保留生成时的旧年龄 prompt，未用修订文案覆盖历史。后续美术验收应以“老人”的剧情设定判断是否需要重绘。', '',
  '本批芈立绘接入属于演出呈现，不修改剧情文本。CG 触发定义位于 `src/data/cgs.ts`，清单内同时记录对应原文及触发条件。', '',
  '复现来源快照：`python scripts/report-art-sources.py`（需要本机 ComfyUI 输出和 composition 记录）；刷新导出状态、登记状态及覆盖统计：`node --import tsx scripts/report-expressions.mjs`。', '',
];
await writeFile(new URL('delivery.md', output), deliveryLines.join('\n'));
console.log(JSON.stringify({ textPages: rows.length, expressionEdits: expressionJobs.length, cgImages: cgJobs.length, newExtraPortraits: extraJobs.length, missingSpeakers: missingRows.length, delivery }));
