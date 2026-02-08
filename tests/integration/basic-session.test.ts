/**
 * Integration test for basic Claude Code session
 * NOTE: Requires Claude Code to be installed and authenticated
 */

import { ClaudeCodeRuntime } from '../../src/runtime/ClaudeCodeRuntime';
import { wolverineConfig } from '../../src/config/wolverine-config';

describe('Basic Session Integration', () => {
  let runtime: ClaudeCodeRuntime;

  beforeAll(async () => {
    runtime = new ClaudeCodeRuntime({
      agent: {
        ...wolverineConfig,
        workspace: '/tmp/wolverine-test',
      },
    });

    // Check if Claude Code is available
    const availability = await runtime.checkAvailability();
    if (!availability.available) {
      console.warn('⚠️  Claude Code not available, skipping integration tests');
      console.warn('   Error:', availability.error);
    }
  });

  afterAll(async () => {
    if (runtime) {
      await runtime.shutdown();
    }
  });

  it('should check Claude Code availability', async () => {
    const result = await runtime.checkAvailability();
    expect(result).toHaveProperty('available');

    if (result.available) {
      console.log('✅ Claude Code available:', result.version);
    }
  });

  // Skip actual session test if Claude Code not available
  it.skip('should start and stop a simple session', async () => {
    const availability = await runtime.checkAvailability();
    if (!availability.available) {
      return;
    }

    // Start session
    const session = await runtime.startSession({
      task: 'Say hello and confirm you can hear me',
      permissionMode: 'bypassPermissions',
    });

    expect(session.sessionId).toBeDefined();
    expect(session.pid).toBeGreaterThan(0);
    expect(session.state).toBe('starting');

    // Give it time to start
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check session is tracked
    const retrievedSession = runtime.getSession(session.sessionId);
    expect(retrievedSession).toBeDefined();
    expect(retrievedSession?.sessionId).toBe(session.sessionId);

    // Stop session
    await runtime.stopSession(session.sessionId);

    // Verify session is no longer active
    const stoppedSession = runtime.getSession(session.sessionId);
    expect(stoppedSession).toBeUndefined();
  }, 30000); // 30 second timeout for integration test
});
