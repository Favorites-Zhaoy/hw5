"""Prepare five bounded EOR teaching assets. CPU only; no application edits.

Run: python -X utf8 tools/operations/prepare-eor.py
Optional: --cases e1 e3   (default: all five cases)
Dependencies: numpy, scipy, torch. Required numeric snapshots are versioned under
tools/operations/source-data/eor; no .artifacts inputs or network are required.

Inference schema, beyond asset-contract.json:
  inputTransform: identity/log/log1p is applied BEFORE feature mean/scale.
  outputTransform: exp/expm1 is applied AFTER outputMean + outputScale * net.
  PyTorch dense weights are flat [out,in], conv weights flat OIHW, flatten CHW.
  GRU gates follow PyTorch r,z,n; candidate n=tanh(i_n+r*h_n), NOT r*(W*h).
  e4 conditioning: add dot(headWeight,(transform(condition)-mean)/scale)
      to normalized head output; condition is the GIVEN next-month steam only.
  GP K=signal*exp(-0.5*sum(((x-x')/lengths)^2))+noise*I.
      signal/noise are variances; scaledX, alpha and Kinv use normalized data.
      RF mean = outputMean + outputScale * k.T@alpha. Latent variance excludes
      noise: outputScale^2 * max(0,signal-k.T@Kinv@k).
  e3 record.modelKey selects an evaluationModels fold for held-out prediction;
      top-level model is explicitly the final all-15-data interpolation model.
All record inputs/targets use physical units except normalized e2 image geometry.
Independent NumPy inference checks the rounded exported weights for first 3 records.
"""
from __future__ import annotations

import argparse
import copy
import csv
import hashlib
import json
import math
import time
from collections import Counter
from pathlib import Path

import numpy as np
import torch
from scipy.ndimage import gaussian_filter
from scipy.optimize import minimize
from torch import nn


BASE = Path(__file__).resolve().parents[2]
RAW = BASE / "tools/operations/source-data/eor"
AUDIT = BASE / ".artifacts/operations-research/eor"
OUT = BASE / "assets/operations/data"
SEED = 20261103
torch.set_num_threads(1)
torch.set_num_interop_threads(1)
torch.use_deterministic_algorithms(True)


def seed(n):
    torch.manual_seed(n)
    np.random.seed(n)
    return np.random.default_rng(n)


def compact(value):
    if isinstance(value, np.ndarray):
        return compact(value.tolist())
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (float, np.floating)):
        if not math.isfinite(float(value)):
            raise ValueError("Non-finite JSON value")
        return float(f"{float(value):.9g}")
    if isinstance(value, dict):
        return {str(k): compact(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [compact(v) for v in value]
    return value


def write(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(compact(payload), ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n", encoding="utf-8", newline="\n")


def load_csv(name):
    with (RAW / name).open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def scale_fit(x):
    x = np.asarray(x, dtype=float)
    mean = x.mean(axis=tuple(range(x.ndim - 1)))
    scale = x.std(axis=tuple(range(x.ndim - 1)))
    return mean, np.where(scale < 1e-8, 1.0, scale)


def transform(x, name):
    x = np.asarray(x, dtype=float)
    if name == "log":
        return np.log(x)
    if name == "log1p":
        return np.log1p(x)
    return x


def undo_transform(x, name):
    if name == "exp":
        return np.exp(x)
    if name == "expm1":
        return np.expm1(x)
    return x


def dense_export(layer, activation="linear"):
    return {"type": "dense", "in": layer.in_features, "out": layer.out_features,
            "weight": layer.weight.detach().numpy().ravel(),
            "bias": layer.bias.detach().numpy(), "activation": activation}


def dense_np(x, layer):
    weight = np.asarray(layer["weight"]).reshape(layer["out"], layer["in"])
    x = weight @ x + np.asarray(layer["bias"])
    if layer.get("activation") == "relu":
        return np.maximum(x, 0)
    if layer.get("activation") == "tanh":
        return np.tanh(x)
    return x


def conv_np(x, layer):
    weight = np.asarray(layer["weight"]).reshape(layer["out"], layer["in"], layer["kernel"], layer["kernel"])
    k, p, s = layer["kernel"], layer["padding"], layer["stride"]
    padded = np.pad(x, ((0, 0), (p, p), (p, p)))
    oh = (x.shape[1] + 2 * p - k) // s + 1
    ow = (x.shape[2] + 2 * p - k) // s + 1
    result = np.empty((layer["out"], oh, ow))
    for y in range(oh):
        for col in range(ow):
            patch = padded[:, y * s:y * s + k, col * s:col * s + k]
            result[:, y, col] = np.sum(weight * patch[None], axis=(1, 2, 3)) + layer["bias"]
    return np.maximum(result, 0) if layer.get("activation") == "relu" else result


def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -60, 60)))


def infer_np(model, x, conditioning=None):
    """Independent reference inference from already-serialized fields."""
    kind = model["type"]
    x = np.asarray(x, dtype=float)
    if kind == "gp":
        z = (x - model["mean"]) / model["scale"]
        train = np.asarray(model["scaledX"])
        kernel = model["kernel"]
        k = kernel["signal"] * np.exp(-0.5 * np.sum(((train - z) / kernel["lengths"]) ** 2, axis=1))
        net = np.array([k @ np.asarray(model["alpha"])])
    elif kind == "cnn":
        z = x.reshape(model["dims"])
        for layer in model["layers"]:
            if layer["type"] == "conv2d":
                z = conv_np(z, layer)
            elif layer["type"] == "flatten":
                z = z.ravel()
            else:
                z = dense_np(z, layer)
        net = z
    elif kind == "mlp":
        z = (transform(x, model.get("inputTransform")) - model["mean"]) / model["scale"]
        for layer in model["layers"]:
            z = dense_np(z, layer)
        net = z
    elif kind == "gru":
        z = (transform(x, model.get("inputTransform")) - model["mean"]) / model["scale"]
        h = np.zeros(model["hiddenSize"])
        wih = np.asarray(model["weightIH"]).reshape(3 * len(h), model["inputSize"])
        whh = np.asarray(model["weightHH"]).reshape(3 * len(h), len(h))
        bih, bhh = np.asarray(model["biasIH"]), np.asarray(model["biasHH"])
        for row in z:
            i = wih @ row + bih
            hh = whh @ h + bhh
            ir, iz, inn = np.split(i, 3)
            hr, hz, hn = np.split(hh, 3)
            r, gate_z = sigmoid(ir + hr), sigmoid(iz + hz)
            n = np.tanh(inn + r * hn)
            h = (1 - gate_z) * n + gate_z * h
        head = model["head"]
        net = np.asarray(head["weight"]).reshape(-1, len(h)) @ h + head["bias"]
        if "conditioning" in model:
            c = model["conditioning"]
            zc = (transform(conditioning, c.get("transform")) - c["mean"]) / c["scale"]
            net += np.asarray(c["headWeight"]).reshape(-1, len(zc)) @ zc
    else:
        raise ValueError(kind)
    result = np.asarray(model.get("outputMean", np.zeros(len(net)))) + np.asarray(model.get("outputScale", np.ones(len(net)))) * net
    return undo_transform(result, model.get("outputTransform")), net


def add_parity(payload):
    # Quantize before checking, so expected values correspond to exported weights.
    payload = compact(payload)
    checks = []
    for index, record in enumerate(payload["records"][:3]):
        model = payload.get("evaluationModels", {}).get(record.get("modelKey"), payload["model"])
        expected, net = infer_np(model, record["input"], record.get("conditioning"))
        check = {"recordIndex": index, "modelKey": record.get("modelKey", "model"),
                       "expected": expected.tolist(), "networkOutput": net.tolist(),
                       "tolerance": 2e-5, "comparison": "relative error <= tolerance, or absolute error <= tolerance for near-zero outputs",
                       "method": "Independent NumPy inference using rounded exported arrays; no Torch call."}
        if "_torchReference" in record:
            reference = np.atleast_1d(record["_torchReference"])
            relative = float(np.max(np.abs(expected - reference) / np.maximum(1.0, np.abs(reference))))
            assert relative < 2e-5, (payload["id"], index, relative)
            check["torchVsExportedNumpyMaxScaledDifference"] = relative
        checks.append(check)
    for record in payload["records"]:
        record.pop("_torchReference", None)
    payload["parity"] = compact(checks)
    return payload


def train_loop(model, args, y, train, val, epochs=800, lr=0.005, patience=90):
    args = [torch.tensor(a, dtype=torch.float32) for a in args]
    target = torch.tensor(y, dtype=torch.float32)
    opt = torch.optim.Adam(model.parameters(), lr=lr)
    best, state, stale, best_epoch = float("inf"), None, 0, 0
    for epoch in range(epochs):
        model.train()
        opt.zero_grad()
        output = model(*[a[train] for a in args])
        loss = torch.mean((output - target[train]) ** 2)
        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), 5.0)
        opt.step()
        model.eval()
        with torch.no_grad():
            value = torch.mean((model(*[a[val] for a in args]) - target[val]) ** 2).item()
        if value < best - 1e-7:
            best, state, stale, best_epoch = value, copy.deepcopy(model.state_dict()), 0, epoch + 1
        else:
            stale += 1
        if epoch >= 80 and stale >= patience:
            break
    model.load_state_dict(state)
    return {"epochsRun": epoch + 1, "selectedEpoch": best_epoch, "validationNormalizedMSE": best}


