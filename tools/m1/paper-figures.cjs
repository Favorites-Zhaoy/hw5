const fs = require('node:fs');
const path = require('node:path');
const manifest = require('./paper-figures.json');
const directory = path.join(__dirname, 'runtime/paper-figures');
const asset = id => {
  const entry = manifest.assets.find(a => a.id === id);
  if (!entry) throw new Error('Unknown paper photograph: ' + id);
  return entry;
};
const url = (id, thumbnail) => 'data:image/webp;base64,' + fs.readFileSync(path.join(directory, asset(id)[thumbnail ? 'thumbnail' : 'file'])).toString('base64');
const full = () => fs.readFileSync(path.join(__dirname, 'observations.template.html'), 'utf8').replace(/\{\{M1_PHOTO:([a-z-]+)\}\}/g, (_, id) => url(id, false));
const legacy = () => '<style>.m1p-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.m1p-gallery figure{margin:0;padding:14px;background:#fff9ed;border:1px solid #e5d8c0;border-radius:8px}.m1p-gallery img{display:block;max-width:100%;height:auto;max-height:190px;margin:8px auto}.m1p-gallery figcaption{font-size:12px;line-height:1.9;color:#728276}.m1p-gallery a{font-size:11px}@media(max-width:560px){.m1p-gallery{grid-template-columns:1fr}}</style>' +
  '<h4>人工描述的依据：已发表论文实例</h4><div class="m1p-gallery">' + [
    ['颜色与表面状态', ['color'], '原文白云岩岩屑标签，观察灰褐色调与表面明暗。干湿状态未在该图中说明。', 'cuttings', 'Tolstaya et al., 2023 · 图4 Dolomite 子图'],
    ['粒度与颗粒特征', ['grain-coarse', 'grain-fine'], 'YG 粗粒与 DZ 细粒砂岩对比；原图标尺分别为800与300 μm，需结合标尺判断实际粒度。', 'grains', 'Zhang et al., 2022 · 图4a、4b'],
    ['组分、基质与胶结', ['cement'], '原图黄色箭头为作者指出的方解石胶结与交代部位，涉及石英颗粒与黏土基质。', 'cement', 'Adesola et al., 2023 · 图9'],
    ['结构与特殊现象', ['structure'], 'A水平纹层，B笔石，C石英纹层；岩心和薄片来自同井不同深度。', 'structure', 'Tang et al., 2021 · 图3A—C']
  ].map(([title, ids, text, paper, citation]) => '<figure><b>' + title + '</b>' + ids.map(id => '<img src="' + url(id, true) + '" alt="' + title + '，文献真实图像">').join('') + '<figcaption>' + text + '<br>' + citation + ' · CC BY 4.0<br><a href="https://doi.org/' + manifest.papers[paper].doi + '" target="_blank" rel="noopener noreferrer">查看完整论文图 ↗</a></figcaption></figure>').join('') + '</div><p>缩略图仅作教学展示，保留原标尺与标注，不作为本例分类样本。图像裁取和格式转换记录见 FIGURE-SOURCES.json。</p>';
module.exports = { manifest, full, legacy };
