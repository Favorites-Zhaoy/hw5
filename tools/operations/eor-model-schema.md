# EOR data and inference schema

Run `python -X utf8 tools/operations/prepare-eor.py`. An optional `--cases e1 e3`
rebuilds selected assets. The script writes only its five case assets and research
audit summaries. Required numeric snapshots are versioned in
`tools/operations/source-data/eor/`; preparation needs no network or untracked
research cache. `source-index.json` records original URLs, licenses, exact
transformations and byte hashes, checked before model preparation. The CSS
snapshot keeps only180 relevant rows and seven consumed columns. Original
downloads remain untouched. Models are small CPU models
trained from this task's data, with fixed seeds and no downloaded pretrained weights.

The common payload follows `asset-contract.json`. `published-laboratory` extends
the example `record.kind` list so laboratory measurements are not mislabeled as
field data. All arrays are finite JSON numbers rounded to nine significant digits.

## Common neural inference

Record inputs remain in their stated physical units. Apply `inputTransform` first
(`log`, `log1p`, or identity), then `(input-model.mean)/model.scale`. The CNN takes
the recorded peak-normalized image directly, without additional standardization.

Dense weights are flattened `[output,input]`; each layer declares `in` and `out`.
Convolution weights are flattened PyTorch `OIHW`. Padding is zeros. The image
and flatten order is channel, row, column. Supported activations are `relu`,
`tanh`, and `linear`.

After the final linear head, compute

```
response = outputMean + outputScale * normalizedNetworkOutput
```

Apply `outputTransform` afterward: `exp` for e1, `expm1` for e4, identity for other
cases. `parity[].networkOutput` is the normalized final head; `parity[].expected`
is the physical/geometric response after all output operations. Expected values
are independently calculated using NumPy and the rounded exported arrays.
Neural parity records also verify these values against actual PyTorch inference.

## e1 — PKN response surrogate

Input order is `[Q_m3_s,time_s,E_pa,mu_pa_s,height_m]`, all positive SI values.
Take the natural logarithm before standardization. Poisson ratio is fixed at 0.25.
Output order after inverse scaling and `exp` is
`[half_length_m,inlet_width_m,net_pressure_pa]`. Width display in mm requires
multiplication by 1000; pressure display in MPa requires division by 1e6.

The separate physical reference is:

```
Ep = E / (1 - 0.25^2)
L  = 0.3817 * (Ep*Q^3*t^4 / (mu*h^4))^(1/5)
w  = 3 * (mu*Q*L / Ep)^(1/4)
p  = (16*mu*Q*Ep^3*L / (pi*h^4))^(1/4)
V  = Q*t
```

Q is total injection rate, not the quarter-domain mass source used inside GEOS.
Training and test groups keep a complete `(E,height)` rock scenario together.
Generated scenarios retain `L/h>=3` as an explicit teaching applicability filter.
The exact analytical baseline has zero error against its own generated labels.

The owner runs an actual bounded `(Q,t)` grid search with the trained surrogate.
Pressure, injected-volume and geometry constraints must be checked by the physical
formula, and the final candidate must retain its analytical recheck. A boundary
candidate or no feasible candidate is a valid outcome. There are no oil labels.

## e2 — Event-density CNN and geometry optimization

Input shape is `[1,32,32]`, flattened channel/row/column. **Rows increase with y**;
if the UI uses downward screen y, invert the plotting coordinates consistently,
not the network inputs. Input image pixels are smoothed event counts normalized
by image peak; x and y occupy `[-1,1]`.

Output order after inverse output scaling is:

```
[center_x, center_y, sigma_major, sigma_minor, cos(2*theta), sin(2*theta)]
theta = 0.5 * atan2(output[5], output[4])
```

The axes are Gaussian one-standard-deviation density scales. For a controlled
2D Gaussian coverage ellipse at coverage c, multiply both scales by
`sqrt(-2*log(1-c))`. The periodic angle vector can be normalized for display.
Negative axes are invalid network predictions, not evidence of a physical shape;
they may be sanitized only as a documented optimizer initial condition.

There are 420 independently generated geometries, each with two noisy event-cloud
views. Both views remain in one split: 300/60/60 geometry groups for training,
validation, and test. Synthetic metrics use true generator parameters, including
axis error, angle error and 64×64 image-window-clipped ellipse IoU at 90% coverage.

