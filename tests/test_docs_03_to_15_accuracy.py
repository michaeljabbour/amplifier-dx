"""Regression checks for corrections made in numbered docs 11, 13 and 14."""
from pathlib import Path


def read(name):
    return Path("docs", name).read_text(encoding="utf-8")


def test_doc_13_links_forward_to_doc_14():
    assert "(./14-built-with-amplifier.md)" in read("13-working-with-ai.md").split("**Next:**")[-1]


def test_doc_14_staged_recipe_is_labelled_a_sketch_and_links_the_schema():
    text = read("14-built-with-amplifier.md")
    assert "RECIPE_SCHEMA.md" in text
    assert "not a valid recipe" in text
    assert "../assets/diagrams/bundle-composition.png" not in text


def test_doc_14_does_not_call_merged_pr_279_pending():
    assert "awaiting reviewer" not in read("14-built-with-amplifier.md")


def test_doc_11_does_not_claim_automatic_critic_or_rerouting():
    text = read("11-developing-judgment.md")
    assert "the system will re-route" not in text
    assert "**Critic assessment**" not in text
