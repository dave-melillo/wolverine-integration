# API Reference

Complete API documentation for Wolverine Claude Code Integration.

## ClaudeCodeRuntime

Main runtime manager for Claude Code integration.

### Constructor

```typescript
new ClaudeCodeRuntime(options: ClaudeCodeRuntimeOptions)
```

**Parameters:**
- `options.agent` - Agent configuration (required)
- `options.onEvent` - Event callback function (optional)
- `options.logger` - Logger function (optional)

**Example:**
```typescript
const runtime = new ClaudeCodeRuntime({
  agent: wolverineConfig,
  onEvent: (event) => console.log(event),
  logger: (level, msg, meta) => console.log(`[${level}] ${msg}`, meta),
});
```

### Methods

#### startSession()

Start a new Claude Code session.

```typescript
startSession(options: ClaudeCodeSpawnOptions): Promise<ClaudeCodeSession>
```

**Parameters:**
- `options.task` - Task description/prompt (required)
- `options.resumeSessionId` - Session ID to resume (optional)
- `options.continue` - Continue last session in workspace (optional)
- `options.permissionMode` - Permission mode override (optional)
- `options.model` - Model override (optional)
- `options.enableTeams` - Enable agent teams (optional)
- `options.teammates` - Number of teammates (optional)
- `options.outputFormat` - Output format (optional)

**Returns:** `ClaudeCodeSession` object with session details

**Example:**
```typescript
const session = await runtime.startSession({
  task: 'Write hello world function',
  permissionMode: 'bypassPermissions',
});
```

#### stopSession()

Stop a running session.

```typescript
stopSession(sessionId: string, force?: boolean): Promise<void>
```

**Parameters:**
- `sessionId` - Session ID to stop (required)
- `force` - Force kill instead of graceful shutdown (optional, default: false)

**Example:**
```typescript
await runtime.stopSession('cc-wolverine-123', false);
```

#### restartSession()

Restart a session with the same task.

```typescript
restartSession(sessionId: string): Promise<ClaudeCodeSession>
```

**Returns:** New session object

#### resumeSession()

Resume a previous session by ID.

```typescript
resumeSession(sessionId: string, task?: string): Promise<ClaudeCodeSession>
```

**Parameters:**
- `sessionId` - Previous session ID (required)
- `task` - New task or 'Continue' (optional)

#### continueLastSession()

Continue the last session in the workspace.

```typescript
continueLastSession(task?: string): Promise<ClaudeCodeSession>
```

#### sendMessage()

Send a message to a running session.

```typescript
sendMessage(sessionId: string, message: string): Promise<void>
```

#### sendCommand()

Send a command (e.g., `/ralph-loop`).

```typescript
sendCommand(sessionId: string, command: string, args?: string): Promise<void>
```

**Example:**
```typescript
await runtime.sendCommand(
  sessionId,
  '/ralph-loop',
  '"Implement auth" --max-iterations 5'
);
```

#### waitForCompletion()

Wait for a session to complete.

```typescript
waitForCompletion(sessionId: string, timeoutMs?: number): Promise<any>
```

**Parameters:**
- `sessionId` - Session ID (required)
- `timeoutMs` - Timeout in milliseconds (optional, default: 300000)

**Returns:** Parsed output result

#### getSession()

Get session information.

```typescript
getSession(sessionId: string): ClaudeCodeSession | undefined
```

#### getAllSessions()

Get all active sessions.

```typescript
getAllSessions(): ClaudeCodeSession[]
```

#### interruptSession()

Send Ctrl+C to interrupt a session.

```typescript
interruptSession(sessionId: string): Promise<void>
```

#### checkAvailability()

Check if Claude Code is available.

```typescript
checkAvailability(): Promise<{
  available: boolean;
  version?: string;
  error?: string;
}>
```

#### shutdown()

Shutdown runtime and clean up all sessions.

```typescript
shutdown(): Promise<void>
```

### Events

The runtime emits the following events:

```typescript
runtime.on('started', (event: ClaudeCodeEvent) => {
  // Session started
  console.log('Session started:', event.sessionId, event.pid);
});

runtime.on('output', (event: ClaudeCodeEvent) => {
  // Raw output from Claude Code
  console.log('Output:', event.data);
});

runtime.on('parsed-output', ({ sessionId, output }) => {
  // Parsed output
  console.log('Parsed:', output.type, output.content);
});

runtime.on('error', (event: ClaudeCodeEvent) => {
  // Error occurred
  console.error('Error:', event.error);
});

runtime.on('completed', (event: ClaudeCodeEvent) => {
  // Task completed
  console.log('Completed:', event.sessionId);
});

runtime.on('stopped', (event: ClaudeCodeEvent) => {
  // Session stopped
  console.log('Stopped:', event.sessionId, event.exitCode);
});
```

## Types

### AgentConfig

```typescript
interface AgentConfig {
  id: string;
  name: string;
  runtime?: 'default' | 'claudeCode';
  model?: string;
  workspace: string;
  agentDir: string;
  identity?: {
    name: string;
    emoji?: string;
  };
  claudeCode?: ClaudeCodeConfig;
}
```

### ClaudeCodeConfig

```typescript
interface ClaudeCodeConfig {
  binaryPath?: string;
  permissionMode?: ClaudeCodePermissionMode;
  sessionPersistence?: boolean;
  plugins?: string[];
  mcpServers?: string[];
  agentTeams?: boolean;
  model?: ClaudeCodeModel;
  workdir?: string;
  env?: Record<string, string>;
}
```

