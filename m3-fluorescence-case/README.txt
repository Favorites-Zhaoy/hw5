M3 荧光图像智能判读 · 1.1.0

打开 demo/background.html、demo/workflow.html、demo/identify.html。请保留完整文件夹；页面共用assets本地资源，可离线运行。也可按原协议导入未内置本案例的课程门户；本站已内置，无需重复导入。

五部分背景、六步流程和可运行示范始终使用同一份合成数据。30个模拟样品盘，每盘4张图，共120张64×64图像。按样品盘分成80张训练、16张检查、24张留出；生成器提供目标与干扰掩膜。

核心算法：小型 U-Net
通道数8→16→32→16→8，两个池化层与对应跳接。模型学习像素标签；页面阈值只改变保存得分的分割结果。
相同曝光校正后，R>0.40、G>0.45且R>1.25B的ROI像素记为目标。阈值预先固定，未用留出图调节。

这里的目标颜色、形态和标签都是教学设定。目标面积比例仅是本例图像统计，不是含油饱和度或现场荧光等级。

固定实验结果见provenance.json及assets/experiment.js；文献见SOURCES.json。复现：python tools/mudlogging/prepare-experiments.py m3，然后 node tools/build-mudlogging-cases.cjs。模型权重在仓库tools/mudlogging/checkpoints。

三页为独立HTML，没有内部三页导航和完整网页嵌套；入口由父页面页签确定。
