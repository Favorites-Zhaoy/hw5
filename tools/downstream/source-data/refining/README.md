# Refining asset interface

All five assets use OperationsMath's existing MLP/GRU inference and export three
independent NumPy parity records. No shared runtime is changed. JSON inputs keep
their original units; normalization is inside the exported model. `validation`
reports the held-out result even when a baseline is stronger.

| Case | Model input → output | record display and optimization |
|---|---|---|
| r1 | MLP `[cut1_C,cut2_C,reflux,heavyIndex]` → `[light_wt%,middle_wt%,heavy_wt%,overlap_index,relativeDuty]` | `display.conditions`, `display.outputNames`, `display.reference`; `physics` contains the independent toy formula, `optimization` contains cut/reflux ranges, product overlap and relative-duty caps. Explicitly a reduced teaching split, no vacuum-system or plant validation. |
| r2 | GRU `[8,5]` of `[feed_lb_s,reactor_F,regenerator_F,regenerated_catalyst_lb_min,reflux_lb_min]` at 5-minute intervals → current `[LPG,LN,HN,LCO,Slurry]` wt% | `display.historyMinutes/historyInputs/actualSeries/predictedSeries/productNames`, `display.sourceRun`; `optimization` varies last-step reactor temperature and catalyst circulation only within recorded support. C/O=`cat_lb_min/(60*feed_lb_s)`. No future products in input. |
| r3 | GRU `[12,3]` past `[v_RMS_m_s,a_RMS_m_s2,temperature_C]` → next `v_RMS_m_s` | `display.series` has nominal relative times, raw/forecast/residual, grease-state label. `alarm` contains normal-validation residual scale, threshold and persistence count. Source has sequence order and nominal 2-minute interval, no actual timestamps; windows never join grease blocks. No failure-date/RUL claim. |
| r4 | MLP char-TF-IDF → 3 assertion logits | `display.text` is editable; rebuild input using `textPipeline`, run MLP, then apply `extractor` patterns/unit rules to current text. `optimization` supplies reviewer skills/capacities and task-generation rules. `display.assignmentReference` is the independently enumerated optimum for the default parsed text, not a replacement for user-text parsing. |
| r5 | GRU `[3,6]` past2 days plus current process `[Feed_C2_mol%,Feed_C3_mol%,Feed_nC4_mol%,F_kmolh,PIC3000_barg,RD_ratio]` → current `LPG_TVP_kgcm2` | `display.historyDates/historyInputs/series`, original synthetic dates/regime. Target is LPG true vapor pressure **kgf/cm²**, not octane. Source29-day demonstration is synthetic and samples are not proof of actual plant dynamics. |

For r2, source CSV has no header: column0 is minute, source variable serial number
maps directly to zero-based column index. Input columns are `[1,10,11,24,39]`;
output flow columns `[34,35,36,37,38]` are lb/min. Yield wt% is
`100*product_flow_lb_min/(60*fresh_feed_lb_s)`. LN/HN are light/heavy naphtha,
not certified finished gasoline. Source is an MIT-licensed public FCC simulation,
with a7-day varying-feed trajectory and separate2-day stable-feed trajectory.

r4 text vectorization is exact and language-neutral:

1. NFKC normalize, lowercase, remove all whitespace.
2. Count all Unicode character unigrams and adjacent bigrams, keeping only exported
   vocabulary. JavaScript should use `Array.from(text)` for character iteration.
3. Multiply each raw count by exported IDF, then divide the vector by its L2 norm
   (leave zero vector unchanged). IDF=`log((N_train+1)/(df_train+1))+1`.
4. OperationsMath.mlp returns logits ordered by `textPipeline.classes`; softmax is
   for display only. A statement classifier is not a product-compliance verdict.

Extractor patterns operate on NFKC/lowercase text **with whitespace retained**.
All numeric/negation/unit results must be recomputed from edited text. Sulfur
mg/kg and mass-basis ppm are equivalent; wt% ×10000 →mg/kg; g/cm³ ×1000 →kg/m³.
Unspecified percentage basis must remain an audit issue. Demo numeric limits and
reviewer costs are classroom assumptions, not regulatory product specifications.

Preparation reads only these tracked numerical snapshots and their license files.
Original hashes, source URLs, units and transformations are in source-index.json.
