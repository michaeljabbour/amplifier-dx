"""Task 7 post-audit: dead internal links removed from docs/*.md."""

from pathlib import Path


DEAD_LINKS = [
    "./09-module-resolution.md",
    "./08-asset-model.md",
    "./10-transport-contracts.md",
]

DOC_FILES = sorted(Path("docs").glob("*.md"))


class TestNoDeadLinks:
    """No dead link targets appear anywhere in docs/*.md."""

    def test_no_09_module_resolution_link(self):
        for path in DOC_FILES:
            content = path.read_text()
            assert "./09-module-resolution.md" not in content, (
                f"{path}: dead link ./09-module-resolution.md still present"
            )

    def test_no_08_asset_model_link(self):
        for path in DOC_FILES:
            content = path.read_text()
            assert "./08-asset-model.md" not in content, (
                f"{path}: dead link ./08-asset-model.md still present"
            )

    def test_no_10_transport_contracts_link(self):
        for path in DOC_FILES:
            content = path.read_text()
            assert "./10-transport-contracts.md" not in content, (
                f"{path}: dead link ./10-transport-contracts.md still present"
            )


class TestReplacementLinks:
    """Replacement links are correct and alive."""

    def test_index_entry_9_is_ecosystem_quick_map(self):
        content = Path("docs/00-index.md").read_text()
        assert "./09-ecosystem-quick-map.md" in content, (
            "docs/00-index.md: entry 9 should link to ./09-ecosystem-quick-map.md"
        )
        assert "Ecosystem Quick Map" in content, (
            "docs/00-index.md: entry 9 title should be 'Ecosystem Quick Map'"
        )

    def test_quick_start_uses_06_layers(self):
        content = Path("docs/05-quick-start.md").read_text()
        # The forward reference formerly pointed to ./08-asset-model.md;
        # it should now point to ./06-layers.md instead.
        lines = content.splitlines()
        recipe_lines = [
            ln for ln in lines if "recipe" in ln.lower() and "06-layers" in ln
        ]
        assert recipe_lines, (
            "docs/05-quick-start.md: recipe/bundle reference should use ./06-layers.md"
        )

    def test_ecosystem_quick_map_next_footer_is_index(self):
        content = Path("docs/09-ecosystem-quick-map.md").read_text()
        assert "./10-transport-contracts.md" not in content, (
            "docs/09-ecosystem-quick-map.md: dead next-link still present"
        )
        assert "./00-index.md" in content, (
            "docs/09-ecosystem-quick-map.md: Next footer should return to Index"
        )
        # The footer line should contain the end-of-docs note
        assert "End of current documentation" in content, (
            "docs/09-ecosystem-quick-map.md: footer should say 'End of current documentation'"
        )
