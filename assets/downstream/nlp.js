(function (g) {
  'use strict';

  // Match Python's Unicode whitespace set used by the preparation script.
  const spaces = /[\u0009-\u000d\u001c-\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/gu;
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const normalized = text => String(text == null ? '' : text).normalize('NFKC').toLowerCase();

  function textVector(text, textPipeline) {
    const chars = Array.from(normalized(text).replace(spaces, ''));
    const counts = new Map();
    const widths = textPipeline.ngrams || [1, 2];
    for (const width of widths) {
      for (let i = 0; i + width <= chars.length; i++) {
        const token = chars.slice(i, i + width).join('');
        counts.set(token, (counts.get(token) || 0) + 1);
      }
    }
    const vector = textPipeline.vocabulary.map((token, i) =>
      (counts.get(token) || 0) * textPipeline.idf[i]);
    const norm = Math.sqrt(vector.reduce((total, value) => total + value * value, 0));
    return norm ? vector.map(value => value / norm) : vector;
  }

  function parseText(text, assertionIndex, d) {
    const e = d.extractor;
    const classes = d.textPipeline.classes;
    if (!Number.isInteger(assertionIndex) || assertionIndex < 0 || assertionIndex >= classes.length) {
      throw new RangeError('断言类别必须是分类器输出的有效索引。');
    }
    // Extraction deliberately retains spaces; vectorization removes them.
    const currentText = normalized(text);
    const fields = {};
    const issues = [];
    for (const rule of e.patterns) {
      const match = new RegExp(rule.pattern, 'iu').exec(currentText);
      if (!match) continue;
      const field = rule.field;
      if (field === 'sampleId') {
        fields[field] = match[rule.valueGroup || 1];
        continue;
      }
      const rawUnit = match[rule.unitGroup].replace(spaces, '');
      const rawValue = Number(match[rule.valueGroup]);
      if (!Number.isFinite(rawValue)) throw new RangeError('抽取的化验数值必须是有限数。');
      const rules = e.unitRules[field] || {};
      const multiplier = own(rules, rawUnit) ? rules[rawUnit] : null;
      fields[field] = {
        rawValue,
        rawUnit,
        normalizedValue: multiplier == null ? null : rawValue * multiplier
      };
      if (multiplier == null) issues.push('unit_basis_unknown');
    }

    const limits = e.demoLimits;
    const sulfur = fields.sulfur ? fields.sulfur.normalizedValue : null;
    if (sulfur == null) issues.push('missing_sulfur_evidence');
    else if (sulfur > limits.sulfurMax_mg_kg) issues.push('sulfur_limit');
    const flash = fields.flashPoint ? fields.flashPoint.normalizedValue : null;
    if (flash != null && flash < limits.flashMin_C) issues.push('flash_low');
    const density = fields.density ? fields.density.normalizedValue : null;
    const densityRange = limits.densityRange_kg_m3;
    if (density != null && densityRange &&
        (density < densityRange[0] || density > densityRange[1])) issues.push('density_range');

    const scope = e.negationScope || {};
    const keywords = scope.fieldKeywords || ['硫', 'sulfur'];
    const clauses = currentText.split(new RegExp(scope.delimiterPattern || '[。；;!?！？]', 'u'))
      .filter(clause => keywords.some(keyword => clause.includes(keyword)));
    const negation = (e.negationCues || []).filter(cue =>
      clauses.some(clause => clause.includes(cue)));
    const uncertain = (e.uncertaintyCues || []).filter(cue => currentText.includes(cue));
    if (sulfur != null && sulfur > limits.sulfurMax_mg_kg &&
        (assertionIndex === 1 || negation.length)) issues.push('assertion_numeric_conflict');
    if (assertionIndex === 2 || uncertain.length) issues.push('uncertain_assertion');

    return { fields, issues, assertion: classes[assertionIndex], cueEvidence: { negation, uncertain } };
  }

  function reviewTasks(parsed, optimization) {
    const fields = parsed.fields || {};
    const issues = parsed.issues || [];
    const hasIssue = names => names.some(name => issues.includes(name));
    const ids = ['identity'];
    if (Object.keys(fields).some(field => field !== 'sampleId')) ids.push('unit');
    if (hasIssue(['sulfur_limit', 'flash_low', 'density_range'])) ids.push('retest');
    if (hasIssue(['assertion_numeric_conflict', 'uncertain_assertion'])) ids.push('context');
    if (hasIssue(['missing_sulfur_evidence', 'unit_basis_unknown'])) ids.push('evidence');
    ids.push('report');
    return ids.map(id => {
      const template = optimization.taskTemplates[id];
      if (!template) throw new Error('缺少审核任务模板：' + id);
      return { id, ...template };
    });
  }

  function assign(tasks, reviewers, capacityFactor = 1) {
    if (!Number.isFinite(capacityFactor) || capacityFactor < 0) {
      throw new RangeError('审核容量系数必须是非负有限数。');
    }
    for (const task of tasks) {
      if (!Number.isFinite(task.minutes) || task.minutes < 0 ||
          !Number.isFinite(task.risk) || task.risk < 0) {
        throw new RangeError('任务时长和风险必须是非负有限数。');
      }
    }
    for (const reviewer of reviewers) {
      if (!Number.isFinite(reviewer.capacity) || reviewer.capacity < 0 ||
          !Number.isFinite(reviewer.costPerMinute) || reviewer.costPerMinute < 0) {
        throw new RangeError('审核容量和分钟成本必须是非负有限数。');
      }
    }

    let best = null;
    const assignment = new Array(tasks.length).fill(-1);
    const loads = reviewers.map(() => 0);
    function visit(index, coveredRisk, cost) {
      if (index === tasks.length) {
        // Strict comparison and enumeration order mirror Python itertools.product.
        if (!best || coveredRisk > best.coveredRisk ||
            (coveredRisk === best.coveredRisk && cost < best.cost)) {
          best = { assignment: assignment.slice(), loads: loads.slice(), coveredRisk, cost };
        }
        return;
      }
      const task = tasks[index];
      assignment[index] = -1;
      visit(index + 1, coveredRisk, cost);
      for (let reviewerIndex = 0; reviewerIndex < reviewers.length; reviewerIndex++) {
        const reviewer = reviewers[reviewerIndex];
        if (!reviewer.skills.includes(task.skill) ||
            loads[reviewerIndex] + task.minutes > reviewer.capacity * capacityFactor) continue;
        assignment[index] = reviewerIndex;
        loads[reviewerIndex] += task.minutes;
        visit(index + 1, coveredRisk + task.risk, cost + task.minutes * reviewer.costPerMinute);
        loads[reviewerIndex] -= task.minutes;
      }
      assignment[index] = -1;
    }
    visit(0, 0, 0);
    // Unassigned(-1) entries stay visible; scheduling is not completed review.
    return { ...best, tasks };
  }

  g.DownstreamNLP = { textVector, parseText, reviewTasks, assign };
})(window);
