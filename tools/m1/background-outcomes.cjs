// Background shows outcomes; model calculations belong to the workflow chapter.
const baseline = require('./runtime/color-baseline.json');
const cnn = require('./runtime/resnet-results.json');
const percent = value => (value * 100).toFixed(1) + '%';
const correct = metric => metric.matrix.reduce((sum, row, i) => sum + row[i], 0);

module.exports = function backgroundOutcomes(data) {
  const examples = data.classes.map(rock => {
    const sample = data.samples.find(row => row.classId === rock.id && row.split === 'reference' && cnn.samples[row.id].prediction === rock.id);
    return '<tr><td>' + sample.depth + ' m</td><td>' + rock.name + '</td><td>' + percent(Math.max(...cnn.samples[sample.id].scores)) + '</td></tr>';
  }).join('');
  const charts = ['validation', 'test'].map(phase => {
    const a = baseline.metrics[phase], b = cnn.metrics[phase];
    const delta = (b.accuracy - a.accuracy) * 100;
    return '<article class="outcome-accuracy-card" data-outcome-phase="' + phase + '">' +
      '<h4>' + (phase === 'validation' ? '开发组 · 42 张' : '留出组 · 24 张') + '</h4>' +
      [['常规颜色参照', a, ''], ['CNN 辅助识别', b, ' is-intelligent']].map(([label, metric, style]) =>
        '<div class="outcome-bar' + style + '"><span>' + label + '</span><div class="outcome-track"><i style="width:' + metric.accuracy * 100 + '%"></i></div><strong>' + percent(metric.accuracy) + '</strong><small>' + correct(metric) + ' / ' + metric.count + ' 张一致</small></div>'
      ).join('') + '<p class="outcome-delta' + (delta < 0 ? ' is-lower' : '') + '">CNN ' + (delta > 0 ? '+' : '−') + Math.abs(delta).toFixed(1) + ' 个百分点</p></article>';
  }).join('');

  return `<section class="recognition-outcomes" id="background-recognition" aria-labelledby="recognition-outcomes-title">
    <div class="outcome-heading"><span class="mini-label">传统与现在 / 识别成果对照</span><h3 id="recognition-outcomes-title">从逐张观察，到成批形成岩性候选。</h3><p>以 CNN 为代表的多种图像识别算法，成为岩屑智能辅助识别程序的核心。程序可以批量给出岩性候选与分类得分，并把结果按井深汇总，让录井人员更快浏览整段资料。</p></div>
    <div class="outcome-before-after">
      <article class="outcome-card is-traditional"><span class="outcome-label">传统方式 · 人工观察</span><h4>逐张看，逐项记。</h4><p>清洗、筛分后，观察颜色、颗粒与结构，对照标准样品，结合检验描述岩性，再登记到对应井深。</p>
        <div class="outcome-route" aria-label="人工逐张观察、比较判断、登记记录"><span>观察样品</span><i>→</i><span>比较判断</span><i>→</i><span>填写记录</span></div>
        <div class="outcome-workload"><b>逐张处理</b><div class="manual-work-strip" aria-label="66 张照片需要逐张观察，图中只示意其中六张">${[1,2,3,4,5,6].map(i => '<span>' + String(i).padStart(2, '0') + '</span>').join('')}<i>…66</i></div><small>观察、判断、登记，随样品反复进行。</small></div>
        <div class="outcome-deliverable"><b>得到什么</b><span>岩性描述 + 井深记录</span><small>精度取决于样品质量、观察经验与检验资料。</small></div>
      </article>
      <article class="outcome-card is-intelligent"><span class="outcome-label">现在 · 智能辅助识别</span><h4>一次提交，整批得到候选。</h4><p>照片交给程序进行外观识别，自动形成候选、得分和井深清单。整批查看时，不必逐张填写同样的分类字段。</p>
        <div class="outcome-route" aria-label="同批照片进入智能辅助识别程序，输出整批候选记录"><span>同批照片</span><i>→</i><span>智能识别</span><i>→</i><span>整批记录</span></div>
        <div class="outcome-batch"><b>66 张输入</b><span>→</span><strong>66 条候选记录</strong></div>
        <table class="outcome-preview"><caption>本例已有输出 · 节选 3 条</caption><thead><tr><th>源井深</th><th>岩性候选</th><th>分类得分</th></tr></thead><tbody>${examples}</tbody></table>
        <div class="outcome-deliverable"><b>多得到什么</b><span>批量候选 + 分类得分 + 井深汇总</span><small>分类得分表示程序的相对判断，不等于正确率。</small></div>
      </article>
    </div>
    <div class="outcome-efficiency"><b>效率变化</b><span>逐张观察、逐条登记</span><i>→</i><strong>批量生成候选、按井深汇总</strong></div>
    <p class="outcome-source">效率对照展示重复操作的变化；本课未采集人工计时，不换算为节省时长或提速倍数。</p>
    <div class="outcome-accuracy-heading"><span class="mini-label">准确度对照 / 与源标签一致的比例</span><h3>识别效果，用同一批照片比较。</h3><p>下图对照常规颜色统计程序与 CNN 的实际结果。两者都使用本课公开照片；未采集人工专家成绩。</p></div>
    <div class="outcome-accuracy-grid">${charts}</div>
    <p class="outcome-source">数据：本课固定实验结果。CNN 在开发组表现更好，在留出组表现更低，当前小样本模型仍需改进。这里展示识别成果；数据划分与算法计算在案例流程中展开。</p>
  </section>`;
};
