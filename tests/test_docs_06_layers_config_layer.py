"""Tests for Config Layer responsibilities in docs/06-layers.md."""

import re
from pathlib import Path


def test_config_layer_package_and_responsibilities_are_current():
    """Config Layer should not mention stale package names and should assign responsibilities correctly."""
    content = Path("docs/06-layers.md").read_text()

    assert "amplifier-config" not in content, (
        "docs/06-layers.md should not contain the stale 'amplifier-config' package name"
    )

    assert re.search(
        r"amplifier-foundation\s+Three-tier YAML merging, bundle parsing,[^\n]*\n"
        r"[^\n]*inheritance, composition",
        content,
    ), (
        "amplifier-foundation should include YAML merging and bundle parsing responsibilities"
    )
