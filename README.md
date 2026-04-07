# Claude Code Voice Buddy — VSCode Extension

> **CC** — Your personality-driven voice companion for Claude Code in VSCode.

🎙️ Opens Claude Code → "欢迎回来，今天也要加油哦~" (cute-girl)

---

## Features

- **5 personality styles** — cute-girl (中文), elegant-lady (中文), warm-boy (中文), secretary (English), kawaii (日本語)
- **SessionStart / SessionEnd** — Instant pre-recorded audio (<100ms)
- **Notification** — Real-time TTS with nickname substitution
- **Stop / PostToolUse** — AI-generated summaries via TTS
- **Sidebar UI** — Click to switch styles, test voices, configure hooks

---

## Prerequisites

1. **Claude Code VSCode Extension** — Install from [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code)
2. **Plyr Extension** — Install from [Open VSX Registry](https://open-vsx.org/extension/ManyEya/plyr)

---

## Installation

### 1. Install Voice Buddy Extension

**Option A: From source (this repo)**

```bash
git clone https://github.com/lemonpopdo/voice-buddy-vscode-ext.git
cd voice-buddy-vscode-ext
npm install
npm run compile
# Press F5 in VSCode to debug, or:
npx vsce package  # generates .vsix file
```

**Option B: Install .vsix**

Download the latest `.vsix` from GitHub Releases, then:
```
Extensions: Install from VSIX...
```

### 2. Install Plyr Extension

Search **"Plyr"** in VSCode extensions and install the one by ManyEya.

### 3. Configure Hooks

Press `Ctrl+Shift+P` → type **"Voice Buddy: Configure Claude Code Hooks"**

This writes `claude.code.hooks` to your `.vscode/settings.json`:

```json
{
  "claude.code.hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "voiceBuddy.handleHook", "args": [{ "hook_event_name": "SessionStart" }], "timeout": 5000, "async": true }] }],
    "SessionEnd": [{ "hooks": [{ "type": "command", "command": "voiceBuddy.handleHook", "args": [{ "hook_event_name": "SessionEnd" }], "timeout": 5000, "async": true }] }],
    "Notification": [{ "hooks": [{ "type": "command", "command": "voiceBuddy.handleHook", "args": [{ "hook_event_name": "Notification" }], "timeout": 5000, "async": true }] }],
    "Stop": [{ "hooks": [{ "type": "command", "command": "voiceBuddy.handleHook", "args": [{ "hook_event_name": "Stop" }], "timeout": 5000, "async": true }] }]
  }
}
```

### 4. Restart Claude Code

Close and reopen Claude Code in VSCode.

---

## Configuration

### Via Sidebar UI

Click the 🎙️ Voice Buddy icon in the VSCode Activity Bar to:
- Switch between 5 personality styles
- Set your nickname
- Test voice playback
- Configure hooks

### Via VSCode Settings

```
Ctrl+, → search "voiceBuddy"
```

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `voiceBuddy.style` | enum | `cute-girl` | Personality style |
| `voiceBuddy.nickname` | string | `Master` | How CC addresses you |
| `voiceBuddy.enabled` | boolean | `true` | Global on/off |
| `voiceBuddy.events.*` | boolean | varies | Per-event toggles |

### Via Command Palette

- `Voice Buddy: Test Voice` — Play a test message
- `Voice Buddy: Configure Claude Code Hooks` — Auto-config hook settings

---

## Architecture

```
Claude Code Hook Event (claude.code.hooks)
    ↓
Voice Buddy Extension
    ├── hook-handler.ts   → parse hook_event_name
    ├── styles.ts        → lookup templates + TTS config
    └── audio-manager.ts  → pre-baked OR TTS synthesize
                              ↓
                         Plyr Extension (player.openFile)
                              ↓
                         🔊 Audio playback
```

### Audio Sources

| Event | Latency | Source |
|-------|---------|--------|
| SessionStart/End | <100ms | Pre-recorded MP3 |
| Notification | ~1s | Real-time TTS (edge-tts) |
| Stop | ~2s | Real-time TTS |
| PostToolUse | ~1s | Real-time TTS |

---

## Project Structure

```
voice-buddy-vscode-ext/
├── src/
│   ├── extension.ts      # activate/deactivate + commands
│   ├── config.ts       # voiceBuddy.* settings
│   ├── styles.ts       # 5 styles + templates
│   ├── audio-manager.ts # TTS + Plyr playback
│   └── hook-handler.ts # event routing
├── media/
│   ├── audio/          # 60 pre-recorded MP3s
│   └── icon.svg
└── package.json
```

---

## Development

```bash
npm install
npm run compile   # TypeScript → JS
npm run watch    # Watch mode
# Press F5 in VSCode to debug
```

---

## License

MIT
