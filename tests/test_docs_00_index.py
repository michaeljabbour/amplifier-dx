from pathlib import Path


def test_docs_index_has_correct_entries_8_through_13():
    """Test that docs/00-index.md has correct entries 8-13 without dead links."""
    content = Path("docs/00-index.md").read_text()

    # Entry 8 should be Architecture Boundaries, not Asset Model
    assert "08-architecture-boundaries.md" in content, (
        "Entry 8 should link to 08-architecture-boundaries.md"
    )
    assert (
        "What belongs where: app layer, kernel layer, and module layer" in content
        or "What belongs where: app, kernel, and module layer" in content
    ), "Entry 8 should describe architecture boundaries"

    # Dead links should not exist
    assert "08-asset-model.md" not in content, (
        "Dead link 08-asset-model.md should be removed"
    )
    assert "10-transport-contracts.md" not in content, (
        "Dead link 10-transport-contracts.md should be removed"
    )
    assert "11-runtime-ownership.md" not in content, (
        "Dead link 11-runtime-ownership.md should be removed"
    )
    assert "12-testing-matrix.md" not in content, (
        "Dead link 12-testing-matrix.md should be removed"
    )

    # Entry 13 should be Working with AI (pointing to 13-working-with-ai.md)
    assert "13-working-with-ai.md" in content, (
        "Entry 13 should link to 13-working-with-ai.md"
    )
    assert "Working with AI" in content, "Entry should mention Working with AI"
    assert (
        "vibe coding" in content or "structured AI-assisted development" in content
    ), "Entry 13 should describe AI development comparison"

    # Verify entries 9, 12, 13 appear in order (docs 10-12 were added between
    # Ecosystem Quick Map and Working with AI, which is why it is entry 13).
    lines = content.splitlines()
    entry_9_line = None
    entry_12_line = None
    entry_13_line = None

    for i, line in enumerate(lines):
        if line.startswith("9. **[Ecosystem Quick Map](./09-ecosystem-quick-map.md)**"):
            entry_9_line = i
        if line.startswith("12. **[Current Ecosystem](./12-current-ecosystem.md)**"):
            entry_12_line = i
        if line.startswith("13. **[Working with AI]"):
            entry_13_line = i

    assert entry_9_line is not None, "Entry 9 should be Ecosystem Quick Map"
    assert entry_12_line is not None, "Entry 12 (Current Ecosystem) should exist"
    assert entry_13_line is not None, "Entry 13 (Working with AI) should exist"
    assert entry_9_line < entry_12_line < entry_13_line, "Entries should be in order"

    assert "[main docs bundles]" in content, (
        "Reading path text should be '[main docs bundles]'"
    )
    assert "[main docs profiles]" not in content, (
        "Stale '[main docs profiles]' text should not remain in docs"
    )
