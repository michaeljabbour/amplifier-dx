from pathlib import Path


def test_working_with_ai_doc_exists():
    """Test that docs/13-working-with-ai.md exists."""
    doc_path = Path("docs/13-working-with-ai.md")
    assert doc_path.exists(), "docs/13-working-with-ai.md must exist"


def test_working_with_ai_has_required_sections():
    """Test that the document has all required sections."""
    doc_path = Path("docs/13-working-with-ai.md")
    content = doc_path.read_text()

    # Required sections
    assert "Vibe Coding" in content, "Must have Vibe Coding section"
    assert "Structured" in content, "Must have Structured section"
    assert "When to Use Which" in content or "When to Use" in content, (
        "Must have comparison section"
    )
    assert (
        "Structured Patterns in Amplifier" in content
        or "5-step" in content
        or "workflow" in content
    ), "Must have workflow section"
    assert (
        "Mixing Approaches" in content
        or "discovery" in content
        and "delivery" in content
    ), "Must have mixing approaches section"
    assert "Common Pitfalls" in content or "antipattern" in content.lower(), (
        "Must have pitfalls section"
    )


def test_working_with_ai_has_navigation_footer():
    """Test that the document has Previous/Next navigation footer."""
    doc_path = Path("docs/13-working-with-ai.md")
    content = doc_path.read_text()

    assert "**Previous" in content or "**Previous:" in content, (
        "Must have Previous navigation link"
    )
    assert "**Next" in content or "**Next:" in content, "Must have Next navigation link"


def test_working_with_ai_has_neutral_tone():
    """Test that the tone is neutral - not prescriptive against vibe coding."""
    doc_path = Path("docs/13-working-with-ai.md")
    content = doc_path.read_text()

    # Check for balance - should not contain heavily biased language
    lower_content = content.lower()

    # These would indicate bias against vibe coding
    biased_phrases = [
        "vibe coding is bad",
        "never use vibe coding",
        "always use structured",
        "vibe coding should be avoided",
    ]

    for phrase in biased_phrases:
        assert phrase not in lower_content, (
            f"Document should not contain biased phrase: '{phrase}'"
        )

    # Should present both approaches
    assert "vibe coding" in lower_content, "Should mention vibe coding"
    assert "structured" in lower_content, "Should mention structured approach"


def test_working_with_ai_has_comparison_table():
    """Test that the document includes a comparison table."""
    doc_path = Path("docs/13-working-with-ai.md")
    content = doc_path.read_text()

    # Look for table syntax (markdown tables use | characters)
    assert "|" in content, "Document should contain a table with | characters"
    assert content.count("|") >= 6, "Table should have multiple rows and columns"


def test_working_with_ai_has_three_antipatterns():
    """Test that the document includes at least 3 antipatterns with fixes."""
    doc_path = Path("docs/13-working-with-ai.md")
    content = doc_path.read_text()

    lower_content = content.lower()

    # Should mention at least 3 issues/problems/antipatterns
    # Look for patterns that indicate multiple items
    assert (
        lower_content.count("antipattern") >= 1 or lower_content.count("pitfall") >= 1
    ), "Should have antipatterns or pitfalls section"

    # Should have fixes mentioned
    assert (
        "fix" in lower_content
        or "solution" in lower_content
        or "instead" in lower_content
    ), "Should provide fixes"


def test_working_with_ai_ties_to_amplifier_architecture():
    """Structured Patterns section must explicitly reference core/foundation/app-cli."""
    doc_path = Path("docs/13-working-with-ai.md")
    content = doc_path.read_text()
    lower = content.lower()

    # Must mention all three layers in plain language
    assert "core" in lower, "Must reference amplifier-core concepts"
    assert "foundation" in lower, "Must reference amplifier-foundation concepts"
    assert "app" in lower, "Must reference app-cli / application layer concepts"


def test_working_with_ai_has_zero_vector_attribution():
    """Must include softened Zero-Vector attribution (draws on / aligns with)."""
    doc_path = Path("docs/13-working-with-ai.md")
    content = doc_path.read_text()

    assert "Zero-Vector" in content or "zerovector" in content.lower(), (
        "Must include Zero-Vector attribution"
    )

    # Should use softened language, not exclusivity claims
    lower = content.lower()
    softened = any(
        phrase in lower
        for phrase in ["draws on", "aligns with", "inspired by", "builds on"]
    )
    assert softened, (
        "Zero-Vector attribution must use softened language "
        "(e.g., 'draws on', 'aligns with'), not exclusivity claims"
    )


def test_working_with_ai_nav_footer_no_dead_links():
    """Navigation footer must point to existing docs, no dead links."""
    doc_path = Path("docs/13-working-with-ai.md")
    content = doc_path.read_text()

    # Previous must link to 09-ecosystem-quick-map.md (exists)
    assert "09-ecosystem-quick-map.md" in content, (
        "Previous link must point to 09-ecosystem-quick-map.md"
    )

    # Next should NOT link to nonexistent docs (10, 11, 12, etc.)
    for num in ["10-", "11-", "12-", "14-"]:
        assert f"./{num}" not in content or f"[{num}" not in content, (
            f"Next link must not reference nonexistent doc {num}*"
        )
