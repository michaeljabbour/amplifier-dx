"""Spec tab generation: links must resolve against the pinned source revision."""
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REV = "737dd6dff2f27194f35a44c29bfc100a978e4d53"


def _generate(tmp: Path) -> str:
    shutil.copytree(ROOT / "scripts", tmp / "scripts")
    shutil.copytree(ROOT / "specs", tmp / "specs", ignore=shutil.ignore_patterns(".git"))
    env = {**os.environ, "SPECS_REV": REV}
    subprocess.run(["node", "scripts/transform-specs.js"], cwd=tmp, env=env, check=True)
    return (tmp / "generated-specs.html").read_text(encoding="utf-8")


def test_relative_links_resolve_to_pinned_source_not_site_root():
    with tempfile.TemporaryDirectory() as d:
        html = _generate(Path(d))
        hrefs = re.findall(r'href="([^"]+)"', html)
        assert not [h for h in hrefs if not re.match(r"https?://", h)]
        assert (
            f"https://github.com/samueljklee/amplifier-next-specs/blob/{REV}/tools/tool-swarm.md"
            in hrefs
        )
        assert f"@ {REV}" in html


def test_missing_targets_render_as_text_and_inject_guards_markers():
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        _generate(tmp)
        (tmp / "index.html").write_text("<p>keep</p>\n<!-- AUTO-GENERATED: External Specifications x -->", encoding="utf-8")
        r = subprocess.run(["node", "scripts/inject-specs.js"], cwd=tmp, capture_output=True)
        assert r.returncode != 0
        assert (tmp / "index.html").read_text(encoding="utf-8").endswith("x -->")
