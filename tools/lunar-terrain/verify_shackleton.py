"""Verify final Shackleton geometry, embedded maps and exact astronaut support.

The general validator also exercises a 625-point non-anchor holdout grid.
"""
import argparse
import io
import json
import struct
from pathlib import Path

# pi-lens-ignore: reportMissingImports
import numpy as np

# pi-lens-ignore: reportMissingImports
import rasterio

# pi-lens-ignore: reportMissingImports
from PIL import Image

# isort: split
# Sibling pipeline modules; keep grouping stable from root and script-directory invocations.
from prepare import bilinear, sha256, write_json
from verify import mesh_height, read_glb, verify


def validate(repo, source):
    repo, source = Path(repo), Path(source)
    web = repo / 'public/terrain'
    output = repo / 'assets/terrain/shackleton-rim'
    meta_path = web / 'shackleton-rim.metadata.json'
    glb_path = web / 'shackleton-rim.glb'
    report_path = output / 'validation.json'
    verify(glb_path, meta_path, source, report_path)
    try:
        meta = json.loads(meta_path.read_text())
        report = json.loads(report_path.read_text())
    except (OSError, ValueError) as exc:
        raise ValueError('Cannot read generated validation metadata') from exc
    assert meta['id'] == 'shackleton-rim', 'This validator is specific to the Shackleton delivery'
    doc, vertices, _, faces = read_glb(glb_path, allow_textures=True)
    data = glb_path.read_bytes()
    json_length = struct.unpack_from('<I', data, 12)[0]
    binary = data[28 + json_length:]
    assert len(doc['materials']) == 1 and len(doc['images']) == 3
    assert all('uri' not in im for im in doc['images']), 'External image download omitted from budget'
    for sampler in doc['samplers']:
        assert sampler['wrapS'] == sampler['wrapT'] == 33071
    images = []
    for info in doc['images']:
        view = doc['bufferViews'][info['bufferView']]
        raw = binary[view['byteOffset']:view['byteOffset'] + view['byteLength']]
        with Image.open(io.BytesIO(raw)) as im:
            im.load()
            images.append({'name': info.get('name'), 'size': list(im.size), 'bytes': len(raw), 'mime': info['mimeType']})
    normal_index = doc['materials'][0]['normalTexture']['index']
    normal_image = doc['images'][doc['textures'][normal_index]['source']]
    view = doc['bufferViews'][normal_image['bufferView']]
    with Image.open(io.BytesIO(binary[view['byteOffset']:view['byteOffset'] + view['byteLength']])) as im:
        normal = np.array(im).astype(float)
    border = np.concatenate([normal[0], normal[-1], normal[:, 0], normal[:, -1]])
    assert np.max(np.abs(border - [128, 128, 255])) <= 2
    assert np.std(normal[700:1300, 700:1300, :2]) > 1, 'Fine normal detail missing'
    ox, oy, oz = (meta['origin'][key] for key in ['projectedXM', 'projectedYM', 'radialElevationM'])
    px, py, _ = meta['astronaut']['supportProjectedM']
    with rasterio.open(source) as ds:
        raster = ds.read(1)
        support_source = bilinear(raster, ds.transform, px, py)
        height = mesh_height(vertices, faces, px - ox, -(py - oy))
        assert height is not None
        site_x, site_y = meta['controlPoints'][0]['projectedM']
        row, col = ds.index(site_x, site_y)
        reference = float(raster[row, col])
        assert abs(reference - 771.043212890625) < 1e-6
        cx, cy = meta['nearDetail']['centerProjectedM']
        # All source pixel centers inside the full-density radius must survive.
        xy = np.column_stack((vertices[:, 0] + ox, -vertices[:, 2] + oy))
        c0, r0 = (~ds.transform) * (cx, cy)
        expected = []
        for r in range(int(r0)-8, int(r0)+9):
            for c in range(int(c0)-8, int(c0)+9):
                x, y = ds.xy(r, c)
                if np.hypot(x-cx, y-cy) <= 35:
                    expected.append((x, y))
        present = set(map(tuple, xy))
        assert all(point in present for point in expected), 'Near-field source samples were decimated'
    report['referencePixel'] = {'row': row, 'column': col, 'heightM': reference,
        'note': 'Containing pixel, NOT bilinear height at the exact saved coordinate'}
    report['astronautSupport'] = {'projectedXYM': [px, py], 'rasterBilinearM': support_source,
        'glbBarycentricM': height + oz, 'glbMinusRasterM': height + oz - support_source}
    report['materialChecks'] = {'embeddedImages': images, 'externalTextureBytes': 0,
        'allSamplersClampToEdge': True, 'neutralNormalBorder': True, 'centerNormalVariation': True,
        'singleContinuousMaterial': True, 'nearFieldFullDensitySamples': len(expected)}
    assert sha256(web / 'astronaut.glb') == sha256(repo / meta['astronaut']['sourcePath'])
    assert sha256(output / 'shackleton-rim.blend') == meta['artifacts']['blend']['sha256']
    report['initialDownload'] = {'terrainBytes': glb_path.stat().st_size,
        'astronautBytes': (web / 'astronaut.glb').stat().st_size, 'metadataBytes': meta_path.stat().st_size,
        'totalModelBytes': glb_path.stat().st_size + (web / 'astronaut.glb').stat().st_size,
        'totalIncludingMetadataBytes': glb_path.stat().st_size + (web / 'astronaut.glb').stat().st_size + meta_path.stat().st_size,
        'scope': 'Raw static response bodies, all embedded maps included. Excludes HTTP headers, application JS/CSS and optional QA images.'}
    write_json(report_path, report)
    print(json.dumps({k: report[k] for k in ['referencePixel', 'astronautSupport', 'materialChecks', 'initialDownload']}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', required=True)
    parser.add_argument('--source', required=True)
    args = parser.parse_args()
    validate(args.repo, args.source)
