// Original-protocol background for portals without optional interactive lessons.
// Keep the four topics used in the teacher's firstbreak-pick-case.
module.exports = function backgroundMetadata(visuals) {
  const { style, well, feature, photos, split, rockOverview } = visuals;
  const external = (url, label) => '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
  const aapg = external('https://wiki.aapg.org/index.php?title=Mudlogging%3A_drill_cuttings_analysis', 'AAPG 岩屑分析');
  const mudLogging = external('https://www.slb.com/resource-library/oilfield-review/defining-series/defining-mud-logging', 'SLB 录井背景');
  const dataset = external('https://github.com/nature9420/-ResNet-HMM-Lithology', '公开岩屑项目');
  const neighbors = external('https://scikit-learn.org/stable/modules/neighbors.html', '近邻分类');
  const validation = external('https://scikit-learn.org/stable/modules/cross_validation.html', '分组验证');
  const cavings = external('https://glossary.slb.com/terms/c/cavings', '井壁坍塌碎块');
  const difficulties = [
    ['样品代表性', '迟到偏移与坍塌混入', '核验取样和深度记录', '#d8ac7b'],
    ['成像可比性', '干湿、光照与倍率变化', '规范拍摄与扰动检查', '#92b2bb'],
    ['标签一致性', '相似岩性与混合样品', '统一词表与专业复核', '#b19cbe'],
    ['跨井泛化', '同井相邻样本相关', '独立井评价与误差分析', '#9fb091']
  ];
  const difficultyDiagram = '<svg viewBox="0 0 800 200" role="img" aria-label="样品、成像、标签与泛化四类难点及参考方向">' + difficulties.map((d, i) => '<g transform="translate(' + (i * 200) + ',0)"><rect x="0" y="5" width="185" height="180" rx="12" fill="#fff8eb" stroke="#e2d4bc"/><circle cx="28" cy="35" r="17" fill="' + d[3] + '"/><text x="28" y="40" text-anchor="middle" font-size="14" fill="white">0' + (i + 1) + '</text><text x="15" y="83" font-size="17" fill="#4f6b76">' + d[0] + '</text><text x="15" y="118" font-size="12" fill="#8b8b76">' + d[1] + '</text><text x="15" y="154" font-size="12" fill="#8b8b76">' + d[2] + '</text></g>').join('') + '</svg>';
  return {
    label: '专业背景',
    lede: '岩屑录井利用随钻井液返回地面的岩石碎屑，描述钻遇岩层的岩性与变化，为地层对比提供实物线索。M1 聚焦照片级岩性辅助分类：机器依据已有标签生成候选，录井人员检查证据并复核。',
    judge: [
      { label: '数据形态', value: 'RGB 岩屑照片', desc: '附井号、井深与原始标签' },
      { label: '标注成本', value: '需专业复核', desc: '统一命名和混合样品处理规则' },
      { label: '可见收益', value: '候选与依据可查', desc: '实际节时效果需要现场验证' },
      { label: '难度', value: '演示中 / 应用高', desc: '主要难在样品质量与跨井泛化' }
    ],
    sections: [
      { no: 1, en: 'PROBLEM', title: '当前做法与问题', html: style +
        '<p>岩屑由钻头破岩产生，经钻井液沿环空携带到振动筛。录井人员按取样制度采集、清洗和筛分，放大观察后描述岩石类型、颜色、颗粒与结构；混合样品还需估计各组分比例。岩性记录按深度对应后用于井段对比。依据：' + aapg + '。</p>' +
        '<p><b>描述依据</b>包括颜色与表面状态、粒度和颗粒特征、组分与胶结、保存的层理或裂缝。钻碎后的岩屑块径受钻头影响，不能直接代替原岩粒度；未标定倍率和比例尺的照片不宜报告定量粒度。</p>' +
        '<div class="m1c">' + well + '</div><p><b>迟到对应</b>：样品深度近似对应取样时刻减去上返时间后的钻头深度；上图为恒定钻速简化，现场需结合循环与校验记录。本包沿用原数据井深，不用教学滑杆重新校正。依据：' + mudLogging + '。</p>' +
        '<p><b>现场问题</b>：重复观察需要统一描述规则；' + cavings + '并非钻头直接切削所得，混入后会干扰钻遇岩性判断；照片还可能缺少取样状态及验证记录。</p>' +
        '<div class="m1c"><div class="m1c-grid">' + photos + '</div></div><details><summary>三类岩性的结构线索与解释边界</summary><div class="m1c">' + rockOverview + '</div><p>结构图为定性示意。矿物组成、孔渗和油气显示需要额外证据。</p></details>' },
      { no: 2, en: 'INTERVENTION', title: 'AI 能做什么', html:
        '<p>本例是<b>照片级、单标签的监督分类</b>：用带岩性标签的参考图预测待识别照片的类别。k 近邻比较特征距离，寻找 k 个相似样本并按类别投票。它可直接展示原图、标签与距离，适合解释判断依据。原理：' + neighbors + '。</p>' +
        '<div class="m1c">' + feature + '</div><p>使用 12 维颜色、16 维局部纹理、8 维梯度方向和 4 个统计量，共 40 维。交付内容是<b>岩性候选、相似证据与人工复核记录</b>。低票结果可优先检查；高票结果也可能继承参考库偏差，票数占比不作校准概率。</p>' +
        '<p>本例没有混合岩屑含量、矿物定量或孔渗标注，因此没有实现这些预测。现场节时与一致性改善需要在相同条件下对照人工基准。</p>' },
      { no: 3, en: 'DATA', title: '需要准备什么', html:
        '<p><b>图像</b>：规范照明、倍率、背景和干湿状态，保留原图与比例尺。本包提供 66 张原始 JPEG 及校验值，未获得完整成像标定信息。</p><p><b>标签</b>：专业人员按统一岩性词表复核，明确混合与不确定样品规则。本例沿用源 CSV 的三类标签，没有新增矿物鉴定或颗粒含量标注。</p>' +
        '<p><b>元数据</b>：需要井号、取样井段、迟到校正状态与处理记录。本包提供井号、源井深、原路径和逐样本 SHA-256，未补造现场记录。来源：' + dataset + '，按上游学术用途说明用于课程教学。</p>' +
        '<div class="m1c">' + split + '<div class="m1c-legend"><span><i></i>参考库 42 张</span><span><i class="test"></i>测试集 24 张</span></div></div>' +
        '<p><b>验证</b>：17 个 20 m 分组中留出 5 组，同组不跨集合；标准化仅使用参考库。20 m 是本例分组宽度，不声明原始取样间距。66 张只用于演示，跨井泛化还需独立井数据。方法依据：' + validation + '。</p>' },
      { no: 4, en: 'DIFFICULTY', title: '难度与参考方向', html:
        '<p>前端基线实现难度为中等，现场应用难度较高。先定位样品、成像和标签误差，再增加模型复杂度。</p><div class="m1c">' + difficultyDiagram + '</div>' +
        '<p>① <b>样品与深度</b>：核验迟到和取样记录，记录坍塌或污染，分类结果回到原始井段解释。② <b>成像差异</b>：规范光照与倍率，利用受控扰动检查敏感性。③ <b>细粒度与混合类别</b>：统一词表并复核疑难样品；有颗粒级标注后再研究分割和含量估计。④ <b>泛化</b>：固定数据划分，增加独立井测试后比较迁移学习等模型。</p>' +
        '<p><b>验收</b>：本例展示准确率、宏平均 F1 和混淆矩阵；人工修改单列。正式应用还应比较人工耗时、漏判、复核量与跨井稳定性，本包未提供现场实测收益。</p>' }
    ]
  };
};
