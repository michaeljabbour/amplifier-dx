"""
Test for docs/06-layers.md content requirements.

Validates that:
- The stale 'amplifier-config' package name has been removed from the Config Layer block
- The stale 'amplifier-profiles' and 'amplifier-collections' entries are gone
- Config responsibility is correctly attributed to amplifier-foundation (YAML merging +
  bundle parsing) and amplifier-core (module discovery/loader/source contracts)
"""

from pathlib import Path


def test_no_amplifier_config_package():
    """'amplifier-config' is a nonexistent package and must not appear in the doc."""
    content = Path("docs/06-layers.md").read_text()
    assert "amplifier-config" not in content, (
        "Stale package 'amplifier-config' should not appear in docs/06-layers.md. "
        "Config responsibilities belong to amplifier-foundation and amplifier-core."
    )


def test_no_amplifier_profiles_package():
    """'amplifier-profiles' was a stale separate entry; it must not appear."""
    content = Path("docs/06-layers.md").read_text()
    assert "amplifier-profiles" not in content, (
        "Stale package 'amplifier-profiles' should not appear in docs/06-layers.md."
    )


def test_no_amplifier_collections_package():
    """'amplifier-collections' was a stale separate entry; it must not appear."""
    content = Path("docs/06-layers.md").read_text()
    assert "amplifier-collections" not in content, (
        "Stale package 'amplifier-collections' should not appear in docs/06-layers.md."
    )


def test_config_layer_attributes_yaml_merging_to_foundation():
    """amplifier-foundation must own three-tier YAML merging + bundle parsing/composition."""
    content = Path("docs/06-layers.md").read_text()

    assert "amplifier-foundation" in content, (
        "amplifier-foundation must be present in the Config Layer table."
    )

    # Both the package name and the YAML-merging description must appear in
    # close proximity — they live on the same line in the ASCII table.
    lines = content.splitlines()
    foundation_lines = [ln for ln in lines if "amplifier-foundation" in ln]
    assert foundation_lines, "No line containing 'amplifier-foundation' found."

    # The description block spans the foundation line and the continuation line
    # immediately below; grab both for the assertion.
    for i, ln in enumerate(lines):
        if "amplifier-foundation" in ln:
            context_block = ln + ("\n" + lines[i + 1] if i + 1 < len(lines) else "")
            has_yaml = "YAML" in context_block or "yaml" in context_block.lower()
            has_bundle = "bundle" in context_block.lower()
            assert has_yaml, (
                f"amplifier-foundation description must mention YAML merging. Got: {context_block!r}"
            )
            assert has_bundle, (
                f"amplifier-foundation description must mention bundle parsing. Got: {context_block!r}"
            )
            break


def test_config_layer_attributes_module_discovery_to_core():
    """amplifier-core must own module discovery / loader / source contracts."""
    content = Path("docs/06-layers.md").read_text()

    assert "amplifier-core" in content, (
        "amplifier-core must be present in the Config Layer table."
    )

    lines = content.splitlines()
    for ln in lines:
        if "amplifier-core" in ln:
            assert (
                "discovery" in ln.lower()
                or "loader" in ln.lower()
                or "module" in ln.lower()
            ), (
                f"amplifier-core line must reference module discovery/loader. Got: {ln!r}"
            )
            break


if __name__ == "__main__":
    test_no_amplifier_config_package()
    test_no_amplifier_profiles_package()
    test_no_amplifier_collections_package()
    test_config_layer_attributes_yaml_merging_to_foundation()
    test_config_layer_attributes_module_discovery_to_core()
    print("✓ All tests passed")
