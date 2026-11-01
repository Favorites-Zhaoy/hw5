M2 气测异常智能解释 · 1.1.0

打开 demo/background.html、demo/workflow.html、demo/identify.html。请保留完整文件夹；页面共用assets本地资源，可离线运行。也可按原协议导入未内置本案例的课程门户；本站已内置，无需重复导入。

五部分背景、六步流程和可运行示范始终使用同一份合成数据。30 口合成井，每口 96 个一分钟记录。20 口拟合、4 口检查、6 口留出；同一口井不跨分区。气峰、迟到与工况关系由生成器给定。

核心算法：因果 1D CNN
三层卷积的扩张率为1、2、4，卷积核长度3；只读取当前与过去14 min的输入。标准化参数仅从20口训练井得到。
全烃超过前12点背景中位数的2倍，且已对齐的前8点内有停泵则记为接单根气，否则记持续显示。参数在拟合前固定。

标签与迟到来自生成器；这组结果说明多通道识别机制，不构成真实油气层判断或井控预警。

固定实验结果见provenance.json及assets/experiment.js；文献见SOURCES.json。复现：python tools/mudlogging/prepare-experiments.py m2，然后 node tools/build-mudlogging-cases.cjs。模型权重在仓库tools/mudlogging/checkpoints。

三页为独立HTML，没有内部三页导航和完整网页嵌套；入口由父页面页签确定。
