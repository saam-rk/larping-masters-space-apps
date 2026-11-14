"""Bake deterministic illustrative regolith maps; no geographic imagery or relief.

Run outside Blender using requirements-shackleton.txt. The atlas has a smooth
neutral border, mapped with CLAMP_TO_EDGE, so one continuous material becomes
constant in the distance without material seams or repeated distant grain.
"""
import argparse
import json
from pathlib import Path

# pi-lens-ignore: reportMissingImports
import numpy as np

# pi-lens-ignore: reportMissingImports
from PIL import Image

# pi-lens-ignore: reportMissingImports
from scipy.ndimage import gaussian_filter


def bake(output):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(2404)
    size = 2048
    coords = (np.arange(size) + 0.5) / size * 50 - 25
    x, y = np.meshgrid(coords, coords)
    distance = np.hypot(x, y)
    t = np.clip((distance - 15) / 9, 0, 1)
    fade = 1 - t * t * (3 - 2 * t)
    noise = rng.normal(size=(size, size))
    height = gaussian_filter(noise, 0.7) + gaussian_filter(noise, 3) * 2
    dy, dx = np.gradient(height)
    normal = np.stack((-dx * 0.16 * fade, dy * 0.16 * fade, np.ones_like(x)), axis=-1)
    normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
    # Image rows run downward while atlas V runs upward; +Y tangent convention.
    normal = np.rint((normal * 0.5 + 0.5) * 255).astype(np.uint8)
    Image.fromarray(normal).save(output / 'regolith-normal.jpg', quality=65, subsampling=0)
    broad = gaussian_filter(noise, 24)
    broad /= np.std(broad)
    fine = gaussian_filter(noise, 2)
    fine /= np.std(fine)
    shade = np.clip(133 + (broad * 3 + fine * 2) * fade, 0, 255)
    color = np.stack((shade * 1.005, shade, shade * 0.99), axis=-1).astype(np.uint8)
    Image.fromarray(color).resize((512, 512), Image.Resampling.LANCZOS).save(
        output / 'regolith-color.jpg', quality=85, subsampling=0)
    rough = np.clip(242 + (fine * 4 + broad * 2) * fade, 220, 255).astype(np.uint8)
    orm = np.stack((np.full_like(rough, 255), rough, np.zeros_like(rough)), axis=-1)
    Image.fromarray(orm).resize((256, 256), Image.Resampling.LANCZOS).save(output / 'regolith-orm.png')
    print(json.dumps({p.name: p.stat().st_size for p in output.glob('regolith-*')}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True)
    bake(parser.parse_args().output)
