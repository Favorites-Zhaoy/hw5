# Production asset details

Run `python tools/operations/prepare-production.py` to recreate the five JSON files.
Optional case arguments prepare only those cases. Required input snapshots are
tracked in `tools/operations/source-data/production/`, with original URLs,
licenses, original-source SHA256 and snapshot SHA256 in `source-index.json`.
The preparation prefers these tracked inputs, with the untouched
`.artifacts/operations-research/production/` as a fallback download cache. The 3W
snapshots retain only required minute channels/labels plus exact onset metadata;
ESPset contributes a count-only context snapshot, not its bulk spectrum/features.
No artwork is used as model input or training data.

The common envelope follows `asset-contract.json`. `record.target` is reference
information and never part of `record.input`. `display` contains plotting data;
neither labels nor plotted future reference values enter inference. Every case has
three independently calculated Python parity outputs using the rounded exported
parameters. Network parity is before UI thresholds. GRU parity includes the fixed
output mean/scale, so its values have the stated physical/source units.

## pr1: digitized card CNN and shape-logistic baseline

`model` is the contract CNN: 1×32×32, Conv(1→4,k3,s2,p1), ReLU,
Conv(4→6,k3,s2,p1), ReLU, flatten CHW, dense(384→4). Dense and convolution
parameters use PyTorch row-major layouts. Output is four logits in `classes` order.
Input pixels are 0/1. Source markers are unordered and are drawn as dots; the
preparation does not invent a continuous trace through them.

`baselineModel` is a multinomial logistic model over the 18 named shape features.
`record.shapeFeatures` holds its exact unscaled features. Standardize using the
baseline's training-only mean/scale, then apply its 4×18 weight and bias.
`record.baseline` contains its independently fitted logits for convenience.
`record.target` is a four-class shape index. All cards are archive-digitized;
measured surface cards and generator-verified synthetic cards do not enter this
classification validation. The same `-wNN-` group never spans partitions.

There are 12 display records: the first three source IDs in each original
`phenomenon` class among held-out cards, interleaved 0/1/2/3. Source IDs often have
a `butterfly-` prefix even for other labels: use `target`, `display.observedLabel`
or `display.phenomenon` as class, and `display.name` as a human-readable option.
No predictions are used to select display cards.

`evaluation` contains **all 55** held-out cards as
`{id,group,target,logits,baselineLogits}`. For each method separately, softmax its
four logits, accept when max probability reaches the UI threshold, and compute
coverage over 55 plus label agreement among accepted cards. With no accepted
cards, agreement is undefined/null, not 100%. Do not compute those population
statistics from only the current card or the balanced 12-card display subset.

`python tools/operations/prepare-production.py pr1 --reuse-pr1-model` repackages
selection/evaluation using existing frozen CNN and logistic parameters. It checks
source/split identity and preserves the established 55-card metrics without
retraining. Normal runs still reproduce training from the tracked sources.

The repository has MIT licensing; a separate original-private-archive release
statement was not located. This boundary is stored in the payload. Shape labels
are not verified maintenance diagnoses.

## pr2: monthly-volume GRU

`record.input` is 12×1 actual past monthly oil volumes in Sm³/month.
`record.target` is the next month's volume. `display.history` and its timestamps
show the 12 observed months; `display.future` contains the one-month reference and
method outputs. It must not be passed to the GRU. Unlike an earlier research
convenience CSV, this case **does not divide by calendar days**.

The single-layer GRU has 8 hidden units, PyTorch r,z,n gate order, zero initial
hidden state for each window, and one linear output. Apply model mean/scale before
the GRU and outputMean/outputScale after its head. Training targets end 2013-12,
check targets cover 2014, and held-out targets cover 2015-01 to 2016-09. A rolling
one-month forecast can use already observed earlier test months. Shutdown zeros
after 2016-09 are kept separately in provenance, not silently removed from source.

The persistence baseline repeats the last input value. The additional decline
baseline fits log monthly volumes over the same 12 available inputs, constrains
the slope to be nonpositive, and extrapolates one month. Neither baseline sees its
target month. No event/covariate or causal-intervention claim is made.

## pr3: exponential NNLS CRM proxy and constrained allocation

All flows share `flowScale`, the median of the first 208 source injection rows.
The payload unit is thus normalized source flow. Original physical flow/time units
were not established, so they must not be relabeled as m³/day or days.

For producer j, filtered injection states obey

    s[t,j,i] = exp(-Δt/tau[j]) s[t-1,j,i]
               + (1-exp(-Δt/tau[j])) injection[t,i]
    production[t,j] = offsets[j] + Σ_i gains[j,i] s[t,j,i]

