"""Extract measured PML026 titer labels with strictly past online sensor windows.

Only the three continuous online channels common to all four batches are used.
Offline biomass, OD, substrate, titer and sparse B2b pH are never input features.
"""
from __future__ import annotations

import bisect
import argparse
import csv
import hashlib
import json
import math
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "biosurfactant.csv"
OUT = ROOT / "biosurfactant_online_windows.json"
AUDIT = ROOT / "biosurfactant_online_windows_audit.json"

# Every sensor uses its own time column. CSV panels have different widths.
PANELS = [
    {"batch": "B1", "condition": "B1", "clock": 0, "rpm": 1, "temp": 2,
     "do_clock": 9, "do": 10, "label_clock": 14, "label": 15, "label_sd": 17},
    {"batch": "B2a", "condition": "B2", "clock": 20, "rpm": 21, "temp": 22,
     "do_clock": 29, "do": 30, "label_clock": 33, "label": 34, "label_sd": 36},
    {"batch": "B2b", "condition": "B2", "clock": 39, "rpm": 40, "temp": 41,
     "do_clock": 49, "do": 50, "label_clock": 53, "label": 54, "label_sd": 56},
    {"batch": "B3", "condition": "B3", "clock": 59, "rpm": 60, "temp": 61,
     "do_clock": 68, "do": 69, "label_clock": 72, "label": 73, "label_sd": 75},
]
FEATURES = ["stirrer_rpm", "temperature_c", "dissolved_oxygen_pct"]


def number(row: list[str], col: int) -> float | None:
    try:
        value = float(row[col])
        return value if math.isfinite(value) else None
    except (ValueError, IndexError):
        return None


def stream(rows: list[list[str]], time_col: int, value_col: int):
    points = []
    for row in rows:
        time, value = number(row, time_col), number(row, value_col)
        if time is not None and value is not None:
            points.append((time, value))
    points.sort(key=lambda pair: pair[0])
    return points, [pair[0] for pair in points]


