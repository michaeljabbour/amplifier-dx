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


# --------------------------------------------------------------------------
# 2. Contrast of the text-on-background pairs the stylesheets use
# --------------------------------------------------------------------------

TEXT = 4.5      # body text
OUTLINE = 3.0   # large text and control outlines (focus ring, selected-tab bar)


def _block(css: str, selector: str) -> str:
    match = re.search(re.escape(selector) + r"\s*\{([^}]*)\}", css)
    assert match, f"css/theme.css has no {selector} block"
    return match.group(1)


def theme_variables():
    """{'dark': {...}, 'light': {...}}; light inherits what it does not override."""
    css = _strip_comments(THEME.read_text(encoding="utf-8"))
    dark = dict(re.findall(r"(--[\w-]+)\s*:\s*([^;]+);", _block(css, ":root")))
    light = dict(dark)
    light.update(re.findall(r"(--[\w-]+)\s*:\s*([^;]+);", _block(css, ':root[data-theme="light"]')))
    return {"dark": dark, "light": light}


def parse_colour(text: str):
    """(r, g, b, alpha) from #rgb, #rrggbb or rgb()/rgba()."""
    text = text.strip()
    if text.startswith("#"):
        h = text[1:]
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 1.0
    match = re.match(r"rgba?\(([^)]*)\)", text)
    assert match, f"cannot read colour {text!r}"
    parts = [p.strip() for p in match.group(1).split(",")]
    alpha = float(parts[3]) if len(parts) == 4 else 1.0
    return int(parts[0]), int(parts[1]), int(parts[2]), alpha


def over(top, base):
    r, g, b, a = top
    return tuple(round(a * t + (1 - a) * u) for t, u in zip((r, g, b), base[:3])) + (1.0,)


