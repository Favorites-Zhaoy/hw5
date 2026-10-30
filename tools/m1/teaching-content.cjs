module.exports = {
  scenario: { title: '把井 2 的一批岩屑照片，整理成沿井深可查的岩性候选记录。',
    setting: '教学任务：你收到 66 张来自同一口井的岩屑照片，需要比较细砂岩、页岩与灰质白云岩的外观，再把每张照片的分类结果对应回原井深。',
    input: '66 张原始 RGB 照片 + 井号、源井深、三类原始标签',
    output: '每张照片的三类得分、岩性候选与图像响应，以及按井深排列的整批记录',
    note: '场景为教学设定；照片、井深和标签来自同一份公开资料。三个页面始终使用这一批数据。' },
  papers: [
    { year: '2026.10', authors: 'Zhang 等', title: 'A multi-attention mechanism-improved ResNet18 approach for lithology identification and classification', journal: 'PLOS One', doi: '10.1371/journal.pone.0361625', url: 'https://doi.org/10.1371/journal.pone.0361625',
      input: '岩石图像', ai: '在 ResNet-18 后加入通道与空间注意，让分类器重视更有区分力的图像特征。', output: '岩石类别', boundary: '岩石图像方法研究，不是本井岩屑实验；本课没有运行 CBAM。' },
    { year: '2026.05', authors: 'Hou 等', title: 'A knowledge-guided multi-task learning method for drill cuttings analysis', journal: 'Petroleum Science', doi: '10.1016/j.petsci.2026.05.037', url: 'https://doi.org/10.1016/j.petsci.2026.05.037',
      input: '岩屑图像与属性标签', ai: '多任务学习结合地质属性之间的先验关联，协同判断颜色、形状和颗粒类型。', output: '多种岩屑属性', boundary: '论文有多属性标注；本课只有整图岩性标签，未复现该模型。' },
    { year: '2025.02', authors: 'Olsen 等', title: 'X-ray Micro-CT based characterization of rock cuttings with deep learning', journal: 'Applied Computing and Geosciences', doi: '10.1016/j.acags.2025.100220', url: 'https://doi.org/10.1016/j.acags.2025.100220',
      input: '岩屑微 CT 图像', ai: '预训练 ResNet-18 学习图像表征，再进行岩性分类，说明基础 CNN 可以成为岩屑识别的核心。', output: '五类岩性', boundary: '微 CT 与本课 RGB 照片成像不同，不能套用论文结果。' }
  ],
  terms: [
    ['岩屑 / Cuttings','钻头破岩后随钻井液返回地面的碎块。','图像中的对象；不等同于原岩颗粒。'],
    ['岩性 / Lithology','对岩石组成、结构等特征的分类描述。','本课三类标签；不是矿物含量。'],
    ['迟到 / Lag time','岩屑从井底返到地面所需的时间。','照片与井深对应时的时间偏移。'],
    ['井深对齐 / Depth matching','把样品和描述放回正确井段。','记录关联与排序；不是分类特征。'],
    ['整图标签 / Image-level label','一张照片只对应一个岩性名称。','监督学习的目标值，不是逐颗标注。'],
    ['裁切区域 / ROI','统一保留照片中用于分析的部分。','本课中心 72%，缩放为 224×224。'],
    ['CNN / 卷积神经网络','逐层提取局部纹理、边缘和组合形态。','把照片转成可供分类的特征。'],
    ['ResNet / 残差网络','用跳接保留信息的一类 CNN。','本课固定的预训练图像编码器。'],
    ['迁移学习 / Transfer learning','利用在其他图像上学到的表示。','冻结骨干，只拟合三类分类层。'],
    ['分类得分 / Class score','模型对三个类别给出的相对分数。','不是地质判断一定正确的概率。'],
    ['开发组与留出组','分开组织用于拟合和检查的资料。','按井段成组，避免相邻照片跨用途。'],
    ['图像响应 / Grad-CAM','显示某个类别与图中哪些区域关联较强。','类别响应图；不表示矿物分布。']
  ]
};
