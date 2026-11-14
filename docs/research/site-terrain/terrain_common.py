"""Shared numerical helpers for the site-terrain scripts (numpy only)."""

from __future__ import annotations

import math

# pi-lens-ignore: reportMissingImports
import numpy as np


def raster_bilinear(data, transform, xs, ys):
    """Bilinear interpolation between source pixel centers.

    ``transform`` is an affine (rasterio) transform for a north-up raster.
    Returns NaN outside the interpolable area or next to missing samples.
    """
    xs = np.asarray(xs, dtype=np.float64)
    ys = np.asarray(ys, dtype=np.float64)
    col = (xs - transform.c) / transform.a - 0.5
    row = (ys - transform.f) / transform.e - 0.5
    c = np.floor(col).astype(np.int64)
    r = np.floor(row).astype(np.int64)
    fx, fy = col - c, row - r
    ok = (c >= 0) & (r >= 0) & (c + 1 < data.shape[1]) & (r + 1 < data.shape[0])
    cc, rr = np.where(ok, c, 0), np.where(ok, r, 0)
    top = data[rr, cc] * (1 - fx) + data[rr, cc + 1] * fx
    bottom = data[rr + 1, cc] * (1 - fx) + data[rr + 1, cc + 1] * fx
    out = top * (1 - fy) + bottom * fy
    return np.where(ok, out, np.nan)


def mesh_height(vx, vy, vz, xq, yq):
    """Height of the triangulated vertex grid at query points.

    ``vx`` ascending (west to east grid X), ``vy`` descending (north to south
    grid Y), ``vz[row, col]``. Each quad is split along the diagonal from its
    north-west vertex (row, col) to its south-east vertex (row+1, col+1), the
    same triangulation written by ``blender_build_scene.py``.
    """
    xq = np.asarray(xq, dtype=np.float64)
    yq = np.asarray(yq, dtype=np.float64)
    dx = vx[1] - vx[0]
    dy = vy[0] - vy[1]
    u = (xq - vx[0]) / dx
    w = (vy[0] - yq) / dy
    c = np.floor(u).astype(np.int64)
    r = np.floor(w).astype(np.int64)
    # Points on the far edges belong to the last quad.
    c = np.where(c == len(vx) - 1, c - 1, c)
    r = np.where(r == len(vy) - 1, r - 1, r)
    ok = (c >= 0) & (r >= 0) & (c < len(vx) - 1) & (r < len(vy) - 1)
    cc, rr = np.where(ok, c, 0), np.where(ok, r, 0)
    fx, fy = u - cc, w - rr
    z00 = vz[rr, cc]
    z01 = vz[rr, cc + 1]
    z10 = vz[rr + 1, cc]
    z11 = vz[rr + 1, cc + 1]
    lower = z00 + fy * (z10 - z00) + fx * (z11 - z10)  # triangle (00, 10, 11)
    upper = z00 + fx * (z01 - z00) + fy * (z11 - z01)  # triangle (00, 11, 01)
    out = np.where(fy >= fx, lower, upper)
    return np.where(ok, out, np.nan)


def polar_stereographic_scale_factor(lat_deg: float) -> float:
    """Point scale of a polar stereographic projection true at the pole."""
    return 2.0 / (1.0 + math.sin(abs(math.radians(lat_deg))))


def grid_bearing_of_north_deg(lon_east_deg: float) -> float:
    """Grid bearing (clockwise from +Y) of geographic north for a south-polar
    stereographic grid with central meridian 0: north points away from the pole
    along (sin lon, cos lon)."""
    return lon_east_deg % 360.0