First three records are synthetic held-out examples. Last three are real FORGE
dates with `target:null`. Their normalized `display.points` support fitting;
`display.pointsMeters` and `display.pointUncertainty` retain local x/y and source
position standard deviations in meters. The inverse frame map is

```
point_m = display.frame.center + display.frame.halfSpan * point_normalized
```

The local lon/lat conversion is a declared equirectangular approximation; it is
not survey-grade reprojection. The filter requires max x/y/z sigma <=150 m and
the square frame omits outside points. Counts before and after both operations
are retained. Weights are proportional to `1/(sigma_x_m^2+sigma_y_m^2+25)` and
normalized to a maximum of one.

The owner optimizes a robust ellipse over weighted projected events, optionally
with selected weighted coverage. Real coverage is an **event-cloud** statistic.
No FORGE fracture parameter, mask, opening or oil-gain ground truth exists here;
do not calculate real-fracture accuracy or IoU from the fitted envelope itself.

## e3 — Gaussian process and concentration constraints

Input order is `[concentration_mg_l,permeability_1e_minus_3_um2]`; do not relabel
the permeability as mD. Apply ordinary mean/scale normalization, no log transform.
The direct target is measured dimensionless resistance factor RF. RF is not a
Random Forest model abbreviation in this case.

For normalized x and each training row z:

```
k(x,z) = kernel.signal * exp(-0.5 * sum(((x-z)/kernel.lengths)^2))
K[i,j] = k(z_i,z_j) + (i==j ? kernel.noise : 0)
mu_normalized = k_vector^T * alpha
mu_RF = outputMean[0] + outputScale[0] * mu_normalized
latent_var_RF = outputScale[0]^2 * max(0, signal-k^T*Kinv*k)
```

`signal` and `noise` are **variances**, not standard deviations. `noise` includes
1e-8 diagonal numerical jitter. Latent variance excludes new-observation noise.
The stored arrays are `scaledX[N][2]`, `alpha[N]`, `Kinv[N][N]`.

Top-level `model` is fitted to all 15 actual observations for interpolation and
constrained candidate screening. `evaluationModels` contain the five independently
scaled/kernel-fitted 12-row models. A held-out record's `modelKey` selects its
evaluation model. Its baseline is same-fold linear interpolation/extrapolation
at the same permeability. Validation summarizes those 15 out-of-fold predictions.
The edge concentration folds (750 and 2000 mg/L) are extrapolation tests. Do not
display the final all-data model's in-sample fit as held-out evaluation.

For concentration screening use the final model and candidate grid 750..2000
mg/L in 25 mg/L steps, with k within 100..500 source units. Find the smallest c
whose mean or selected conservative lower bound satisfies the RF constraint.
No feasible candidate is allowed. Unmeasured candidates remain proposals; the
separate five-row recovery table was never joined to these RF labels.

## e4 — Conditional CSS GRU and bounded three-month plans

Historical record input is `[6,2]`, oldest to most recent, with raw monthly
`[Oil_m3,SteamINJ_cold_water_equivalent_m3]`. Apply `log1p`, then training-only
means/scales. Historical features contain no SOR, future Oil, GHG or EI.

`record.conditioning` is `[given_next_month_steam_cwe_m3]`. After the GRU head,
but before output inverse scaling, add:

```
zc = (log1p(record.conditioning)-model.conditioning.mean)
     / model.conditioning.scale
normalizedOutput += model.conditioning.headWeight * zc
Oil_m3 = expm1(outputMean + outputScale*normalizedOutput)
```

GRU input remains two historical features; the known steam acts through a separate
linear conditional head. It is **given future steam**, not predicted future steam.
Historical tests supply realized steam as a retrospective known condition.

The single-layer PyTorch gate equations are shared with e5:

```
i = weightIH*x + biasIH
q = weightHH*h + biasHH
r = sigmoid(i_r + q_r)
z = sigmoid(i_z + q_z)
n = tanh(i_n + r*q_n)
h = (1-z)*n + z*h
head = head.weight*h + head.bias
```

Gate order is r,z,n; weights have shapes `[3H,I]`, `[3H,H]`; biases have length
3H. Zero initial state, no dropout at inference. In particular, do not multiply
the recurrent hidden vector by r before the candidate matrix multiplication.

