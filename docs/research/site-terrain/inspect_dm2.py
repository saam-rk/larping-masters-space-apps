"""Inspect DM2 numeric heights before choosing the demonstration feature."""

import argparse

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import rasterio
from matplotlib.colors import LightSource

p = argparse.ArgumentParser()
p.add_argument("--raster", required=True)
p.add_argument("--out", required=True)
a = p.parse_args()
with rasterio.open(a.raster) as ds:
    z = ds.read(1)[999:3000, 1000:3001]
extent = [152002.5, 162002.5, 90002.5, 100002.5]
fig, axes = plt.subplots(1, 2, figsize=(14, 7), constrained_layout=True)
im = axes[0].imshow(z, extent=extent, cmap="terrain")
fig.colorbar(im, ax=axes[0], label="Radial elevation (m)", shrink=0.6)
axes[1].imshow(
    LightSource(315, 15).hillshade(z, dx=5, dy=5), extent=extent, cmap="gray"
)
for ax in axes:
    ax.plot(157000.451965, 95000.253401, "r+", ms=10)
    ax.set_xlabel("Projected X (m)")
    ax.set_ylabel("Projected Y (m)")
    ax.ticklabel_format(style="plain", useOffset=False)
axes[0].set_title("DM2: 10 km crop, numeric elevation")
axes[1].set_title("Illustrative hillshade: no solar ephemeris")
fig.savefig(a.out, dpi=130)
print(
    {
        "minM": float(np.nanmin(z)),
        "maxM": float(np.nanmax(z)),
        "missing": int((~np.isfinite(z)).sum()),
    }
)
