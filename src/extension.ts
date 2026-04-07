/**
 * Voice Buddy Extension - Entry Point
 *
 * CC: Your personality-driven voice companion for Claude Code (VSCode).
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { setExtensionUri } from './audio-manager.js';
import { handleHookEvent } from './hook-handler.js';
import type { HookEventData } from './hook-handler.js';
import { getStyle, getNickname, setStyle, setNickname, setEnabled } from './config.js';
import { listStyles } from './styles.js';
import { synthesizeAndPlay, pickTemplate } from './audio-manager.js';

let webviewView: VoiceBuddyView | undefined;

export function activate(context: vscode.ExtensionContext) {
  // Store extension URI for audio manager
  setExtensionUri(context.extensionUri);

  // Register the hook handler command
  context.subscriptions.push(
    vscode.commands.registerCommand('voiceBuddy.handleHook', async (data: HookEventData) => {
      await handleHookEvent(data);
    })
  );

  // Register configure hooks command
  context.subscriptions.push(
    vscode.commands.registerCommand('voiceBuddy.configureHooks', async () => {
      await configureClaudeCodeHooks(context);
    })
  );

  // Register test command
  context.subscriptions.push(
    vscode.commands.registerCommand('voiceBuddy.test', async () => {
      const style = getStyle();
      const styleDef = listStyles().find(s => s.id === style);
      if (styleDef) {
        const msg = pickTemplate(styleDef.templates.sessionstart);
        await synthesizeAndPlay(msg, style);
        vscode.window.showInformationMessage(`Voice Buddy: Playing "${msg}"`);
      }
    })
  );

  // Register webview sidebar
  webviewView = new VoiceBuddyView(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('voiceBuddy.view', webviewView, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  // First-run notification
  const firstRun = context.globalState.get<boolean>('voiceBuddy.firstRun', true);
  if (firstRun) {
    context.globalState.update('voiceBuddy.firstRun', false);
    vscode.window.showInformationMessage(
      '🎙️ Voice Buddy installed! Click "Configure Hooks" to enable voice notifications.',
      'Configure Hooks Now'
    ).then(choice => {
      if (choice === 'Configure Hooks Now') {
        void vscode.commands.executeCommand('voiceBuddy.configureHooks');
      }
    });
  }
}

export function deactivate() {}

// ---------------------------------------------------------------------------
// Configure Claude Code hooks
// ---------------------------------------------------------------------------

async function configureClaudeCodeHooks(context: vscode.ExtensionContext): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showWarningMessage(
      'Voice Buddy: Open a project folder first, then run "Configure Claude Code Hooks".'
    );
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const vscodeDir = path.join(rootPath, '.vscode');
  const settingsPath = path.join(vscodeDir, 'settings.json');

  // Build hook config
  const hookConfig = {
    'claude.code.hooks': {
      SessionStart: [
        {
          hooks: [{
            type: 'command',
            command: 'voiceBuddy.handleHook',
            args: [{ hook_event_name: 'SessionStart' }],
            timeout: 5000,
            async: true,
          }],
        },
      ],
      SessionEnd: [
        {
          hooks: [{
            type: 'command',
            command: 'voiceBuddy.handleHook',
            args: [{ hook_event_name: 'SessionEnd' }],
            timeout: 5000,
            async: true,
          }],
        },
      ],
      Notification: [
        {
          hooks: [{
            type: 'command',
            command: 'voiceBuddy.handleHook',
            args: [{ hook_event_name: 'Notification' }],
            timeout: 5000,
            async: true,
          }],
        },
      ],
      Stop: [
        {
          hooks: [{
            type: 'command',
            command: 'voiceBuddy.handleHook',
            args: [{ hook_event_name: 'Stop' }],
            timeout: 5000,
            async: true,
          }],
        },
      ],
      PostToolUse: [
        {
          hooks: [{
            type: 'command',
            command: 'voiceBuddy.handleHook',
            args: [{ hook_event_name: 'PostToolUse' }],
            timeout: 5000,
            async: true,
          }],
        },
      ],
    },
  };

  let existingSettings: Record<string, unknown> = {};
  if (fs.existsSync(settingsPath)) {
    try {
      const raw = fs.readFileSync(settingsPath, 'utf-8');
      existingSettings = JSON.parse(raw);
    } catch {
      existingSettings = {};
    }
  }

  // Merge hooks into existing settings
  const merged = { ...existingSettings, ...hookConfig };

  // Ensure .vscode directory exists
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir, { recursive: true });
  }

  fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2), 'utf-8');

  const relPath = path.relative(rootPath, settingsPath);

  const choice = await vscode.window.showInformationMessage(
    `✅ Voice Buddy hooks configured!\nFile: ${relPath}\n\n⚠️ You also need to install the **Plyr** extension for audio playback:\nSearch "Plyr" in VS Code extensions and install it.`,
    'Open settings.json'
  );

  if (choice === 'Open settings.json') {
    const editor = await vscode.window.showTextDocument(vscode.Uri.file(settingsPath));
    const content = editor.document.getText();
    const hooksIndex = content.indexOf('"claude.code.hooks"');
    if (hooksIndex >= 0) {
      const pos = editor.document.positionAt(hooksIndex);
      editor.selection = new vscode.Selection(pos, pos);
      editor.revealRange(new vscode.Range(pos, pos));
    }
  }
}

// ---------------------------------------------------------------------------
// Webview View Provider
// ---------------------------------------------------------------------------

const STYLE_ICONS: Record<string, string> = {
  'cute-girl': '🌸',
  'elegant-lady': '🌹',
  'warm-boy': '🌿',
  secretary: '📋',
  kawaii: '🎀',
};

class VoiceBuddyView implements vscode.WebviewViewProvider {
  private _webviewView?: vscode.WebviewView;

  constructor(private readonly _context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._webviewView = webviewView;
    webviewView.webview.options = {
      localResourceRoots: [this._context.extensionUri],
      enableScripts: true,
    };
    webviewView.webview.html = this._getHtml();

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === 'setStyle') {
        await setStyle(msg.style);
        this._refresh();
      } else if (msg.type === 'setNickname') {
        await setNickname(msg.nickname);
        this._refresh();
      } else if (msg.type === 'toggleEnabled') {
        await setEnabled(msg.enabled);
        this._refresh();
      } else if (msg.type === 'test') {
        await vscode.commands.executeCommand('voiceBuddy.test');
      } else if (msg.type === 'configureHooks') {
        await vscode.commands.executeCommand('voiceBuddy.configureHooks');
      }
    });

    // Listen for config changes
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('voiceBuddy')) {
        this._refresh();
      }
    });
  }

  private _refresh() {
    if (this._webviewView) {
      this._webviewView.webview.html = this._getHtml();
    }
  }

  private _getHtml(): string {
    const styles = listStyles();
    const currentStyle = getStyle();
    const nickname = getNickname();
    const enabled = vscode.workspace.getConfiguration('voiceBuddy').get<boolean>('enabled', true);

    const styleCards = styles.map(s => {
      const icon = STYLE_ICONS[s.id] || '🎵';
      const selected = s.id === currentStyle ? 'border: 2px solid #4fc3f7; background: #1e3a5f;' : '';
      return `
        <div class="style-card ${s.id === currentStyle ? 'selected' : ''}"
             style="${selected}" data-style="${s.id}">
          <div class="style-icon">${icon}</div>
          <div class="style-name">${s.name}</div>
          <div class="style-voice">${s.voice}</div>
        </div>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { margin: 0; padding: 12px; font-family: system-ui, sans-serif; background: transparent; color: #ccc; }
  .header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
  .logo { font-size: 20px; }
  .title { font-size: 14px; font-weight: 600; }
  .section { margin-bottom: 12px; }
  .section-label { font-size: 11px; color: #888; text-transform: uppercase; margin-bottom: 6px; }
  .style-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .style-card {
    padding: 8px; border-radius: 6px; cursor: pointer;
    background: #2d2d2d; transition: all 0.15s;
  }
  .style-card:hover { background: #3d3d3d; }
  .style-card.selected { background: #1e3a5f; }
  .style-icon { font-size: 18px; }
  .style-name { font-size: 12px; font-weight: 500; margin-top: 2px; }
  .style-voice { font-size: 10px; color: #888; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .input-row { display: flex; gap: 6px; margin-bottom: 8px; }
  .input { flex: 1; padding: 6px 8px; border-radius: 4px; border: 1px solid #444; background: #2d2d2d; color: #ccc; font-size: 12px; }
  .btn { padding: 6px 12px; border-radius: 4px; border: none; cursor: pointer; font-size: 12px; font-weight: 500; }
  .btn-primary { background: #4fc3f7; color: #000; }
  .btn-secondary { background: #2d2d2d; color: #ccc; border: 1px solid #444; }
  .btn:hover { opacity: 0.85; }
  .btn-row { display: flex; gap: 6px; margin-top: 8px; }
  .toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; }
  .toggle-label { font-size: 12px; }
  .disabled-overlay { opacity: 0.5; pointer-events: none; }
  .status { font-size: 11px; color: #888; margin-top: 8px; padding: 6px; background: #1a1a1a; border-radius: 4px; }
</style>
</head>
<body>
  <div class="${enabled ? '' : 'disabled-overlay'}">
    <div class="header">
      <span class="logo">🎙️</span>
      <span class="title">Voice Buddy</span>
    </div>

    <div class="section">
      <div class="section-label">Style</div>
      <div class="style-grid">${styleCards}</div>
    </div>

    <div class="section">
      <div class="section-label">Nickname</div>
      <div class="input-row">
        <input class="input" id="nickname-input" value="${nickname}" placeholder="Nickname...">
        <button class="btn btn-secondary" id="save-nickname-btn">Save</button>
      </div>
    </div>

    <div class="btn-row">
      <button class="btn btn-primary" id="test-btn">▶ Test Voice</button>
      <button class="btn btn-secondary" id="hooks-btn">⚙️ Hooks</button>
    </div>

    <div class="status" id="status">
      Style: ${currentStyle} · Nickname: ${nickname}
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    document.querySelectorAll('.style-card').forEach(card => {
      card.addEventListener('click', () => {
        const style = card.dataset.style;
        vscode.postMessage({ type: 'setStyle', style });
      });
    });

    document.getElementById('save-nickname-btn').addEventListener('click', () => {
      const nickname = document.getElementById('nickname-input').value.trim();
      if (nickname) { vscode.postMessage({ type: 'setNickname', nickname }); }
    });

    document.getElementById('test-btn').addEventListener('click', () => {
      vscode.postMessage({ type: 'test' });
    });

    document.getElementById('hooks-btn').addEventListener('click', () => {
      vscode.postMessage({ type: 'configureHooks' });
    });

    // Update status on message receipt
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'refresh') {
        document.getElementById('status').textContent = msg.status;
      }
    });
  </script>
</body>
</html>`;
  }
}
