/* m1 draft. Metadata mirrors m1-cuttings-case/case.json; no portal/import protocol changes. */
(function (global) {
  'use strict';
  var definition = {
  "id": "m1-cuttings-preview",
  "sceneId": "m1",
  "title": "岩屑岩性识别：从井底到屏幕",
  "methods": [
    "cv"
  ],
  "version": "0.1.0",
  "updated": "2026-10-24",
  "status": "draft",
  "tabs": {
    "background": {
      "label": "专业背景",
      "lede": "从一份岩屑样品出发，理解计算机视觉辅助岩性识别的流程。本版为交互页面原型，真实公开样本与模型将在后续接入。",
      "sections": [
        {
          "en": "CONTEXT",
          "title": "岩屑为什么能帮助认识地层",
          "html": "<p>钻头破岩产生岩屑，岩屑随钻井液返回地面。颜色、颗粒与结构等观察信息为岩性判断提供线索。岩屑返回存在迟到时间，地面采样时的钻头深度不能直接作为样品来源深度。</p><p><a class=\"btn primary\" href=\"#/scene/m1?tab=demo\">打开岩屑识别交互流程 →</a></p>"
        },
        {
          "en": "INTERVENTION",
          "title": "计算机视觉在哪一步发挥作用",
          "html": "<p>在图像质量检查之后，用图像特征辅助比较样品，展示相似参考样本与候选岩性。识别结果由地质人员复核；本初版先展示这一过程，尚未运行分类模型。</p>"
        },
        {
          "en": "OPEN DATA",
          "title": "优先接入公开数据",
          "html": "<p>候选数据为 <a href=\"https://zenodo.org/records/5545058\" target=\"_blank\" rel=\"noopener noreferrer\">Zenodo 公开岩屑数据集</a>（DOI: 10.5281/zenodo.5545058，CC BY 4.0）。该数据以扫描电镜图像为主，正式接入前需核验类别、样本分组与元数据，并据此选择灰度和纹理特征。当前未下载或展示其原始图像。</p>"
        },
        {
          "en": "LIMITS",
          "title": "让结果可追溯，也保留不确定性",
          "html": "<p>同源样品不能同时出现在训练和测试集中；混合岩屑、污染与井壁掉块需要复核。没有真实深度元数据时只展示样品序列，不生成虚构深度剖面。</p><p>流程插画由 AI 生成，仅用于教学情境展示，不作为岩屑训练样本。专业背景参考：<a href=\"https://www.slb.com/resource-library/oilfield-review/defining-series/defining-mud-logging\" target=\"_blank\" rel=\"noopener noreferrer\">SLB · Defining Mud Logging</a>。</p>"
        }
      ]
    },
    "workflow": {
      "label": "案例流程",
      "title": "一份岩屑样品的四步旅程",
      "lead": [
        "跟随样品完成取样、成像、识别和复核。第三个标签页提供带立体插画与流动箭头的交互流程。"
      ],
      "steps": [
        {
          "name": "钻进与取样",
          "role": "现场",
          "do": "收集返出的岩屑并保留样品编号、采集时间与井段记录。",
          "effect": "建立从原始样品到后续解释的追溯链。",
          "trap": "注意岩屑返出迟到、混样和井壁掉块。"
        },
        {
          "name": "清洗与成像",
          "role": "图像",
          "do": "清洗、铺样，记录成像方式、尺度和光照；检查图像质量。",
          "effect": "得到可比较且来源清楚的样品图像。",
          "trap": "白光照片与扫描电镜图像应分别处理。"
        },
        {
          "name": "智能辅助识别",
          "role": "CV",
          "do": "拟提取与成像方式匹配的特征，比较相似样本，输出候选岩性。",
          "effect": "把相似性证据展示给复核人员。",
          "trap": "本初版尚未接入模型，不展示虚构概率与精度。"
        },
        {
          "name": "复核与记录",
          "role": "地质",
          "do": "结合样品、取样信息与其他证据复核，并保留修改记录。",
          "effect": "形成可追溯的岩性记录。",
          "trap": "缺少深度元数据时不绘制虚构的井深结果。"
        }
      ],
      "metrics": {
        "title": "后续如何检验识别效果",
        "html": "<p>公开数据接入后，按同源样品分组划分数据，展示混淆矩阵和各类别召回率。模型原始输出与人工复核结果分别保留。本版不提供识别精度。</p>"
      }
    },
    "demo": {
      "mode": "page",
      "html": "demo/index.html",
      "label": "可视化示范",
      "intro": "点击四个场景查看解释；悬浮突出场景；可自动讲解或暂停动效。当前为流程原型。",
      "height": 1120
    }
  }
};
  var frame = null;
  function resize(event) {
    if (!frame || event.source !== frame.contentWindow) return;
    var height = event.data && event.data.__m1Height;
    if (typeof height === 'number' && isFinite(height)) frame.style.height = Math.max(700, Math.min(4200, height + 2)) + 'px';
  }
  definition.tabs.demo.mount = function (root) {
    definition.tabs.demo.unmount();
    frame = document.createElement('iframe');
    frame.src = 'm1-cuttings-case/demo/index.html';
    frame.setAttribute('title', 'm1 岩屑岩性识别 · 交互流程');
    frame.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.style.cssText = 'display:block;width:100%;height:1120px;border:0;border-radius:12px;background:#fcf6eb';
    global.addEventListener('message', resize);
    root.appendChild(frame);
  };
  definition.tabs.demo.unmount = function () {
    global.removeEventListener('message', resize);
    if (frame) frame.remove();
    frame = null;
  };
  // Keep the distributable package ID free so it can also be imported here.
  definition.id += '-local';
  global.Cases.register(definition);
}(window));
