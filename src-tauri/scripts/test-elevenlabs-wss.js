#!/usr/bin/env node
/**
 * Test ElevenLabs realtime STT WebSocket with raw PCM audio.
 * Mirrors exactly what the Rust code does so we can isolate any API issues.
 * 
 * Usage: node scripts/test-elevenlabs-wss.js [api_key]
 */

import WebSocket from 'ws';
import https from 'https';
import { readFileSync } from 'fs';

const API_KEY = process.argv[2] || process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error('Error: No API key provided. Set ELEVENLABS_API_KEY env var or pass as first argument.');
  console.error('Usage: node scripts/test-elevenlabs-wss.js [api_key]');
  process.exit(1);
}
const MODEL_ID = 'scribe_v2_realtime';

// Step 1: Get single-use token
async function getToken() {
  return new Promise((resolve, reject) => {
    const data = '';
    const options = {
      hostname: 'api.elevenlabs.io',
      path: '/v1/single-use-token/realtime_scribe',
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Length': Buffer.byteLength(data),
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(body);
            resolve(json.token);
          } catch(e) {
            reject(new Error(`Failed to parse token response: ${body}`));
          }
        } else {
          reject(new Error(`Token request failed (${res.statusCode}): ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Generate test PCM audio: 1 second of 1kHz sine wave at 16kHz mono
function generateTestTone(durationSecs = 1, sampleRate = 16000, frequency = 1000) {
  const numSamples = Math.floor(sampleRate * durationSecs);
  const samples = [];
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const value = Math.sin(2 * Math.PI * frequency * t);
    // Convert to 16-bit signed integer
    samples.push(Math.max(-32768, Math.min(32767, Math.round(value * 32767))));
  }
  return samples;
}

// Encode PCM samples as base64 (raw PCM, not WAV)
function encodeRawPCM(samples) {
  const buffer = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(samples[i], i * 2);
  }
  return buffer.toString('base64');
}

async function main() {
  console.log('=== ElevenLabs Realtime STT WSS Test ===\n');

  // Get token
  console.log('1. Getting single-use token...');
  const token = await getToken();
  console.log(`   Token: ${token.slice(0, 12)}...\n`);

  // Build WSS URL
  const url = `wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=${MODEL_ID}&audio_format=pcm_16000&commit_strategy=vad&token=${token}`;
  console.log(`2. Connecting to WSS...\n   URL: wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=${MODEL_ID}&audio_format=pcm_16000&commit_strategy=vad&token=***\n`);

  const ws = new WebSocket(url);

  let transcriptsReceived = 0;
  let audioSent = false;

  ws.on('open', () => {
    console.log('3. WSS connected! Waiting for session_started...\n');
  });

  ws.on('message', (data) => {
    const text = data.toString();
    let json;
    try {
      json = JSON.parse(text);
    } catch(e) {
      console.log('   [BINARY or unparseable]', data.length, 'bytes');
      return;
    }

    const msgType = json.message_type || json.type;

    if (msgType === 'session_started') {
      console.log('   ✓ session_started received');
      console.log('   Config:', JSON.stringify(json.config, null, 2).split('\n').slice(0, 5).join('\n'));
      console.log('\n4. Sending 1 second of 1kHz tone as PCM audio...\n');

      // Send test audio
      const samples = generateTestTone(1.0);
      const audioB64 = encodeRawPCM(samples);
      const payload = JSON.stringify({
        message_type: 'input_audio_chunk',
        audio_base_64: audioB64
      });

      ws.send(payload);
      audioSent = true;
      console.log(`   Sent ${samples.length} PCM samples (${payload.length} chars)\n`);
      console.log('5. Waiting for transcript (5s)...\n');

      // Give ElevenLabs 5 seconds to respond
      setTimeout(() => {
        if (transcriptsReceived === 0) {
          console.log('   ✗ No transcript received in 5 seconds.');
          console.log('   This confirms: ElevenLabs WSS receives audio but does NOT return partial/final transcript.\n');
        }
        ws.close();
        process.exit(transcriptsReceived > 0 ? 0 : 1);
      }, 5000);

    } else if (msgType === 'partial_transcript') {
      transcriptsReceived++;
      console.log(`   ✓ partial_transcript: "${json.text}"`);

    } else if (msgType === 'committed_transcript' || msgType === 'committed_transcript_with_timestamps') {
      transcriptsReceived++;
      console.log(`   ✓ committed_transcript: "${json.text}"`);
      ws.close();
      process.exit(0);

    } else if (msgType === 'error' || msgType === 'auth_error' || msgType === 'quota_exceeded') {
      console.log(`   ✗ ElevenLabs error (${msgType}):`, json.error || json.message);
      ws.close();
      process.exit(1);

    } else if (msgType === 'rate_limited' || msgType === 'throttled') {
      console.log(`   ! Rate limited:`, text.slice(0, 200));

    } else {
      console.log(`   [${msgType}]:`, text.slice(0, 200));
    }
  });

  ws.on('error', (err) => {
    console.log(`   WSS error: ${err.message}`);
  });

  ws.on('close', (code, reason) => {
    console.log(`\n   WSS closed (code=${code}, reason=${reason ? reason.toString() : 'none'})`);
    console.log(`   Transcripts received: ${transcriptsReceived}`);
    process.exit(transcriptsReceived > 0 ? 0 : 1);
  });

  // Timeout
  setTimeout(() => {
    console.log('\nWSS connection timeout (30s)');
    ws.close();
    process.exit(1);
  }, 30000);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});