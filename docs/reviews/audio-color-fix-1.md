# 河边肤色与听水集音频状态修复

基线：`56e2c6df75751d0bcd7a030431e410c87038e0fd`（PR #6）。只处理用户指出的三项问题；不合并、不部署。

## 根因与修复

1. **冷场景中的青脸不是原图问题。** `ink-dialogue.css` 的 `.actor--cold img` 把 `hue-rotate(155deg)` 作用于整个 RGB 图片。前面的 `sepia(.06)` 只控制 sepia 强度，并不会把后面的 155° 色相旋转限制为 6%。原始媭 default/v3、smile、surprised、sad 肤色正常；全部都被同一个 CSS 变成青色。移除色相旋转，保留 94% 饱和度、97% 亮度与冷色投影；暖场景和所有原图保持不变。没有生成图或改像素、alpha、头发、衣服。
2. **初次打开没有尝试播放。** 原来只在 main 的指针/键盘事件里 unlock，首次加载不调用；首次焦点在 body 的键盘事件也不经过 main。现在加载时尝试正常的 AudioContext resume / 原生 play（不绕过策略），并在 document 捕获首次指针/键盘激活。浏览器阻止时显示“点击开启声音”。持久化静音时既不创建音频设备，也不自动解除静音。
3. **播放器把“预览意图”和“实际播放”混为一谈。** 场景 BGM 的 `track` 已在播，但按钮只判断 `preview`；同时引擎多处用“voice 对象存在”来声称正在播放，忽略 suspended context / 媒体 play 拒绝。现在按钮、列表、封面和进度共用实际引擎状态；打开房间不重启音乐，第一个暂停直接接管当前 BGM，不必先“播放”一次。声音状态由 context.statechange、media playing/pause/waiting/ended 及实际 voice 状态发布；被策略拒绝不再误报“不支持音频”。支持对同一 transport 定位，取消旧请求，离开时恢复场景而不产生重复来源。

## 变更入口

- `src/audio.ts`：真实播放状态、解锁策略、共享暂停/定位/恢复、原生音频回退事件。
- `src/App.tsx`：自动尝试、document 级激活、静音偏好和提示。
- `src/components/MusicRoom.tsx` / `ink-music.css`：状态直接订阅、统一按钮、可访问的定位控制。
- `src/styles/ink-dialogue.css`：冷场景不旋转人物色相。
- `tests/audio-transport.test.ts`：真实 Soundscape + 模拟设备/策略边界的回归测试；`ui-sounds.test.ts` 的 Context double 补 EventTarget。
- 现有 `test-audio.mjs` / `test-sprites.mjs`：严格自动播放策略、首次键盘、静音持久化、房间状态/重开/定位、河边四个表情的肤色采样和桌面/手机截图。CI 增加原有 `test:audio`。
- `build-portable.mjs` 支持 `VN_PORTABLE_OUTPUT`，可以生成独立验收包，不重写仓库中 89MB 的旧离线包。

## 本机已验证与限制

- `npm test`：44 项通过；包含 Web Audio / 原生媒体拒绝播放、未决 resume、允许播放、持久化静音、同轨暂停一次、定位、离开/返回、上下文挂起、快速换曲取消。
- `npm run build`：TypeScript 与生产构建通过。
- `node --check scripts/test-audio.mjs` / `test-sprites.mjs`：通过。
- 独立离线包可构建（148 张轻量图、27 张原画、51 个音频），不重写跟踪的 `异托邦.html`。**离线浏览器播放仍需验收，跟踪的旧离线包尚未更新，发布离线版前必须重建。**
- 未在本机通过 Shell 驱动浏览器；真实浏览器回归由 PR 的 CI 和父代理的桌面完成。未实际听音，不声称听过。
- 提供的两张附件在本执行代理的指定路径不存在，不能声称看过用户原截图。根因通过原图与实际 CSS 矩阵复现，父代理仍需对照截图确认。
- 本机比较图（原图 / 旧 CSS 数值模拟 / 新 CSS 数值模拟）在 `/workspace/heterotopia-shots/audio-color-fix-1/portrait-filter-math-comparison.jpg`；它不是浏览器截图。

## 桌面验收入口

