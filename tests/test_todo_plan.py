"""Keep TODO.md readable by The Tower: markers, size markers, no duplicates."""

import re
from pathlib import Path

TODO = Path(__file__).resolve().parent.parent / "TODO.md"

# An item line starts with "- [" (any marker); the valid markers are checked below.
ITEM_START = re.compile(r"^\s*-\s+\[")
VALID_ITEM = re.compile(r"^\s*-\s+\[([x~ ])\]\s+\S")
SIZE = re.compile(r"\*Size:\*\s+(S|M|L|XL)\b")


def _items():
    lines = TODO.read_text(encoding="utf-8").splitlines()
    return [line for line in lines if ITEM_START.match(line)]


def test_plan_has_items():
    assert _items(), "TODO.md has no plan items"


def test_every_item_uses_a_known_marker():
    bad = [line for line in _items() if not VALID_ITEM.match(line)]
    assert not bad, f"items without a [x], [~] or [ ] marker and text: {bad}"


def test_open_and_in_progress_items_carry_a_size():
    # Done items in the file do not all carry a size, so only open/partial ones must.
    missing = [
        line
        for line in _items()
        if (m := VALID_ITEM.match(line)) and m.group(1) in "~ " and not SIZE.search(line)
    ]
    assert not missing, f"open or in-progress items without *Size:* S/M/L/XL: {missing}"


def test_no_duplicate_items():
    items = [line.strip() for line in _items()]
    dupes = sorted({line for line in items if items.count(line) > 1})
    assert not dupes, f"duplicated items: {dupes}"
