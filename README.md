# Wolverine Claude Code Integration

**Phase 1: Foundation** - Native OpenClaw agent integration with Claude Code runtime

Transform Wolverine from a bash-script wrapper into a **native OpenClaw agent** with full Claude Code capabilities including plugins, MCP tools, and agent teams.

## 🎯 Project Overview

This project implements Phase 1 of the Wolverine Claude Code Integration PRD (XM-MLE6HL71), providing the foundation for running Claude Code as a first-class OpenClaw agent runtime.

**Current State:** ✅ Phase 1 Complete
**Status:** Ready for integration into OpenClaw Gateway

## ✨ Features

### Phase 1 Implementation

- ✅ **Claude Code Runtime Type** - New `claudeCode` runtime for OpenClaw agents
- ✅ **Process Spawner** - Manages Claude Code process lifecycle with node-pty
- ✅ **Stdin/Stdout Communication** - Bidirectional communication layer with output parsing
- ✅ **Session Lifecycle Management** - Start, stop, restart, resume, and continue sessions
- ✅ **Wolverine Configuration** - Example agent config with all Claude Code features
- ✅ **Type Safety** - Full TypeScript type definitions
- ✅ **Examples** - Basic usage, Ralph Wiggum loop, and agent teams
- ✅ **Tests** - Unit and integration test suites

### Supported Claude Code Features

- **Permission Modes:** `bypassPermissions`, `acceptEdits`, `delegate`, `plan`, `dontAsk`
- **Models:** Opus 4.6, Sonnet 4.5, Haiku 4.5
- **Plugins:** Ralph Wiggum, claude-mem, GitHub, context7, Supermemory
- **MCP Servers:** Custom tool integration via Model Context Protocol
- **Agent Teams:** Multi-agent orchestration (experimental)
- **Session Persistence:** Resume and continue previous sessions

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/dave-melillo/wolverine-integration.git
cd wolverine-integration

# Install dependencies
npm install

# Build the project
npm run build
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { ClaudeCodeRuntime, wolverineConfig } from '@wolverine/openclaw-integration';

// Create runtime
const runtime = new ClaudeCodeRuntime({
  agent: wolverineConfig,
});

// Check availability
const availability = await runtime.checkAvailability();
console.log('Claude Code available:', availability.available);

// Start a session
const session = await runtime.startSession({
  task: 'Write a hello world function',
  permissionMode: 'bypassPermissions',
});

// Wait for completion
const result = await runtime.waitForCompletion(session.sessionId);
console.log('Result:', result.content);

// Clean up
await runtime.stopSession(session.sessionId);
await runtime.shutdown();
```

### With Ralph Wiggum Loop

```typescript
const session = await runtime.startSession({
  task: `Implement user authentication module.

  FIRST: Run complexity check. This is complex. Use /ralph-loop with
  completion promise: "All tests pass and code is production-ready".`,
  permissionMode: 'bypassPermissions',
});
```

### With Agent Teams

```typescript
const session = await runtime.startSession({
  task: `Build a REST API with 3 teammates working in parallel`,
  permissionMode: 'bypassPermissions',
  enableTeams: true,
  teammates: 3,
});
```

## 🏗️ Architecture

### Components

```
src/
├── runtime/
│   ├── ClaudeCodeRuntime.ts          # Main runtime manager
│   ├── ClaudeCodeProcessSpawner.ts   # Process lifecycle
│   └── ClaudeCodeCommunicator.ts     # Communication layer
├── types/
│   └── runtime.ts                     # Type definitions
├── config/
│   └── wolverine-config.ts           # Agent configuration
└── index.ts                          # Public API
```

### Data Flow

```
OpenClaw Gateway
       ↓
ClaudeCodeRuntime (Main interface)
       ↓
ClaudeCodeProcessSpawner (Manages processes)
       ↓
node-pty (PTY communication)
       ↓
Claude Code CLI (Interactive session)
```

### Communication Protocol

1. **OpenClaw → Wolverine:** Standard `sessions_spawn` with task
2. **Wolverine → Claude Code:** Task as prompt via stdin
3. **Claude Code → Wolverine:** Stream output via stdout
4. **Wolverine → OpenClaw:** Completion event with results

## 🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm test tests/unit

# Run integration tests (requires Claude Code installed)
npm test tests/integration

# Run with coverage
npm test -- --coverage

# Type checking
npm run typecheck
```

