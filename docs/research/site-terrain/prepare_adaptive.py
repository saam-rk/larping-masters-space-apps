"""Reuse the regular-grid preparation, then add error-prioritized pixel centers.

This bounded variant requires a fully valid crop and fails closed on nodata;
it never fills holes. All final vertices retain exact source pixel heights.
"""

import argparse
import json
from pathlib import Path

import numpy as np
import rasterio

import prepare_grid
from terrain_common import mesh_height


def stats(values):
    return {
        "samples": int(values.size),
        "meanM": float(values.mean()),
        "rmsM": float(np.sqrt(np.mean(values**2))),
        "p95AbsM": float(np.percentile(np.abs(values), 95)),
        "p99AbsM": float(np.percentile(np.abs(values), 99)),
        "maxAbsM": float(np.max(np.abs(values))),
    }


def sample_adaptive(vertices, cells, x, y, x0, y0, spacing):
    """Barycentric sampling of the conforming per-cell triangle fans."""
    shape = np.broadcast_shapes(np.shape(x), np.shape(y))
    x, y = np.broadcast_arrays(x, y)
    c = np.clip(np.floor((x - x0) / spacing).astype(int), 0, cells.shape[1] - 1)
    r = np.clip(np.floor((y0 - y) / spacing).astype(int), 0, cells.shape[0] - 1)
    out = np.full(shape, np.nan)
    for i in range(4):
        face = cells[r, c, i]
        valid = face[..., 0] >= 0
        v0, v1, v2 = (
            vertices[np.maximum(face[..., j], 0)].astype(float) for j in range(3)
        )
        dx1, dy1 = v1[..., 0] - v0[..., 0], v1[..., 1] - v0[..., 1]
        dx2, dy2 = v2[..., 0] - v0[..., 0], v2[..., 1] - v0[..., 1]
        det = dx1 * dy2 - dx2 * dy1
        det = np.where(valid, det, 1)
        u = ((x - v0[..., 0]) * dy2 - dx2 * (y - v0[..., 1])) / det
        v = (dx1 * (y - v0[..., 1]) - (x - v0[..., 0]) * dy1) / det
        hit = valid & (u >= -1e-8) & (v >= -1e-8) & (u + v <= 1 + 1e-8)
        out = np.where(
            hit,
            v0[..., 2] + u * (v1[..., 2] - v0[..., 2]) + v * (v2[..., 2] - v0[..., 2]),
            out,
        )
    return out


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--config", type=Path, required=True)
    p.add_argument("--raster", type=Path, required=True)
    p.add_argument("--out-dir", type=Path, required=True)
    args = p.parse_args()
    prepare_grid.main()  # Same arguments, CRS checks, origin, cameras and source provenance.
    cfg = json.loads(args.config.read_text())
    stem = args.out_dir / cfg["siteId"]
    prep = json.loads(stem.with_suffix(".prep.json").read_text())
    if prep["crop"]["missingSourcePixelsInWindow"]:
        raise ValueError(
            "Adaptive DM2 variant requires a fully valid crop; use masked regular generator for nodata"
        )
    with rasterio.open(args.raster) as ds:
        w = prep["crop"]["sourceWindow"]
        z = ds.read(
            1,
            window=rasterio.windows.Window(
                w["colOff"], w["rowOff"], w["width"], w["height"]
            ),
        ).astype(float)
    grid = np.load(stem.with_suffix(".grid.npz"))
    x, y = grid["x_local"], grid["y_local"]
    origin = prep["localOrigin"]
    step = cfg["mesh"]["stepPixels"]
    res = prep["rasterInspection"]["cellSizeM"]
    rows, cols = np.indices(z.shape)
    gx, gy = x[0] + cols * res, y[0] - rows * res
    base = mesh_height(x, y, grid["z_local"], gx, gy) + origin["elevationM"]
    error = np.abs(base - z)
    feature = prep["points"]["ridge-reference"]["blenderLocalM"]
    radius = cfg["mesh"]["featurePriorityRadiusM"]
    weight = 1 + (cfg["mesh"]["featurePriorityMultiplier"] - 1) * np.exp(
        -((gx - feature[0]) ** 2 + (gy - feature[1]) ** 2) / (2 * radius**2)
    )
    score = error * weight
    # Interior vertices leave shared coarse edges intact: no T junctions.
    score[::step, :] = -1
    score[:, ::step] = -1
    # One best residual per coarse quad, then rank quads. This spreads refinement
    # across slope changes instead of spending the budget on one narrow crater.
    n = (z.shape[0] - 1) // step
    blocks = (
        score[:-1, :-1]
        .reshape(n, step, n, step)
        .transpose(0, 2, 1, 3)
        .reshape(n * n, step * step)
    )
    best = blocks.argmax(axis=1)
    ranking = np.argsort(-blocks[np.arange(n * n), best], kind="stable")
    br, bc = np.meshgrid(
        np.arange(0, z.shape[0], step), np.arange(0, z.shape[1], step), indexing="ij"
    )
    count = cfg["mesh"]["targetVertices"] - br.size
    if count < 0 or count > n * n:
        raise ValueError("Target outside available refinement budget")
    chosen = ranking[:count]
    rr = np.concatenate([br.ravel(), (chosen // n) * step + best[chosen] // step])
    cc = np.concatenate([bc.ravel(), (chosen % n) * step + best[chosen] % step])
    vertices = np.column_stack(
        [gx[rr, cc], gy[rr, cc], z[rr, cc] - origin["elevationM"]]
    ).astype(np.float32)
    ids = np.arange(br.size).reshape(br.shape)
    nw, ne, sw, se = ids[:-1, :-1], ids[:-1, 1:], ids[1:, :-1], ids[1:, 1:]
    cells = np.full((n, n, 4, 3), -1, dtype=np.int32)
    cells[:, :, 0] = np.stack([nw, sw, se], axis=-1)
    cells[:, :, 1] = np.stack([nw, se, ne], axis=-1)
    qr, qc = chosen // n, chosen % n
    added = np.arange(br.size, len(vertices))
    for i, (start, end) in enumerate(((nw, sw), (sw, se), (se, ne), (ne, nw))):
        cells[qr, qc, i] = np.column_stack([start[qr, qc], end[qr, qc], added])
    faces = cells.reshape(-1, 3)
    faces = faces[faces[:, 0] >= 0]
    diff = np.empty_like(z)
    for begin in range(0, z.shape[0], 100):
        section = slice(begin, begin + 100)
        diff[section] = (
            sample_adaptive(
                vertices, cells, gx[section], gy[section], x[0], y[0], res * step
            )
            + origin["elevationM"]
            - z[section]
        )
    assert np.isfinite(diff).all()
    prep["adaptive"] = {
        "method": "50 m regular base; one maximum absolute source-versus-base triangle height residual at an interior source pixel per 50 m quad; rank by residual times feature weight; split selected quads into four triangles around that pixel, retaining shared coarse edges",
        "featureWeight": "1 + 3*exp(-distanceToFeatureSquared/(2*1000^2))",
        "vertices": len(vertices),
        "triangles": len(faces),
        "baseVertices": br.size,
        "addedVertices": count,
        "sourcePixelSpacingM": res,
        "errorAgainstAllSourceCenters": stats(diff),
        "featureRegionError": stats(
            diff[(gx - feature[0]) ** 2 + (gy - feature[1]) ** 2 <= radius**2]
        ),
        "noDataPolicy": "Fail closed if any source pixel is invalid; no triangles bridge nodata. This DM2 crop has no missing pixels.",
        "coverageValidFraction": 1.0,
    }
    np.savez_compressed(
        stem.with_suffix(".adaptive.npz"), vertices=vertices, triangles=faces
    )
    stem.with_suffix(".prep.json").write_text(
        json.dumps(prep, indent=2, allow_nan=False) + "\n"
    )
    print(json.dumps(prep["adaptive"], indent=2))


if __name__ == "__main__":
    main()
