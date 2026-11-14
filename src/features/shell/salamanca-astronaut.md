# Salamanca astronaut logo asset

## Provenance

The project integrator explicitly certified that `salamanca-astronaut.png` is the team's own image during the PR #20 follow-up. This records the integrator's confirmation of authorship; it does not assign a separate license to the asset.

## Optimization

The PNG is stored as grayscale with alpha at its original 1225 × 1284 dimensions. Its alpha channel is byte-for-byte identical to the original asset committed in `10185c17ad58f40a0d63aef4c59073c8b8a047b0`; the grayscale channel is constant white.

`AstronautMark` uses only the image's alpha channel: the SVG filter adjusts opacity, floods with the theme's amber color, and composites that color against the adjusted alpha. Removing the unused original RGB colors therefore preserves the logo's rendered appearance, including its silhouette mask. The standalone PNG no longer contains the original colors; the original remains available in Git history.

Optimized with Pillow's lossless PNG encoder (`optimize=True`): 1,026,729 bytes to 319,033 bytes (68.9% smaller). No dimensions, SVG coordinates, or animation behavior were changed.
