# OpenClaw Gateway Integration Guide

This guide explains how to integrate the Wolverine Claude Code runtime into OpenClaw Gateway.

## Overview

The Wolverine Claude Code integration provides a new agent runtime type (`claudeCode`) that OpenClaw Gateway can use to spawn Claude Code processes for agents like Wolverine.

## Integration Steps

### 1. Install the Package

In your OpenClaw/Moltbot project:

```bash
cd /Users/dave/moltbot
npm install @wolverine/openclaw-integration
```

Or add to `package.json`:

```json
{
  "dependencies": {
    "@wolverine/openclaw-integration": "file:../clawd/wolverine-integration"
  }
}
```

### 2. Update Agent Configuration

In `~/.openclaw/openclaw.json`, update Wolverine's configuration:

```json
{
  "agents": {
    "list": [
      {
        "id": "wolverine",
        "name": "Wolverine",
        "runtime": "claudeCode",
        "model": "anthropic/claude-sonnet-4-5",
        "workspace": "/Users/dave/.openclaw/workspace-wolverine",
        "agentDir": "/Users/dave/.openclaw/agents/wolverine/agent",
        "identity": {
          "name": "Wolverine",
          "emoji": "🐺"
        },
        "claudeCode": {
          "binaryPath": "/opt/homebrew/bin/claude",
          "permissionMode": "bypassPermissions",
          "sessionPersistence": true,
          "plugins": ["ralph-wiggum", "claude-mem", "github"],
          "mcpServers": [],
          "agentTeams": true,
          "model": "sonnet",
          "env": {
            "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
          }
        }
      }
    ]
  }
}
```

### 3. Modify Gateway Agent Spawner

In your OpenClaw Gateway code (likely in `src/gateway/agent-spawner.ts` or similar):

```typescript
import { ClaudeCodeRuntime } from '@wolverine/openclaw-integration';

// In your agent spawning logic
function spawnAgent(agentConfig: AgentConfig, task: string) {
  // Check runtime type
  if (agentConfig.runtime === 'claudeCode') {
    return spawnClaudeCodeAgent(agentConfig, task);
  } else {
    return spawnDefaultAgent(agentConfig, task);
  }
}

// New function for Claude Code agents
async function spawnClaudeCodeAgent(agentConfig: AgentConfig, task: string) {
  // Create runtime
  const runtime = new ClaudeCodeRuntime({
    agent: agentConfig,
    onEvent: (event) => {
      // Forward events to OpenClaw event system
      gateway.emit('agent-event', {
        agentId: agentConfig.id,
        event,
      });
    },
    logger: (level, message, meta) => {
      // Use OpenClaw logger
      logger[level](`[${agentConfig.id}] ${message}`, meta);
    },
  });

  // Start session
  const session = await runtime.startSession({
    task,
    permissionMode: agentConfig.claudeCode?.permissionMode || 'bypassPermissions',
  });

  // Store runtime for later access
  activeRuntimes.set(session.sessionId, runtime);

  return {
    sessionId: session.sessionId,
    agentId: agentConfig.id,
    runtime,
  };
}
```

### 4. Handle Session Lifecycle

```typescript
// Stop session
async function stopSession(sessionId: string) {
  const runtime = activeRuntimes.get(sessionId);
  if (runtime) {
    await runtime.stopSession(sessionId);
    activeRuntimes.delete(sessionId);
  }
}

// Resume session
async function resumeSession(sessionId: string, task: string) {
  const runtime = activeRuntimes.get(sessionId);
  if (runtime) {
    return await runtime.resumeSession(sessionId, task);
  }
}
```

### 5. Handle Completion Events

```typescript
runtime.on('completed', async ({ sessionId, result }) => {
  // Notify main agent that Wolverine completed task
  await notifyCompletionToGambit({
    agentId: 'wolverine',
    sessionId,
    result,
  });

  // Clean up
  await runtime.stopSession(sessionId);
  activeRuntimes.delete(sessionId);
});
```

### 6. Integrate with sessions_spawn Tool

```typescript
// In your sessions_spawn tool implementation
async function sessions_spawn(params: {
  agentId: string;
  task: string;
  options?: any;
}) {
  const agent = getAgentConfig(params.agentId);

  if (agent.runtime === 'claudeCode') {
    // Use Claude Code runtime
    const session = await spawnClaudeCodeAgent(agent, params.task);

    return {
      success: true,
      sessionId: session.sessionId,
      message: `Wolverine session started: ${session.sessionId}`,
    };
  } else {
    // Use default runtime
    return await spawnDefaultAgent(agent, params.task);
  }
}
```

## Testing Integration

### 1. Verify Claude Code Availability

