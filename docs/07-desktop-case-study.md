# Embedding Amplifier: A Case Study

How real applications embed `amplifier-core` in a non-CLI host process. The pattern below
is taken from the apps that actually ship today — primarily
[`amplifierd`](https://github.com/microsoft/amplifierd), the official localhost daemon
that exposes Amplifier sessions over HTTP+SSE — with `session.execute()` and the Foundation
factory pattern as the canonical API surface.

> **Note on the predecessor of this doc.** An earlier version of this file described
> "Amplifier Desktop," a Tauri/React/Python-sidecar app that does not exist in any
> repository, official or community. That doc was aspirational fiction and has been
> replaced. The apps and code patterns below are real, current, and verifiable.

---

## The Embedded Amplifier Pattern

When you embed Amplifier in a host process — daemon, web app, voice agent, IDE plugin —
the pattern is always the same:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            Host process                                   │
│                                                                           │
│   ┌─────────────────────┐                                                │
│   │  Transport surface  │   HTTP / SSE / WebSocket / WebRTC / RPC         │
│   └──────────┬──────────┘                                                │
│              │                                                            │
│   ┌──────────▼──────────┐                                                │
│   │  Session manager    │   Maintains live sessions, routes prompts      │
│   └──────────┬──────────┘                                                │
│              │                                                            │
│   ┌──────────▼──────────────────────────────────────────────────────┐   │
│   │  Foundation factory                                                │   │
│   │  load_bundle() → compose() → prepare() → create_session()         │   │
│   └──────────┬──────────────────────────────────────────────────────┘   │
│              │                                                            │
│   ┌──────────▼──────────┐                                                │
│   │  AmplifierSession   │   Rust-backed kernel + mounted modules        │
│   │  .execute(prompt)   │                                                │
│   └─────────────────────┘                                                │
└──────────────────────────────────────────────────────────────────────────┘
```

The host process owns transport. Amplifier owns the agent loop. They communicate through
a thin Foundation factory that turns a Mount Plan into a live `AmplifierSession`.

---

## Reference Apps That Implement This Pattern

| App | Repo | Transport | What it demonstrates |
|-----|------|-----------|----------------------|
| **amplifierd** | [microsoft/amplifierd](https://github.com/microsoft/amplifierd) | REST + SSE | The canonical daemon: any language can drive sessions over HTTP |
| **amplifier-chat** | [microsoft/amplifier-chat](https://github.com/microsoft/amplifier-chat) | Browser ↔ amplifierd | Browser-based chat UI as a plugin to amplifierd |
| **amplifier-voice** | [microsoft/amplifier-voice](https://github.com/microsoft/amplifier-voice) | WebRTC + OpenAI Realtime | Voice interface as a plugin to amplifierd |
| **amplifier-app-log-viewer** | [microsoft/amplifier-app-log-viewer](https://github.com/microsoft/amplifier-app-log-viewer) | Web (real-time log streaming) | Reads session JSONL event logs, renders interactive JSON |
| **amplifier-app-voice** (community) | [robotdad/amplifier-app-voice](https://github.com/robotdad/amplifier-app-voice) | Native desktop, OpenAI Realtime | The closest thing to a desktop voice assistant in the ecosystem |

The first three together — `amplifierd` plus its `amplifier-chat` and `amplifier-voice`
plugins — are the most complete worked example of the pattern.

---

## The Code Pattern (Foundation Factory)

The authoritative references are the [Foundation examples](https://github.com/microsoft/amplifier-foundation/tree/main/examples)
(`01_hello_world.py` for the minimal embed, `07_full_workflow.py` for the full flow) and
`docs/APPLICATION_INTEGRATION_GUIDE.md` in the same repository. Here is the shape:

```python
# host_app.py — runs inside your daemon, web app, voice agent, IDE plugin, ...
from amplifier_foundation import load_bundle


class HostApp:
    """A long-lived host process that creates Amplifier sessions on demand."""

    async def start(self) -> None:
        # 1. Load the bundle once at startup
        bundle = await load_bundle("./bundles/myapp.md")

        # 2. Compose with a provider bundle. compose() takes Bundle objects, not dicts;
        #    the model is set by config.default_model inside the provider bundle.
        provider = await load_bundle(
            "git+https://github.com/microsoft/amplifier-foundation@main"
            "#subdirectory=providers/anthropic-sonnet.yaml"
        )
        composed = bundle.compose(provider)

        # 3. Prepare — resolves modules, validates the mount plan, downloads cache
        self.prepared = await composed.prepare()

    async def handle_request(self, prompt: str) -> str:
        # 4. Create a fresh session per request (or hold one for a conversation)
        session = await self.prepared.create_session()
        async with session:  # cleans up on exit; there is no session.close()
            # 5. The current API: session.execute()
            return await session.execute(prompt)
```

**API to use today:** `session.execute(prompt)` returns the final response as a string. The
`session.run()` and `session.stream()` calls shown in older material do not exist on the
session; outside `async with`, call `await session.cleanup()` when you are done. For
streaming UIs, register a handler for hook events such as `content_block:delta` with
`session.coordinator.hooks.register(...)` and forward them over your transport.

---

## Transport Choices

Pick the transport that matches your host:

| Transport | When to use | Reference |
|-----------|-------------|-----------|
| **HTTP REST + SSE** | Service-to-service, browser SPA, CLI clients | `amplifierd` |
| **WebSocket** | Bidirectional realtime UIs needing tight tool-call feedback | (custom) |
| **WebRTC** | Voice / video / low-latency interactive | `amplifier-voice` |
| **In-process / library** | Embedding directly in a Python app | Foundation example `01_hello_world.py` |

The kernel does not care which one you choose — your host process maps the transport's
events onto `session.execute()` calls and forwards events emitted by hooks back over the wire.

---

## Capability Injection: How Hosts Extend Sessions

A common embedding need: the host wants modules to push events back through its transport
(e.g. SSE, WebSocket). Modules cannot import from the host (that would violate the
[dependency rules](./09-ecosystem-quick-map.md)). Instead, the host registers a
**capability** on the coordinator and modules look it up:

```python
# Host registers a capability
async def my_broadcast(event: str, data: dict) -> None:
    await sse_stream.publish({"type": event, **data})

session.coordinator.register_capability("broadcast", my_broadcast)

# A hook module looks it up — no import of host code
class MyHook:
    async def __call__(self, event: str, data: dict):
        broadcast = self.coordinator.get_capability("broadcast")
        if broadcast:
            await broadcast(event, data)
```

Same module works in `amplifierd` (SSE), in a hypothetical desktop app (WebSocket), in a
voice agent (WebRTC data channel) — only the capability implementation changes.

Sub-agent delegation relies on the same mechanism. The `delegate` tool needs the host to
register a `session.spawn` capability after `create_session()` and before `execute()`;
without it, delegation silently degrades. The library call behind it is
`PreparedBundle.spawn(child_bundle, instruction, ...)`, and the reference implementation
is `session_spawner.py` in `amplifier-app-cli`.

See [Architecture Boundaries](./08-architecture-boundaries.md) for the boundary tests.

---

## What This Pattern Buys You

- **Swappable transport.** SSE today, WebSocket tomorrow, WebRTC the day after — your
  modules don't change.
- **Swappable bundle.** The same host can serve different bundles for different users
  or different purposes; just `compose()` differently per request.
- **Real session lifecycle.** Hooks fire on `session:start`, `tool:pre`, `tool:post`,
  `llm:request`, `llm:response`, `session:end` regardless of transport.
- **Observability built in.** `hooks-logging` produces the same JSONL event log that
  `amplifier-app-log-viewer` reads — debugging tools work across all hosts.

---

## Read Next

- **[microsoft/amplifierd](https://github.com/microsoft/amplifierd)** — read the daemon's
  README and source for the most complete worked example of this pattern.
- **[Foundation examples](https://github.com/microsoft/amplifier-foundation/tree/main/examples)** —
  `01_hello_world.py` is the minimal embedded session in a Python host; `07_full_workflow.py`
  is the full flow.
- **[Architecture Boundaries](./08-architecture-boundaries.md)** — the boundary tests that
  keep modules portable across host transports.
- **[Ecosystem Quick Map](./09-ecosystem-quick-map.md)** — how the three core repos
  (`amplifier-core`, `amplifier-foundation`, `amplifier-app-cli`) compose.
- **[Current Ecosystem](./12-current-ecosystem.md)** — verified inventory of every app,
  bundle, and module with GitHub links.

---

**Previous:** [Layers of Understanding](./06-layers.md)  
**Next:** [Architecture Boundaries](./08-architecture-boundaries.md)
