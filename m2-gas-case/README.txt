M2 气测异常智能解释 · 2.1.0

打开 demo/background.html、demo/workflow.html、demo/identify.html。请保留完整文件夹；页面共用assets本地资源；固定回放和L2规则可离线查看。L3模型推理请使用静态HTTP站点，需要按需载入公共ONNX/WASM组件。也可按原协议导入未内置本案例的课程门户；本站已内置，无需重复导入。

五部分背景、五步流程（03含传统与AI两部分）和可运行示范延续同一份选择和参数。本例使用固定来源版本的Volve真实观测，没有独立事件或地质层界标签。
真实模式使用Volve 15/9-F-1-C井2013-08-22至28的分钟中位数记录。GRU只读取当前分钟之前最多12条连续TG、流量、钻压、转速、扭矩和ROP，按日期划分拟合与检查。

核心算法：GRU 连续气测预测
总览将M2划为时序分析。气峰的升降与持续时间都依赖先后顺序；GRU逐分钟传递状态，用过去预测下一分钟，再找偏离预期的变化。
输入：当前时刻之前最多12分钟的6通道记录 → 输出：下一分钟通道预测与观测残差

以当前窗最初12个有效点的全烃中位数为背景，按指定倍数筛气峰。

真实气测没有独立事件标签，Euc不写成百分比；GRU预测残差不等于发现油气层。

本例只提供Volve真实记录及GRU/LSTM处理结果。复现：python tools/mudlogging/prepare-sequence-models.py；node tools/build-mudlogging-cases.cjs。 数据见assets/dataset-v2.js；文献见SOURCES.json。模型权重在tools/mudlogging/checkpoints。

V2复现步骤：python tools/mudlogging/prepare-real-volve.py；python tools/mudlogging/prepare-sequence-models.py；python tools/mudlogging/export-browser-models.py；node tools/build-mudlogging-cases.cjs。静态预览：python tools/preview-static.py。公共推理组件固定在assets/vendor/ort-1.31.1，不随每个案例包重复存储；导入后的在线推理使用同版本公共组件。

三页为独立HTML，没有内部三页导航和完整网页嵌套；入口由父页面页签确定。
