M5 录井报告自动生成 · 1.1.0

打开 demo/background.html、demo/workflow.html、demo/identify.html。请保留完整文件夹；页面共用assets本地资源，可离线运行。也可按原协议导入未内置本案例的课程门户；本站已内置，无需重复导入。

五部分背景、六步流程和可运行示范始终使用同一份合成数据。共1392条合成语句：1152条训练、80条检查、160条留出。按32/8/16个句式模板组隔开；留出组的不同数字版本仍只算16种句式。

核心算法：字符级 BiGRU
24维字符向量、双向各24维GRU、4类线性输出。词表只从训练句式建立；摘要由明确的字段绑定生成，没有调用LLM。
按“接单根/停泵→气测词→钻时词→平稳”的顺序匹配，不处理否定与转折。它是计算参照，不是人工写报告的测评。

这是一份合成交班摘要实验，不是完整现场综合录井报告。BiGRU仍有分错的记录，页面保留全部输出；不能据此写入未经记录支持的地质结论。

分类模型为BiGRU。报告由记录ID绑定事实后按模板组装，未部署LLM或RAG模型。额外结构化事实由记录ID确定，不是分类器输入。
固定实验结果见provenance.json及assets/experiment.js；文献见SOURCES.json。复现：python tools/mudlogging/prepare-experiments.py m5，然后 node tools/build-mudlogging-cases.cjs。模型权重在仓库tools/mudlogging/checkpoints。

三页为独立HTML，没有内部三页导航和完整网页嵌套；入口由父页面页签确定。
