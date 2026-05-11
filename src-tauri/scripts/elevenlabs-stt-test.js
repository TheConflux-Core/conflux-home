#!/usr/bin/env node
/**
 * ElevenLabs STT Test Script
 * Uses @elevenlabs/elevenlabs-js SDK — the official approach
 * 
 * Usage:
 *   ELEVENLABS_API_KEY=xxx node scripts/elevenlabs-stt-test.js <audio_file.wav>
 * 
 * If no audio file is provided, creates a 1-second silent test WAV and tests with it.
 */

import { ElevenLabsClient } from '../node_modules/@elevenlabs/elevenlabs-js/index.js';
import fs from 'fs';
import path from 'path';

// ── Get API Key ──────────────────────────────────────────────────────────────
const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error('❌ ELEVENLABS_API_KEY not set');
  process.exit(1);
}

// ── Get Audio File ──────────────────────────────────────────────────────────
let audioPath = process.argv[2];
let audioBuffer;

if (audioPath) {
  if (!fs.existsSync(audioPath)) {
    console.error(`❌ File not found: ${audioPath}`);
    process.exit(1);
  }
  audioBuffer = fs.readFileSync(audioPath);
  console.log(`📁 Loaded audio from: ${audioPath} (${audioBuffer.length} bytes)`);
} else {
  // Create a valid test WAV with a sine wave tone (more reliable than silence)
  console.log('🎙️  No audio file — creating 3-second 440Hz sine wave test WAV...');
  audioBuffer = createSineWaveWav(16000, 3, 440);
  audioPath = '(generated sine wave WAV)';
}

// ── Test TTS First (verify API key is valid) ─────────────────────────────────
async function testTTS(client, text) {
  console.log('\n🔊 Testing TTS...');
  try {
    const audio = await client.textToSpeech.convert('JBFqnCBsd6RMkjVDRZzb', {
      text,
      modelId: 'eleven_turbo_v2_5',
    });
    
    // Collect chunks
    const chunks = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    console.log(`✅ TTS OK — generated ${buffer.length} bytes of audio`);
    return true;
  } catch (err) {
    console.error(`❌ TTS failed: ${err.message || err}`);
    return false;
  }
}

// ── Test STT ─────────────────────────────────────────────────────────────────
async function testSTT(client, audioBuffer) {
  console.log('\n🎙️  Testing ElevenLabs Speech-to-Text...');
  try {
    const result = await client.speechToText.convert({
      file: {
        data: audioBuffer,
        filename: 'test.wav',
        contentType: 'audio/wav',
      },
      modelId: 'scribe_v2',
    });

    // result is SpeechToTextChunkResponseModel | MultichannelSpeechToTextResponseModel
    console.log('✅ STT OK — response:', JSON.stringify(result, null, 2));
    return result;
  } catch (err) {
    console.error(`❌ STT failed: ${err.message || err}`);
    if (err.status === 401) console.error('   → Invalid API key');
    if (err.status === 403) console.error('   → Access forbidden (batch STT may require paid plan)');
    if (err.status === 422) console.error('   → Invalid parameters (check model_id)');
    return null;
  }
}

// ── WAV Generator ────────────────────────────────────────────────────────────
function createSilentWav(sampleRate, durationSecs) {
  const numSamples = sampleRate * durationSecs;
  const dataSize = numSamples * 2; // 16-bit
  const fileSize = 36 + dataSize;

  const buf = Buffer.alloc(44 + dataSize);
  let offset = 0;

  // RIFF header
  buf.write('RIFF', offset); offset += 4;
  buf.writeUInt32LE(fileSize, offset); offset += 4;
  buf.write('WAVE', offset); offset += 4;

  // fmt chunk
  buf.write('fmt ', offset); offset += 4;
  buf.writeUInt32LE(16, offset); offset += 4;       // chunk size
  buf.writeUInt16LE(1, offset); offset += 2;         // PCM format
  buf.writeUInt16LE(1, offset); offset += 2;         // mono
  buf.writeUInt32LE(sampleRate, offset); offset += 4;
  buf.writeUInt32LE(sampleRate * 2, offset); offset += 4; // byte rate
  buf.writeUInt16LE(2, offset); offset += 2;         // block align
  buf.writeUInt16LE(16, offset); offset += 2;        // bits per sample

  // data chunk
  buf.write('data', offset); offset += 4;
  buf.writeUInt32LE(dataSize, offset); offset += 4;

  // Silent audio (zeros — 16-bit little-endian)
  for (let i = 0; i < numSamples; i++) {
    buf.writeInt16LE(0, offset); offset += 2;
  }

  return buf;
}

// ── Generate a valid sine wave test tone ────────────────────────────────────
function createSineWaveWav(sampleRate, durationSecs, frequency = 440) {
  const numSamples = sampleRate * durationSecs;
  const dataSize = numSamples * 2; // 16-bit
  const fileSize = 36 + dataSize;

  const buf = Buffer.alloc(44 + dataSize);
  let offset = 0;

  // RIFF header
  buf.write('RIFF', offset); offset += 4;
  buf.writeUInt32LE(fileSize, offset); offset += 4;
  buf.write('WAVE', offset); offset += 4;

  // fmt chunk
  buf.write('fmt ', offset); offset += 4;
  buf.writeUInt32LE(16, offset); offset += 4;
  buf.writeUInt16LE(1, offset); offset += 2;
  buf.writeUInt16LE(1, offset); offset += 2;
  buf.writeUInt32LE(sampleRate, offset); offset += 4;
  buf.writeUInt32LE(sampleRate * 2, offset); offset += 4;
  buf.writeUInt16LE(2, offset); offset += 2;
  buf.writeUInt16LE(16, offset); offset += 2;

  // data chunk
  buf.write('data', offset); offset += 4;
  buf.writeUInt32LE(dataSize, offset); offset += 4;

  // Sine wave at ~30% amplitude
  const amplitude = 0.3 * 32767;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.round(amplitude * Math.sin(2 * Math.PI * frequency * t));
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), offset);
    offset += 2;
  }

  return buf;
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  const client = new ElevenLabsClient({ apiKey });

  // Step 1: Verify key with TTS
  const ttsOk = await testTTS(client, 'Hello, this is a test of the ElevenLabs API.');
  if (!ttsOk) {
    console.error('\n⚠️  TTS failed — API key may be invalid. Fix API key before testing STT.');
    process.exit(1);
  }

  // Step 2: Test STT
  const sttResult = await testSTT(client, audioBuffer);
  
  if (sttResult) {
    console.log('\n🎉 ELEVENTHREE LABS STT/TTS FULLY OPERATIONAL');
    process.exit(0);
  } else {
    console.log('\n💥 STT failed but TTS worked — check plan limits');
    process.exit(1);
  }
})();
