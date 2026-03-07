"""
Test for docs/08-architecture-boundaries.md content requirements.

Validates that stale references have been removed and navigation links are correct.
"""

from pathlib import Path


def test_architecture_boundaries_content():
    """Verify architecture boundaries doc has correct content and no stale references."""
    doc_path = Path("docs/08-architecture-boundaries.md")

    # Read the document
    content = doc_path.read_text()

    # Acceptance criteria 1: No "amplifier-desktop" string remains
    assert "amplifier-desktop" not in content, (
        "Document should not contain 'amplifier-desktop' references"
    )

    # Acceptance criteria 2: No "sidecar" string remains
    assert "sidecar" not in content, "Document should not contain 'sidecar' references"

    # Acceptance criteria 3: No "09-module-lifecycle" link remains
    assert "09-module-lifecycle" not in content, (
        "Document should not link to '09-module-lifecycle.md'"
    )

    # Acceptance criteria 4: Next link points to ecosystem-quick-map
    assert "09-ecosystem-quick-map.md" in content, (
        "Document should link to '09-ecosystem-quick-map.md'"
    )

    # Verify the specific line 20 content
    assert "amplifier-app-cli (reference), your-custom-app" in content, (
        "Line 20 should reference 'amplifier-app-cli (reference), your-custom-app'"
    )

    # Verify the generic boundary violation statement
    assert (
        "When boundaries are violated in practice, the result is fragile apps that need costly rework."
        in content
    ), "Document should contain generic boundary violation statement"


if __name__ == "__main__":
    # Allow running this test directly
    test_architecture_boundaries_content()
    print("✓ All tests passed")
