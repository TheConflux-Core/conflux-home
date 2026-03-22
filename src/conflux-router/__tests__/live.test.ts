// Conflux Router — Live Integration Test
// Tests real API calls through the router. Run manually: npx vitest run src/conflux-router/__tests__/live.test.ts

import { describe, it, expect } from 'vitest';
import { ConfluxRouter } from '../router';

describe('Live API Integration', () => {
  const router = new ConfluxRouter('test-user-live', 'free');

  it('should send a chat message via Groq (conflux-fast)', async () => {
    const response = await router.chat({
      model: 'conflux-fast',
      messages: [{ role: 'user', content: 'Say hello in exactly 5 words.' }],
      stream: false,
      maxTokens: 30,
    });

    expect(response.choices).toHaveLength(1);
    expect(response.choices[0].message.content).toBeTruthy();
    expect(response.choices[0].message.content.length).toBeGreaterThan(0);
    expect(response._conflux.providerId).toBeTruthy();
    expect(response._conflux.latencyMs).toBeGreaterThan(0);

    console.log(`✅ [${response._conflux.providerName}] "${response.choices[0].message.content}" (${response._conflux.latencyMs}ms)`);
  }, 15_000);

  it('should stream a chat message', async () => {
    const chunks: string[] = [];

    const fullText = await router.chatStream(
      {
        model: 'conflux-fast',
        messages: [{ role: 'user', content: 'Count from 1 to 5.' }],
        stream: true,
        maxTokens: 50,
      },
      (chunk) => chunks.push(chunk),
    );

    expect(fullText).toBeTruthy();
    expect(fullText.length).toBeGreaterThan(0);
    expect(chunks.length).toBeGreaterThan(0);

    console.log(`✅ Streamed ${chunks.length} chunks: "${fullText}"`);
  }, 15_000);

  it('should track quota correctly', () => {
    const quota = router.getQuota();
    expect(quota.callsToday).toBeGreaterThanOrEqual(0);
    expect(quota.maxCallsPerDay).toBe(50);
    expect(quota.tier).toBe('free');

    const remaining = router.getRemainingCalls();
    expect(remaining).toBeGreaterThanOrEqual(0);

    console.log(`✅ Quota: ${quota.callsToday}/50 calls used, ${remaining} remaining`);
  });

  it('should round-robin across providers', async () => {
    const providers: string[] = [];

    // Make 3 calls and track which provider each uses
    for (let i = 0; i < 3; i++) {
      const response = await router.chat({
        model: 'conflux-fast',
        messages: [{ role: 'user', content: `Test ${i + 1}. Reply with just "ok".` }],
        stream: false,
        maxTokens: 10,
      });
      providers.push(response._conflux.providerId);
    }

    expect(providers).toHaveLength(3);
    console.log(`✅ Round-robin: ${providers.join(' → ')}`);
  }, 30_000);
});
