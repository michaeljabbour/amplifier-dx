from pathlib import Path


def test_document_index_includes_08_09_13_once_without_duplicates():
    lines = Path("context/conceptual-docs-index.txt").read_text().splitlines()

    start = lines.index("DOCUMENT INDEX")
    end = lines.index("READING PATHS BY GOAL")
    document_index = lines[start:end]

    entry_07 = (
        "07-desktop-case-study.md - Real-world embedding example (Amplifier Desktop)"
    )
    entry_08 = "08-architecture-boundaries.md - What belongs where: app, kernel, and module layers"
    entry_09 = "09-ecosystem-quick-map.md - Which repo owns what, dependency direction, change placement"
    entry_13 = "13-working-with-ai.md - Practical guide: vibe coding vs structured AI-assisted development"

    assert entry_08 in document_index
    assert entry_09 in document_index
    assert entry_13 in document_index

    assert lines.count(entry_08) == 1
    assert lines.count(entry_09) == 1
    assert lines.count(entry_13) == 1

    assert document_index.index(entry_07) < document_index.index(entry_08)
    assert document_index.index(entry_08) < document_index.index(entry_09)
    assert document_index.index(entry_09) < document_index.index(entry_13)
