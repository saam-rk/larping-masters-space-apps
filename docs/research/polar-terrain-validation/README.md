# Bounded polar-terrain research bundle

Read [the report](../../POLAR_TERRAIN_VALIDATION_REPORT.md) and [source review](../../POLAR_TERRAIN_SOURCE_REVIEW.md) first. This is not application code, an operational service, or a validated landing/shadow predictor.

## Contents

- `validate.py`: live GDAL/Rasterio window reads and PROJ calculations. Attempts 15 local layers, a Site06 patch for six near-field rays, and a regional ridge sample. Logs each failed stage; a completed process alone does **not** mean those reads succeeded. Inspect `failures` and missing outputs.
- `results.json`: observed 2026-11-14 run: two successful small windows and **16 failed stages**, predominantly HTTP 403. No near-field profile completed.
- `Site06-surf.tif`, `Site06-slp.tif`: retained 5 × 5 decoded/re-encoded source windows with CRS, affine transform and nodata. Their hashes, source URLs and source-window offsets are in `results.json`. Not complete source files or original compressed byte ranges.
- `check_offline.py`: no-network checks of retained hashes, values, interpolation, synthetic geometry and projection. The inherited ridge height is explicitly attributed to the old audit, not mislabeled as a fresh extraction.
- `offline-checks.json`: 13 named passing checks, including 200 projection cases, and numerical outputs.
- `requirements.txt`: direct runtime versions used; GDAL/PROJ and Python versions are recorded in `results.json`. Different platforms can ship different library builds.

## Reproduce offline

Use a separate Python 3.11+ virtual environment; do not add these dependencies to the React application. For example, create the environment outside the repository:

```sh
python -m venv /path/to/research-venv
/path/to/research-venv/bin/python -m pip install -r docs/research/polar-terrain-validation/requirements.txt
/path/to/research-venv/bin/python docs/research/polar-terrain-validation/check_offline.py
```

On Windows, use `<venv>/Scripts/python.exe` instead of `bin/python`. This session used `C:/Users/crown/AppData/Local/Temp/lunar-validation-venv/`; that location is not required or guaranteed to persist.

The offline command rewrites `offline-checks.json` deterministically for the retained inputs. An assertion failure must be investigated, not removed to make the test pass. Numerical agreement tolerances are software regression tolerances, not physical accuracy claims.

## Repeat live acquisition

**Use a copy of this directory** to preserve the historical run, because the script rewrites `results.json` and artifacts with fixed names:

```sh
/path/to/research-venv/bin/python /path/to/copied-bundle/validate.py
```

This accesses NASA PGDA over HTTPS, reads bounded raster windows and may transfer tens of megabytes for the near-field patch because the local raster is strip-organized. It uses GDAL read timeouts and one configured retry, not authentication/TLS bypasses. Stop and resolve persistent access errors with the provider or use authorized local copies; do not treat unavailable bytes as zero. A different source version may change results; retain the new metadata and hashes separately.

Even a future successful run would cover only six azimuths through 5 km plus a ridge sample—not the entire original 400 km profile, not full-disk visibility, not a 360° horizon and not the whole polar cap. Its radial refinements are a limited sensitivity experiment, not certified convergence of a continuous skyline. No near-field CSV artifacts were produced in this session.

## Checks observed

- `check_offline.py`: passed 13 named checks, including 200 projection cases.
- Pyright 1.1.414 with `--pythonpath <research-venv>/Scripts/python.exe`: zero errors/warnings after fixes.
- Ruff 0.17.5 selected rules `E4,E7,E9,F,I,UP,C408`: passed.
- The workspace LSP uses a different interpreter. Import-only pi-lens dispositions are recorded locally in the research scripts; the packages were actually installed, imported and checked with the explicit research interpreter. No application configuration or dependencies were changed.
- No application tests/build, browser tests, SPICE calculation, full terrain-profile validation or scientific accuracy certification.

Provider attribution: [NASA GSFC PGDA local LOLA](https://pgda.gsfc.nasa.gov/products/78), [README](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/README), [Barker et al. 2021](https://doi.org/10.1016/j.pss.2020.105119). Retained windows are research evidence with source attribution; publication/redistribution licensing review remains a project release gate.
