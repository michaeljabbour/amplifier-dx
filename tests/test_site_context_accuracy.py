"""Chat-widget context extraction: substantive, current, and free of historical specs.

Runs scripts/extract-site-context.js against the real index.html into a temp
output dir (CONTEXT_OUTPUT_DIR), so the committed context/site-context.txt is
never touched. Assertions are deliberately loose (headings, stable markers) so
unrelated content edits do not break them.
"""
import os
import re
import subprocess
import tempfile
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="module")
def context_text():
    with tempfile.TemporaryDirectory() as d:
        env = {**os.environ, "CONTEXT_OUTPUT_DIR": d}
        subprocess.run(["node", "scripts/extract-site-context.js"], cwd=ROOT, env=env, check=True, capture_output=True)
        return (Path(d) / "site-context.txt").read_text(encoding="utf-8")


def _section(text: str, title: str) -> str:
    m = re.search(rf"^SECTION: {re.escape(title)}\n=+\n(.*?)(?=^={{60}}\nSECTION: |^={{60}}\nEND OF DOCUMENTATION)", text, re.S | re.M)
    assert m, f"section {title} missing from extracted context"
    return m.group(1)


def _normalize(text: str) -> str:
    return re.sub(r"^Generated: .*$", "Generated: <ts>", text, flags=re.M)


def test_philosophy_has_substantive_content(context_text):
    body = _section(context_text, "PHILOSOPHY")
    assert len(body.split()) > 500
    assert re.search(r"^# Philosophy", body, re.M)
    assert len(re.findall(r"^### ", body, re.M)) >= 5


def test_guides_has_substantive_content(context_text):
    body = _section(context_text, "GUIDES")
    assert len(body.split()) > 500
    assert re.search(r"^## Architecture Boundaries", body, re.M)
    assert len(re.findall(r"^## ", body, re.M)) >= 3


def test_reference_is_present_and_current(context_text):
    body = _section(context_text, "API REFERENCE")
    assert len(body.split()) > 300
    assert "HookResult" in body
    # Profiles and collections no longer exist in Amplifier (CLAUDE.md).
    assert not re.search(r"amplifier profile\b", body)


def test_contribute_is_maintained(context_text):
    body = _section(context_text, "CONTRIBUTE")
    assert len(body.split()) > 300
    assert "Contributors Guide" in body


def test_historical_spec_content_is_absent(context_text):
    specs = ROOT / "specs"
    stems = [
        p.stem
        for sub in ("tools", "collections")
        for p in sorted((specs / sub).glob("*.md"))
    ] if specs.is_dir() else []
    stems = stems or ["tool-swarm", "tool-feature-flag", "collection-enterprise-dev"]
    leaked = [s for s in stems if s in context_text]
    assert not leaked, f"historical spec names leaked into context: {leaked[:5]}"
    assert "AUTO-GENERATED" not in context_text
    assert "amplifier-next-specs" not in context_text


def test_archive_pointer_present(context_text):
    body = _section(context_text, "CONTRIBUTE")
    assert "Specifications" in body
    assert "historical" in body.lower()
    assert "Contribute > Specifications" in body


def test_regeneration_is_stable_apart_from_timestamp(context_text):
    with tempfile.TemporaryDirectory() as d:
        env = {**os.environ, "CONTEXT_OUTPUT_DIR": d}
        subprocess.run(["node", "scripts/extract-site-context.js"], cwd=ROOT, env=env, check=True, capture_output=True)
        again = (Path(d) / "site-context.txt").read_text(encoding="utf-8")
    assert _normalize(again) == _normalize(context_text)


def test_committed_context_matches_regeneration(context_text):
    committed = ROOT / "context" / "site-context.txt"
    assert _normalize(committed.read_text(encoding="utf-8")) == _normalize(context_text), (
        "context/site-context.txt is stale: run node scripts/extract-site-context.js"
    )