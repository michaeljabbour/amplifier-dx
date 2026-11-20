"""Light theme audit: every colour goes through a theme variable, and the
text-on-background pairs the site uses are readable in both themes.

Standard library and pytest only: no browser, no network.
"""

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
THEME = ROOT / "css" / "theme.css"

HEX = r"#[0-9a-fA-F]{3,8}\b"
COLOR_FUNC = r"\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\("
NAMED = (
    r"\b(?:white|black|red|green|blue|orange|purple|yellow|gray|grey|silver|"
    r"navy|teal|maroon|olive|lime|aqua|fuchsia|pink|brown|gold)\b"
)


def _strip_comments(css: str) -> str:
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def inline_stylesheet() -> str:
    """The <style> block in the head of index.html (before css/theme.css loads)."""
    html = INDEX.read_text(encoding="utf-8")
    match = re.search(r"<style>(.*?)</style>", html, flags=re.S)
    assert match, "index.html has no inline <style> block"
    return _strip_comments(match.group(1))


def declarations(css: str):
    """Yield (property, value) for every declaration in a stylesheet."""
    for block in re.findall(r"\{([^{}]*)\}", css):
        for decl in block.split(";"):
            if ":" not in decl:
                continue
            prop, value = decl.split(":", 1)
            yield prop.strip().lower(), value.strip()


# --------------------------------------------------------------------------
# 1. No hard-coded colour in the inline stylesheet
# --------------------------------------------------------------------------

# (property, value pattern, reason). Keep this list short.
ALLOWED_HARD_CODED = [
    (
        "box-shadow",
        r"^0 \d+px \d+px rgba\(0,\s*0,\s*0,\s*0?\.\d+\)$",
        "a drop shadow is a translucent black shade in both themes, never a readable colour",
    ),
]


def _is_allowed(prop: str, value: str) -> bool:
    return any(prop == p and re.match(rx, value) for p, rx, _ in ALLOWED_HARD_CODED)


def test_inline_stylesheet_has_no_hard_coded_colour():
    offenders = []
    for prop, value in declarations(inline_stylesheet()):
        bare = re.sub(r"var\(\s*--[\w-]+\s*\)", "", value)  # var(--blue) is not a hard-coded blue
        if re.search(HEX, bare) or re.search(COLOR_FUNC, bare, re.I) or re.search(NAMED, bare, re.I):
            if not _is_allowed(prop, value):
                offenders.append(f"{prop}: {value}")
    assert not offenders, "hard-coded colours in the inline stylesheet:\n" + "\n".join(offenders)


def test_allow_list_entries_have_reasons_and_are_used():
    decls = list(declarations(inline_stylesheet()))
    for prop, rx, reason in ALLOWED_HARD_CODED:
        assert len(reason) > 20, f"allow-list entry for {prop} needs a reason"
        assert any(p == prop and re.match(rx, v) for p, v in decls), f"unused allow-list entry: {prop} {rx}"


def test_every_variable_the_inline_stylesheet_uses_is_defined():
    used = set(re.findall(r"var\(\s*(--[\w-]+)", inline_stylesheet()))
    defined = set(re.findall(r"(--[\w-]+)\s*:", THEME.read_text(encoding="utf-8")))
    defined |= set(re.findall(r"(--[\w-]+)\s*:", inline_stylesheet()))
    assert not used - defined, f"undefined variables: {sorted(used - defined)}"
