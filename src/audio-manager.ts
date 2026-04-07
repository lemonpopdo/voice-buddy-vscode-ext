/**
 * Audio Manager for Voice Buddy.
 * Handles both pre-baked audio playback and real-time TTS synthesis.
 * Playback: tries Plyr first (desktop), falls back to webview HTTP (code-server).
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { EdgeTTS } from 'node-edge-tts';
import { getStyle, STYLES } from './styles.js';
import { playAudioInWebview } from './audio-server.js';

let extUri: vscode.Uri | undefined;

export function setExtensionUri(uri: vscode.Uri) {
  extUri = uri;
}

function getExtPath(): string {
  if (!extUri) { return ''; }
  return extUri.fsPath;
}

/**
 * Try Plyr first (desktop), then fall back to webview HTTP.
 */
async function _playFile(filePath: string, text: string): Promise<void> {
  try {
    const uri = vscode.Uri.file(filePath);
    await vscode.commands.executeCommand('player.openFile', uri);
    return;  // Plyr succeeded
  } catch {
    // Plyr not available — use webview HTTP playback
  }

  try {
    playAudioInWebview(filePath, text);
  } catch (err) {
    console.warn('[VoiceBuddy] Webview playback failed:', err);
    vscode.window.showWarningMessage(
      'Voice Buddy: No audio player available. Install Plyr extension or ensure webview is open.'
    );
  }
}

/**
 * Play a pre-baked audio file.
 */
export async function playPrebaked(style: string, audioId: string): Promise<void> {
  const extPath = getExtPath();
  if (!extPath) { return; }

  const filePath = path.join(extPath, 'media', 'audio', style, `${audioId}.mp3`);
  if (!fs.existsSync(filePath)) {
    console.warn(`[VoiceBuddy] Pre-baked audio not found: ${filePath}`);
    return;
  }

  await _playFile(filePath, '');
}

/**
 * Synthesize text with edge-tts and play.
 */
export async function synthesizeAndPlay(
  text: string,
  styleId: string,
): Promise<void> {
  const style = getStyle(styleId);
  if (!style) { return; }

  const tmpFile = path.join(os.tmpdir(), `voice-buddy-${Date.now()}.mp3`);

  try {
    const tts = new EdgeTTS({
      voice: style.voice,
      rate: style.rate,
      pitch: style.pitch,
    });
    await tts.ttsPromise(text, tmpFile);
    await _playFile(tmpFile, text);

    // Cleanup after playback starts
    setTimeout(() => {
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
    }, 15_000);
  } catch (err) {
    console.error('[VoiceBuddy] TTS synthesis failed:', err);
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

/**
 * Pick a random template from the given list.
 */
export function pickTemplate(templates: string[]): string {
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Substitute {{nickname}} in text.
 */
export function substituteNickname(text: string, nickname: string): string {
  return text.replace(/\{\{nickname\}\}/g, nickname);
}
