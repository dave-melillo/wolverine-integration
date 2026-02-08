/**
 * Example: Basic usage of Wolverine Claude Code Runtime
 */

import { ClaudeCodeRuntime, wolverineConfig, ClaudeCodeEvent } from '../src';

async function main() {
  console.log('🐺 Wolverine Claude Code Integration - Example\n');

  // Create runtime instance
  const runtime = new ClaudeCodeRuntime({
    agent: wolverineConfig,
    onEvent: (event: ClaudeCodeEvent) => {
      console.log(`[Event] ${event.type}:`, event);
    },
    logger: (level, message, meta) => {
      console.log(`[${level.toUpperCase()}] ${message}`, meta || '');
    },
  });

  // Check Claude Code availability
  const availability = await runtime.checkAvailability();
  if (!availability.available) {
    console.error('❌ Claude Code not available:', availability.error);
    process.exit(1);
  }

  console.log(`✅ Claude Code available: ${availability.version}\n`);

  try {
    // Start a new session with a simple task
    console.log('📝 Starting Claude Code session...');
    const session = await runtime.startSession({
      task: 'Write a simple hello world function in TypeScript',
      permissionMode: 'bypassPermissions',
    });

    console.log(`✅ Session started: ${session.sessionId}`);
    console.log(`   PID: ${session.pid}`);
    console.log(`   Workspace: ${session.workdir}\n`);

    // Wait for completion (with 60 second timeout)
    console.log('⏳ Waiting for task completion...');
    const result = await runtime.waitForCompletion(session.sessionId, 60000);

    console.log('\n✅ Task completed!');
    console.log('Result:', result.content);

    // Stop the session
    await runtime.stopSession(session.sessionId);
    console.log('\n🛑 Session stopped');

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    // Clean shutdown
    await runtime.shutdown();
    console.log('\n👋 Runtime shutdown complete');
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main };
