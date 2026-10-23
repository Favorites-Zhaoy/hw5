/* Mud logging is drawn entirely in HTML and SVG: no text is baked into a bitmap. */
(function (global) {
  'use strict';
  var artSerial = 0;
  var METHODS = [
    { id: '', abbr: 'ALL', name: '完整流程', note: '悬停图示放大细节，其他部分虚化；点击技术图示进入讲解。' },
    { id: 'cv', abbr: 'CV', name: '计算机视觉', note: 'm1 与 m3 已放大。悬停可单独聚焦，点击进入对应讲解。' },
    { id: 'ts', abbr: 'TS', name: '时序分析', note: 'm2 与 m4 已放大。悬停可单独聚焦，点击进入对应讲解。' },
    { id: 'nlp', abbr: 'NLP', name: '自然语言处理', note: 'm5 已放大。汇总多源证据，形成可追溯的报告初稿。' }
  ];
  var TECH = [
    { id: 'm1', method: 'cv', title: '岩屑岩性自动识别', color: '#e88c29', summary: '为返出的岩屑拍照，识别岩性类别与组分比例。', input: '清洗、拍照后的岩屑图像', output: '岩性类别与组分比例', labels: ['岩屑图像', '岩性分类'] },
    { id: 'm2', method: 'ts', title: '气测异常智能解释', color: '#258fca', summary: '从全烃与组分曲线中定位异常，结合工况解释信号。', input: '全烃、组分与工况序列', output: '异常层段与解释线索', labels: ['全烃 / C1—C5', '异常层段'] },
    { id: 'm3', method: 'cv', title: '荧光图像智能判读', color: '#9363c7', summary: '提取紫外荧光的颜色、强度和分布，辅助评价含油显示。', input: '固定灯源与曝光的荧光图像', output: '荧光区域与级别建议', labels: ['紫外荧光', '含油显示'] },
    { id: 'm4', method: 'ts', title: '钻时曲线地层划分', color: '#4d9c72', summary: '联合钻时、钻压、转速等曲线，寻找可能的地层界面。', input: '钻时、钻压、转速等工况', output: '候选层界与交叉验证', labels: ['钻时与工况', '候选层界'] },
    { id: 'm5', method: 'nlp', title: '录井报告自动生成', color: '#ec763b', summary: '将分层、显示与异常工况组织成文字，让每条结论都有出处。', input: '分层、油气显示与异常记录', output: '带证据来源的报告初稿', labels: ['证据溯源', '报告初稿'] }
  ];
  function selected(value) { return METHODS.some(function (m) { return m.id === value; }) ? value : ''; }
  function method(value) { return METHODS.filter(function (m) { return m.id === value; })[0] || METHODS[0]; }
  function available(ctx) { return TECH.filter(function (t) { return ctx.stage.scenes.some(function (s) { return s.id === t.id; }); }); }
  function scene(ctx, id) { return ctx.stage.scenes.filter(function (s) { return s.id === id; })[0]; }
  function trace(x, color, phase) {
    var d = '';
    for (var i = 0; i <= 26; i++) d += (i ? 'L' : 'M') + (x + Math.sin(i * 1.9 + phase) * 7 + Math.sin(i * .45) * 4).toFixed(1) + ' ' + (57 + i * 3.6).toFixed(1) + ' ';
    return '<path class="ml-signal" d="' + d + '" stroke="' + color + '" style="animation-delay:' + (-phase) + 's"/>';
  }
  function illustration(type) {
    var id = 'ml-art-' + type + '-' + (++artSerial), steel = 'url(#' + id + '-steel)', screen = 'url(#' + id + '-screen)', uv = 'url(#' + id + '-uv)';
    var base = '<ellipse cx="162" cy="190" rx="135" ry="12" fill="#bba18b" opacity=".13"/><path d="M17 157 164 113 307 158 161 204Z" fill="#f0e4d2"/><path d="M17 157v7l144 47v-7z" fill="#e0cdb4"/><path d="m161 204 146-46v7l-146 46z" fill="#e9dac3"/>';
    var body = '';
    if (type === 'drill') {
      body = '<g class="ml-strata"><path d="m43 111 91-28 121 39-91 29z" fill="#ead6b5"/>' +
        ['#d7b68c', '#c29468', '#e7cda6', '#b78763'].map(function (c, i) { var y = 111 + i * 16; return '<path d="M43 ' + y + 'v16l121 40v-16z" fill="' + c + '"/><path d="m164 ' + (y + 40) + ' 91-29v16l-91 29z" fill="' + c + '" opacity=".78"/>'; }).join('') +
        '<path d="M110 111v69l10 3v-71" fill="#f7edda"/><path d="M113 112v64" stroke="#e7aa3d" stroke-width="3"/><path d="M119 173v-61" stroke="#e97d39" stroke-width="3" class="ml-well-flow"/></g>' +
        '<path d="M82 104 105 12 133 104M105 12 116 106M91 66h32M87 83h41M95 48h23M99 31h13M91 66l37 17M87 83l34-17M95 48l27 18M93 66l25-18" fill="none" stroke="#d95545" stroke-width="4" stroke-linejoin="round"/>' +
        '<path d="m65 104 56-17 39 13-56 17z" fill="#f7ae42"/><path d="M65 104v14l39 13v-14z" fill="#d38531"/><path d="m104 117 56-17v14l-56 17z" fill="#e99a37"/><path d="M113 29v145" stroke="#667982" stroke-width="3"/>' +
        '<g class="ml-bit"><circle cx="115" cy="178" r="9" fill="#73868c"/><path d="m109 173 13 10m0-10-13 10m6-13v16" stroke="#dce5de" stroke-width="3"/></g><path d="M136 110c34 9 38-11 70-9" stroke="#c89441" stroke-width="9" fill="none"/><path class="ml-pipe-flow" d="M136 110c34 9 38-11 70-9"/>' +
        '<path d="m196 72 32-9 28 9-32 10z" fill="#eaf0ed"/><path d="M196 72v29l28 10V82z" fill="#c1d5d7"/><path d="m224 82 32-10v29l-32 10z" fill="#9dbac2"/>';
    } else if (type === 'return') {
      body = '<g class="ml-shaker"><path d="m22 104 68-20 41 16-69 23z" fill="#8da6b0"/><path d="M22 104v43l40 17v-41z" fill="#607d8c"/><path d="m62 123 69-23v43l-69 21z" fill="#b1c4c7"/><path d="m31 102 56-15 33 13-57 18z" fill="#dcceb5"/>' +
        [[44,101],[59,103],[76,95],[91,100],[81,108],[63,112]].map(function(p){return '<path d="m'+p[0]+' '+p[1]+' 7-4 6 5-7 4z" fill="#8e8170"/>';}).join('') + '</g>' +
        '<path d="M127 107h21V84h14M194 111h17v23h20" fill="none" stroke="#ba8b4c" stroke-width="8"/><path class="ml-pipe-flow" d="M127 107h21V84h14M194 111h17v23h20"/>' +
        '<path d="M154 69v83c0 15 45 15 45 0V69" fill="' + steel + '" stroke="#87989c"/><ellipse cx="176.5" cy="69" rx="22.5" ry="8" fill="#e6eeeb" stroke="#87989c"/><ellipse cx="176.5" cy="151" rx="22.5" ry="8" fill="none" stroke="#9aa9a6"/><path d="M171 67V54h12v13" fill="#95a9ad"/>' +
        '<g class="ml-steam"><circle cx="177" cy="48" r="7"/><circle cx="190" cy="35" r="8"/><circle cx="171" cy="21" r="6"/></g>' +
        '<path d="m223 114 42-13 42 14-43 14z" fill="#c9d5d1"/><path d="M223 114v43l41 15v-43z" fill="#b4bcb3"/><path d="m264 129 43-14v43l-43 14z" fill="#99aaa6"/><path d="m232 114 32-9 31 10-32 9z" fill="#73afbd"/><path d="M239 105V88h50v19" fill="none" stroke="#e9ae40" stroke-width="3"/>';
    } else if (type === 'm1') {
      body = '<path d="m38 134 154-42 94 37-153 48z" fill="#fff9eb"/><path d="M38 134v11l95 40v-8z" fill="#cfb898"/><path d="m133 177 153-48v11l-153 45z" fill="#e4cba7"/><path d="M53 147v34m211-36v33" stroke="#b2a08e" stroke-width="6"/>' +
        '<path d="m172 39 121 31v83l-121-33z" fill="#344f60"/><path d="m180 50 104 27v63l-104-27z" fill="#f1e8d7"/>' +
        [[186,58],[218,66],[250,75],[186,87],[218,95],[250,104]].map(function(p,i){return '<path d="m'+p[0]+' '+p[1]+' 24 6v22l-24-7z" fill="'+['#c2b49c','#9f9a86','#cabda3'][i%3]+'"/><path d="m'+(p[0]+4)+' '+(p[1]+7)+' 7-2 9 9-7 5-10-4z" fill="'+['#6e7565','#e4d7b7','#7a786a'][i%3]+'"/>';}).join('') +
        '<path class="ml-vision-frame" d="m183 53 108 28v63l-108-28z"/><path d="m106 86 14 4-17 40-14-4z" fill="#728b98"/><path d="m94 88 23 6 7-17-22-6z" fill="#3f5969"/><path d="M115 100c33 14 34 48 1 49" fill="none" stroke="#c6d4d5" stroke-width="11"/><ellipse cx="102" cy="150" rx="33" ry="10" fill="#99afb3"/>' +
        '<path d="m64 144 52-14 23 10-52 15z" fill="#d3bc94"/><path d="m131 151 49-14 22 9-48 15z" fill="#d3bc94"/><g fill="#8b7d64"><circle cx="80" cy="142" r="4"/><circle cx="99" cy="141" r="5"/><circle cx="155" cy="150" r="4"/><circle cx="173" cy="145" r="5"/></g>';
    } else if (type === 'm2') {
      body = '<rect x="23" y="80" width="66" height="91" rx="6" fill="' + steel + '"/><rect x="31" y="92" width="48" height="29" rx="3" fill="' + screen + '"/><path d="M35 137h39m-39 10h39m-39 10h26" stroke="#8d9e9e" stroke-width="3"/><circle cx="68" cy="110" r="3" fill="#80daae"/>' +
        '<rect x="111" y="30" width="191" height="135" rx="8" fill="#3b5669"/><rect x="120" y="39" width="173" height="116" rx="3" fill="#f8fcfb"/><path d="M194 166v13m-22 3h45" stroke="#8fa5af" stroke-width="7"/>' +
        [62,85,108,131].map(function(y){return '<path d="M129 '+y+'H284" stroke="#dfe9e9"/>';}).join('') +
        [145,176,207,238,269].map(function(x){return '<path d="M'+x+' 48v98" stroke="#e6eded"/>';}).join('') +
        '<path class="ml-signal" stroke="#ed6e62" d="M130 137l10-5 8 2 7-24 9 18 9-6 9 3 9-40 9 30 10-4 8 5 10-17 9 10 10-51 11 60 9 12 8-5"/><path class="ml-signal" stroke="#45aacd" style="animation-delay:-1.3s" d="M130 140l10-1 8-3 7-11 9 8 9-3 9 4 9-24 9 20 10-6 8 5 10-12 9 8 10-35 11 37 9 9 8-4"/>' +
        '<rect class="ml-chart-sweep" x="130" y="46" width="10" height="100" fill="#70c6e9" opacity=".15"/>';
    } else if (type === 'm3') {
      body = '<path d="m24 79 84-25 51 21-82 28z" fill="#a4a3bb"/><path d="M24 79v81l53 20v-77z" fill="#74718c"/><path d="m77 103 82-28v81l-82 24z" fill="#41415a"/><path d="m85 109 65-22v59l-65 22z" fill="' + uv + '"/><path d="m91 112 53-17" stroke="#d0a4ff" stroke-width="5"/><path d="m97 154 29-11 15 6-30 11z" fill="#8f65b8"/>' +
        '<rect x="175" y="43" width="129" height="104" rx="6" fill="#354557"/><rect x="183" y="51" width="113" height="87" rx="2" fill="' + uv + '"/><path d="M235 148v20m-22 4h48" stroke="#999eb5" stroke-width="7"/>' +
        '<g class="ml-fluor"><path d="m204 80 15-10 11 12-7 15-20-4zM252 94l14-14 16 9-3 18-21 4zM110 135l13-6 10 9-11 9-13-4z" fill="#e8ee67"/><g fill="#fff8a8"><circle cx="216" cy="84" r="3"/><circle cx="265" cy="97" r="3"/><circle cx="121" cy="137" r="2"/></g></g><path class="ml-uv-ray" d="m119 103-22 48h45z" fill="#bd84ff" opacity=".13"/>';
    } else if (type === 'm4') {
      body = '<rect x="29" y="27" width="269" height="144" rx="8" fill="#354e5e"/><rect x="38" y="37" width="251" height="124" rx="3" fill="#f8fbf7"/><path d="M160 173v12m-31 0h64" stroke="#91a4a8" stroke-width="8"/>' +
        [100,163,226].map(function(x){return '<path d="M'+x+' 40v118" stroke="#d7e1dc"/>';}).join('') +
        [75,101,127].map(function(y){return '<path d="M39 '+y+'H288" stroke="#e9eeea"/>';}).join('') +
        trace(68,'#e66b65',0) + trace(131,'#519ee4',1.1) + trace(194,'#63ae75',2.2) + trace(257,'#e4aa44',3.3) +
        '<path class="ml-layer-scan" d="M39 87H288" stroke="#8b7251" stroke-width="2" stroke-dasharray="4 5"/>';
    } else if (type === 'align') {
      body = '<rect x="28" y="19" width="272" height="167" rx="7" fill="#c0cbd0"/><rect x="35" y="27" width="258" height="151" rx="3" fill="#fffdf7"/><path d="M35 49h258" stroke="#bdc7c7"/>' +
        '<g class="ml-axis-labels"><text x="43" y="43">深度 / m</text><text x="111" y="43">岩屑</text><text x="164" y="43">气测</text><text x="214" y="43">荧光</text><text x="264" y="43">工况</text></g>' +
        [72,100,128,156].map(function(y,i){return '<path d="M85 '+y+'H287" stroke="#e9e2d6"/><text class="ml-depth-label" x="43" y="'+(y+4)+'">'+(3200+i*20)+'</text><path d="m103 '+(y-12)+' 26 3 6 14-19 5-13-9z" fill="'+['#d3bb94','#a9a18b','#d5c4a9','#b19b7b'][i]+'"/>';}).join('') +
        '<path d="M91 50v123m54-123v123m52-123v123m53-123v123" stroke="#d7cfbf"/>' + trace(168,'#e66f65',.3) + trace(268,'#62a877',1.2) +
        '<g class="ml-fluor" fill="#c6cf57"><circle cx="220" cy="68" r="5"/><circle cx="228" cy="96" r="6"/><circle cx="216" cy="126" r="4"/><circle cx="229" cy="151" r="6"/></g><path class="ml-depth-scan" d="M37 60h254" stroke="#51acd4" stroke-width="3"/>';
    } else if (type === 'm5') {
      body = '<g transform="rotate(-8 162 104)"><rect x="75" y="30" width="167" height="153" rx="5" fill="#c7b29a" opacity=".2" transform="translate(5 6)"/><rect x="75" y="30" width="167" height="153" rx="5" fill="#fffdf7" stroke="#d5c5ae"/><text x="95" y="58" class="ml-paper-title">录井报告</text><path d="M96 70h125" stroke="#e8e0d4"/><rect x="96" y="83" width="43" height="47" rx="3" fill="#eee4cf"/><path class="ml-signal" d="m100 117 9-13 7 12 7-21 10 10" stroke="#dc8d55"/><path d="M151 87h69m-69 10h58m-58 10h64m-64 10h47m-116 27h124m-124 10h99m-99 10h114" stroke="#b9b6a9" stroke-width="3" stroke-linecap="round"/><path class="ml-report-lines" d="M96 145h123m-123 10h98m-98 10h113" stroke="#e4a142" stroke-width="3"/></g>' +
        '<g class="ml-evidence-dots"><path d="M249 76h29v70h-21" fill="none" stroke="#d7b48b" stroke-width="2"/><circle cx="277" cy="76" r="8" fill="#eaa04a"/><circle cx="277" cy="111" r="8" fill="#8a72c4"/><circle cx="277" cy="146" r="8" fill="#61a47b"/></g><circle cx="248" cy="169" r="19" fill="#68a886"/><path d="m238 169 7 7 13-15" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    return '<svg class="ml-illustration ml-art-' + type + '" data-ml-art="' + type + '" viewBox="0 0 320 216" aria-hidden="true"><defs>' +
      '<linearGradient id="' + id + '-steel"><stop stop-color="#eaf0eb"/><stop offset=".45" stop-color="#afc1c6"/><stop offset="1" stop-color="#849aa4"/></linearGradient>' +
      '<linearGradient id="' + id + '-screen" x2=".4" y2="1"><stop stop-color="#3e7183"/><stop offset="1" stop-color="#23394c"/></linearGradient>' +
      '<radialGradient id="' + id + '-uv"><stop stop-color="#6740a0"/><stop offset="1" stop-color="#22253d"/></radialGradient></defs>' + base + body + '</svg>';
  }
  function labels(items) { return '<span class="ml-art-labels">' + items.map(function (s) { return '<span>' + s + '</span>'; }).join('') + '</span>'; }
  function spot(ctx, t, focus) {
    var sc = scene(ctx, t.id), esc = ctx.K.esc, count = ctx.cases.bySceneAll(t.id).length;
    return '<a class="ml-node ml-spot ml-spot-' + t.id + (focus === t.method ? ' is-relevant' : focus ? ' is-dim' : '') +
      '" data-ml-node="' + t.id + '" data-ml-spot="' + t.id + '" data-ml-tech-method="' + t.method + '" href="#/scene/' + t.id +
      '" style="--tech:' + t.color + '" aria-label="' + esc(sc.name + '，' + method(t.method).name + '，查看场景讲解') + '">' +
      '<span class="ml-node-art"><span class="ml-node-badge">' + t.id.toUpperCase() + ' <i>·</i> ' + method(t.method).abbr + '</span>' + illustration(t.id) + labels(t.labels) + '</span>' +
      '<div class="ml-node-copy"><h3>' + esc(sc.name) + '</h3><p>' + t.summary + '</p><span class="ml-node-link">' + (count ? count + ' 个案例已接入' : '查看场景讲解') + '<b>↗</b></span></div></a>';
  }
  function processNode(id, no, title, desc, items) {
    return '<article class="ml-node ml-process ml-process-' + id + '" data-ml-node="' + id + '" tabindex="0" aria-label="' + title + '" style="--tech:#bd8b52">' +
      '<span class="ml-process-art">' + illustration(id) + labels(items) + '</span><div class="ml-node-copy"><span class="ml-process-step">' + no + '</span><h3>' + title + '</h3><p>' + desc + '</p></div></article>';
  }
  function fallbackModel() {
    var boxes = { drill: [28, 32, 510, 240], 'return': [610, 32, 1418, 240], m1: [28, 350, 350, 665], m2: [384, 350, 707, 665], m3: [741, 350, 1063, 665], m4: [1097, 350, 1418, 665], align: [28, 780, 790, 1000], m5: [965, 780, 1418, 1000] }, nodes = {};
    Object.keys(boxes).forEach(function (key) { var b = boxes[key]; nodes[key] = { left: b[0], top: b[1], right: b[2], bottom: b[3] }; });
    return { width: 1448, height: 1032, nodes: nodes };
  }
  function pathBetween(a, b) {
    if (b.left >= a.right && b.top < a.bottom) {
      var y1 = (a.top + a.bottom) / 2, y2 = (b.top + b.bottom) / 2, mx = (a.right + b.left) / 2;
      return 'M' + (a.right + 5) + ' ' + y1 + 'C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + (b.left - 5) + ' ' + y2;
    }
    var x1 = (a.left + a.right) / 2, x2 = (b.left + b.right) / 2, my = (a.bottom + b.top) / 2;
    return 'M' + x1 + ' ' + (a.bottom + 5) + 'C' + x1 + ' ' + my + ' ' + x2 + ' ' + my + ' ' + x2 + ' ' + (b.top - 5);
  }
  function flow(path, color, id, from, to, duration) {
    return '<g class="ml-flow" data-ml-flow="' + id + '" data-ml-from="' + from + '" data-ml-to="' + to + '" style="--flow:' + color + '">' +
      '<path class="ml-flow-track" d="' + path + '"/><path class="ml-flow-current" d="' + path + '"/>' + [0,1].map(function (i) {
        return '<g class="ml-moving-arrow"><path d="M-9-5 0 0-9 5"/><animateMotion dur="' + duration + 's" begin="' + (-duration*i/2) + 's" repeatCount="indefinite" rotate="auto" path="' + path + '"/></g>';
      }).join('') + '</g>';
  }
  function drawing(model) {
    var n = model.nodes, out = '';
    function add(from, to, color, id, duration) { if (n[from] && n[to]) out += flow(pathBetween(n[from],n[to]), color, id, from, to, duration); }
    add('drill','return','#dca05d','source',4);
    TECH.filter(function (t) { return t.id !== 'm5'; }).forEach(function (t) {
      add('return',t.id,'#6db8d4',t.id,5.6); add(t.id,'align',t.color,t.id,4.4);
    });
    add('align','m5','#ed9660','m5',3.3);
    return out;
  }
  function mobileArrow() { return '<div class="ml-mobile-arrow" aria-hidden="true"><svg viewBox="0 0 40 45"><path d="M20 2v34m-7-8 7 9 7-9"/></svg></div>'; }
  function deck(ctx, focus) {
    var esc = ctx.K.esc;
    return available(ctx).filter(function (t) { return !focus || t.method === focus; }).map(function (t) {
      var sc = scene(ctx,t.id), count = ctx.cases.bySceneAll(t.id).length;
      return '<a class="ml-read-card" href="#/scene/' + t.id + '" style="--tech:' + t.color + '"><span class="ml-read-art">' + illustration(t.id) + '<span class="ml-read-id">' + t.id.toUpperCase() + ' · ' + method(t.method).abbr + '</span></span><div class="ml-read-text"><h3>' + esc(sc.name) + '</h3><p>' + esc(sc.point) + '</p><dl><div><dt>输入</dt><dd>' + t.input + '</dd></div><div><dt>输出</dt><dd>' + t.output + '</dd></div></dl><span class="ml-read-link">' + (count ? '查看讲解与案例 · ' + count + ' 个已接入' : '查看场景讲解') + '<b>↗</b></span></div></a>';
    }).join('');
  }
  function extraScenes(ctx) {
    var extra = ctx.stage.scenes.filter(function (sc) { return !TECH.some(function (t) { return t.id === sc.id; }); });
    if (!extra.length) return '';
    var esc = ctx.K.esc;
    return '<section class="ml-extra"><h2>更多录井场景</h2>' + extra.map(function (sc) { return '<a href="#/scene/' + esc(sc.id) + '"><b>' + esc(sc.name) + '</b><span>' + esc(sc.point || '') + '</span><i>↗</i></a>'; }).join('') + '</section>';
  }
  function render(ctx) {
    var focus = selected((ctx.query || {}).m), esc = ctx.K.esc, tech = available(ctx), model = fallbackModel();
    var index = ctx.atlas.stages.indexOf(ctx.stage), prev = ctx.atlas.stages[index-1], next = ctx.atlas.stages[index+1];
    return '<main class="ml-page" data-ml-stage data-ml-method="' + focus + '"><nav class="crumb"><a href="#/">总览</a><span class="sep">/</span><a href="#/chain">作业链</a><span class="sep">/</span><span class="cur">录井</span></nav>' +
      '<header class="ml-head"><div><div class="ml-eyebrow"><span>04 / 13</span> MUD LOGGING · 录井</div><h1>看见地下，读懂每一米<span>。</span></h1><p>从井底的一片岩屑，到一份有据可查的录井报告。</p></div><div class="ml-head-note"><span class="ml-live-dot"></span><span>一张图，串起 <b>' + ctx.stage.scenes.length + ' 个场景</b><small>悬停放大 · 点击进入讲解</small></span></div></header>' +
      '<section class="ml-lab" aria-label="录井现场交互总览"><div class="ml-toolbar"><div class="ml-methods" role="group" aria-label="选择智能方法并放大对应图示">' + METHODS.map(function (m) {
        return '<button type="button" data-ml-method-button="' + m.id + '" aria-pressed="' + (focus === m.id) + '" aria-controls="ml-map ml-deck"><b>' + m.abbr + '</b><span>' + m.name + '</span></button>';
      }).join('') + '</div><button class="ml-motion" type="button" data-ml-toggle aria-pressed="true"><span data-ml-toggle-icon>Ⅱ</span><span data-ml-toggle-label>暂停动效</span></button></div>' +
      '<div class="ml-status"><span>↳</span><p data-ml-status role="status">' + method(focus).note + '</p><small>悬停看细节 <b>↗</b></small></div>' +
      '<div class="ml-map' + (focus ? ' has-focus' : '') + '" id="ml-map" data-ml-map><div class="ml-ground" aria-hidden="true"></div>' +
      '<svg class="ml-flows" data-ml-motion="" viewBox="0 0 1448 1032" preserveAspectRatio="none" aria-hidden="true">' + drawing(model) + '</svg>' +
      '<div class="ml-process-row">' + processNode('drill','01 / 井底取样','钻头破岩，向下钻进','钻井液沿钻柱向下，到达井底后携带岩屑与地层气体返出。',['钻头破岩','携样返出']) + mobileArrow() +
      processNode('return','02 / 地面分离','让岩屑、气体与钻井液各归其位','振动筛分离岩屑，脱气器提取气体，钻井液通过循环系统再次入井。',['振动筛','脱气器','钻井液循环池']) + '</div>' + mobileArrow() +
      '<div class="ml-section-marker"><span>03</span><b>四条证据通道</b><i>取样、测量，再交给智能方法分析</i></div><div class="ml-evidence-grid">' + tech.filter(function (t) { return t.id !== 'm5'; }).map(function (t) { return spot(ctx,t,focus); }).join('') + '</div>' + mobileArrow() +
      '<div class="ml-fusion-row">' + processNode('align','04 / 深度对齐','把所有线索，放到同一条深度轴','对岩屑、气测做迟到校正，再与荧光、钻时和工况资料综合对比。',['统一深度','多源对照']) + mobileArrow() +
      tech.filter(function (t) { return t.id === 'm5'; }).map(function (t) { return spot(ctx,t,focus); }).join('') + '</div></div>' +
      '<div class="ml-map-footer"><span class="ml-live-dot"></span><span data-ml-running>信号正在流动</span><i>示意动画</i><p>岩屑与气测需做迟到校正；钻时还需结合钻压、转速等工况解读。</p></div></section>' +
      '<section class="ml-reading' + (focus ? ' has-focus' : '') + '" data-ml-reading aria-labelledby="ml-reading-title"><div class="ml-reading-head"><div><span class="ml-eyebrow">EXPLORE THE SCENES</span><h2 id="ml-reading-title" data-ml-reading-title>' + (focus ? method(focus).name + ' · 放大看细节' : '从图示，走进每一个场景') + '</h2></div><span data-ml-reading-count>' + tech.filter(function (t) { return !focus || t.method === focus; }).length + ' 个图示入口 ↗</span></div><div class="ml-deck" id="ml-deck" data-ml-deck>' + deck(ctx,focus) + '</div></section>' + extraScenes(ctx) +
      '<div class="pager">' + (prev ? '<a class="prev" href="#/stage/' + esc(prev.id) + '"><span class="dir">← 上一环节</span><span class="nm">' + esc(prev.name) + '</span></a>' : '') + (next ? '<a class="next" href="#/stage/' + esc(next.id) + '"><span class="dir">下一环节 →</span><span class="nm">' + esc(next.name) + '</span></a>' : '') + '</div></main>';
  }
  function bind(root, ctx) {
    if (!root) return { destroy: function () {} };
    var focus = selected((ctx.query || {}).m), disposed = false, hovered = '', focused = '', frame = 0;
    var buttons = [].slice.call(root.querySelectorAll('[data-ml-method-button]'));
    var nodes = [].slice.call(root.querySelectorAll('[data-ml-node]'));
    var spots = [].slice.call(root.querySelectorAll('[data-ml-spot]'));
    var svgs = [].slice.call(root.querySelectorAll('[data-ml-motion]'));
    var map = root.querySelector('[data-ml-map]');
    var mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var paused = !!(mq && mq.matches);
    function visual() {
      var active = hovered || focused;
      map.classList.toggle('has-peek', !!active); root.dataset.mlInspect = active;
      nodes.forEach(function (node) {
        node.classList.toggle('is-peeked', node.dataset.mlNode === active);
        node.classList.toggle('is-blurred', !!active && node.dataset.mlNode !== active);
        node.classList.toggle('is-relevant', !!focus && node.dataset.mlTechMethod === focus);
        node.classList.toggle('is-dim', !!focus && node.dataset.mlTechMethod !== focus);
      });
      [].forEach.call(root.querySelectorAll('[data-ml-flow]'), function (f) {
        var t = TECH.filter(function (x) { return x.id === f.dataset.mlFlow; })[0];
        var related = active ? f.dataset.mlFrom === active || f.dataset.mlTo === active || f.dataset.mlFlow === active : !!focus && t && t.method === focus;
        f.classList.toggle('is-dim', active ? !related : !!focus && !related);
        f.classList.toggle('is-relevant', !!related);
      });
    }
    function applyFocus(value, updateUrl) {
      focus = selected(value); root.dataset.mlMethod = focus;
      map.classList.toggle('has-focus', !!focus);
      root.querySelector('[data-ml-reading]').classList.toggle('has-focus', !!focus);
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mlMethodButton === focus)); });
      root.querySelector('[data-ml-status]').textContent = method(focus).note;
      root.querySelector('[data-ml-reading-title]').textContent = focus ? method(focus).name + ' · 放大看细节' : '从图示，走进每一个场景';
      root.querySelector('[data-ml-reading-count]').textContent = available(ctx).filter(function (t) { return !focus || t.method === focus; }).length + ' 个图示入口 ↗';
      root.querySelector('[data-ml-deck]').innerHTML = deck(ctx,focus); visual();
      if (updateUrl) {
        try { global.history.replaceState(null,'','#/stage/mudlogging' + (focus ? '?m=' + focus : '')); } catch (e) { /* file:// can reject URL-only updates. */ }
        var first = spots.filter(function (s) { return s.dataset.mlTechMethod === focus; })[0];
        if (first && global.innerHeight) { var rect = first.getBoundingClientRect(); if (rect.top < 130 || rect.bottom > global.innerHeight-25) first.scrollIntoView({block:'center',inline:'nearest',behavior:mq && mq.matches ? 'auto' : 'smooth'}); }
      }
    }
    function applyMotion() {
      root.classList.toggle('is-paused',paused); root.classList.toggle('is-playing',!paused);
      root.querySelector('[data-ml-toggle]').setAttribute('aria-pressed',String(!paused));
      root.querySelector('[data-ml-toggle-icon]').textContent = paused ? '▶' : 'Ⅱ';
      root.querySelector('[data-ml-toggle-label]').textContent = paused ? '播放动效' : '暂停动效';
      root.querySelector('[data-ml-running]').textContent = paused ? '动效已暂停 · 仍可探索' : '信号正在流动';
      svgs.forEach(function (svg) { var action = paused ? 'pauseAnimations' : 'unpauseAnimations'; if (typeof svg[action] === 'function') svg[action](); });
    }
    function refresh() {
      if (disposed) return;
      var svg = svgs[0], rect = map.getBoundingClientRect();
      if (!svg || !rect.width || !rect.height) return;
      var model = {width:rect.width,height:rect.height,nodes:{}};
      nodes.forEach(function (node) { var b = node.getBoundingClientRect(); model.nodes[node.dataset.mlNode] = {left:b.left-rect.left,top:b.top-rect.top,right:b.right-rect.left,bottom:b.bottom-rect.top}; });
      svg.setAttribute('viewBox','0 0 ' + model.width + ' ' + model.height); svg.innerHTML = drawing(model); visual(); applyMotion();
    }
    function schedule() { if (disposed || frame) return; if (global.requestAnimationFrame) frame = global.requestAnimationFrame(function () { frame=0; refresh(); }); else refresh(); }
    function closest(target) { return target && target.closest ? target.closest('[data-ml-node]') : null; }
    function inspect(e) {
      if (e.pointerType === 'touch') return;
      var node = closest(e.target), id = node ? node.dataset.mlNode : '';
      if (hovered !== id) { hovered=id; visual(); }
    }
    function leave(e) {
      var node = closest(e.relatedTarget), id = node ? node.dataset.mlNode : '';
      if (hovered !== id) { hovered=id; visual(); }
    }
    function focusIn(e) { var node=closest(e.target); focused=node ? node.dataset.mlNode : ''; visual(); }
    function focusOut(e) { var node=closest(e.relatedTarget); focused=node ? node.dataset.mlNode : ''; visual(); }
    function click(e) {
      var choice=e.target.closest('[data-ml-method-button]');
      if (choice) { applyFocus(choice.dataset.mlMethodButton,true); return; }
      if (e.target.closest('[data-ml-toggle]')) { paused=!paused; applyMotion(); }
    }
    function keydown(e) {
      var choice=e.target.closest('[data-ml-method-button]'); if (!choice) return;
      var i=buttons.indexOf(choice), n=i;
      if (e.key==='ArrowRight' || e.key==='ArrowDown') n=(i+1)%buttons.length;
      else if (e.key==='ArrowLeft' || e.key==='ArrowUp') n=(i-1+buttons.length)%buttons.length;
      else if (e.key==='Home') n=0; else if (e.key==='End') n=buttons.length-1; else return;
      e.preventDefault(); buttons[n].focus(); applyFocus(buttons[n].dataset.mlMethodButton,true);
    }
    function preference() { if (!disposed) { paused=!!mq.matches; applyMotion(); } }
    var handlers={click:click,keydown:keydown,pointerover:inspect,pointerout:leave,focusin:focusIn,focusout:focusOut};
    Object.keys(handlers).forEach(function (name) { root.addEventListener(name,handlers[name]); });
    if (mq && mq.addEventListener) mq.addEventListener('change',preference);
    var observer=global.ResizeObserver ? new global.ResizeObserver(schedule) : null;
    if (observer) observer.observe(map);
    global.addEventListener('resize',schedule);
    if (global.document.fonts && global.document.fonts.ready) global.document.fonts.ready.then(schedule);
    applyFocus(focus,false); applyMotion(); refresh();
    return { refresh:refresh, destroy:function () {
      if (disposed) return; disposed=true;
      Object.keys(handlers).forEach(function (name) { root.removeEventListener(name,handlers[name]); });
      if (mq && mq.removeEventListener) mq.removeEventListener('change',preference);
      if (observer) observer.disconnect(); global.removeEventListener('resize',schedule);
      if (frame && global.cancelAnimationFrame) global.cancelAnimationFrame(frame);
      svgs.forEach(function (svg) { if (typeof svg.pauseAnimations==='function') svg.pauseAnimations(); });
    }};
  }
  global.MudloggingStage={render:render,bind:bind};
})(window);
