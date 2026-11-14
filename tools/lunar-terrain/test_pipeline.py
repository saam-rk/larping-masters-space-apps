"""Small synthetic regressions for missing data, centers and triangle sampling."""

import unittest

# pi-lens-ignore: reportMissingImports
import numpy as np

# pi-lens-ignore: reportMissingImports
from affine import Affine
from prepare import bilinear, supported_faces
from verify import mesh_height


class TerrainTests(unittest.TestCase):
    def test_bilinear_pixel_centers(self):
        data = np.array([[1, 3], [5, 7]], dtype=np.float32)
        transform = Affine(5, 0, 100, 0, -5, 200)
        self.assertEqual(bilinear(data, transform, 105, 195), 4)
        self.assertEqual(bilinear(data, transform, 102.5, 197.5), 1)

    def test_nodata_is_not_zero(self):
        data = np.array([[1, np.nan], [5, 7]], dtype=np.float32)
        with self.assertRaisesRegex(ValueError, 'Missing terrain'):
            bilinear(data, Affine(5, 0, 0, 0, -5, 10), 5, 5)

    def test_outside_bilinear_support(self):
        with self.assertRaisesRegex(ValueError, 'outside'):
            bilinear(np.ones((2, 2)), Affine.identity(), 0, 0)

    def test_triangle_must_not_bridge_hidden_nodata(self):
        points = np.array([[0, 0], [4, 0], [0, 4]])
        faces = np.array([[0, 1, 2]])
        valid = np.ones((5, 5), dtype=bool)
        self.assertTrue(supported_faces(points, faces, valid)[0])
        valid[1, 1] = False  # All three triangle vertices remain valid.
        self.assertFalse(supported_faces(points, faces, valid)[0])

    def test_triangle_intersection_and_outside(self):
        positions = np.array([[0, 2, 0], [1, 4, 0], [0, 6, 1]], dtype=float)
        faces = np.array([[0, 1, 2]])
        self.assertEqual(mesh_height(positions, faces, 0.25, 0.25), 3.5)
        self.assertIsNone(mesh_height(positions, faces, 0.9, 0.9))


if __name__ == '__main__':
    unittest.main()
