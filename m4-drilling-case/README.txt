M4 钻进响应变化候选 · 2.0.0

打开 demo/background.html、demo/workflow.html、demo/identify.html。请保留完整文件夹；页面共用assets本地资源；固定回放和L2规则可离线查看。L3模型推理请使用静态HTTP站点，需要按需载入公共ONNX/WASM组件。也可按原协议导入未内置本案例的课程门户；本站已内置，无需重复导入。

五部分背景、六步流程和可运行示范延续同一份选择和参数。本例包含固定来源版本的Volve真实观测与单独的合成教学实验。真实资料无独立事件或地质层界标签；合成资料保留生成器标签。
Volve F-5井823个、F-1-C井1059个有效1 m深度分箱记录；来源是公开WITSML整理副本，单位与筛选记录可查看。MLP只在F-1-C较早井段拟合，F-5整井留出；另保留原30口合成井CNN实验。

核心算法：扩张卷积 1D CNN
三层卷积核长度5，扩张率1、2、4，通道数24；使用完整井段的前后邻域，是离线分段演示。
钻时阈值为4.1、6.7 min/m；规则与CNN均使用4点最短段过滤。相同资料、相同后处理，参数在检查前固定。

真实资料没有独立地质层界标签，只展示钻进响应变化候选。跨井MLP的ROP误差高于常数参照，不能据此宣称层界判定有效。合成CNN成绩单独保留。

真实资料（若有）见assets/dataset-v2.js；原合成实验结果见provenance.json及assets/experiment.js；文献见SOURCES.json。复现：python tools/mudlogging/prepare-experiments.py m4，然后 node tools/build-mudlogging-cases.cjs。模型权重在仓库tools/mudlogging/checkpoints。

V2复现步骤：python tools/mudlogging/prepare-real-volve.py；python tools/mudlogging/export-browser-models.py；node tools/build-mudlogging-cases.cjs。静态预览：python tools/preview-static.py。公共推理组件固定在assets/vendor/ort-1.31.1，不随每个案例包重复存储；导入后的在线推理使用同版本公共组件。

三页为独立HTML，没有内部三页导航和完整网页嵌套；入口由父页面页签确定。
