"""Offline regression test: chat widget model id, saved settings and request body."""
import shutil
import subprocess
from pathlib import Path

import pytest

WIDGET = Path(__file__).resolve().parent.parent / "js" / "chat-widget.js"

HARNESS = r"""
const fs = require('fs');
const vm = require('vm');
function run(stored) {
  const store = {};
  if (stored !== undefined) store['amplifier-chat-settings'] = JSON.stringify(stored);
  const calls = [];
  const el = () => ({ style: {}, classList: { add() {}, remove() {}, contains() { return false; } },
    appendChild() {}, addEventListener() {}, setAttribute() {}, querySelector: () => el(),
    querySelectorAll: () => [], remove() {}, focus() {}, firstChild: null });
  const doc = { readyState: 'loading', addEventListener() {}, createElement: el,
    getElementById: () => el(), querySelector: () => null, querySelectorAll: () => [],
    body: el(), head: el() };
  const ctx = { document: doc, console: { log() {}, warn() {}, error() {} },
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } },
    fetch: async (u, o) => { calls.push({ u, body: JSON.parse(o.body) }); return { ok: false, status: 500, json: async () => ({}) }; },
    window: {}, setTimeout, TextDecoder };
  ctx.window = ctx;
  vm.createContext(ctx);
  let src = fs.readFileSync(process.argv[2], 'utf8');
  src = src.replace("})();\n", "globalThis.__t = { CONFIG, normalizeModel, loadSettings, sendMessage, getSettings: () => settings, setKey: k => { settings.apiKey = k; } };\n})();\n");
  src = src.replace(/function renderMessages\(\) \{/, "function renderMessages() { return;").replace(/function showError\([^)]*\) \{/, "function showError() { return;").replace(/function showTypingIndicator\([^)]*\) \{/, "function showTypingIndicator() { return;");
  vm.runInContext(src, ctx);
  return { t: ctx.__t, calls, store };
}
async function main() {
  const out = {};
  const a = run(); a.t.loadSettings(); out.fresh = a.t.getSettings().model;
  out.config = a.t.CONFIG.models.map(m => m.id); out.def = a.t.CONFIG.defaultModel;
  out.noWindow = a.t.CONFIG.models.every(m => !('contextWindow' in m));
  for (const [k, v] of [['old', 'gpt-5.1'], ['bad', 'nope'], ['num', 5], ['ok', 'gpt-6.2-sol']]) {
    const r = run({ model: v, rememberKey: false }); r.t.loadSettings(); out[k] = r.t.getSettings().model;
  }
  const b = run({ model: 'gpt-5.1' }); b.t.loadSettings(); b.t.setKey('test-key');
  await b.t.sendMessage('hi');
  out.request = b.calls.map(c => ({ u: c.u, keys: Object.keys(c.body).sort(), model: c.body.model }));
  console.log(JSON.stringify(out));
}
main();
"""


@pytest.mark.skipif(shutil.which("node") is None, reason="node not installed")
def test_chat_model_defaults_and_request(tmp_path):
    import json

    h = tmp_path / "h.js"
    h.write_text(HARNESS, encoding="utf-8")
    r = subprocess.run(["node", str(h), str(WIDGET)], capture_output=True, text=True, timeout=30)
    assert r.returncode == 0, r.stderr
    out = json.loads(r.stdout.strip().splitlines()[-1])
    assert out["config"] == ["gpt-6.2-sol"] and out["def"] == "gpt-6.2-sol"
    assert out["noWindow"]
    assert out["fresh"] == out["old"] == out["bad"] == out["num"] == out["ok"] == "gpt-6.2-sol"
    assert out["request"] == [{"u": "https://api.openai.com/v1/chat/completions",
                               "keys": ["messages", "model", "stream"], "model": "gpt-6.2-sol"}]
