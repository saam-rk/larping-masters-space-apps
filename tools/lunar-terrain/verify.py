"""Verify actual GLB buffers against the numeric GeoTIFF; no Blender required."""

import argparse
import json
import struct
from pathlib import Path

# Run with the isolated geospatial interpreter from requirements.txt.
# pi-lens-ignore: reportMissingImports
import numpy as np

# pi-lens-ignore: reportMissingImports
import pyproj

# pi-lens-ignore: reportMissingImports
import rasterio
from prepare import bilinear, sha256, supported_faces, write_json


def read_glb(path, allow_textures=False):
    data = Path(path).read_bytes()
    magic, version, length = struct.unpack_from('<4sII', data)
    assert magic == b'glTF' and version == 2 and length == len(data)
    json_length, chunk = struct.unpack_from('<I4s', data, 12)
    assert chunk == b'JSON'
    try:
        document = json.loads(data[20:20 + json_length])
    except ValueError as exc:
        raise ValueError("Invalid GLB JSON chunk") from exc
    bin_length, chunk = struct.unpack_from('<I4s', data, 20 + json_length)
    assert chunk == b'BIN\x00'
    binary = data[28 + json_length:]
    assert len(binary) == bin_length
    assert len(document['scenes']) == len(document['nodes']) == len(document['meshes']) == 1
    assert not document.get('extensionsRequired'), "Compressed or otherwise extension-dependent GLB"
    assert (allow_textures or not document.get('images'))
    assert not document.get('animations') and not document.get('cameras')
    node = document['nodes'][0]
    assert not any(key in node for key in ('matrix', 'translation', 'rotation', 'scale'))
    primitive = document['meshes'][0]['primitives'][0]
    assert len(document['meshes'][0]['primitives']) == 1
    assert primitive.get('mode', 4) == 4
    expected = {'POSITION', 'NORMAL', 'TEXCOORD_0'} if allow_textures else {'POSITION', 'NORMAL'}
    assert set(primitive['attributes']) == expected

    def accessor(index):
        acc = document['accessors'][index]
        view = document['bufferViews'][acc['bufferView']]
        dtype = np.dtype({5123: '<u2', 5125: '<u4', 5126: '<f4'}[acc['componentType']])
        width = {'SCALAR': 1, 'VEC3': 3}[acc['type']]
        offset = view.get('byteOffset', 0) + acc.get('byteOffset', 0)
        stride = view.get('byteStride', dtype.itemsize * width)
        return np.ndarray((acc['count'], width), dtype=dtype, buffer=binary,
                          offset=offset, strides=(stride, dtype.itemsize)).copy()

    positions = accessor(primitive['attributes']['POSITION']).astype(np.float64)
    normals = accessor(primitive['attributes']['NORMAL']).astype(np.float64)
    indices = accessor(primitive['indices']).reshape(-1, 3).astype(np.int64)
    return document, positions, normals, indices


def mesh_height(positions, faces, x, z):
    """Vertical intersection / barycentric interpolation on actual indexed triangles.

    Return None for unsupported points; never extrapolate. Vectorized brute force
    is intentional for offline validation, independent of Blender/Three raycasters.
    """
    triangle = positions[faces]
    a, b, c = triangle[:, 0], triangle[:, 1], triangle[:, 2]
    denominator = (b[:, 2] - c[:, 2]) * (a[:, 0] - c[:, 0]) + (c[:, 0] - b[:, 0]) * (a[:, 2] - c[:, 2])
    u = ((b[:, 2] - c[:, 2]) * (x - c[:, 0]) + (c[:, 0] - b[:, 0]) * (z - c[:, 2])) / denominator
    v = ((c[:, 2] - a[:, 2]) * (x - c[:, 0]) + (a[:, 0] - c[:, 0]) * (z - c[:, 2])) / denominator
    hit = np.flatnonzero((u >= -1e-9) & (v >= -1e-9) & (u + v <= 1 + 1e-9))
    if not len(hit):
        return None
    i = hit[0]
    return float(u[i] * a[i, 1] + v[i] * b[i, 1] + (1-u[i]-v[i]) * c[i, 1])


