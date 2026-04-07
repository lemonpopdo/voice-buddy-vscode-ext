/**
 * Built-in HTTP audio server for code-server / browser playback.
 * Serves MP3 files via HTTP so the webview can stream and play them.
 * Uses Plyr.js in the webview for playback controls.
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { WebviewView } from 'vscode';

const PORT = 18765;
const players = new Map<number, { res: http.ServerResponse; path: string }>();

let server: http.Server | null = null;
let currentWebviewView: WebviewView | undefined;

export function setWebviewView(view: WebviewView) {
  currentWebviewView = view;
}

export function startServer(): void {
  if (server) { return; }

  server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);

    if (url.pathname === '/play') {
      // Expect a JSON body with { path: "/tmp/voice_buddy_xxx.mp3" }
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const { audioPath } = JSON.parse(body);
          if (!fs.existsSync(audioPath)) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Audio file not found');
            return;
          }
          const stat = fs.statSync(audioPath);
          const data = fs.readFileSync(audioPath);
          res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'Content-Length': stat.size,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
          });
          res.end(data);
          // Cleanup after sending
          try { fs.unlinkSync(audioPath); } catch { /* ignore */ }
        } catch {
          res.writeHead(400);
          res.end('Invalid request');
        }
      });
    } else if (url.pathname === '/status') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(PORT, '127.0.0.1', () => {
    // Server started
  });
}

export function stopServer(): void {
  if (server) {
    server.close();
    server = null;
  }
}

export function getServerUrl(): string {
  return `http://localhost:${PORT}`;
}

/**
 * Play an audio file by serving it via the HTTP server
 * and sending a postMessage to the webview to trigger playback.
 */
export function playAudioInWebview(audioPath: string, text: string): void {
  if (!currentWebviewView) { return; }

  startServer();

  const audioUrl = `${getServerUrl()}/play`;
  const body = JSON.stringify({ audioPath });

  const postData = Buffer.from(body);
  const options = {
    hostname: '127.0.0.1',
    port: PORT,
    path: '/play',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length,
    },
  };

  const req = http.request(options, (res) => {
    // Trigger webview playback
    currentWebviewView!.webview.postMessage({
      type: 'playAudio',
      audioUrl: `${getServerUrl()}/play`,
      text,
    });
  });

  req.write(postData);
  req.end();
}
