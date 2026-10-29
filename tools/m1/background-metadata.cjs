// Fallback for portals without interactive pages; keep the same four chapters.
module.exports = function backgroundMetadata(visuals) {
  const { style, well, feature, photos, split, observationGallery } = visuals;
  const external = (url, label) => '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
  const dataset = external('https://github.com/nature9420/-ResNet-HMM-Lithology', '公开岩屑数据');
  const neighbors = external('https://scikit-learn.org/stable/modules/neighbors.html', 'kNN 相似检索 ↗');
  const validation = external('https://scikit-learn.org/stable/modules/cross_validation.html', '分组验证 ↗');
  const cnn = external('https://doi.org/10.3390/jimaging9070126', 'CNN 图像分类 ↗');
  const ensemble = external('https://doi.org/10.1002/dug2.70047', 'Li 等（2025）');
  const instances = external('https://www.spwla.org/common/Uploaded%20files/2026%20Symposium%20Website/FINAL%20Abstracts%20-%202026-Final.pdf', '颗粒分割 / SPWLA 2026 摘要 ↗');
  return {
    label: '专业背景',
    lede: '从岩屑录井的现场工作出发，认识图像识别研究，再了解本课的真实照片与实现条件，为案例流程和人工复核做准备。',
    judge: [
      { label: '数据形态', value: 'RGB 岩屑照片', desc: '附井号、井深与原始标签' },
      { label: '标注条件', value: '沿用源标签', desc: '正式应用需统一词表与专业复核' },
      { label: '学习目标', value: '候选与依据可查', desc: '跟随同一张照片进入流程与示范' },
      { label: '课程实现难度', value: '中', desc: '需整理标签、分组验证与复核交互' }
    ],
    sections: [
      { no: 1, en: 'CONTEXT', title: '真实背景', html: style +
        '<p>钻头打碎岩层，岩屑随钻井液返回地面。录井人员取样、清洗筛分，观察颜色、颗粒和结构，并将描述对应井深，用于认识钻遇地层。' + external('https://wiki.aapg.org/index.php?title=Mudlogging%3A_drill_cuttings_analysis', 'AAPG 岩屑分析') + '。</p>' +
        '<div class="m1c">' + well + '</div><p>上返需要时间，样品深度应对应取样时刻减去迟到时间后的钻头深度；上图采用恒定钻速教学假设。本例沿用源井深，不用示意参数重新校正。参考：' + external('https://www.slb.com/resource-library/oilfield-review/defining-series/defining-mud-logging', 'SLB 录井背景') + '。</p>' +
        '<p>照片可辅助反复观察，但样品代表性和深度对应仍需核验现场记录。岩屑碎块大小也不能直接代替原岩粒度。</p>' },
      { no: 2, en: 'RESEARCH', title: '技术前沿', html:
        '<p><b>2023 · 标签与图像质量。</b>Tolstaya 等以 CNN 分类岩屑照片，先排查低质量图像，再用交叉验证和特征聚类检查可疑标签。' + cnn + '。</p>' +
        '<p><b>2025 · 取样成像与集成识别。</b>' + ensemble + '把取样、输送与图像采集接入钻机流程，再用集成学习识别岩性；试验场景为煤矿井下，与本课油气井照片不同。</p>' +
        '<p><b>2026 · 单颗粒识别。</b>Zeghdoud 等提出分割、分类单颗岩屑，并比较统计特征与视觉 Transformer 表征，关注整图标签可能掩盖的少量岩性。依据为会议摘要：' + instances + '。</p>' + observationGallery +
        '<p><b>本课方法。</b>为看清一次判断的依据，采用 34 维手工外观特征与 kNN 基线，展示参考图、距离和投票。它是照片级单标签分类，未实现上述深度模型或颗粒分割。' + neighbors + '。</p><div class="m1c">' + feature + '</div>' },
      { no: 3, en: 'DATA', title: '示例数据', html:
        '<p>本例使用' + dataset + '中井 2 的 66 张原始 RGB 照片：细砂岩 24 张、页岩 18 张、灰质白云岩 24 张。保留原图字节、源标签、井深和逐图 SHA-256，没有新增矿物鉴定或颗粒含量标注。</p>' +
        '<div class="m1c"><div class="m1c-grid">' + photos + '</div></div>' +
        '<div class="m1c">' + split + '<div class="m1c-legend"><span><i></i>训练参考集 42 张</span><span><i class="test"></i>测试集 24 张</span></div></div>' +
        '<p>按 20 m 井段成组：42 张训练图分 12 组，训练集内留一组交叉验证；锁定参数后再评价 24 张测试图的 5 组。每折只用训练参考图拟合尺度。20 m 是建模分组宽度，不是原始采样间距；单井结果不能证明跨井效果。参考：' + validation + '。</p>' },
      { no: 4, en: 'DIFFICULTY', title: '技术难度与参考方向', html:
        '<p><b style="color:#a57628">● 难度 中</b>　公开照片易获取，分类任务边界清晰；难点在标签核对、井段分组和复核交互。</p><svg viewBox="0 0 420 14" role="img" aria-label="课程实现难度为中，三档中的第二档"><rect width="132" height="7" rx="3" fill="#e7484d"/><rect x="140" width="132" height="7" rx="3" fill="#e7484d"/><rect x="280" width="132" height="7" rx="3" fill="#dcd6d3"/></svg>' +
        '<p>按课程实现条件分档：<b>低</b>＝数据标签可直接使用、任务边界清晰；<b>中</b>＝需整理标签、设计分组验证与复核交互；<b>高</b>＝缺少可靠标注，或需解决混样定量与跨井应用。现场应用还需规范采样成像、专业复核与独立井验证。</p>' +
        '<p><b>可借鉴的通用技术</b></p><p>' + [neighbors, cnn, instances, validation].join('　·　') + '</p>' +
        '<p><b>交叉环节：</b>钻井（取样与井深）· 录井（观察与描述）· 测井（综合核对）。</p>' }
    ]
  };
};