Splits: UID1+3 train target months 2015-07..2017-12 (60 windows), validate 2018
(24), test 2019 (24). All UID17 windows 2015-07..2019-12 (54) form an untouched
operation holdout. The main metric reports that harder group holdout even when
the model is worse than persistence. Actual names and units:

| UID | Operation | Scheme | Months |
|---|---|---|---:|
| 1 | IMOCL | Cold Lake | 60 |
| 3 | CNRLWL | CNRL Wolf Lake, Primrose, and Burnt Lake | 60 |
| 17 | CNULPR | PeaceRiver | 60 |

Oil is m³/month; steam is m³ cold-water-equivalent/month at 15°C. Gas fields in
the original table use 10³ m³ and are excluded. A project month is not a well cycle.

Three-month scenario rollout must append **predicted** Oil and selected steam at
each step; actual future Oil is displayed only for the original observed-steam
hindcast and never fed to a changed scenario. Owner grid search enforces the three
monthly bounds, sum budget and ramp limit. Record bounds use already observed
history, intersected with ±20% of the last steam value. Unknown-operation inputs
may still lie outside model training support and must be flagged. A predicted
scenario difference is observational association, not causal incremental oil.

## e5 — Causal-in-time online soft sensor

Input is the unchanged `[24,3]` extract, ordered oldest to most recent:
`[stirrer_rpm,temperature_C,dissolved_oxygen_percent_saturation]`. Each hour uses
actual sensor values in `[t-24+i,t-23+i)`. The latest sensor must be strictly before
the actual assay time t. Identity transform; normalize with training-window means
and scales. The target is the same-time offline trehalolipid assay, g/L.

There are 64 original assay values. Four t=0 values have no prior24h, leaving60
windows. Train on B1+B3 at24..288h (24 labels); validate their312/336/360h values
(6); hold all B2a+B2b together (30). B2a/b are replicates. Scaling and the titer
mean baseline use only the24 training labels/windows. There is no titer,
biomass, OD, substrate, protein or sparse pH feature, no target fill, and no future
sensor. Negative predictions remain visible rather than being silently clipped.

The task is same-time soft sensing before the assay is available, not a 24h-ahead
forecast. “Past-only” is an information-timing statement, not causal treatment
identification. It does not validate reservoir activity or oil recovery.

## Attribution and licensing

| Asset | Primary source | License and scope |
|---|---|---|
| e1 | [GEOS PKN verification](https://geosx-geosx.readthedocs-hosted.com/en/develop/docs/sphinx/advancedExamples/validationStudies/hydraulicFracture/pknFracViscosityDominated/Example.html) | Independently implemented analytical teaching simulation; no GEOS source copied or field data implied. No separate source-document data license asserted. |
| e2 real | [Zhu et al., Utah FORGE catalog, 2026](https://gdr.openei.org/submissions/1817) | CC BY4.0; processed geothermal event locations, not fracture labels. Synthetic training clouds are independently generated. |
| e3 | [Qiannan Yu, Mendeley 10.17632/ns7xbjz54h.1](https://data.mendeley.com/datasets/ns7xbjz54h/1) | CC BY4.0;15 measured laboratory RF records. |
| e4 | [Minxing Si, Mendeley 10.17632/8ngkgz69zb.2](https://data.mendeley.com/datasets/8ngkgz69zb/2) | CC BY4.0; author-curated Petrinex operational aggregates. [Paper Table2](https://doi.org/10.3390/su13041968) gives units and CWE convention. |
| e5 | [Martin, Bages Estopa, Winterburn, Webb and White, Mendeley 10.17632/bw79v9vnbs.1](https://data.mendeley.com/datasets/bw79v9vnbs/1) | CC BY4.0 for the data. [Research article](https://doi.org/10.1016/j.bej.2018.07.006) is a reference; its separate media/license are not asserted or redistributed. |

Retain these source links, authors, DOI identifiers, measurement/simulation labels
and boundaries when sharing derived plots or records. Raw file hashes and
hashes are in the tracked source index. Preparation summaries are generated under
`.artifacts/operations-research/eor/` as optional outputs. The tracked
`source-data/eor/extract_sensor_windows.py` is a reference regeneration tool: supply
the original4.75MB Mendeley CSV using `--raw` and an optional `--output-dir`.
It is not needed for normal preparation, which reads the60-label snapshot directly.