def source(title, url, license="CC BY 4.0"):
    return {"title": title, "url": url, "license": license}


def provenance(case_id, sources, counts, assumptions):
    return {"seed": SEED + int(case_id[1:]), "sources": sources, "counts": counts,
            "assumptions": assumptions, "preparationScript": "tools/operations/prepare-eor.py",
            "inferenceSchema": "See module docstring and tools/operations/eor-model-schema.md",
            "rawFilesModified": False}


def pkn(x):
    q, t, e, mu, height = np.asarray(x, dtype=float).T
    ep = e / (1 - 0.25 ** 2)
    length = 0.3817 * (ep * q ** 3 * t ** 4 / (mu * height ** 4)) ** 0.2
    width = 3 * (mu * q * length / ep) ** 0.25
    pressure = (16 * mu * q * ep ** 3 * length / (np.pi * height ** 4)) ** 0.25
    return np.stack([length, width, pressure], axis=-1)


def prepare_e1():
    rng = seed(SEED + 1)
    rows, groups = [], []
    for ei, e in enumerate([20e9, 27.5e9, 35e9, 42.5e9, 50e9]):
        for hi, height in enumerate([12.0, 18.0, 24.0, 30.0]):
            gid = f"E{ei}-h{hi}"
            for _ in range(100):
                q = rng.uniform(0.008, 0.055)
                duration = rng.uniform(180, 1800)
                mu = np.exp(rng.uniform(np.log(0.001), np.log(0.03)))
                row = [q, duration, e, mu, height]
                if pkn(row)[0] / height >= 3:
                    rows.append(row)
                    groups.append(gid)
    x, groups = np.asarray(rows), np.asarray(groups)
    y = pkn(x)
    group_order = rng.permutation(sorted(set(groups)))
    train_groups, val_groups, test_groups = group_order[:13], group_order[13:16], group_order[16:]
    train, val, test = [np.flatnonzero(np.isin(groups, g)) for g in [train_groups, val_groups, test_groups]]
    xm, xs = scale_fit(np.log(x[train]))
    ym, ys = scale_fit(np.log(y[train]))
    model = nn.Sequential(nn.Linear(5, 16), nn.Tanh(), nn.Linear(16, 12), nn.Tanh(), nn.Linear(12, 3))
    training = train_loop(model, [(np.log(x) - xm) / xs], (np.log(y) - ym) / ys, train, val, epochs=1600, lr=0.006, patience=130)
    with torch.no_grad():
        predicted = np.exp(model(torch.tensor((np.log(x) - xm) / xs, dtype=torch.float32)).numpy() * ys + ym)
    exported = {"type": "mlp", "name": "PKN log-response MLP 5→16→12→3", "inputTransform": "log", "mean": xm, "scale": xs,
                "layers": [dense_export(model[0], "tanh"), dense_export(model[2], "tanh"), dense_export(model[4])],
                "outputMean": ym, "outputScale": ys, "outputTransform": "exp",
                "inputNames": ["Q_m3_s", "time_s", "E_pa", "mu_pa_s", "height_m"], "outputNames": ["half_length_m", "inlet_width_m", "net_pressure_pa"]}
    src = source("GEOS · Viscosity-storage-dominated PKN validation", "https://geosx-geosx.readthedocs-hosted.com/en/develop/docs/sphinx/advancedExamples/validationStudies/hydraulicFracture/pknFracViscosityDominated/Example.html", "Independent teaching simulations from cited analytical formulas; no GEOS code copied; not field data.")
    records = []
    for k, i in enumerate(test[np.linspace(0, len(test) - 1, 6, dtype=int)]):
        records.append({"id": f"pkn-holdout-{k + 1}", "kind": "controlled-synthetic", "scope": "Homogeneous fixed-height PKN simulation; no oil labels", "sourceId": f"seed{SEED + 1}/{groups[i]}/row{i}", "split": "held-out", "input": x[i], "target": y[i], "baseline": y[i],
                        "_torchReference": predicted[i],
                        "display": {"scenarioId": groups[i], "physicalInput": dict(zip(exported["inputNames"], x[i])), "nu": 0.25, "targetUnits": ["m", "m", "Pa"], "baselineName": "Direct PKN analytical calculation", "volume_m3": x[i, 0] * x[i, 1], "lengthHeightRatio": y[i, 0] / x[i, 4]}})
    payload = {"id": "e1", "unit": "m / mm / MPa", "source": src, "scope": "Trained surrogate and bounded parameter search for simulated fracture response; no production or recovery inference.", "model": exported, "records": records,
               "physics": {"nu": 0.25, "inputOrder": exported["inputNames"], "outputOrder": exported["outputNames"], "formulas": {"Ep": "E/(1-nu^2)", "length": "0.3817*(Ep*Q^3*t^4/(mu*h^4))^(1/5)", "width": "3*(mu*Q*length/Ep)^(1/4)", "pressure": "(16*mu*Q*Ep^3*length/(pi*h^4))^(1/4)", "volume": "Q*t"}, "units": "SI: Q m3/s, t s, E Pa, mu Pa.s, h m; length/width m, net pressure Pa. Q is TOTAL injection rate.", "validity": "Constant height, homogeneous elastic medium, negligible leakoff, viscosity-storage regime; retain length/height>=3 as a teaching filter."},
               "optimization": {"variables": ["Q_m3_s", "time_s"], "rateRange": [0.008, 0.055], "timeRange": [180, 1800], "gridSteps": [31, 31], "defaultMaxPressureMPa": 3.5, "defaultMaxVolumeM3": 40, "objective": "maximize surrogate half_length_m", "constraints": ["analytical net pressure <= selected MPa cap", "Q*time <= selected volume cap", "length/height>=3", "stay within trained parameter ranges"], "requiredRecheck": "Recompute PKN analytically for each proposed optimum and retain infeasible status; no causal oil-gain label."},
               "validation": {"split": {"trainGroups": train_groups.tolist(), "validationGroups": val_groups.tolist(), "testGroups": test_groups.tolist(), "counts": [len(train), len(val), len(test)], "groupKey": "complete (E,height) rock scenario; all mu/rate/time values from a scenario stay together"}, "metric": "mean absolute relative error across length,width,pressure (%)", "baseline": 0.0, "model": float(np.mean(np.abs(predicted[test] / y[test] - 1)) * 100), "perOutputMAE": np.mean(np.abs(predicted[test] - y[test]), axis=0), "n": len(test), "boundary": "Pure simulated response; exact analytical baseline has zero label error by construction.", "training": training},
               "provenance": provenance("e1", [src], {"generated": len(x), "train": len(train), "validation": len(val), "test": len(test)}, ["fixed nu=.25", "group split before scaling", "MLP targets are log physical responses", "direct analytical baseline is not expected to be less accurate than a surrogate"]) }
    return add_parity(payload)


class DensityCNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 4, 3, stride=2, padding=1)
        self.conv2 = nn.Conv2d(4, 8, 3, stride=2, padding=1)
        self.fc1 = nn.Linear(8 * 8 * 8, 32)
        self.fc2 = nn.Linear(32, 6)

    def forward(self, x):
        x = torch.relu(self.conv1(x))
        x = torch.relu(self.conv2(x)).flatten(1)
        return self.fc2(torch.relu(self.fc1(x)))


def density_image(points, size=32):
    # Array row increases with normalized y. UI must not silently invert angle.
    hist, _, _ = np.histogram2d(points[:, 1], points[:, 0], bins=size, range=[[-1, 1], [-1, 1]])
    image = gaussian_filter(hist, sigma=0.75)
    return image / max(image.max(), 1e-9)


def ellipse_moments(points, weights=None):
    if weights is None:
        weights = np.ones(len(points))
    weights = np.asarray(weights) / np.sum(weights)
    center = np.sum(points * weights[:, None], axis=0)
    delta = points - center
    cov = (delta * weights[:, None]).T @ delta
    values, vectors = np.linalg.eigh(cov)
    order = np.argsort(values)[::-1]
    values, vectors = values[order], vectors[:, order]
    theta = np.arctan2(vectors[1, 0], vectors[0, 0])
    return np.array([*center, *np.sqrt(np.maximum(values, 1e-9)), np.cos(2 * theta), np.sin(2 * theta)])


def ellipse_error(prediction, target):
    center = np.linalg.norm(prediction[:, :2] - target[:, :2], axis=1)
    axes = np.mean(np.abs(prediction[:, 2:4] - target[:, 2:4]), axis=1)
    pa = 0.5 * np.arctan2(prediction[:, 5], prediction[:, 4])
    ta = 0.5 * np.arctan2(target[:, 5], target[:, 4])
    angle = np.abs((pa - ta + np.pi / 2) % np.pi - np.pi / 2) * 180 / np.pi
    return {"centerMAE": float(center.mean()), "axisMAE": float(axes.mean()), "angleMAEDeg": float(angle.mean())}


def ellipse_iou(prediction, target, coverage=0.90):
    grid = np.linspace(-1, 1, 64)
    gx, gy = np.meshgrid(grid, grid)
    factor = np.sqrt(-2 * np.log(1 - coverage))
    def mask(parameters):
        cx, cy, a, b, co, si = parameters
        if a <= 0 or b <= 0:
            return np.zeros_like(gx, dtype=bool)
        theta = 0.5 * np.arctan2(si, co)
        xx, yy = gx - cx, gy - cy
        rx = np.cos(theta) * xx + np.sin(theta) * yy
        ry = -np.sin(theta) * xx + np.cos(theta) * yy
        return (rx / (factor * a)) ** 2 + (ry / (factor * b)) ** 2 <= 1
    scores = []
    for p, t in zip(prediction, target):
        pm, tm = mask(p), mask(t)
        scores.append(np.logical_and(pm, tm).sum() / max(1, np.logical_or(pm, tm).sum()))
    return float(np.mean(scores))


