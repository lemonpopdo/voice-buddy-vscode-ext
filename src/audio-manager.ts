/**
 * Audio Manager for Voice Buddy.
 * Handles both pre-baked audio playback (via Plyr) and real-time TTS synthesis.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { EdgeTTS } from 'node-edge-tts';
import { getStyle, STYLES } from './styles.js';

let extUri: vscode.Uri | undefined;

export function setExtensionUri(uri: vscode.Uri) {
  extUri = uri;
}

function getExtPath(): string {
  if (!extUri) { return ''; }
  return extUri.fsPath;
}

/**
 * Play a pre-baked audio file via Plyr's player.openFile command.
 */
export async function playPrebaked(style: string, audioId: string): Promise<void> {
  const extPath = getExtPath();
  if (!extPath) { return; }

  const filePath = path.join(extPath, 'media', 'audio', style, `${audioId}.mp3`);
  if (!fs.existsSync(filePath)) {
    console.warn(`[VoiceBuddy] Pre-baked audio not found: ${filePath}`);
    return;
  }

  try {
    const uri = vscode.Uri.file(filePath);
    await vscode.commands.executeCommand('player.openFile', uri);
  } catch (err) {
    // Plyr may not be installed
    console.warn('[VoiceBuddy] Plyr not found or player.openFile failed:', err);
    vscode.window.showWarningMessage(
      'Voice Buddy: Plyr extension is required for audio playback. Install it from Open VSX Registry.'
    );
  }
}

/**
 * Synthesize text with edge-tts and play via Plyr.
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

    const uri = vscode.Uri.file(tmpFile);
    await vscode.commands.executeCommand('player.openFile', uri);

    // Cleanup after playback starts (give it 10s to load into Plyr)
    setTimeout(() => {
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
    }, 10_000);
  } catch (err) {
    console.error('[VoiceBuddy] TTS synthesis failed:', err);
    // Cleanup on error
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
