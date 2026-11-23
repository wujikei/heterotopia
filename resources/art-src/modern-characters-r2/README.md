# 现代角色透明源

这是两名角色的统一底图与表情分层，不是视频、六套姿势或整脸矩形贴片。

- `generated/`：12份选中的真实生成源。每张均以项目既有身份图或同角色新底图作参考。`provenance.json`含源文件校验和；精确逐字prompt未单独留档。
- `source-layers/`：每人一张864×1152透明身体底图、一张灰度区域蒙版、五张同尺寸RGBA表情层。把某一表情层以正常alpha叠在该角色底图上即可重建对应运行PNG。中性态就是底图。
- `runtime/`：12张864×1152透明PNG母版。
- `qa/`：两张六态近景板、一张深浅底/整体身份板；均为实际输出接触表，不是游戏截图。登记检查记录身体和轮廓锚点恒定、表情层逐像素重建结果。

运行名映射见仓库 `docs/art/modern-characters-r2-exports.json`。neutral→default，warm→smile，startled→surprised；其余沿用语义名。

林越保留既有圆框眼镜、灰蓝开衫、白T和绿包。室友无原著姓名，具体外观延续现有分面CG；肤色、卷发、米色衣服作为视觉设定，不新增原稿未明示的民族/国籍。

验证/再导出（不会重新生成图片）：

```sh
npm run art:modern-characters
```

Python环境需 Pillow（支持AVIF）、NumPy、OpenCV。检查板用DejaVuSans，必要时以`VN_QA_FONT`指定本地拉丁字体。生成新图时只写正向提示，负面字段为空或省略。

六态已导出可调用，不等于正文六态全线都演出。室友目前正文只实际绑定关切；林越惊愕为备用，警觉位于隐藏立绘的CG段。正文绑定/未实现边界见 `docs/art/modern-r2-round2.md`。
