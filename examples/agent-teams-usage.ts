/**
 * Example: Using Claude Code Agent Teams with Wolverine
 */

import { ClaudeCodeRuntime, wolverineConfig } from '../src';

async function main() {
  console.log('🐺 Wolverine with Agent Teams - Example\n');

  const runtime = new ClaudeCodeRuntime({
    agent: {
      ...wolverineConfig,
      claudeCode: {
        ...wolverineConfig.claudeCode,
        agentTeams: true,
        env: {
          CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1',
        },
      },
    },
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
    // Start session with multi-module task
    console.log('📝 Starting multi-module task with agent teams...');
    const session = await runtime.startSession({
      task: `Build a REST API for a task management app with:

1. Database schema (tasks table with CRUD)
2. API routes for tasks (GET, POST, PUT, DELETE)
3. Input validation middleware
4. Error handling middleware
5. Unit tests for all endpoints
6. Integration tests
7. API documentation

This is a complex, parallelizable task. Create an agent team with 3 teammates:
- Teammate 1: Database schema and migrations
- Teammate 2: API routes and middleware
- Teammate 3: Tests and documentation

Coordinate the work so teammates can work in parallel where possible.

When done: Report completion with summary of what each teammate accomplished.`,
      permissionMode: 'bypassPermissions',
      enableTeams: true,
      teammates: 3,
    });

    console.log(`✅ Session started: ${session.sessionId}`);
    console.log(`   Agent teams enabled with 3 teammates\n`);

    // Listen for team-related output
    runtime.on('parsed-output', ({ sessionId, output }) => {
      if (output.content.includes('teammate') || output.content.includes('team')) {
        console.log(`👥 [Team Activity] ${output.content.substring(0, 100)}...`);
      }
    });

    // Wait for completion (teams can be faster for parallel work)
    console.log('⏳ Waiting for team completion (expect 2-4x speedup)...\n');
    const result = await runtime.waitForCompletion(session.sessionId, 900000); // 15 min timeout

    console.log('\n✅ Team implementation completed!');
    console.log('Final result:', result.content.substring(0, 500));

    // Stop session
    await runtime.stopSession(session.sessionId);
    console.log('\n🛑 Session and team stopped');

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