def luminance(rgb):
    def channel(c):
        c /= 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (channel(c) for c in rgb[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(fg, bg):
    hi, lo = sorted((luminance(fg), luminance(bg)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def resolve(theme, name):
    value = theme[name]
    ref = re.fullmatch(r"var\((--[\w-]+)\)", value.strip())
    return resolve(theme, ref.group(1)) if ref else parse_colour(value)


# (foreground, background layers bottom-up, threshold, where it is used)
PAIRS = [
    ("--text-0", ["--bg-0"], TEXT, "headings and strong text on the page"),
    ("--text-0", ["--bg-1"], TEXT, "code text in code wells, sidebar headers"),
    ("--text-0", ["--bg-2"], TEXT, "inline code, raised cards"),
    ("--text-0", ["--bg-3"], TEXT, "active controls"),
    ("--text-1", ["--bg-0"], TEXT, "body prose, hero description"),
    ("--text-1", ["--bg-1"], TEXT, "info-box and callout text, nav buttons"),
    ("--text-1", ["--bg-2"], TEXT, "card text"),
    ("--text-2", ["--bg-0"], TEXT, "tabs, figure captions, table heads"),
    ("--text-2", ["--bg-1"], TEXT, "sidebar items, copy button"),
    ("--text-2", ["--bg-2"], TEXT, "secondary lines in cards"),
    ("--text-3", ["--bg-1"], TEXT, "code language label"),
    ("--link", ["--bg-0"], TEXT, "links in prose and tables"),
    ("--link", ["--bg-1"], TEXT, "links in info boxes"),
    ("--accent", ["--bg-0"], TEXT, "link hover, Home path hover"),
    ("--accent", ["--bg-1"], TEXT, "active sidebar sub-item"),
    ("--accent", ["--bg-1", "--tint-teal"], TEXT, "notification repo tag"),
    ("--on-accent", ["--accent"], TEXT, "primary button, notification badge, selection"),
    ("--on-accent", ["--accent-hover"], TEXT, "primary button hover"),
    ("--on-fill", ["--green"], TEXT, "copy button after copying"),
    ("--on-fill", ["--accent"], TEXT, "active notification tab"),
    ("--blue", ["--bg-0"], TEXT, "action and inline code highlights"),
    ("--blue", ["--bg-1"], TEXT, "callout emphasis"),
    ("--blue", ["--bg-2"], TEXT, "concept card code"),
    ("--green", ["--bg-0"], TEXT, "CLI commands, contribution status done"),
    ("--green", ["--bg-2"], TEXT, "event tags"),
    ("--green", ["--bg-0", "--tint-green"], TEXT, "hook labels, example kind tag"),
    ("--green", ["--bg-0", "--tint-green-mid"], TEXT, "update card tag"),
    ("--blue", ["--bg-0", "--tint-blue-strong"], TEXT, "event step icon: start"),
    ("--purple", ["--bg-0", "--tint-purple-strong"], TEXT, "event step icon: provider"),
    ("--orange", ["--bg-0", "--tint-orange-strong"], TEXT, "event step icon: tool"),
    ("--green", ["--bg-0", "--tint-green-strong"], TEXT, "event step icon: end"),
    ("--orange", ["--bg-0"], TEXT, "contribution status needed"),
    ("--text-0", ["--bg-0", "--tint-blue"], TEXT, "context reloaded row, app layer"),
    ("--text-0", ["--bg-0", "--tint-orange"], TEXT, "context not kept row"),
    ("--text-0", ["--bg-0", "--tint-purple"], TEXT, "module layer row"),
    ("--text-1", ["--bg-0", "--tint-red"], TEXT, "danger callout text"),
    ("--red", ["--bg-0", "--tint-red"], TEXT, "danger callout heading"),
    ("--code-comment", ["--bg-1"], TEXT, "code comments"),
    ("--code-keyword", ["--bg-1"], TEXT, "code keywords and decorators"),
    ("--code-string", ["--bg-1"], TEXT, "code strings"),
    ("--code-function", ["--bg-1"], TEXT, "code function names"),
    ("--code-type", ["--bg-1"], TEXT, "code class names and builtins"),
    ("--code-number", ["--bg-1"], TEXT, "code numbers and booleans"),
    ("--code-operator", ["--bg-1"], TEXT, "code operators"),
    ("--code-punctuation", ["--bg-1"], TEXT, "code punctuation"),
    ("--accent", ["--bg-0"], OUTLINE, "focus ring and selected-tab bar on the page"),
    ("--accent", ["--bg-1"], OUTLINE, "focus ring in the sidebar and code wells"),
    ("--accent", ["--bg-2"], OUTLINE, "focus ring on raised cards"),
]

# Dark-theme pairs that are below threshold today. The brief keeps the dark
# palette as it is, so these are left for the Owner; strict xfail makes the
# test fail (and this list shrink) once one is fixed.
DARK_BELOW_THRESHOLD = {
    "dark:--text-3-on---bg-1:text": "code language label, 3.73:1; --text-3 #75716a",
    "dark:--on-fill-on---green:text": "white 'Copied' on green, 2.02:1; --on-fill #ffffff",
    "dark:--on-fill-on---accent:text": "white active notification tab on amber, 2.00:1; --on-fill #ffffff",
    "dark:--code-comment-on---bg-1:text": "code comments, 4.12:1; --code-comment #7d786e",
}


def _pair_id(theme, fg, layers, threshold):
    kind = "text" if threshold == TEXT else "outline"
    return f"{theme}:{fg}-on-{'+'.join(layers)}:{kind}"


def _cases():
    for theme in ("light", "dark"):
        for fg, layers, threshold, where in PAIRS:
            pid = _pair_id(theme, fg, layers, threshold)
            marks = []
            if theme == "dark" and pid in DARK_BELOW_THRESHOLD:
                marks = [pytest.mark.xfail(strict=True, reason=DARK_BELOW_THRESHOLD[pid])]
            yield pytest.param(theme, fg, layers, threshold, where, id=pid, marks=marks)


@pytest.mark.parametrize("theme,fg,layers,threshold,where", list(_cases()))
def test_contrast(theme, fg, layers, threshold, where):
    variables = theme_variables()[theme]
    bg = resolve(variables, layers[0])
    assert bg[3] == 1.0, f"{layers[0]} must be opaque to be a base"
    for layer in layers[1:]:
        bg = over(resolve(variables, layer), bg)
    ratio = contrast(over(resolve(variables, fg), bg), bg)
    assert ratio >= threshold, f"{theme} {fg} on {'+'.join(layers)} ({where}): {ratio:.2f} < {threshold}"


def test_light_block_overrides_only_known_variables():
    themes = theme_variables()
    css = _strip_comments(THEME.read_text(encoding="utf-8"))
    light_only = set(re.findall(r"(--[\w-]+)\s*:", _block(css, ':root[data-theme="light"]')))
    assert set(light_only) <= set(themes["dark"]), "light theme sets a variable the dark theme lacks"


# --------------------------------------------------------------------------
# 3. The dark theme looks exactly as before the audit
#
# css/theme.css is linked after the inline <style> block, so a theme.css
# rule with the same selector wins. Inline declarations it overrides were
# never visible; these checks pin that the override is still there and
# that each new variable's dark value equals the colour that rendered.
# --------------------------------------------------------------------------


def _rule(css: str, selector: str) -> str:
    match = re.search(r"(?:^|\n)" + re.escape(selector) + r"\s*\{([^}]*)\}", css)
    assert match, f"css/theme.css has no {selector} rule"
    return match.group(1)


def test_theme_css_is_linked_after_the_inline_stylesheet():
    html = INDEX.read_text(encoding="utf-8")
    assert html.index("</style>") < html.index('href="css/theme.css"')


# (selector, declaration theme.css must make, what the inline rule used to say)
THEME_OVERRIDES = [
    (".nav", "background: var(--nav-bg)", "rgba(0, 0, 0, 0.8)"),
    (".sidebar-item.active", "background: var(--accent-dim)", "rgba(59, 130, 246, 0.1)"),
    (".examples-tab.active", "background: none", "blue-to-purple gradient"),
    (".examples-tab.active", "color: var(--text-0)", "white"),
    (".callout", "background: var(--bg-1)", "blue-to-green tint gradient"),
]


@pytest.mark.parametrize("selector,declaration,old", THEME_OVERRIDES)
def test_theme_css_overrides_the_old_inline_value(selector, declaration, old):
    css = _strip_comments(THEME.read_text(encoding="utf-8"))
    assert declaration in _rule(css, selector), f"{selector} no longer overrides the old inline {old}"


# Dark values that rendered before the audit (theme.css literals, or inline
# literals theme.css did not override). Each new or moved variable must keep them.
DARK_BEFORE = {
    "--bg-0": "#1a1b1d", "--bg-1": "#151618", "--bg-2": "#232527", "--bg-3": "#2e3033",
    "--bg-hover": "#26282b", "--text-0": "#efeadf", "--text-1": "#cdc8bc",
    "--text-2": "#9b968b", "--text-3": "#75716a", "--border": "#323437",
    "--border-subtle": "#27292c", "--accent": "#f2a93b",
    "--accent-dim": "rgba(242, 169, 59, 0.14)", "--blue": "#7fb0dd", "--green": "#86c49a",
    "--purple": "#b9a2dc", "--orange": "#ea9a62", "--red": "#e2776b",
    "--nav-bg": "rgba(26, 27, 29, 0.92)", "--on-accent": "#1a1b1d", "--on-fill": "#ffffff",
    "--accent-hover": "#ffbd55",
    "--code-comment": "#7d786e", "--code-keyword": "#d7a4d0", "--code-string": "#a9c98b",
    "--code-function": "#8fbbe4", "--code-type": "#e6c583", "--code-number": "#e8a878",
    "--code-operator": "#9bbfc0", "--code-punctuation": "#a8a399",
    "--tint-blue": "rgba(59, 130, 246, 0.1)", "--tint-blue-strong": "rgba(59, 130, 246, 0.2)",
    "--tint-green": "rgba(16, 185, 129, 0.1)", "--tint-green-mid": "rgba(16, 185, 129, 0.15)",
    "--tint-green-strong": "rgba(16, 185, 129, 0.2)", "--tint-purple": "rgba(168, 85, 247, 0.1)",
    "--tint-purple-strong": "rgba(168, 85, 247, 0.2)", "--tint-orange": "rgba(249, 115, 22, 0.1)",
    "--tint-orange-strong": "rgba(249, 115, 22, 0.2)", "--tint-teal": "rgba(16, 163, 127, 0.15)",
    "--tint-red": "rgba(226, 119, 107, 0.1)",
}


@pytest.mark.parametrize("name,before", sorted(DARK_BEFORE.items()))
def test_dark_value_is_unchanged(name, before):
    assert theme_variables()["dark"][name].strip() == before
