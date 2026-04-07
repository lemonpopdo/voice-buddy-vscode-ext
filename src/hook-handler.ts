/**
 * 从 Claude 的回复中提取任务完成摘要，生成自然播报文本。
 */
function buildCompletionReport(lastMsg: string, styleDef: NonNullable<ReturnType<typeof getStyleDef>>, nickname: string): string {
  if (!lastMsg) {
    return pickTemplate(styleDef.templates.sessionend);
  }

  const text = lastMsg.trim();

  // 提取关键信息
  const fileChanges = extractFileChanges(text);
  const actions = extractActions(text);
  const summary = extractSummary(text);

  // 构建播报内容
  const parts: string[] = [];

  // 人格化前缀（从风格的 stop 模板中取）
  parts.push(substituteNickname(pickTemplate(styleDef.templates.stop), nickname));

  // 文件变更播报
  if (fileChanges.length > 0) {
    const fileList = fileChanges.slice(0, 3).join('和');
    if (fileChanges.length > 3) {
      parts.push(`${fileList}等${fileChanges.length}个文件`);
    } else {
      parts.push(`${fileList}`);
    }
  }

  // 动作播报
  if (actions.length > 0) {
    parts.push(...actions.slice(0, 2));
  }

  // 如果没有提取到有用信息，用摘要
  if (parts.length <= 1 && summary) {
    const shortSummary = summary.slice(0, 50);
    parts.push(shortSummary + (summary.length > 50 ? '...' : ''));
  }

  const result = parts.join('，');
  // 限制长度（中文 TTS 太长听起来不好）
  return result.slice(0, 80);
}

/** 提取文件变更信息 */
function extractFileChanges(text: string): string[] {
  const files: string[] = [];

  // "wrote to /path/to/file" 或 "created file" 或 "updated file"
  const wroteMatches = text.matchAll(/(?:wrote to|updated|created|modified)\s+`?([^`\n]+)`?/gi);
  for (const m of wroteMatches) {
    const f = m[1].split('/').pop() || m[1];
    if (f && !files.includes(f)) { files.push(f); }
  }

  // "X files changed"
  const changedMatch = text.match(/(\d+)\s+file/i);
  if (changedMatch && files.length === 0) {
    const count = parseInt(changedMatch[1]);
    if (count > 0) { return [`${count}个文件`]; }
  }

  return files;
}

/** 提取动作类型 */
function extractActions(text: string): string[] {
  const actions: string[] = [];
  const lower = text.toLowerCase();

  if (lower.includes('fix') || lower.includes('修复') || lower.includes('bug')) {
    actions.push('修好了bug');
  }
  if (lower.includes('implement') || lower.includes('implement') || lower.includes('实现')) {
    actions.push('完成了实现');
  }
  if (lower.includes('test') || lower.includes('测试')) {
    if (lower.includes('pass') || lower.includes('通过')) {
      actions.push('测试通过');
    } else {
      actions.push('测试完成');
    }
  }
  if (lower.includes('commit')) {
    actions.push('已提交');
  }
  if (lower.includes('push')) {
    actions.push('已推送');
  }
  if (lower.includes('refactor') || lower.includes('重构')) {
    actions.push('完成重构');
  }
  if (lower.includes('update') || lower.includes('更新')) {
    actions.push('更新完成');
  }

  return actions;
}

/** 提取简短摘要 */
function extractSummary(text: string): string {
  // 找第一句完整的中文或英文句子
  const lines = text.split('\n').filter(l => l.trim().length > 5);
  for (const line of lines) {
    const trimmed = line.trim();
    // 跳过代码块、文件路径、命令等
    if (trimmed.startsWith('```') || trimmed.startsWith('$') || trimmed.startsWith('/')) { continue; }
    // 取前60个字符
    const sentence = trimmed.slice(0, 60).replace(/[#*`\[\]]/g, '').trim();
    if (sentence.length > 5) { return sentence; }
  }
  return text.slice(0, 60).replace(/[#*`\[\]]/g, '').trim();
}

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

  // Stop → 读取任务完成内容，生成自然语言播报
  if (eventName === 'Stop') {
    if (!isEventEnabled('stop')) { return; }
    const styleDef = getStyleDef(style);
    if (!styleDef) { return; }

    const lastMsg = (data.last_assistant_message as string) || '';
    const msg = buildCompletionReport(lastMsg, styleDef, nickname);
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
