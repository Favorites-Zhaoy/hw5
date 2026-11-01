M4 钻进响应变化候选 · 2.0.3

打开 demo/background.html、demo/workflow.html、demo/identify.html。请保留完整文件夹；页面共用assets本地资源；固定回放和L2规则可离线查看。L3模型推理请使用静态HTTP站点，需要按需载入公共ONNX/WASM组件。也可按原协议导入未内置本案例的课程门户；本站已内置，无需重复导入。

五部分背景、五步流程（03含传统与AI两部分）和可运行示范延续同一份选择和参数。本例使用固定来源版本的Volve真实观测，没有独立事件或地质层界标签。
Volve F-5井823个、F-1-C井1059个有效1 m深度分箱记录，单位与筛选记录可查。LSTM在F-1-C前794点拟合，后265点验证，F-5整井留出。每次沿井深读取最多12条四通道工况；旧MLP保留同一划分的数值对照。

核心算法：LSTM 工况序列回归
总览将M4划为时序分析。钻进响应要放回连续井段中比较；LSTM沿井深读取钻压、转速、扭矩和流量，把前段工况状态带入当前钻速估计。
输入：按井深排序的最多12条四通道工况记录 → 输出：当前ROP估计与沿井深的残差变化

对钻时作中位数平滑，按相邻变化阈值找候选；不跨大于2 m的井深缺口。

真实资料没有独立地质层界标签，只展示钻进响应变化候选。LSTM在整口留出井上的误差仍高于训练井中位数常数参照，不能据此宣称层界判定有效。

本例只提供Volve真实记录及GRU/LSTM处理结果。复现：python tools/mudlogging/prepare-sequence-models.py；node tools/build-mudlogging-cases.cjs。 数据见assets/dataset-v2.js；文献见SOURCES.json。模型权重在tools/mudlogging/checkpoints。

V2复现步骤：python tools/mudlogging/prepare-real-volve.py；python tools/mudlogging/prepare-sequence-models.py；python tools/mudlogging/export-browser-models.py；node tools/build-mudlogging-cases.cjs。静态预览：python tools/preview-static.py。公共推理组件固定在assets/vendor/ort-1.31.1，不随每个案例包重复存储；导入后的在线推理使用同版本公共组件。

三页为独立HTML，没有内部三页导航和完整网页嵌套；入口由父页面页签确定。