The 5 gains and intercept are nonnegative NNLS fits for each producer. Its one tau
is selected from a fixed source-time-unit grid by check-set MAE. No test rows tune
the lag, coefficients, flow normalization, or capacities.

`record.input` contains current `state[4][5]`, `currentInjection[5]`, planningDt,
budget and five lower/upper bounds. For a proposed constant injection q over that
planning interval, apply the same exponential update once and sum the four
predicted productions. The objective is linear with marginal coefficients

    c[i] = Σ_j gains[j,i] (1-exp(-planningDt/tau[j]))

Maximize c·q subject to lower≤q≤upper and Σq≤budget. The script actually solves
this LP using SciPy HiGHS. Three parity cases are independently solved by greedily
filling remaining capacity in descending c order. Infeasible user bounds must be
reported; a negative budget or sum(lower)>budget has no feasible solution.

The baseline uses identical caps and budget: q[i]=min(upper[i],lambda), with lambda
chosen to use the available budget up to total capacity. `target` is null because
new allocation has no measured counterfactual. `evidence` separately stores the
historical prediction and observed production at the source row. Validation MAE
is historical field-total liquid prediction; it does not verify new allocation
effects. No oil/water split or incremental oil claim is supported.

## pr4: explicit synthetic episodes and causal forecast residuals

The source of all plotted chronology is `esp_episode` in the preparation script.
There are 16 normal training, 4 normal check, and 12 held-out episodes, each 240
one-minute points. Known frequency changes and first-order operating responses
generate normal behavior. Controlled channel offsets start at minute 150 in some
held-out episodes. These offsets are pedagogical perturbations, not physical
failure-mechanism simulations. Normal held-out episodes are also retained.

Inputs are `[current_A,temperature_C,pressure_MPa,frequency_Hz]`. A 12×4 past window
predicts the next `[current_A,temperature_C,pressure_MPa]`. The GRU has 8 hidden
units and 3 outputs. Every rolling window resets its hidden state. For the anchor
at `display.selectedIndex`, `record.input` holds exactly the past 12 rows and the
record target is the next observed triple. Full `display.channels` and
`display.modelForecast` allow plotting and selecting another anchor.

For every next-point prediction, score

    sqrt(mean(((observed-predicted)/model.monitor.residualScale)^2))

Residual scales and the 99.5% default threshold use training-normal errors only.
Default alarms require three consecutive points above threshold; the score is
not a calibrated failure probability. The first 12 points have null scores.
`display.truth` is the explicit synthetic injected-offset label. Report delay
after its known onset and normal-period false alarms, not field lead time.
`baselineModel` is a training-normal fixed current upper threshold.

ESPset's actual device, sample and class counts are source context only. Its
spectral rows have no chronology, and they do not calibrate the synthetic motor
current, temperature or pressure values.

## pr5: causal PCA windows on real choke-scaling records

Source pressures are converted Pa→MPa; temperature stays °C. Each source is
aggregated into one-minute sensor medians and modal nonmissing class labels.
Unknown labels stay null. Exact second-level onsets are retained separately.
QGL and P-PDG are all zero in these selected files and are excluded.

PCA is fitted only on normal windows from WELL-00001. Later source-well normal
windows form a check split with an 11-point gap. All WELL-00021 observations are
held out; no target-well scaler or threshold is fitted. To remove absolute well
pressure levels using a causal deterministic transformation, each 12×3 window
subtracts its own first row and flattens time-major. `record.input` is this 36-value
vector, still in pressure-difference MPa / temperature-difference °C units.

Apply the exported training mean/scale to get z. Reshape components as 5×36 C:

    projection = z @ C.T
    reconstruction = projection @ C
    score = sqrt(mean((z-reconstruction)^2))

All five components and the 99.5% training-normal score threshold are exported.
The baseline is absolute 11-minute change of P-MON-CKP divided by its training
normal change SD, with its own training-normal 99.5% threshold. These window
lengths are fixed; changing them requires preparing another model. UI may change
the score threshold or add an explicitly documented persistence condition.

`record.target` and `display.labels` are exact class codes: 0 normal, 107 evolving
choke scaling, 7 established choke scaling. Binary F1 in validation treats 107/7
as event development, excludes missing labels, and has no diagnostic-cause claim.
An alarm during 107 is not an event-pre-onset prediction. Cross-well performance
is reported as computed even if worse than the single-pressure baseline.
