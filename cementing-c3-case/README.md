# C3 · 固井漏失风险与预警优化

沿用MUDLOGGING的M1/M2三页教学模板。背景、流程和示范分别是固定HTML文档，三页之间保留同一份资料和参数。只有课程外层提供案例导航与页签。

- `demo/background.html`：五章背景，含A/B/C专业原理图、近期文献、示例资料、难度与术语。
- `demo/workflow.html`：01、02、03传统、03AI、04、05六张步骤卡。
- `demo/identify.html`：方法是什么、为什么有效、效果如何三个可视问题。
- `assets/lesson.css`：与M2模板逐字节相同；`field.css`只补充案例图表。

请从完整课程的静态HTTP服务访问，共享脚本通过相对路径读取；本目录不宣称可脱离课程根目录作为独立ZIP运行。全部模型推断和图表在浏览器本地执行，运行不依赖外部API。外部DOI与专业词典链接供延伸阅读。

入口：`#/scene/c3?case=cementing-c3&tab=bg`；流程`flow`，示范`demo`。

`field-pages-v2`：请求`__lessonStateRequest`，接收`__lessonSharedState`；更改资料和参数发布`__lessonStateUpdate`，跳转发布`__lessonNavigate`，固定文档身份为`__lessonSection`。高度由当前iframe发送`__lessonHeight`，注册器仅接受来自该frame的高度。接收`__lessonScrollToTop`重置到顶部；恢复状态不会改变HTML所属章节。

全部资料均为合成教学数据。这些是合成漏失标签与风险候选，不是事故诊断或现场告警。优化的是模型门槛，不是防漏剂配方、密度或泵注控制；输出仍需结合其他资料复核。

重建页面：`node tools/build-cementing-case-pages.cjs`（只读取存储权重）。显式重现训练：`node tools/cementing/prepare-models.cjs`。模型来源：`tools/cementing/provenance.json`。数值、DOM与协议检查：`node --test tests/cementing*.cjs`。
