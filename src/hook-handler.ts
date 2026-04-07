/**
 * Hook handler for Claude Code events.
 * Receives hook_event_name and triggers the appropriate audio.
 */

import * as vscode from 'vscode';
import { isEnabled, isEventEnabled, getStyle, getNickname } from './config.js';
import { getStyle as getStyleDef } from './styles.js';
import { playPrebaked, synthesizeAndPlay, pickTemplate, substituteNickname } from './audio-manager.js';
import type { HookEventName } from './config.js';

export interface HookEventData {
  hook_event_name: string;
  [key: string]: unknown;
}

const PREBAKED_EVENTS: Record<string, { audioId: (style: string) => string }> = {
  SessionStart: {
    audioId: () => 'sessionstart_01',
  },
  SessionEnd: {
    audioId: () => 'sessionend_01',
  },
};

/**
 * Handle an incoming hook event from Claude Code.
 * Called by the voiceBuddy.handleHook command.
 */
export async function handleHookEvent(data: HookEventData): Promise<void> {
  if (!isEnabled()) { return; }

  const eventName = data.hook_event_name as string;
  const style = getStyle();
  const nickname = getNickname();

  // SessionStart / SessionEnd → pre-baked audio
  if (eventName === 'SessionStart') {
    if (!isEventEnabled('sessionstart')) { return; }
    const audioId = PREBAKED_EVENTS.SessionStart.audioId(style);
    await playPrebaked(style, audioId);
    return;
  }

  if (eventName === 'SessionEnd') {
    if (!isEventEnabled('sessionend')) { return; }
    const audioId = PREBAKED_EVENTS.SessionEnd.audioId(style);
    await playPrebaked(style, audioId);
    return;
  }

  // Notification → TTS with nickname substitution
  if (eventName === 'Notification') {
    if (!isEventEnabled('notification')) { return; }
    const styleDef = getStyleDef(style);
    if (!styleDef) { return; }

    const rawMessage = (data.message as string) || (data.title as string) || '';
    const msg = substituteNickname(rawMessage, nickname) || pickTemplate(styleDef.templates.notification);

    await synthesizeAndPlay(msg, style);
    return;
  }

  // Stop → TTS summary
  if (eventName === 'Stop') {
    if (!isEventEnabled('stop')) { return; }
    const styleDef = getStyleDef(style);
    if (!styleDef) { return; }

    // Extract last assistant message for context
    const lastMsg = (data.last_assistant_message as string) || '';
    const summary = lastMsg.length > 100 ? lastMsg.slice(0, 100) + '...' : lastMsg;

    // Pick a generic completion message or use the summary
    const msg = summary || pickTemplate(['任务完成啦~', '搞定了呢~', '完成咯~']);
    await synthesizeAndPlay(msg, style);
    return;
  }

  // PostToolUse → TTS based on tool output
  if (eventName === 'PostToolUse') {
    if (!isEventEnabled('posttooluse')) { return; }
    const styleDef = getStyleDef(style);
    if (!styleDef) { return; }

    const toolName = (data.tool_name as string) || '';
    const toolOutput = (data.tool_output as string || '').toLowerCase();

    let templates: string[] | undefined;
    if (toolOutput.includes('test passed') || toolOutput.includes('all tests passed') || toolOutput.includes('tests pass')) {
      templates = styleDef.templates.posttooluse['test_passed'];
    } else if (toolOutput.includes('wrote to') || toolOutput.includes('created file') || toolOutput.includes('updated file')) {
      templates = styleDef.templates.posttooluse['file_written'];
    } else if (toolName.toLowerCase().includes('commit') || toolOutput.includes('commit')) {
      templates = styleDef.templates.posttooluse['git_commit'];
    } else if (toolOutput.includes('push')) {
      templates = styleDef.templates.posttooluse['git_push'];
    } else {
      templates = styleDef.templates.posttooluse['default'];
    }

    if (templates && templates.length > 0) {
      const msg = pickTemplate(templates);
      await synthesizeAndPlay(msg, style);
    }
    return;
  }
}
