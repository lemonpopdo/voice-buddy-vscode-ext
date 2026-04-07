/**
 * Configuration management for Voice Buddy.
 * Reads/writes voiceBuddy.* settings from VS Code configuration.
 */

import * as vscode from 'vscode';

export type HookEventName = 'sessionstart' | 'sessionend' | 'notification' | 'stop' | 'posttooluse';

export function getConfig() {
  return vscode.workspace.getConfiguration('voiceBuddy');
}

export function getStyle(): string {
  return getConfig().get<string>('style', 'cute-girl');
}

export function getNickname(): string {
  return getConfig().get<string>('nickname', 'Master');
}

export function isEnabled(): boolean {
  return getConfig().get<boolean>('enabled', true);
}

export function isEventEnabled(event: HookEventName): boolean {
  return getConfig().get<boolean>(`events.${event}`, false);
}

export function setStyle(style: string): Thenable<void> {
  return getConfig().update('style', style, vscode.ConfigurationTarget.Global);
}

export function setNickname(nickname: string): Thenable<void> {
  return getConfig().update('nickname', nickname, vscode.ConfigurationTarget.Global);
}

export function setEnabled(enabled: boolean): Thenable<void> {
  return getConfig().update('enabled', enabled, vscode.ConfigurationTarget.Global);
}