## 📖 Examples

See the `examples/` directory for complete working examples:

- **basic-usage.ts** - Simple task execution
- **ralph-loop-usage.ts** - Complex task with iterative refinement
- **agent-teams-usage.ts** - Multi-agent parallel work

Run examples:

```bash
npm run build
node dist/examples/basic-usage.js
```

## 🔧 Configuration

### Agent Configuration

```typescript
const config: AgentConfig = {
  id: 'wolverine',
  name: 'Wolverine',
  runtime: 'claudeCode',
  model: 'anthropic/claude-sonnet-4-5',
  workspace: '/path/to/workspace',
  agentDir: '/path/to/agent',
  claudeCode: {
    binaryPath: '/opt/homebrew/bin/claude',
    permissionMode: 'bypassPermissions',
    sessionPersistence: true,
    plugins: ['ralph-wiggum', 'claude-mem'],
    agentTeams: true,
    model: 'sonnet',
    env: {
      CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1',
    },
  },
};
```

### Spawn Options

```typescript
const options: ClaudeCodeSpawnOptions = {
  task: 'Your task here',
  resumeSessionId: 'optional-session-id',
  continue: false,
  permissionMode: 'bypassPermissions',
  model: 'sonnet',
  enableTeams: true,
  teammates: 3,
  outputFormat: 'text',
};
```

## 🔌 OpenClaw Gateway Integration

To integrate this into OpenClaw Gateway:

1. **Install Package:**
   ```bash
   npm install @wolverine/openclaw-integration
   ```

2. **Import Runtime:**
   ```typescript
   import { ClaudeCodeRuntime } from '@wolverine/openclaw-integration';
   ```

3. **Update Agent Spawning Logic:**
   ```typescript
   // In Gateway agent spawner
   if (agent.runtime === 'claudeCode') {
     const runtime = new ClaudeCodeRuntime({ agent });
     // Use runtime.startSession() for tasks
   }
   ```

4. **Update openclaw.json:**
   ```json
   {
     "agents": {
       "list": [{
         "id": "wolverine",
         "runtime": "claudeCode",
         "claudeCode": { ... }
       }]
     }
   }
   ```

See [INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md) for detailed instructions.

## 📋 Requirements

- **Node.js:** v18+ (v20+ recommended)
- **TypeScript:** 5.0+
- **Claude Code CLI:** 2.1.37+ installed and authenticated
- **OS:** macOS, Linux (Windows WSL2)
- **OpenClaw:** 2026.2.6-3+

## 🗺️ Roadmap

### Phase 1: Foundation ✅ (Current)
- [x] Basic runtime integration
- [x] Session lifecycle management
- [x] Communication layer
- [x] Plugin support
- [x] Documentation

### Phase 2: Agent Teams (Next)
- [ ] Multi-agent orchestration
- [ ] Task list monitoring
- [ ] Team cleanup automation
- [ ] Performance benchmarks

### Phase 3: MCP Ecosystem
- [ ] Custom MCP servers
- [ ] GitHub integration
- [ ] Memory persistence
- [ ] Plugin marketplace

### Phase 4: Quality Gates
- [ ] Magneto auto-validation
- [ ] Git automation
- [ ] Test execution gates
- [ ] Production hardening

## 🐛 Known Issues

1. **Plugin Marketplace:** Some plugins showing "failed to load" (upstream issue)
2. **Agent Teams:** Experimental feature, API may change
3. **Session Resume:** Requires Claude Code 2.1.37+

## 🤝 Contributing

This is an internal project for the X-Men agent system. For issues or feature requests, see the PRD in this repository.

## 📄 License

MIT License - See [LICENSE](LICENSE) file

## 🙏 Acknowledgments

- **Claude Code** by Anthropic - The underlying coding agent
- **OpenClaw** by Moltbot - Agent orchestration platform
- **Ralph Wiggum Plugin** - Iterative refinement loop

---

**Project:** XM-MLE6HL71
**Status:** Phase 1 Complete
**Next:** Integrate into OpenClaw Gateway and begin Phase 2
