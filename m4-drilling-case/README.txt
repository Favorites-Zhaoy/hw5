M4 钻时曲线地层划分 · 1.1.0

打开 demo/background.html、demo/workflow.html、demo/identify.html。请保留完整文件夹；页面共用assets本地资源，可离线运行。也可按原协议导入未内置本案例的课程门户；本站已内置，无需重复导入。

五部分背景、六步流程和可运行示范始终使用同一份合成数据。30口合成井，每口128个1 m记录。生成器同时给定地层段、钻压、转速与钻时。20口训练、4口检查、6口留出，按井隔开。

核心算法：扩张卷积 1D CNN
三层卷积核长度5，扩张率1、2、4，通道数24；使用完整井段的前后邻域，是离线分段演示。
钻时阈值为4.1、6.7 min/m；规则与CNN均使用4点最短段过滤。相同资料、相同后处理，参数在检查前固定。

标签是生成器定义的三种可钻性段，不能直接当成砂岩、泥岩等现场岩性。真实层界仍需独立地质资料验证。

固定实验结果见provenance.json及assets/experiment.js；文献见SOURCES.json。复现：python tools/mudlogging/prepare-experiments.py m4，然后 node tools/build-mudlogging-cases.cjs。模型权重在仓库tools/mudlogging/checkpoints。

三页为独立HTML，没有内部三页导航和完整网页嵌套；入口由父页面页签确定。
