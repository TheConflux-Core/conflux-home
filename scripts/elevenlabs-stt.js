#!/usr/bin/env node
/**
 * ElevenLabs STT via @elevenlabs/elevenlabs-js SDK
 * Called by Rust backend as a child process: node scripts/elevenlabs-stt.js <wav_path> [api_key]
 *
 * Returns JSON: { "text": "transcription" }
 * Exits non-zero on error.
 */

import { ElevenLabsClient } from '../node_modules/@elevenlabs/elevenlabs-js/index.js';
import fs from 'fs';

const wavPath = process.argv[2];
if (!wavPath) {
  console.error(JSON.stringify({ error: 'Usage: node elevenlabs-stt.js <wav_path> [api_key]' }));
  process.exit(1);
}

if (!fs.existsSync(wavPath)) {
  console.error(JSON.stringify({ error: `File not found: ${wavPath}` }));
  process.exit(1);
}

// API key: pass as 2nd arg, or fall back to env
const apiKey = process.argv[3] || process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error(JSON.stringify({ error: 'No API key provided' }));
  process.exit(1);
}

const client = new ElevenLabsClient({ apiKey });
const audioBuffer = fs.readFileSync(wavPath);

try {
  const result = await client.speechToText.convert({
    file: {
      data: audioBuffer,
      filename: 'audio.wav',
      contentType: 'audio/wav',
    },
    modelId: 'scribe_v2',
  });

  // All response variants have a 'text' field
  const text = result.text || '';
  process.stdout.write(JSON.stringify({ text, transcriptionId: result.transcriptionId }));
  process.exit(0);
} catch (err) {
  const message = err.message || String(err);
  const status = err.status || 'unknown';
  console.error(JSON.stringify({ error: message, status }));
  process.exit(1);
}
