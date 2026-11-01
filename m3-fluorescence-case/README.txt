M3 荧光图像智能判读 · 2.0.1

打开 demo/background.html、demo/workflow.html、demo/identify.html。请保留完整文件夹；页面共用assets本地资源；固定回放和L2规则可离线查看。L3模型推理请使用静态HTTP站点，需要按需载入公共ONNX/WASM组件。也可按原协议导入未内置本案例的课程门户；本站已内置，无需重复导入。

五部分背景、六步流程和可运行示范延续同一份选择和参数。本例目前使用合成教学资料及生成器标签。真实岩屑UV图像与独立像素标注尚未取得；不把合成成绩当作现场性能。
30个模拟样品盘，每盘4张图，共120张64×64图像。按样品盘分成80张训练、16张检查、24张留出；生成器提供目标与干扰掩膜。

核心算法：U-Net 像素分割
这里需要知道亮区在哪里，而不是只给整张图一个类别。U-Net在提取邻域特征后恢复像素位置，适合区域圈定任务。
输入：荧光RGB图与逐像素标签 → 输出：每个像素的目标概率与掩膜

相同曝光校正后，R>0.40、G>0.45且R>1.25B的ROI像素记为目标。阈值预先固定，未用留出图调节。

这里的目标颜色、形态和标签都是教学设定。目标面积比例仅是本例图像统计，不是含油饱和度或现场荧光等级。

真实资料（若有）见assets/dataset-v2.js；原合成实验结果见provenance.json及assets/experiment.js；文献见SOURCES.json。复现：python tools/mudlogging/prepare-experiments.py m3，然后 node tools/build-mudlogging-cases.cjs。模型权重在仓库tools/mudlogging/checkpoints。

V2复现步骤：python tools/mudlogging/prepare-real-volve.py；python tools/mudlogging/prepare-drilling-forest.py；python tools/mudlogging/export-browser-models.py；node tools/build-mudlogging-cases.cjs。静态预览：python tools/preview-static.py。公共推理组件固定在assets/vendor/ort-1.31.1，不随每个案例包重复存储；导入后的在线推理使用同版本公共组件。

三页为独立HTML，没有内部三页导航和完整网页嵌套；入口由父页面页签确定。
