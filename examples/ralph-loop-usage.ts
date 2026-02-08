/**
 * Example: Using Ralph Wiggum loop with Wolverine
 */

import { ClaudeCodeRuntime, wolverineConfig } from '../src';

async function main() {
  console.log('🐺 Wolverine with Ralph Wiggum Loop - Example\n');

  const runtime = new ClaudeCodeRuntime({
    agent: wolverineConfig,
    logger: (level, message, meta) => {
      console.log(`[${level.toUpperCase()}] ${message}`, meta || '');
    },
  });

  // Check availability
  const availability = await runtime.checkAvailability();
  if (!availability.available) {
    console.error('❌ Claude Code not available:', availability.error);
    process.exit(1);
  }

  console.log(`✅ Claude Code available: ${availability.version}\n`);

  try {
    // Start session with a complex task
    console.log('📝 Starting complex implementation task...');
    const session = await runtime.startSession({
      task: `Implement a user authentication module with the following:
1. User model with email/password
2. Registration endpoint
3. Login endpoint with JWT
4. Password hashing
5. Input validation
6. Unit tests

FIRST: Run complexity check. This is a complex task (2+ criteria: multiple files,
multiple components, tests required). Use /ralph-loop with completion promise:
"All tests pass and code is production-ready".

When done: Report completion summary.`,
      permissionMode: 'bypassPermissions',
      enableTeams: false, // Ralph loop handles complexity
    });

    console.log(`✅ Session started: ${session.sessionId}`);
    console.log(`   Task will use Ralph Wiggum loop for iterative refinement\n`);

    // Listen for output to detect Ralph loop activation
    runtime.on('parsed-output', ({ sessionId, output }) => {
      if (output.content.includes('/ralph-loop') || output.content.includes('Ralph')) {
        console.log('🔄 Ralph Wiggum loop activated!');
      }
    });

    // Wait for completion (Ralph loop can take longer)
    console.log('⏳ Waiting for Ralph loop completion (this may take several minutes)...\n');
    const result = await runtime.waitForCompletion(session.sessionId, 600000); // 10 min timeout

    console.log('\n✅ Implementation completed!');
    console.log('Final result:', result.content.substring(0, 500));

    // Stop session
    await runtime.stopSession(session.sessionId);
    console.log('\n🛑 Session stopped');

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await runtime.shutdown();
    console.log('\n👋 Runtime shutdown complete');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main };