def verify(glb_path, metadata_path, source_path, report_path):
    try:
        meta = json.loads(Path(metadata_path).read_text(encoding='utf-8'))
    except (OSError, ValueError) as exc:
        raise ValueError("Cannot read terrain metadata") from exc
    assert sha256(source_path) == meta['source']['sha256']
    assert sha256(glb_path) == meta['artifacts']['glb']['sha256']
    document, vertices, normals, faces = read_glb(
        glb_path, allow_textures='TEXCOORD_0' in meta['generation']['exportAttributes'])
    assert np.isfinite(vertices).all() and np.isfinite(normals).all()
    assert faces.min() == 0 and faces.max() < len(vertices)
    assert len(np.unique(faces)) == len(vertices)
    assert np.allclose(np.linalg.norm(normals, axis=1), 1, atol=1e-5)
    assert (normals[:, 1] > 0).all(), "Normal axis/sign mismatch"
    config = meta['generation']['config']
    size = Path(glb_path).stat().st_size
    assert size <= config['maxGlbBytes']
    assert 40000 <= len(vertices) <= 60000 and 80000 <= len(faces) <= 120000
    origin = meta['origin']
    ox, oy, oz = origin['projectedXM'], origin['projectedYM'], origin['radialElevationM']
    projected_x, projected_y = vertices[:, 0] + ox, -vertices[:, 2] + oy
    with rasterio.open(source_path) as ds:
        raster = ds.read(1, masked=True).filled(np.nan)
        col, row = (~ds.transform) * (projected_x, projected_y)
        cr = np.column_stack((col-0.5, row-0.5))
        indices = np.rint(cr).astype(np.int64)
        assert np.max(np.abs(cr-indices)) < 1e-6, "Vertices are not at source pixel centers"
        source_heights = raster[indices[:, 1], indices[:, 0]].astype(np.float64)
        vertex_errors = vertices[:, 1] + oz - source_heights
        assert np.max(np.abs(vertex_errors)) < 0.001
        assert supported_faces(indices, faces, np.isfinite(raster)).all(), "Mesh bridges nodata"
        projection = pyproj.Proj(ds.crs)
        controls = []
        for point in meta['controlPoints']:
            x, y = projection(point['longitudeEastDeg'], point['latitudeDeg'])
            raster_height = bilinear(raster, ds.transform, x, y)
            height = mesh_height(vertices, faces, x-ox, -(y-oy))
            assert height is not None
            glb_height = height + oz
            controls.append({**point, 'rasterBilinearM': raster_height,
                             'glbBarycentricM': glb_height, 'glbMinusRasterM': glb_height-raster_height})
        # A non-anchor grid tests the interior; not an exhaustive physical-error bound.
        min_x, min_y, max_x, max_y = meta['coverage']['meshPixelCenterBoundsM']
        errors, missing = [], 0
        for x in np.linspace(min_x+31.23, max_x-31.23, 25):
            for y in np.linspace(min_y+27.41, max_y-27.41, 25):
                height = mesh_height(vertices, faces, x-ox, -(y-oy))
                if height is None:
                    missing += 1
                    continue
                errors.append(height + oz - bilinear(raster, ds.transform, x, y))
    assert missing == 0, "Unexpected missing terrain in this fully valid rectangular crop"
    assert mesh_height(vertices, faces, min_x-ox-1, -(min_y-oy)) is None
    vectors = vertices[faces]
    cross = np.cross(vectors[:, 1]-vectors[:, 0], vectors[:, 2]-vectors[:, 0])
    assert (cross[:, 1] > 0).all()
    projected_area = float(cross[:, 1].sum()/2)
    assert abs(projected_area-meta['coverage']['meshProjectedAreaM2']) < 0.01
    edges = np.sort(np.vstack((faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]])), axis=1)
    unique_edges, incidence = np.unique(edges, axis=0, return_counts=True)
    assert (incidence <= 2).all(), "Non-manifold mesh"
    euler = len(vertices)-len(unique_edges)+len(faces)
    assert euler == 1, "Expected one rectangular height-field disk"
    errors = np.array(errors)
    report = {
        'status': 'passed', 'glb': {'bytes': size, 'mib': size / 1048576,
            'budgetBytes': config['maxGlbBytes'], 'remainingBytes': config['maxGlbBytes']-size,
            'vertices': len(vertices), 'triangles': len(faces),
            'attributes': list(document['meshes'][0]['primitives'][0]['attributes']),
            'indexComponentType': document['accessors'][document['meshes'][0]['primitives'][0]['indices']]['componentType'],
            'extensionsRequired': document.get('extensionsRequired', []),
            'sha256': sha256(glb_path), 'boundsM': [vertices.min(axis=0).tolist(), vertices.max(axis=0).tolist()]},
        'topology': {'boundaryEdges': int((incidence == 1).sum()), 'nonManifoldEdges': 0,
                     'eulerCharacteristic': euler, 'allFaceNormalsUp': True, 'projectedAreaM2': projected_area},
        'sourceChecks': {'sha256': sha256(source_path), 'allVerticesAtSourcePixelCenters': True,
                         'maxVertexHeightResidualM': float(np.max(np.abs(vertex_errors))),
                         'allTrianglesNodataSafe': True, 'outsidePointRejected': True},
        'comparisonMethods': {'raster': 'float64 bilinear interpolation of four surrounding 5 m pixel centers',
                              'glb': 'float64 barycentric vertical intersection with actual exported triangle/index buffers; restore origin height',
                              'delta': 'GLB minus raster, meters; mesh approximation difference, NOT scientific accuracy'},
        'controls': controls,
        'holdoutGrid': {'count': len(errors), 'missing': missing, 'maxAbsDifferenceM': float(np.max(np.abs(errors))),
                        'rmsDifferenceM': float(np.sqrt(np.mean(errors**2))),
                        'p95AbsDifferenceM': float(np.percentile(np.abs(errors), 95)),
                        'note': '625 interior points, not exhaustive. Site/ridge supports are protected; third control is not.'},
        'mobilePerformance': meta['performance'],
    }
    write_json(report_path, report)
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--glb', type=Path, required=True)
    parser.add_argument('--metadata', type=Path, required=True)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    verify(args.glb, args.metadata, args.source, args.report)
