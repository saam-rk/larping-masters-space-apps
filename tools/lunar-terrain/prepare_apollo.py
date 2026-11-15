"""Compatibility entry point: Apollo 11 now uses the authorized LROC DTM."""
from pathlib import Path
import runpy

runpy.run_path(str(Path(__file__).with_name("prepare_apollo_lroc.py")), run_name="__main__")
