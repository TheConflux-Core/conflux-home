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

console.error(JSON.stringify({ info: `Sending ${audioBuffer.length} bytes to ElevenLabs` }));

// Build multipart/form-data — model_id is required by ElevenLabs API
const boundary = '----ElevenLabsBoundary' + Date.now();

const parts = [];
parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n`));
parts.push(audioBuffer);
parts.push(Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="model_id"\r\n\r\nscribe_v2`));
parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

const body = Buffer.concat(parts);

const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
  method: 'POST',
  headers: {
    'xi-api-key': apiKey,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  },
  body,
});

const status = response.status;
const responseText = await response.text();

if (!response.ok) {
  let errMsg = `HTTP ${status}`;
  try {
    const errJson = JSON.parse(responseText);
    errMsg = errJson.detail || errJson.message || JSON.stringify(errJson);
  } catch {
    errMsg = responseText || `HTTP ${status}`;
  }
  console.error(JSON.stringify({ error: errMsg, status }));
  process.exit(1);
}

try {
  const result = JSON.parse(responseText);
  let text = '';
  if (result.text) {
    text = result.text;
  } else if (result.transcripts && Array.isArray(result.transcripts)) {
    text = result.transcripts.map(t => t.text || '').filter(Boolean).join(' ');
  }
  process.stdout.write(JSON.stringify({ text }));
  process.exit(0);
} catch (e) {
  console.error(JSON.stringify({ error: `Failed to parse response: ${e.message}`, body: responseText.slice(0, 200) }));
  process.exit(1);
}
