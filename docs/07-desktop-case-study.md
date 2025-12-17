# Case Study: Amplifier Desktop

This is a real-world example of embedding Amplifier in a desktop application. It demonstrates Layer 4 (Embed) patterns in production.

---

## What Is Amplifier Desktop?

A native desktop AI coding assistant built on:
- **React** frontend for the UI
- **Tauri** (Rust) for the native shell
- **Python sidecar** running amplifier-core
- **WebSocket** for real-time communication

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AMPLIFIER DESKTOP                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     REACT FRONTEND                            │  │
│  │                                                               │  │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │  │
│  │   │ Sidebar │  │  Chat   │  │ Profile │  │Settings │        │  │
│  │   │         │  │Container│  │ Selector│  │  Modal  │        │  │
│  │   └─────────┘  └─────────┘  └─────────┘  └─────────┘        │  │
│  │                      │                                        │  │
│  │                      │ WebSocket                              │  │
│  │                      ▼                                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                         │                                           │
│                         │ Port 9876                                 │
│                         ▼                                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   PYTHON SIDECAR                              │  │
│  │                                                               │  │
│  │   ┌─────────────────────────────────────────────────────┐    │  │
│  │   │              AMPLIFIER-CORE                          │    │  │
│  │   │                                                      │    │  │
│  │   │  Coordinator → Session → Provider/Tools/Hooks        │    │  │
│  │   │                                                      │    │  │
│  │   └─────────────────────────────────────────────────────┘    │  │
│  │                                                               │  │
│  │   + Profile Manager (CRUD for profiles)                       │  │
│  │   + Config Manager (three-tier settings)                      │  │
│  │   + Custom Tools (filesystem, bash, grep, etc.)               │  │
│  │                                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                         │                                           │
│                         │ Managed by                                │
│                         ▼                                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    TAURI (RUST)                               │  │
│  │                                                               │  │
│  │   - Starts/stops sidecar                                      │  │
│  │   - SQLite database (conversations, projects, settings)       │  │
│  │   - Native window management                                   │  │
│  │   - IPC bridge                                                 │  │
│  │                                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Why a Sidecar?

**Decision:** Run amplifier-core in a separate Python process instead of embedding directly.

