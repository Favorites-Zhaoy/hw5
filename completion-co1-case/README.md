# CO1 · 完井方案智能选择

本案例沿用 MUDLOGGING 的 M1/M2 三页教学模板，专业背景、案例流程、可运行示范分别是三个固定 HTML 文档。只有课程外层提供三页页签；包内不重复案例导航、页签或大幅标题区。

- 背景：`demo/background.html`，五个章节，含 A/B/C 专业概念图。
- 流程：`demo/workflow.html`，01、02、03（传统）、03（AI）、04、05 六张步骤卡。
- 示范：`demo/identify.html`，方法、原因和效果三个可视问题。
- 元数据：`case.json`、`config.json`、`assets/config.js`。

请从完整课程站点的静态 HTTP 服务访问。页面通过相对路径读取站点共享的 `assets/shared-perforation/{data,core}.js` 与 `assets/completion/{content,data,core,lessons}.js`，本目录不宣称可脱离课程根目录作为独立 ZIP 运行。全部运行所需代码和资料均为本地文件，断网后可以继续使用；外部论文链接仅供阅读。

入口路由：`#/scene/co1?case=completion-co1&tab=bg`（流程 `flow`；示范 `demo`）。

`field-pages-v2` 协议：页面请求 `__lessonStateRequest`，接收 `__lessonSharedState`，在修改记录、步骤或参数时发布 `__lessonStateUpdate`；发布 `__lessonNavigate`、固定文档身份 `__lessonSection` 和 `__lessonHeight`，接收 `__lessonScrollToTop`。状态含 `caseId`、数字记录索引 `record`、`recordId`、`point`、`step` 和数值参数。恢复状态只恢复资料和参数，不改变 HTML 所属页。

重建：在课程根目录运行 `node tools/build-completion-case-pages.cjs`。检查：`node --test tests/completion-pages.cjs`。构建只读取既有合成教学资料和已拟合模型，不重新训练，不更改 `tools/completion/provenance.json`。
