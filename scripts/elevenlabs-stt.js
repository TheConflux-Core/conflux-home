#!/usr/bin/env node
/**
 * ElevenLabs STT via REST API (multipart/form-data)
 * Called by Rust backend: node scripts/elevenlabs-stt.js <wav_path> [api_key]
 *
 * Uses native fetch — no npm package dependency.
 * Returns JSON: { "text": "transcription" }
 * Exits non-zero on error.
 */

import { readFileSync } from 'fs';

const wavPath = process.argv[2];
if (!wavPath) {
  console.error(JSON.stringify({ error: 'Usage: node elevenlabs-stt.js <wav_path> [api_key]' }));
  process.exit(1);
}

const apiKey = process.argv[3] || process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error(JSON.stringify({ error: 'No API key provided' }));
  process.exit(1);
}

let audioBuffer;
try {
  audioBuffer = readFileSync(wavPath);
} catch (e) {
  console.error(JSON.stringify({ error: `File not found: ${wavPath}` }));
  process.exit(1);
}

if (audioBuffer.length === 0) {
  console.error(JSON.stringify({ error: 'Empty audio file' }));
  process.exit(1);
}

// Build multipart/form-data manually
const boundary = '----ElevenLabsBoundary' + Date.now();
const header = Buffer.from(
  `--${boundary}\r\n` +
  `Content-Disposition: form-data; name="file"; filename="audio.wav"\r\n` +
  `Content-Type: audio/wav\r\n\r\n`
);
const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
const body = Buffer.concat([header, audioBuffer, footer]);

fetch('https://api.elevenlabs.io/v1/speech-to-text', {
  method: 'POST',
  headers: {
    'xi-api-key': apiKey,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  },
  body,
}).then(async (response) => {
  if (!response.ok) {
    const status = response.status;
    let message = '';
    try {
      const errJson = await response.json();
      message = errJson.detail || JSON.stringify(errJson);
    } catch {
      message = await response.text() || `HTTP ${status}`;
    }
    console.error(JSON.stringify({ error: message, status }));
    process.exit(1);
  }
  const result = await response.json();
  const text = result.text || '';
  process.stdout.write(JSON.stringify({ text }));
  process.exit(0);
}).catch((err) => {
  console.error(JSON.stringify({ error: err.message || String(err) }));
  process.exit(1);
});
