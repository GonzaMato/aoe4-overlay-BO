import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import { emit } from '@tauri-apps/api/event';

test('the overlay receives a native game restart once and ignores focus changes', async t => {
  globalThis.window = { crypto: globalThis.crypto };
  mockIPC(() => {}, { shouldMockEvents: true });
  t.after(() => { clearMocks(); delete globalThis.window; });
  const { onGameReopened } = await import('../src/lib/bridge.ts');
  let restarts = 0;
  const stop = onGameReopened(() => restarts++);
  await emit('game-focus', false);
  await emit('game-focus', true);
  assert.equal(restarts, 0);
  await emit('game-reopened', null);
  assert.equal(restarts, 1);
  stop();
  await Promise.resolve();
  await emit('game-reopened', null);
  assert.equal(restarts, 1);
});
