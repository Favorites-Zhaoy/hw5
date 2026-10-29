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
  '<h4>岩屑文献图例：观察依据与限制</h4><div class="m1p-gallery">' + [
    ['不同类型的岩屑', 'cuttings-types', '九种原文标签；Sand与Dolomite不直接等同本例的细砂岩与灰质白云岩。', 'tolstaya', 'Tolstaya et al., 2023 · 图4'],
    ['同一类型的变化', 'cuttings-variation', '来自不同深度与地层的粉砂岩岩屑，说明同类照片外观可能不同。', 'tolstaya', 'Tolstaya et al., 2023 · 图6'],
    ['泥浆污染的影响', 'cuttings-contamination', '原文中的泥浆污染图像，不是同一份样品的清洗前后对照。', 'tolstaya', 'Tolstaya et al., 2023 · 图8'],
    ['岩屑碎块的尺度', 'cuttings-thinsection', '真实油气井岩屑薄片扫描；保留原图12 mm标尺，岩屑块径不能代替原岩粒度。', 'caja', 'Caja et al., 2023 · 图9']
  ].map(([title, id, text, paper, citation]) => '<figure><b>' + title + '</b><img src="' + url(id, true) + '" alt="' + title + '，文献真实图像"><figcaption>' + text + '<br>' + citation + ' · CC BY 4.0<br><a href="https://doi.org/' + manifest.papers[paper].doi + '" target="_blank" rel="noopener noreferrer">查看完整论文图 ↗</a></figcaption></figure>').join('') + '</div><p>图像不作为本例分类样本；出处及等比缩小记录见 FIGURE-SOURCES.json。</p>';
module.exports = { manifest, full, legacy };