```typescript
import { ClaudeCodeRuntime } from '@wolverine/openclaw-integration';
import { wolverineConfig } from '@wolverine/openclaw-integration';

const runtime = new ClaudeCodeRuntime({ agent: wolverineConfig });
const availability = await runtime.checkAvailability();

if (!availability.available) {
  console.error('Claude Code not available:', availability.error);
} else {
  console.log('Claude Code ready:', availability.version);
}
```

### 2. Test Basic Session

```typescript
// From Gambit or main agent
const result = await sessions_spawn({
  agentId: 'wolverine',
  task: 'Write a simple hello world function and show me the code',
});

console.log('Session started:', result.sessionId);

// Wait for completion event
// Runtime will emit 'completed' when done
```

### 3. Test Ralph Wiggum Loop

```typescript
await sessions_spawn({
  agentId: 'wolverine',
  task: `Implement a user authentication module with:
  - User model
  - Login endpoint
  - Registration endpoint
  - Unit tests

  FIRST: Run complexity check. This is complex. Use /ralph-loop.`,
});
```

### 4. Test Agent Teams

```typescript
await sessions_spawn({
  agentId: 'wolverine',
  task: `Build a REST API with 3 modules. Create agent team with 3 teammates
  to work in parallel.`,
  options: {
    enableTeams: true,
    teammates: 3,
  },
});
```

## Migration from Old Exec Approach

### Before (exec wrapper)

```javascript
exec({
  pty: true,
  workdir: '/path/to/project',
  background: true,
  command: `claude --print 'task' && openclaw gateway wake --text "Done" --mode now`
});
```

### After (native runtime)

```typescript
const session = await sessions_spawn({
  agentId: 'wolverine',
  task: 'task',
});

// Completion notification is automatic via events
runtime.on('completed', ({ sessionId, result }) => {
  // Auto-notification to main agent
});
```

### Benefits

- ✅ No more manual process management
- ✅ Access to Ralph Wiggum and other plugins
- ✅ Agent teams for parallel work
- ✅ Session persistence and resume
- ✅ Structured events instead of parsing text
- ✅ Native OpenClaw agent lifecycle

## Troubleshooting

### Claude Code Not Found

**Error:** `Claude Code not available: Command not found`

**Solution:**
1. Install Claude Code: `npm install -g @anthropic/claude-code`
2. Verify path: `which claude`
3. Update `binaryPath` in config

### Plugin Failed to Load

**Error:** `Plugin 'ralph-wiggum' failed to load`

**Solution:**
1. Check Claude Code settings: `~/.claude/settings.json`
2. Reinstall plugin: `claude plugin install ralph-wiggum`
3. Verify plugin status: `claude plugin list`

### Session Timeout

**Error:** `Timeout waiting for completion`

**Solution:**
1. Increase timeout: `runtime.waitForCompletion(sessionId, 600000)` (10 min)
2. Check Claude Code output for prompts requiring user input
3. Ensure `permissionMode: 'bypassPermissions'` is set

### Agent Teams Not Working

**Error:** `Agent teams not available`

**Solution:**
1. Set environment variable: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`
2. Update Claude Code to 2.1.37+
3. Enable in config: `agentTeams: true`

## Performance Considerations

### Memory Usage

Each Claude Code session consumes:
- **Base:** ~100-200 MB
- **With Agent Teams (3):** ~400-600 MB
- **With Ralph Loop:** Variable (depends on iterations)

### Concurrency

- **Recommended:** 1-2 concurrent Wolverine sessions
- **Maximum:** 4 concurrent sessions (hardware dependent)
- **Agent Teams:** Multiplies resource usage by team size

### Timeouts

- **Simple tasks:** 60 seconds
- **Complex tasks:** 5-10 minutes
- **Ralph loops:** 10-30 minutes
- **Agent teams:** 10-20 minutes (often faster than single-agent)

## Best Practices

1. **Always set permissionMode:** Use `bypassPermissions` for autonomous work
2. **Enable session persistence:** Allows resuming on failure
3. **Use Ralph loop for complex tasks:** Triggers iterative refinement
4. **Use agent teams for parallel work:** 2-4x speedup on multi-module tasks
5. **Monitor memory usage:** Clean up sessions after completion
6. **Handle errors gracefully:** Implement retry logic for transient failures
7. **Log everything:** Use structured logging for debugging

## Next Steps

- Implement Phase 2: Agent Teams Integration
- Add Magneto validation integration
- Set up custom MCP servers
- Configure GitHub plugin with PAT

## Support

For issues or questions:
- Check PRD: `PRD.md`
- Review examples: `examples/`
- Run tests: `npm test`
- Check logs in OpenClaw Gateway

---

**Last Updated:** Phase 1 Complete
**Status:** Ready for OpenClaw Gateway integration