### ClaudeCodePermissionMode

```typescript
type ClaudeCodePermissionMode =
  | 'bypassPermissions'
  | 'acceptEdits'
  | 'delegate'
  | 'plan'
  | 'dontAsk';
```

### ClaudeCodeModel

```typescript
type ClaudeCodeModel =
  | 'opus'
  | 'sonnet'
  | 'haiku'
  | 'anthropic/claude-opus-4-6'
  | 'anthropic/claude-sonnet-4-5'
  | 'anthropic/claude-haiku-4-5';
```

### ClaudeCodeSession

```typescript
interface ClaudeCodeSession {
  sessionId: string;
  agentId: string;
  pid: number;
  workdir: string;
  task: string;
  startedAt: Date;
  lastActivity: Date;
  state: 'starting' | 'running' | 'idle' | 'error' | 'stopped';
  error?: string;
  outputBuffer: string[];
}
```

### ClaudeCodeEvent

```typescript
type ClaudeCodeEvent =
  | { type: 'started'; sessionId: string; pid: number }
  | { type: 'output'; sessionId: string; data: string }
  | { type: 'error'; sessionId: string; error: string }
  | { type: 'completed'; sessionId: string; result?: string }
  | { type: 'stopped'; sessionId: string; exitCode?: number };
```

## ClaudeCodeProcessSpawner

Lower-level process management (usually not used directly).

### Methods

#### spawn()

```typescript
spawn(options: ClaudeCodeSpawnOptions): Promise<ClaudeCodeSession>
```

#### write()

```typescript
write(sessionId: string, input: string): void
```

#### stop()

```typescript
stop(sessionId: string, force?: boolean): Promise<void>
```

#### restart()

```typescript
restart(sessionId: string): Promise<ClaudeCodeSession>
```

#### getSession()

```typescript
getSession(sessionId: string): ClaudeCodeSession | undefined
```

#### getAllSessions()

```typescript
getAllSessions(): ClaudeCodeSession[]
```

#### cleanup()

```typescript
cleanup(): Promise<void>
```

## ClaudeCodeCommunicator

Communication layer (usually not used directly).

### Methods

#### sendMessage()

```typescript
sendMessage(sessionId: string, message: string): Promise<void>
```

#### sendCommand()

```typescript
sendCommand(sessionId: string, command: string, args?: string): Promise<void>
```

#### onOutput()

```typescript
onOutput(sessionId: string, handler: (output: ParsedOutput) => void): void
```

#### offOutput()

```typescript
offOutput(sessionId: string): void
```

#### waitForCompletion()

```typescript
waitForCompletion(sessionId: string, timeoutMs?: number): Promise<ParsedOutput>
```

#### respondToPrompt()

```typescript
respondToPrompt(sessionId: string, response: string): Promise<void>
```

#### interrupt()

```typescript
interrupt(sessionId: string): Promise<void>
```

## Output Parsers

### DefaultOutputParser

Parses text-mode output from Claude Code.

```typescript
const parser = new DefaultOutputParser();
const parsed = parser.parse(output);
```

### JsonOutputParser

Parses JSON-mode output from Claude Code.

```typescript
const parser = new JsonOutputParser();
const parsed = parser.parse(output);
```

### ParsedOutput

```typescript
interface ParsedOutput {
  type: 'status' | 'result' | 'error' | 'prompt' | 'raw';
  content: string;
  data?: any;
  isComplete?: boolean;
  error?: string;
}
```

## Configuration Helpers

### wolverineConfig

Default Wolverine configuration.

```typescript
import { wolverineConfig } from '@wolverine/openclaw-integration';
```

### wolverineDevConfig

Development/testing configuration.

```typescript
import { wolverineDevConfig } from '@wolverine/openclaw-integration';
```

### createWolverineConfig()

Create custom configuration.

```typescript
import { createWolverineConfig } from '@wolverine/openclaw-integration';

const customConfig = createWolverineConfig({
  workspace: '/custom/path',
  claudeCode: {
    model: 'opus',
  },
});
```

## Error Handling

All async methods can throw errors:

```typescript
try {
  const session = await runtime.startSession({ task: 'test' });
} catch (error) {
  if (error instanceof Error) {
    console.error('Error:', error.message);
  }
}
```

Common errors:
- `Agent configuration missing required field: {field}`
- `Invalid runtime type: {type}. Expected 'claudeCode'.`
- `Claude Code Runtime is not initialized`
- `Session {sessionId} not found`
- `Timeout waiting for completion: {sessionId}`

## Best Practices

1. **Always check availability before starting:**
   ```typescript
   const { available } = await runtime.checkAvailability();
   if (!available) throw new Error('Claude Code not available');
   ```

2. **Use permissionMode for autonomous work:**
   ```typescript
   { permissionMode: 'bypassPermissions' }
   ```

3. **Clean up sessions:**
   ```typescript
   try {
     // ... work ...
   } finally {
     await runtime.shutdown();
   }
   ```

4. **Handle events:**
   ```typescript
   runtime.on('error', (event) => {
     console.error('Session error:', event);
     // Retry or cleanup
   });
   ```

5. **Set appropriate timeouts:**
   ```typescript
   // Simple task: 60 seconds
   await runtime.waitForCompletion(sessionId, 60000);

   // Complex task: 10 minutes
   await runtime.waitForCompletion(sessionId, 600000);
   ```

---

**Version:** 0.1.0
**Last Updated:** Phase 1 Complete