在此分支 `npm run build && npm run preview -- --port 4181 --strictPort`，打开 http://127.0.0.1:4181/ 。
- 新浏览器无手势：允许时 BGM 正常启动；受阻时只显示提示，不显示假播放。按 Shift / 点击画面后启动；已静音的存储必须保持静音。
- BGM 已播放时打开听水集：播放器与当前曲行都立刻显示暂停；点击一次暂停，进度停住；定位到 20 秒后一次播放；关闭/重开不额外启动同一 BGM。
- 在浏览器端为测试存储设置 `heterotopia.v1.autosave`：`{"version":1,"sceneId":"B-1","beatId":"B-1:5:0","inventory":[],"choices":{},"history":[],"cycle":1}`；`heterotopia.v1.readingHint` = `true`；续梦查看河边媭。桌面 1280×800、手机390×844 对照线上基线截图。不要在用户真实存档上播种测试。

## 回滚点

- 改前：tag `pre-audio-color-fix-1` + branch `backup/pre-audio-color-fix-1`（均为 PR #6 main 基线）。
- 完成后：`audio-color-fix-1-ready` + `backup/audio-color-fix-1-ready`（以实际推送的 tested commit 为准）。
- 等用户批准后才合并，未部署。不更改剧情、分支、存档格式或 Asia/Shanghai 时区。


### 浏览器策略测试的前提修正

两次失败都假设“headless Chromium 在 loopback 上会遵守启动 flag，挂起 Web Audio”。CI 的直接观察反驳了这个前提：无手势时真实 context 已经 running、提示为空。这不是生产播放失败，也不是提示 CSS 失效。已保留允许自动播放的设备测试；另在浏览器测试中加入**更严格、仅测试使用**的边界：真实 context 初始 suspend，resume/play 在可信指针/键盘激活前拒绝。音源、时钟、解码、暂停与媒体仍是真实浏览器的；此拒绝策略是测试注入，不能据此声称 headless 原生策略就会阻止播放。生产代码不注入或放宽任何策略。


## 普通桌面复测发现的首次手势竞态（追加）

父代理在 `ca757ea` 的正常桌面 UI 发现：先提示「点击开启声音」，点击后却变成「开启声音」；听水集「此刻静默」+ Play，进度继续走。

**不是把它当成环境问题跳过。** 新增真实浏览器回归，先只提交测试 `42a5d3b`：鼠标按住首屏声音按钮 600ms 再释放，CI 明确失败。证据：
https://github.com/wujikei/heterotopia/actions/runs/43558729355
`cold-first-pointer.json` 记录 `muted: true`、context `running`、按钮「开启声音」。

根因是同一个手势被处理两次：document 捕获 `pointerdown/keydown` 先恢复 AudioContext，React 在 `click` 前把 needsGesture 更新为 false；按钮随后收到 click，把原本「开启声音」的意图解释成「静音」。持久化 muted 被意外写为 true，因此之后播放按钮又会把它解除。引擎在静音时保留音乐时钟（bus gain 归零，不暂停源），所以进度推进本身不证明当时有声音；这组观察不足以声称听到了 BGM。引擎订阅使用稳定 getSnapshot + 新对象通知，并非未重绘的 UI 本地布尔值。

修复在最先出错的事件所有权边界：显式声音/播放按钮标记 `data-audio-control`，document 通用首手势监听不再抢先处理它们，改由按钮原有 click 完成唯一动作；其他位置的首次指针/键盘解锁仍保留。覆盖首页、剧情声音按钮及听水集静音、曲目行、主播放和切曲。

追加回归覆盖鼠标长按和 Space 长按首个声音按钮、随后首次打开听水集、运行中 context 再被挂起后直接点击房间声音/播放按钮；要求 muted 不被反转、主按钮和行立即显示暂停、只保留一次音乐 start。保留原有允许自动播放、body 首键、静音持久化、暂停、定位、重开和原生媒体测试。

本机重新通过 44 项单测、TypeScript 和生产构建；最终浏览器结果以 PR 最新 head 的 CI 为准，手动普通桌面需父代理复核，不能用测试替代听音。

父代理使用新端口 `http://127.0.0.1:4182/` 隔离旧 origin 的 localStorage/SW。此补丁构建入口为 `assets/index-CHo6fgg7.js`，MusicRoom 为 `assets/MusicRoom-DnEY5tKt.js`（若后续仅改文档/测试，这两者不变）。原 4181 构建入口曾为 `index-BYvdM9Rg.js`，确实包含 ca757ea 的修复，但无法从服务器读取父代理页面当时是否由旧 SW 控制；新回归在禁止 SW 的隔离浏览器同样复现，足以排除「只有缓存才会发生」。