def prepare_e2():
    rng = seed(SEED + 2)
    images, targets, groups, cloud_list = [], [], [], []
    # Two noisy views per underlying geometry; related views are never split.
    for group in range(420):
        cx, cy = rng.uniform(-0.23, 0.23, 2)
        major, minor = rng.uniform(0.30, 0.48), rng.uniform(0.09, 0.22)
        theta = rng.uniform(0, np.pi)
        rotation = np.array([[np.cos(theta), -np.sin(theta)], [np.sin(theta), np.cos(theta)]])
        target = [cx, cy, major, minor, np.cos(2 * theta), np.sin(2 * theta)]
        for view in range(2):
            count = int(rng.integers(180, 420))
            points = rng.normal(size=(count, 2)) * [major, minor]
            points = points @ rotation.T + [cx, cy]
            points += rng.normal(0, rng.uniform(0.004, 0.025), points.shape)
            noise = rng.uniform(-1, 1, size=(int(count * rng.uniform(0, 0.08)), 2))
            points = np.concatenate([points, noise])
            points = points[np.all(np.abs(points) <= 1, axis=1)]
            images.append(density_image(points))
            targets.append(target)
            cloud_list.append(points)
            groups.append(group)
    x, y, groups = np.asarray(images)[:, None], np.asarray(targets), np.asarray(groups)
    order = rng.permutation(420)
    train, val, test = [np.flatnonzero(np.isin(groups, g)) for g in [order[:300], order[300:360], order[360:]]]
    ym, ys = scale_fit(y[train])
    model = DensityCNN()
    training = train_loop(model, [x], (y - ym) / ys, train, val, epochs=260, lr=0.003, patience=45)
    with torch.no_grad():
        pred = model(torch.tensor(x, dtype=torch.float32)).numpy() * ys + ym
    baseline = np.asarray([ellipse_moments(p) for p in cloud_list])
    layers = []
    for conv in [model.conv1, model.conv2]:
        layers.append({"type": "conv2d", "in": conv.in_channels, "out": conv.out_channels, "kernel": 3, "stride": 2, "padding": 1, "weight": conv.weight.detach().numpy().ravel(), "bias": conv.bias.detach().numpy(), "activation": "relu"})
    layers.extend([{"type": "flatten"}, dense_export(model.fc1, "relu"), dense_export(model.fc2)])
    exported = {"type": "cnn", "name": "32×32 event-density CNN → Gaussian ellipse geometry", "dims": [1, 32, 32], "layers": layers, "outputMean": ym, "outputScale": ys,
                "outputNames": ["center_x", "center_y", "sigma_major", "sigma_minor", "cos_2theta", "sin_2theta"],
                "coordinateConvention": "Input row index increases with normalized y; x is column. Domain [-1,1]^2. Axes are Gaussian 1-sigma scales; multiply by sqrt(-2*ln(1-coverage)) for a 2D Gaussian coverage ellipse. Angle=.5*atan2(output[5],output[4]); normalize angle vector only for display."}
    real_src = source("Utah FORGE April 2024 microseismic event catalog", "https://gdr.openei.org/submissions/1817")
    records = []
    for n, i in enumerate(test[[0, len(test) // 2, -1]]):
        records.append({"id": f"ellipse-synthetic-{n + 1}", "kind": "controlled-synthetic", "scope": "Known Gaussian event-cloud geometry, not a physical fracture mask", "sourceId": f"geometry-{groups[i]}/view-{i % 2}", "split": "held-out", "input": x[i].ravel(), "target": y[i], "baseline": baseline[i],
                        "_torchReference": pred[i],
                        "display": {"points": cloud_list[i], "pointWeights": np.ones(len(cloud_list[i])), "pointUncertainty": None, "frame": {"center": [0, 0], "halfSpan": 1, "unit": "normalized"}, "axisNames": ["x", "y"], "sourceKind": "controlled-synthetic", "baselineName": "unweighted covariance ellipse", "geometryGroup": int(groups[i]), "coverageDefault": 0.90}})
    events = load_csv("forge_microseismic.csv")
    lon0 = np.median([float(r["longitude"]) for r in events])
    lat0 = np.median([float(r["latitude"]) for r in events])
    for day in ["2024-04-04", "2024-04-05", "2024-04-06"]:
        all_day = [r for r in events if r["time"].startswith(day)]
        selected = [r for r in all_day if max(float(r[k]) for k in ["sigma_x_km", "sigma_y_km", "sigma_z_km"]) <= 0.15]
        points_m = np.array([[(float(r["longitude"]) - lon0) * 111320 * np.cos(np.deg2rad(lat0)), (float(r["latitude"]) - lat0) * 111320] for r in selected])
        uncertainty = np.array([[float(r["sigma_x_km"]) * 1000, float(r["sigma_y_km"]) * 1000] for r in selected])
        center = np.median(points_m, axis=0)
        half = float(max(np.quantile(np.abs(points_m - center), 0.98, axis=0)) * 1.12)
        points_n = (points_m - center) / half
        inside = np.all(np.abs(points_n) <= 1, axis=1)
        weights = 1 / (np.sum(uncertainty ** 2, axis=1) + 25)
        weights /= weights.max()
        records.append({"id": f"FORGE-{day}", "kind": "derived-field", "scope": "Observed geothermal event cloud; out-of-domain qualitative envelope, no fracture geometry truth", "sourceId": f"Utah_FORGE_2024_Auto_Pick_catalog_2026.1.23.csv/date={day}", "split": "demonstration", "input": density_image(points_n[inside]).ravel(), "target": None, "baseline": ellipse_moments(points_n[inside], weights[inside]),
                        "display": {"points": points_n[inside], "pointsMeters": points_m[inside], "pointWeights": weights[inside], "pointUncertainty": uncertainty[inside], "frame": {"center": center, "halfSpan": half, "unit": "m", "referenceLongitude": lon0, "referenceLatitude": lat0, "projection": "local equirectangular approximation, not a survey-grade projection"}, "axisNames": ["east_m", "north_m"], "date": day, "sourceCount": len(all_day), "afterQualityFilter": len(selected), "plottedCount": int(inside.sum()), "filter": "max sigma_x/y/z <=150 m; common square frame trims points outside ±1", "baselineName": "uncertainty-weighted covariance envelope", "coverageDefault": 0.90, "sourceKind": "observed-geothermal", "targetUnavailable": "No fracture masks, geometry, opening, conductivity or oil-gain truth."}})
    err, base_err = ellipse_error(pred[test], y[test]), ellipse_error(baseline[test], y[test])
    err["ellipseIoUMeanAt90pct"] = ellipse_iou(pred[test], y[test])
    base_err["ellipseIoUMeanAt90pct"] = ellipse_iou(baseline[test], y[test])
    payload = {"id": "e2", "unit": "normalized geometry / m for real coordinates", "source": real_src, "scope": "CNN trained only on controlled synthetic Gaussian clouds; real FORGE records are qualitative out-of-domain event-envelope demonstrations.", "model": exported, "records": records,
               "optimization": {"objective": "robust weighted ellipse fit to observed projected event distribution, initialized by CNN", "suggestedLoss": "trimmed/Huber radial residual plus chosen weighted-coverage error; keep major>=minor>0", "coverageRange": [0.7, 0.98], "defaultCoverage": 0.90, "warning": "Event-envelope coverage is not fracture coverage. Display real location uncertainty; no real-ground-truth IoU."},
               "validation": {"split": {"geometries": 420, "viewsPerGeometry": 2, "trainGeometryCount": 300, "validationGeometryCount": 60, "testGeometryCount": 60, "counts": [len(train), len(val), len(test)], "groupKey": "underlying ellipse geometry; both noisy views together"}, "metric": "mean absolute Gaussian axis error in normalized coordinates", "baseline": base_err["axisMAE"], "model": err["axisMAE"], "details": {"baseline": base_err, "model": err}, "n": len(test), "boundary": "Only synthetic labels are scored; real ground truth is null.", "training": training},
               "provenance": provenance("e2", [real_src], {"syntheticImages": len(x), "syntheticHeldOut": len(test), "realCatalogRows": len(events), "displayRecords": len(records)}, ["Gaussian cloud scales are controlled generator labels, not crack masks", "real dates have separate frames and uncertainty filters", "CNN has never trained on FORGE data or pseudo fracture labels", "source coordinates and uncertainties are retained in meters"])}
    return add_parity(payload)


def fit_gp(x, y):
    xm, xs = scale_fit(x)
    ym, ys = scale_fit(np.asarray(y)[:, None])
    z, target = (x - xm) / xs, (y - ym[0]) / ys[0]
    def matrix(parameters):
        lengths, signal, noise = np.exp(parameters[:2]), np.exp(parameters[2]), np.exp(parameters[3])
        delta = (z[:, None] - z[None, :]) / lengths
        return signal * np.exp(-0.5 * np.sum(delta ** 2, axis=2)) + (noise + 1e-8) * np.eye(len(z))
    def objective(parameters):
        try:
            k = matrix(parameters)
            l = np.linalg.cholesky(k)
            alpha = np.linalg.solve(l.T, np.linalg.solve(l, target))
            return 0.5 * target @ alpha + np.log(np.diag(l)).sum() + len(z) * np.log(2 * np.pi) / 2
        except np.linalg.LinAlgError:
            return 1e12
    bounds = [(-2.5, 2.5), (-2.5, 2.5), (-3, 4), (-12, -0.5)]
    fits = [minimize(objective, start, method="L-BFGS-B", bounds=bounds) for start in [np.array([0, 0, 0, -7]), np.array([0.5, 0.5, 1, -5])]]
    best = min(fits, key=lambda result: result.fun)
    parameters = best.x
    k = matrix(parameters)
    kinv = np.linalg.inv(k)
    return compact({"type": "gp", "name": "RBF Gaussian process for measured resistance factor RF(c,k)", "mean": xm, "scale": xs, "scaledX": z, "alpha": kinv @ target, "Kinv": kinv,
                    "kernel": {"type": "rbf", "lengths": np.exp(parameters[:2]), "signal": np.exp(parameters[2]), "noise": np.exp(parameters[3]) + 1e-8, "convention": "signal and noise are VARIANCES; diagonal noise includes 1e-8 numerical jitter"},
                    "outputMean": ym, "outputScale": ys, "inputNames": ["concentration_mg_l", "permeability_1e_minus_3_um2"], "outputNames": ["resistance_factor"], "trainingCount": len(x), "nll": float(best.fun), "variance": "latent RF variance=outputScale^2*max(0,signal-k.T@Kinv@k); add noise only if explicitly predicting a noisy measurement"})


def linear_extrapolate(x, y, value):
    order = np.argsort(x)
    x, y = x[order], y[order]
    if value < x[0]:
        return float(y[0] + (value - x[0]) * (y[1] - y[0]) / (x[1] - x[0]))
    if value > x[-1]:
        return float(y[-1] + (value - x[-1]) * (y[-1] - y[-2]) / (x[-1] - x[-2]))
    return float(np.interp(value, x, y))


def prepare_e3():
    seed(SEED + 3)
    rows = load_csv("polymer_resistance_factor.csv")
    x = np.array([[float(r["polymer_concentration_mg_l"]), float(r["permeability_1e_minus_3_um2"])] for r in rows])
    y = np.array([float(r["resistance_factor"]) for r in rows])
    models, evaluations, predictions, base = {}, [], np.empty(len(y)), np.empty(len(y))
    for concentration in sorted(set(x[:, 0])):
        key = f"leave-c{concentration:g}"
        train, test = np.flatnonzero(x[:, 0] != concentration), np.flatnonzero(x[:, 0] == concentration)
        models[key] = fit_gp(x[train], y[train])
        for i in test:
            predictions[i] = infer_np(models[key], x[i])[0][0]
            same_k = train[x[train, 1] == x[i, 1]]
            base[i] = linear_extrapolate(x[same_k, 0], y[same_k], x[i, 0])
            evaluations.append({"rowIndex": int(i), "sourceId": rows[i]["experiment_id"], "concentration": concentration, "permeability": x[i, 1], "target": y[i], "prediction": predictions[i], "baseline": base[i], "modelKey": key})
    final_model = fit_gp(x, y)
    records = []
    # Include three permeability levels for one held-out concentration first.
    indices = [0, 1, 2, 6, 10, 14]
    for i in indices:
        key = f"leave-c{x[i, 0]:g}"
        records.append({"id": f"core-{rows[i]['experiment_id']}", "kind": "published-laboratory", "scope": "Measured resistance factor for one polymer; no oil-gain target", "sourceId": f"ns7xbjz54h.1/table-BP:BS/experiment-{rows[i]['experiment_id']}", "split": "held-out", "modelKey": key, "input": x[i], "target": y[i], "baseline": base[i],
                        "display": {"concentration_mg_l": x[i, 0], "permeability_1e_minus_3_um2": x[i, 1], "fold": key, "crossValidatedPrediction": predictions[i], "finalAllDataPrediction": infer_np(final_model, x[i])[0][0], "finalFitScope": "top model fitted to all15 observed rows; use only for interpolation/optimization, never label it held-out accuracy", "baselineName": "same-fold piecewise linear concentration interpolation/extrapolation at same permeability"}})
    src = source("Yu · Surface-active Polymer Flooding experimental workbook", "https://data.mendeley.com/datasets/ns7xbjz54h/1")
    payload = {"id": "e3", "unit": "dimensionless RF", "source": src, "scope": "Measured small-sample RF(c,k) regression and bounded concentration screening; no recovery inference.", "model": final_model, "evaluationModels": models, "records": records,
               "observations": [{"id": rows[i]["experiment_id"], "concentration": x[i, 0], "permeability": x[i, 1], "resistanceFactor": y[i], "concentrationGroup": f"c{x[i, 0]:g}"} for i in range(len(y))],
               "optimization": {"modelKey": "model", "concentrationCandidates": list(range(750, 2001, 25)), "concentrationRange": [750, 2000], "permeabilityRange": [100, 500], "permeabilityMeasuredLevels": [100, 200, 500], "defaultRFMinimum": 250, "defaultConservativeZ": 1, "objective": "minimum concentration whose GP mean or selected lower bound reaches RF threshold", "boundary": "Candidate concentrations between measured levels are unverified proposals, not new laboratory labels; return no feasible candidate if none passes. No surfactant mixture or oil-gain prediction."},
               "validation": {"split": "5 leave-one-concentration-out folds, each train12/test3; all feature/target scalers and kernel optimization fit within each training fold", "metric": "MAE in dimensionless resistance factor", "baseline": float(np.abs(base - y).mean()), "model": float(np.abs(predictions - y).mean()), "n": 15, "foldRows": evaluations, "boundary": "Only15 genuine measured rows; the750 and2000mg/L edge holdouts test concentration extrapolation. Final top model refit to all15 for interpolation is distinct from LOCO evaluation models."},
               "provenance": provenance("e3", [src], {"measuredRows": 15, "concentrations": 5, "permeabilityLevels": 3, "folds": 5}, ["permeability unit remains10^-3 um2, not silently mD", "RF means resistance factor, not Random Forest", "separate5-row recovery table is not joined to concentration labels", "kernel signal/noise are variances"])}
    # Contract enum has no laboratory term; derived-field would be misleading.
    for record in payload["records"]:
        record["kind"] = "published-laboratory"
    return add_parity(payload)


class SmallGRU(nn.Module):
    def __init__(self, inputs, hidden=8, conditional=False):
        super().__init__()
        self.gru = nn.GRU(inputs, hidden, batch_first=True)
        self.head = nn.Linear(hidden, 1)
        self.conditional = conditional
        if conditional:
            self.condition = nn.Linear(1, 1, bias=False)

    def forward(self, x, condition=None):
        _, hidden = self.gru(x)
        output = self.head(hidden[-1])
        return output + self.condition(condition) if self.conditional else output


def export_gru(model, xm, xs, ym, ys, name):
    return {"type": "gru", "name": name, "inputSize": model.gru.input_size, "hiddenSize": model.gru.hidden_size,
            "mean": xm, "scale": xs, "weightIH": model.gru.weight_ih_l0.detach().numpy().ravel(),
            "weightHH": model.gru.weight_hh_l0.detach().numpy().ravel(), "biasIH": model.gru.bias_ih_l0.detach().numpy(), "biasHH": model.gru.bias_hh_l0.detach().numpy(),
            "head": {"weight": model.head.weight.detach().numpy().ravel(), "bias": model.head.bias.detach().numpy()},
            "outputMean": ym, "outputScale": ys, "note": "single layer; zero initial hidden; PyTorch r,z,n; n=tanh(i_n+r*h_n); output at last step; no inference dropout"}


def prepare_e4():
    seed(SEED + 4)
    rows = [r for r in load_csv("oil_sands_monthly.csv") if r["Method"] == "CSS"]
    by_uid = {uid: sorted([r for r in rows if r["UID"] == uid], key=lambda r: r["ProductionMonth"]) for uid in ["1", "3", "17"]}
    x, c, y, meta = [], [], [], []
    history = 6
    for uid, data in by_uid.items():
        for j in range(history, len(data)):
            context = data[j - history:j]
            # All three selected CSS series have60 consecutive months.
            x.append([[float(r["Oil"]), float(r["SteamINJ"])] for r in context])
            c.append([float(data[j]["SteamINJ"])])
            y.append([float(data[j]["Oil"])])
            meta.append({"uid": uid, "targetIndex": j, "targetMonth": data[j]["ProductionMonth"], "data": data})
    x, c, y = np.array(x), np.array(c), np.array(y)
    train = np.array([i for i, m in enumerate(meta) if m["uid"] in ["1", "3"] and m["targetMonth"][:4] <= "2017"])
    val = np.array([i for i, m in enumerate(meta) if m["uid"] in ["1", "3"] and m["targetMonth"][:4] == "2018"])
    time_test = np.array([i for i, m in enumerate(meta) if m["uid"] in ["1", "3"] and m["targetMonth"][:4] == "2019"])
    held_test = np.array([i for i, m in enumerate(meta) if m["uid"] == "17"])
    xm, xs = scale_fit(np.log1p(x[train]))
    cm, cs = scale_fit(np.log1p(c[train]))
    ym, ys = scale_fit(np.log1p(y[train]))
    zx, zc, zy = (np.log1p(x) - xm) / xs, (np.log1p(c) - cm) / cs, (np.log1p(y) - ym) / ys
    model = SmallGRU(2, hidden=8, conditional=True)
    training = train_loop(model, [zx, zc], zy, train, val, epochs=1400, lr=0.005, patience=150)
    with torch.no_grad():
        prediction = np.expm1(model(torch.tensor(zx, dtype=torch.float32), torch.tensor(zc, dtype=torch.float32)).numpy() * ys + ym)[:, 0]
    baseline = x[:, -1, 0]
    exported = export_gru(model, xm, xs, ym, ys, "CSS historical GRU + given-steam conditional head")
    exported.update({"inputTransform": "log1p", "outputTransform": "expm1", "inputNames": ["historical_oil_m3", "historical_steam_cwe_m3"],
                     "conditioning": {"feature": "given_next_month_steam_cwe_m3", "transform": "log1p", "mean": cm, "scale": cs, "headWeight": model.condition.weight.detach().numpy().ravel(), "formula": "net=head(hidden)+headWeight*((log1p(givenSteam)-mean)/scale); do not substitute future Oil"},
                     "trainingRawRange": {"oil": [x[train, :, 0].min(), x[train, :, 0].max()], "steam": [x[train, :, 1].min(), x[train, :, 1].max()], "givenSteam": [c[train].min(), c[train].max()]}})
    selected = [i for i in held_test if meta[i]["targetMonth"] in ["2019-01", "2019-05", "2019-09"]]
    selected += [i for i in time_test if (meta[i]["uid"], meta[i]["targetMonth"]) in [("1", "2019-01"), ("3", "2019-05"), ("1", "2019-09")]]
    records = []
    for i in selected:
        m, last = meta[i], x[i, -1, 1]
        data, j = m["data"], m["targetIndex"]
        future = data[j:j + 3]
        past = data[j - history:j]
        lower = max(float(x[i, :, 1].min()), last * 0.8)
        upper = min(float(x[i, :, 1].max()), last * 1.2)
        records.append({"id": f"CSS-{m['uid']}-{m['targetMonth']}", "kind": "field", "scope": "Monthly scheme-level conditional production hindcast, not individual CSS cycles", "sourceId": f"8ngkgz69zb.2/UID{m['uid']}/{m['targetMonth']}", "split": "held-out", "input": x[i], "conditioning": c[i], "target": y[i, 0], "baseline": baseline[i],
                        "_torchReference": [prediction[i]],
                        "display": {"UID": m["uid"], "Operation": data[j]["Operation"], "Scheme": data[j]["Scheme"], "historyMonths": [r["ProductionMonth"] for r in past], "historyOil": x[i, :, 0], "historySteam": x[i, :, 1], "targetMonth": m["targetMonth"], "evaluationPartition": "unseen UID17" if m["uid"] == "17" else "2019 future-time holdout for trained UID", "futureMonths": [r["ProductionMonth"] for r in future], "observedFutureSteam": [float(r["SteamINJ"]) for r in future], "observedFutureOil": [float(r["Oil"]) for r in future], "givenSteamMeaning": "Observed future steam is supplied as known conditioning for this retrospective test. It is not a forecast of steam and does not establish causal gain.", "steamBounds": [lower, upper], "defaultThreeMonthBudget": float(last * 3), "maxMonthlyChangeFraction": 0.15, "baselineName": "last observed monthly Oil", "oilUnit": "m3/month", "steamUnit": "m3 cold-water-equivalent/month at15 C"}})
    src = source("Si · Canadian in-situ oil sands monthly operating data", "https://data.mendeley.com/datasets/8ngkgz69zb/2")
    stats = lambda ix: {"n": len(ix), "modelMAE": float(np.abs(prediction[ix] - y[ix, 0]).mean()), "baselineMAE": float(np.abs(baseline[ix] - y[ix, 0]).mean())}
    payload = {"id": "e4", "unit": "m³/month; steam cold-water equivalent", "source": src, "scope": "Given-steam conditional monthly Oil forecasts and bounded3-month model scenarios; observational association, no per-well cycle or causal oil gain.", "model": exported, "records": records,
               "optimization": {"horizon": 3, "objective": "maximize cumulative model-predicted Oil under selected steam budget", "steps": 9, "perRecordBounds": "display.steamBounds from already observed6-month history intersect0.8..1.2×last steam", "maxMonthlyChangeFraction": 0.15, "requiredRollout": "At each step use current6×2 history and given steam condition. Append [predictedOil,givenSteam], drop oldest row; never append observed future Oil.", "constraints": ["all3 steam volumes in record bounds", "total cold-water-equivalent steam <= budget", "adjacent monthly change <= selected fraction"], "boundary": "Plans outside trained input support require an explicit warning. Scenario difference is predicted association, not incremental causal oil."},
               "validation": {"split": {"train": "UID1+3 target months2015-07..2017-12 (60 windows)", "validation": "UID1+3 target months2018 (24 windows)", "timeTest": "UID1+3 target months2019 (24 windows)", "groupTest": "UID17 all target months2015-07..2019-12 (54 windows), never fitted or selected on", "historyLength": history, "counts": [len(train), len(val), len(time_test), len(held_test)]}, "metric": "MAE in Oil m3/month", "baseline": stats(held_test)["baselineMAE"], "model": stats(held_test)["modelMAE"], "n": len(held_test), "details": {"unseenOperation": stats(held_test), "futureTimeKnownOperations": stats(time_test)}, "boundary": "Known future steam conditioning is retrospective, not unconstrained future-steam forecasting. Report low scores as obtained; no SOR feature.", "training": training},
               "provenance": provenance("e4", [src, source("Operating units and study", "https://doi.org/10.3390/su13041968")], {"allCSSRows": 180, "UIDs": [1, 3, 17], "windows": len(x)}, ["UID1 IMOCL Cold Lake; UID3 CNRLWL Wolf/Primrose/Burnt; UID17 CNULPR PeaceRiver", "Oil m3/month; SteamINJ m3 CWE/month at15 C; gas columns10^3m3 are excluded", "no SOR, futureOil, GHG or EI in input", "train-only log1p scalers; UID17 untouched", "monthly data are never relabeled as individual stimulation cycles"])}
    return add_parity(payload)


def prepare_e5():
    seed(SEED + 5)
    raw = json.loads((RAW / "biosurfactant_online_windows.json").read_text(encoding="utf-8"))
    samples = raw["samples"]
    x = np.array([s["x"] for s in samples])
    y = np.array([[s["target_trehalolipid_g_l"]] for s in samples])
    train = np.array([i for i, s in enumerate(samples) if s["condition_group"] in ["B1", "B3"] and s["assay_time_h"] <= 288])
    val = np.array([i for i, s in enumerate(samples) if s["condition_group"] in ["B1", "B3"] and s["assay_time_h"] > 288])
    test = np.array([i for i, s in enumerate(samples) if s["condition_group"] == "B2"])
    xm, xs = scale_fit(x[train])
    ym, ys = scale_fit(y[train])
    zx, zy = (x - xm) / xs, (y - ym) / ys
    model = SmallGRU(3, hidden=6)
    training = train_loop(model, [zx], zy, train, val, epochs=1400, lr=0.005, patience=180)
    with torch.no_grad():
        predicted = (model(torch.tensor(zx, dtype=torch.float32)).numpy() * ys + ym)[:, 0]
    baseline = float(y[train].mean())
    exported = export_gru(model, xm, xs, ym, ys, "PML026 past-only online-sensor GRU soft sensor")
    exported["inputNames"] = raw["features"]
    exported["outputNames"] = ["trehalolipid_g_l"]
    exported["postprocess"] = "none; retain and flag negative predictions rather than silently hiding them"
    # First3 actual held-out samples cover the rise and late batch, not easiest points.
    chosen = [i for i in test if samples[i]["batch_id"] == "B2a" and samples[i]["assay_time_h"] in [72, 192, 336]]
    chosen += [i for i in test if samples[i]["batch_id"] == "B2b" and samples[i]["assay_time_h"] in [72, 192, 336]]
    records = []
    for i in chosen:
        s = samples[i]
        batch_all = [j for j, other in enumerate(samples) if other["batch_id"] == s["batch_id"]]
        records.append({"id": s["id"], "kind": "published-laboratory", "scope": "Measured ex-situ fermentation titer; no reservoir activity or recovery labels", "sourceId": f"bw79v9vnbs.1/{s['id']}", "split": "held-out", "input": x[i], "target": y[i, 0], "baseline": baseline,
                        "_torchReference": [predicted[i]],
                        "display": {"batch": s["batch_id"], "conditionGroup": s["condition_group"], "assayTimeHours": s["assay_time_h"], "historyStartHours": s["history_start_h"], "historyEndExclusiveHours": s["history_end_exclusive_h"], "lastSensorTimeHours": s["last_sensor_time_h"], "sensorCountPerBin": s["sensor_count_per_bin"], "hourBins": [s["history_start_h"] + j for j in range(24)], "featureNames": raw["features"], "featureUnits": raw["feature_units"], "targetAssayStd": s["target_assay_std_g_l"], "batchAssayTimes": [samples[j]["assay_time_h"] for j in batch_all], "batchTargets": y[batch_all, 0], "batchPredictions": predicted[batch_all], "baselineName": "training-condition measured-titer mean", "inputBoundary": "Strictly past online signals only; neither titer nor other offline assays are features."}})
    src = source("PML026 · Production and separation of a trehalolipid biosurfactant: data", "https://data.mendeley.com/datasets/bw79v9vnbs/1")
    payload = {"id": "e5", "unit": "g/L trehalolipid", "source": src, "scope": "Past-only online-sensor soft sensing at the actual assay time, evaluated on a held-out fermentation condition. No field microbial-activity or oil-gain claim.", "model": exported, "records": records,
               "validation": {"split": {"train": "B1+B3 assays24..288h,24 labels", "validation": "B1+B3 assays312/336/360h,6 labels", "test": "B2a+B2b together, all15 noninitial assays per batch,30 labels", "conditionGroup": "B2a and B2b are replicates and never split between train/test", "counts": [len(train), len(val), len(test)]}, "metric": "MAE in trehalolipid g/L", "baseline": float(np.mean(np.abs(y[test, 0] - baseline))), "model": float(np.mean(np.abs(predicted[test] - y[test, 0]))), "n": len(test), "details": {batch: {"n": len(ix), "modelMAE": float(np.abs(predicted[ix] - y[ix, 0]).mean()), "baselineMAE": float(np.abs(y[ix, 0] - baseline).mean())} for batch, ix in [(batch, np.array([i for i in test if samples[i]["batch_id"] == batch])) for batch in ["B2a", "B2b"]]}, "negativePredictionCount": int((predicted[test] < 0).sum()), "boundary": "Only3 conditions and60 usable assay labels. Dense sensors do not add independent labels. Past-only timing does not identify intervention causality.", "training": training},
               "alignment": {"featureOrder": raw["features"], "units": raw["feature_units"], "shape": [24, 3], "interval": "[assay_t-24,assay_t),24 one-hour actual-observation means", "noFill": raw["no_fill"], "originalAssays": 64, "usableAssays": 60, "omitted": "4 batch-start t=0 assays have no past24h", "rawSHA256": raw["source"]["raw_sha256"]},
               "provenance": provenance("e5", [src, source("Laboratory production/separation study", "https://doi.org/10.1016/j.bej.2018.07.006", "Research reference only; article license not asserted or redistributed. The separate data record is CC BY4.0.")], {"originalAssays": 64, "usable": 60, "train": len(train), "validation": len(val), "test": len(test)}, ["only past rpm,temp,DO input", "no same-target or other offline assay feature", "no interpolation/backfill/forward-fill", "B2a+b held out together", "scalers fit to24 training labels/windows only", "raw records retained unmodified"])}
    return add_parity(payload)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cases", nargs="+", choices=["e1", "e2", "e3", "e4", "e5"], default=["e1", "e2", "e3", "e4", "e5"])
    arguments = parser.parse_args()
    index = json.loads((RAW / "source-index.json").read_text(encoding="utf-8"))
    for item in index["inputs"]:
        path = RAW / item["file"]
        if path.stat().st_size != item["bytes"] or hashlib.sha256(path.read_bytes()).hexdigest() != item["sha256"]:
            raise ValueError(f"Source snapshot hash mismatch: {item['file']}")
    prepare = {"e1": prepare_e1, "e2": prepare_e2, "e3": prepare_e3, "e4": prepare_e4, "e5": prepare_e5}
    summary = []
    for case in arguments.cases:
        start = time.time()
        payload = prepare[case]()
        path = OUT / f"{case}.json"
        write(path, payload)
        report = {"id": case, "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "records": len(payload["records"]), "validation": payload["validation"], "seconds": round(time.time() - start, 2)}
        summary.append(report)
        print(json.dumps({k: v for k, v in report.items() if k != "validation"} | {"metric": payload["validation"]["metric"], "baseline": payload["validation"]["baseline"], "model": payload["validation"]["model"]}, ensure_ascii=False), flush=True)
    write(AUDIT / ("model-preparation-summary.json" if len(arguments.cases) == 5 else "model-preparation-summary-" + "-".join(arguments.cases) + ".json"), summary)


if __name__ == "__main__":
    main()