**Rationale:**
- Python ecosystem has best LLM library support
- Tauri is Rust-native; FFI to Python is complex
- Sidecar can be updated independently
- Crash isolation (sidecar crash doesn't kill app)

**Trade-off:** Extra process overhead (~100MB RAM), but worth it for ecosystem access.

### 2. Why WebSocket?

**Decision:** Frontend communicates with sidecar via WebSocket, not HTTP.

**Rationale:**
- Streaming is natural with WebSocket
- Bidirectional (sidecar can push events)
- Single connection, no per-request overhead
- Real-time token-by-token updates

**Implementation:**
```typescript
// Frontend: hooks/useWebSocket.ts
const ws = new WebSocket('ws://localhost:9876/ws');

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  switch (msg.type) {
    case 'delta':
      appendToCurrentMessage(msg.content);
      break;
    case 'tool_start':
      showToolIndicator(msg.tool_name);
      break;
    case 'done':
      finalizeMessage();
      break;
  }
};
```

### 3. Why Three-Tier Config?

**Decision:** Implement full amplifier config hierarchy (user/project/local).

**Rationale:**
- Users expect their global settings to work
- Teams can share project configs via git
- Local overrides stay out of version control
- Matches CLI behavior exactly

**Implementation:**
```python
# sidecar/config_manager.py
def get_merged_config(project_dir: Path) -> dict:
    user_config = load_yaml(USER_CONFIG_PATH)
    project_config = load_yaml(project_dir / ".amplifier/settings.yaml")
    local_config = load_yaml(project_dir / ".amplifier/settings.local.yaml")

    return deep_merge(user_config, project_config, local_config)
```

---

## Message Flow

### User Sends a Prompt

```
┌─────────────────────────────────────────────────────────────────────┐
│  PROMPT: "Help me fix the bug in auth.py"                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Frontend                                                        │
│     └─ User clicks send                                             │
│     └─ ChatMessage created: {type: "prompt", content: "..."}        │
│     └─ Sent over WebSocket                                          │
│                                                                     │
│  2. Sidecar receives                                                │
│     └─ server.py handles WebSocket message                          │
│     └─ Creates or retrieves Session                                 │
│     └─ Calls session.run(prompt)                                    │
│                                                                     │
│  3. Amplifier-core processes                                        │
│     └─ Orchestrator loop starts                                     │
│     └─ Provider.complete() called                                   │
│     └─ Streaming response begins                                    │
│                                                                     │
│  4. Sidecar streams back                                            │
│     └─ Each token: {type: "delta", content: "I"}                    │
│     └─ Tool use: {type: "tool_start", tool_name: "read_file"}       │
│     └─ Tool done: {type: "tool_end", result: "..."}                 │
│     └─ Final: {type: "done"}                                        │
│                                                                     │
│  5. Frontend updates                                                │
│     └─ delta → append to message                                    │
│     └─ tool_start → show indicator                                  │
│     └─ done → finalize, enable input                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `prompt` | Frontend → Sidecar | User's input |
| `cancel` | Frontend → Sidecar | Stop current generation |
| `delta` | Sidecar → Frontend | Streaming token |
| `thinking` | Sidecar → Frontend | Model is thinking |
| `tool_start` | Sidecar → Frontend | Tool execution beginning |
| `tool_end` | Sidecar → Frontend | Tool execution complete |
| `done` | Sidecar → Frontend | Response complete |
| `error` | Sidecar → Frontend | Error occurred |

---

## Profile Integration

Amplifier Desktop exposes profile management in the UI:

### ProfileSelector Component
```typescript
// Shows dropdown of available profiles
// Groups by scope (user vs project)
// Allows activation/deactivation

<ProfileSelector
  profiles={profiles}
  activeProfile={activeProfile}
  onSelect={handleProfileSelect}
  onCreateNew={openProfileEditor}
/>
```

### Profile API (REST)
```
GET    /api/profiles              # List all profiles
GET    /api/profiles/{name}       # Get profile details
POST   /api/profiles              # Create new profile
PUT    /api/profiles/{name}       # Update profile
DELETE /api/profiles/{name}       # Delete profile
POST   /api/profiles/{name}/activate   # Set as active
```

### Inheritance Visualization
```
┌─────────────────────────────────────────┐
│  Profile: team-coding                   │
├─────────────────────────────────────────┤
│  extends: coding-base                   │
│                                         │
│  Inheritance chain:                     │
│    default                              │
│       └── coding-base                   │
│              └── team-coding ← active   │
│                                         │
│  Effective config:                      │
│    model: claude-opus-4-5-20251101 (from team-coding)       │
│    tools: [filesystem, bash, grep]      │
│           (merged from all levels)      │
│                                         │
└─────────────────────────────────────────┘
```

---

## Custom Tools

Amplifier Desktop ships with custom tools beyond the defaults:

### tool-filesystem
Extended file operations with safety checks:
```python
class FilesystemTool(Tool):
    # read_file, write_file, list_files
    # Built-in path validation
    # Respects .gitignore patterns
```

### tool-bash
Shell execution with streaming output:
```python
class BashTool(Tool):
    # Executes shell commands
    # Streams stdout/stderr in real-time
    # Configurable timeout
    # Working directory awareness
```

### tool-grep
Code search optimized for development:
```python
class GrepTool(Tool):
    # Regex search across files
    # Respects .gitignore
    # Context lines
    # File type filtering
```

---

## Lessons Learned

### What Worked Well

1. **Sidecar architecture** - Clean separation, easy updates
2. **WebSocket streaming** - Great UX, natural for LLMs
3. **Full config hierarchy** - Users trust it works like CLI
4. **Profile inheritance** - Teams love shared base profiles

### What Was Challenging

1. **Sidecar lifecycle** - Starting/stopping reliably on all platforms
2. **Error propagation** - Getting meaningful errors to the UI
3. **State sync** - Keeping frontend and sidecar in sync
4. **Cross-platform builds** - PyInstaller on macOS/Windows/Linux

### Advice for Embedders

1. **Start with the message protocol** - Define your wire format early
2. **Stream everything** - Don't wait for complete responses
3. **Handle disconnects** - WebSocket drops happen; reconnect gracefully
4. **Test with slow models** - UX breaks become obvious
5. **Log everything** - You'll need it for debugging

---

## Code Samples

### Starting the Sidecar (Tauri/Rust)
```rust
// Simplified - actual code handles more edge cases
fn start_sidecar() -> Result<Child> {
    let sidecar_path = get_sidecar_path();

    Command::new(&sidecar_path)
        .arg("--port")
        .arg("9876")
        .spawn()
}
```

### WebSocket Hook (React)
```typescript
// hooks/useWebSocket.ts
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:9876/ws');

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => {
      setIsConnected(false);
      // Reconnect logic here
    };

    wsRef.current = ws;
    return () => ws.close();
  }, []);

  const sendMessage = useCallback((msg: ChatMessage) => {
    wsRef.current?.send(JSON.stringify(msg));
  }, []);

  return { isConnected, sendMessage };
}
```

### Session Handler (Python)
```python
# sidecar/server.py
@app.websocket("/ws")
async def websocket_handler(websocket: WebSocket):
    await websocket.accept()
    session = create_session_from_config()

    async for message in websocket.iter_json():
        if message["type"] == "prompt":
            async for event in session.stream(message["content"]):
                await websocket.send_json(event.to_dict())
```

---

## Resources

- [Amplifier Desktop Repository](https://github.com/your-org/amplifier-desktop)
- [Tauri Documentation](https://tauri.app/docs/)
- [Layer 4: Embed Guide](./06-layers.md#layer-4-embed)

---

**Previous:** [Layers of Understanding](./06-layers.md)
**Next:** [Back to Index →](./00-index.md)