def main() -> None:
    global RAW, OUT, AUDIT
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, required=True, help="Original Mendeley data.csv download (SHA checked).")
    parser.add_argument("--output-dir", type=Path, default=ROOT.parents[3] / ".artifacts/operations-research/eor", help="Regeneration destination; defaults to optional research cache, not tracked snapshots.")
    args = parser.parse_args()
    RAW = args.raw.resolve()
    if hashlib.sha256(RAW.read_bytes()).hexdigest() != "097925dfaf194f35e8531567d201764849d9290246b39073db83ebb318d957d7":
        raise ValueError("Raw CSV differs from the attributed Mendeley snapshot; inspect source version before extracting.")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    OUT = args.output_dir / "biosurfactant_online_windows.json"
    AUDIT = args.output_dir / "biosurfactant_online_windows_audit.json"
    with RAW.open(encoding="utf-8-sig", newline="") as handle:
        rows = [row for row in csv.reader(handle) if any(cell.strip() for cell in row)]
    # The first three non-empty rows are panel names, variable names and units.
    rows = rows[3:]
    samples, skipped, batch_meta = [], [], []
    total_offline = 0
    for panel in PANELS:
        streams = [
            stream(rows, panel["clock"], panel["rpm"]),
            stream(rows, panel["clock"], panel["temp"]),
            stream(rows, panel["do_clock"], panel["do"]),
        ]
        labels = []
        for row in rows:
            time = number(row, panel["label_clock"])
            target = number(row, panel["label"])
            if time is not None and target is not None:
                labels.append((time, target, number(row, panel["label_sd"])))
        labels.sort()
        total_offline += len(labels)
        batch_meta.append({
            "batch_id": panel["batch"], "condition_group": panel["condition"],
            "offline_assay_count": len(labels),
            "sensor_count": dict(zip(FEATURES, [len(pair[0]) for pair in streams])),
            "sensor_time_range_h": dict(zip(FEATURES, [
                [pair[1][0], pair[1][-1]] for pair in streams
            ])),
        })
        for target_time, target, target_sd in labels:
            sample_id = f"{panel['batch']}-h{target_time:03.0f}"
            if target_time < 24:
                skipped.append({"id": sample_id, "reason": "No complete 24-hour past sensor window at batch start."})
                continue
            window_start = target_time - 24.0
            values, counts = [], []
            latest = [None] * len(FEATURES)
            earliest = [None] * len(FEATURES)
            for hour in range(24):
                start, end = window_start + hour, window_start + hour + 1
                bin_values, bin_counts = [], []
                for feature_index, (points, times) in enumerate(streams):
                    # [start,end): the final interval excludes the target instant.
                    left, right = bisect.bisect_left(times, start), bisect.bisect_left(times, end)
                    selected = points[left:right]
                    if selected:
                        bin_values.append(round(math.fsum(p[1] for p in selected) / len(selected), 8))
                        latest[feature_index] = selected[-1][0]
                        if earliest[feature_index] is None:
                            earliest[feature_index] = selected[0][0]
                    else:
                        bin_values.append(None)
                    bin_counts.append(len(selected))
                values.append(bin_values)
                counts.append(bin_counts)
            # Never fill missing sensor bins, target labels or absent assay times.
            if any(value is None for hour in values for value in hour):
                skipped.append({"id": sample_id, "reason": "One or more hourly sensor bins have no actual observations."})
                continue
            assert all(time is not None and time < target_time for time in latest)
            assert all(time is not None and time >= window_start for time in earliest)
            samples.append({
                "id": sample_id, "batch_id": panel["batch"],
                "condition_group": panel["condition"],
                "assay_time_h": target_time,
                "target_trehalolipid_g_l": target,
                "target_assay_std_g_l": target_sd,
                "history_start_h": window_start,
                "history_end_exclusive_h": target_time,
                "x": values,
                "sensor_count_per_bin": counts,
                "first_sensor_time_h": earliest,
                "last_sensor_time_h": latest,
            })
    payload = {
        "schema_version": 1,
        "title": "PML026 measured offline titer labels with past online sensor windows",
        "source": {
            "title": "Production and separation of a trehalolipid biosurfactant: data",
            "url": "https://data.mendeley.com/datasets/bw79v9vnbs/1",
            "doi": "10.17632/bw79v9vnbs.1", "license": "CC BY 4.0",
            "raw_file": "biosurfactant.csv",
            "raw_sha256": hashlib.sha256(RAW.read_bytes()).hexdigest(),
        },
        "task": "Soft sensing: estimate the laboratory titer at hour t using only online sensors timestamped strictly before t. No laboratory titer or biochemical assay is an input.",
        "features": FEATURES,
        "feature_units": ["rpm", "degree C", "% oxygen saturation"],
        "target": {"name": "trehalolipid concentration", "unit": "g/L", "provenance": "measured offline assay"},
        "window": {"history_hours": 24, "bins": 24, "bin_hours": 1, "order": "oldest to most recent", "aggregation": "mean of actual sensor observations in [start,end)", "shape": [24, 3]},
        "sample_count": len(samples), "original_assay_count": total_offline,
        "batches": batch_meta,
        "split_guidance": {
            "group_key": "condition_group",
            "condition_groups": {"B1": ["B1"], "B2": ["B2a", "B2b"], "B3": ["B3"]},
            "reason": "B2a and B2b are replicate fermentations; hold out both together when evaluating a new condition.",
            "preferred": "Three condition-group holdouts; all preprocessing is fit using the training conditions only. Report each fold and a macro average.",
            "chronological_alternative": "Within a batch, train through 240 h, tune on 264/288 h and test on 312/336/360 h; do not share any target or future sensor with earlier windows.",
            "no_fixed_split": "The file preserves groups and time; it does not silently choose the easiest split.",
        },
        "excluded_features": ["current or previous trehalolipid assays", "dry cell weight", "OD600", "protein", "hexadecane assays", "target standard deviation", "batch or condition ID", "pH: B2b pH uses a separate sparse clock; omit from this common three-channel online extract"],
        "no_fill": "No interpolation, backfill, forward fill, target duplication, zero fill or future observations. Missing hourly data would exclude that assay.",
        "limitations": ["Four fermentations and three condition groups are small-sample evidence, even though minute sensor records are numerous.", "This is ex-situ biosurfactant fermentation; it does not measure reservoir microbial activity or oil recovery.", "Past-only refers to information timing, not causal identification of a process intervention."],
        "skipped_assays": skipped,
        "samples": samples,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    audit = {
        "original_assay_count": total_offline, "accepted": len(samples),
        "by_batch": dict(Counter(sample["batch_id"] for sample in samples)),
        "by_condition": dict(Counter(sample["condition_group"] for sample in samples)),
        "target_time_range_h": [min(sample["assay_time_h"] for sample in samples), max(sample["assay_time_h"] for sample in samples)],
        "strict_past_ok": all(max(sample["last_sensor_time_h"]) < sample["assay_time_h"] for sample in samples),
        "all_bins_observed": all(all(count > 0 for bin_counts in sample["sensor_count_per_bin"] for count in bin_counts) for sample in samples),
        "minimum_sensor_observations_per_hour_bin": min(count for sample in samples for bin_counts in sample["sensor_count_per_bin"] for count in bin_counts),
        "skipped": skipped,
        "output": OUT.name, "output_sha256": hashlib.sha256(OUT.read_bytes()).hexdigest(),
    }
    AUDIT.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(audit, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
