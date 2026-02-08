# PRD: XM-MLE6HL71 - Wolverine Claude Code Integration

**Project ID:** XM-MLE6HL71  
**Author:** Beast (Hank McCoy)  
**Date:** 2026-02-08  
**Status:** Draft  
**Priority Score:** 5 (Critical)  
**Complexity Score:** L (Large)

---

## Summary

Transform Wolverine from a bash-script wrapper that spawns Claude Code processes into a **native OpenClaw agent** that IS Claude Code - running as a proper coding agent with full access to Claude Code's agentic features, plugins, file watching, MCP tools, and agent teams.

**Current State:** Wolverine is spawned via `exec pty:true` running `claude --print` commands  
**Desired State:** Wolverine is a first-class OpenClaw agent with Claude Code capabilities baked in  
**Why Now:** Current approach loses plugin support, can't leverage agent teams, and requires manual process management

---

## Research

### 1. What is Claude Code?

Claude Code is Anthropic's official CLI coding agent (v2.1.37+) with sophisticated agentic capabilities:

**Core Features:**
- **Agentic Loop:** Autonomous task completion with iterative refinement
- **File Watching:** Monitors file changes for context-aware responses
- **Session Management:** Persistent sessions with resume/continue support
- **Permission Modes:** `bypassPermissions`, `acceptEdits`, `delegate`, `plan`, `dontAsk`
- **Model Selection:** Can use Opus 4.5, Sonnet 4.5, or Haiku with --model flag
- **Structured Output:** JSON schema validation for API responses

**Plugin System (Critical):**
- **Ralph Wiggum** - Iterative refinement loop (`/ralph-loop` command)
- **claude-mem** - Local memory compression and management
- **GitHub** - Native GitHub integration (requires PAT)
- **context7** - Library documentation lookup
- **Supermemory** - Enhanced AI memory (Pro subscription)

**MCP (Model Context Protocol) Support:**
- Add external tools via `claude mcp add`
- HTTP and stdio transports
- Environment variable configuration
- Project-scoped and user-scoped servers

**Agent Teams (Experimental):**
- Multi-agent orchestration within a single session
- Team lead spawns teammates with independent context windows
- Shared task lists with file-locking coordination
- Direct teammate-to-teammate messaging
- 2-4x speedup for parallelizable work
- Enabled via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`

**Interactive vs Non-Interactive:**
- Default: Interactive terminal UI with real-time feedback
- `--print`: Non-interactive output (for automation)
- `--output-format`: `text` (default), `json`, `stream-json`
- `--input-format`: `text` (default), `stream-json` (realtime streaming)

### 2. How OpenClaw Handles Agents vs Sub-Agents

**Agents (First-Class Citizens):**
- Defined in `~/.openclaw/openclaw.json` under `agents.list[]`
- Have dedicated workspaces (e.g., `/Users/dave/.openclaw/workspace-wolverine`)
- Have agent directories with personality files (AGENTS.md, SOUL.md, etc.)
- Can be spawned via `sessions_spawn agentId:wolverine`
- Run in their own sessions with full tool access
- Managed by OpenClaw runtime (Moltbot/Gateway)
- Can communicate with other agents via `agentToAgent` tool
- Have persistent sessions stored in `~/.openclaw/agents/{id}/sessions/`

**Sub-Agents (Task-Based):**
- Spawned for specific tasks, not persistent
- Use `sessions_spawn` without full agent configuration
- Inherit parent session's model and settings
- Controlled via `agents.defaults.subagents` config
- Limited to basic tool access
- No persistent workspace or personality
- Archived after completion (`archiveAfterMinutes: 30`)

**Current Wolverine Configuration:**
```json
{
  "id": "wolverine",
  "name": "Wolverine",
  "workspace": "/Users/dave/.openclaw/workspace-wolverine",
  "agentDir": "/Users/dave/.openclaw/agents/wolverine/agent",
  "model": "anthropic/claude-sonnet-4-5",
  "identity": {
    "name": "Wolverine",
    "emoji": "🐺"
  }
}
```

### 3. Integration Options

**Option A: Exec Wrapper (Current - Unsatisfactory)**
- Main agent spawns `exec pty:true command:"claude --print 'task'"`
- **Pros:** Simple, works today
- **Cons:** 
  - No plugin support (Ralph Wiggum unavailable)
  - Manual process management (poll/log/kill)
  - No session persistence
  - Can't leverage agent teams
  - Must parse text output
  - No access to MCP tools

**Option B: Native OpenClaw Agent with Claude Code Integration (Recommended)**
- OpenClaw Gateway spawns Wolverine as native agent
- Wolverine's runtime IS Claude Code (not Moltbot's default LLM client)
- **Pros:**
  - Full plugin support (Ralph Wiggum, GitHub, etc.)
  - Agent teams available
  - Session persistence and resume
  - Native MCP tool support
  - Structured JSON output
  - First-class agent communication
  - Managed by OpenClaw lifecycle
- **Cons:**
  - Requires OpenClaw code changes (Gateway agent spawning)
  - More complex architecture
  - Needs coordination between Moltbot runtime and Claude Code

**Option C: Hybrid - OpenClaw Agent That Delegates to Claude Code**
- Wolverine is a normal OpenClaw agent
- When given coding tasks, it spawns Claude Code via exec
- Acts as orchestrator/coordinator
- **Pros:**
  - No OpenClaw core changes
  - Can still use OpenClaw tools
  - Simpler to implement
- **Cons:**
  - Still loses plugin support during coding
  - Dual-personality problem (when to delegate?)
  - Complexity in state management

### 4. Existing Coding-Agent Skill

Located at `/Users/dave/moltbot/skills/coding-agent/SKILL.md`, the skill documents:

**Key Patterns:**
- Always use `pty:true` - coding agents need a terminal
- Use `exec` with `background:true` for long tasks
- Monitor with `process action:log sessionId:XXX`
- Append wake notification to prompts for completion alerts
- Use `--permission-mode bypassPermissions` for autonomous work

**Tool Choices:**
- **Codex CLI:** Default coding agent (`gpt-5.2-codex` model)
- **Claude Code:** Anthropic's official CLI
- **OpenCode:** Alternative coding agent
- **Pi Coding Agent:** Lightweight option

**Critical Insight:**
> "⚠️ CRITICAL: Never review PRs in OpenClaw's own project folder!"
> "Wolverine MUST use Claude Code for all implementation work."

The skill already treats Claude Code as the preferred tool for implementation work.

### 5. Current System

**Old wolverine.sh Script:**
- Located at `/Users/dave/clawd/scripts/wolverine.sh`
- Bash wrapper that invokes Claude Code via `claude --print`
- Features:
  - Complexity check (--complex/--simple flags)
  - Ralph Wiggum prompt injection
  - Swarm mode (--swarm N)
  - Background execution with nohup
  - WIP state tracking for Captain
  - Wake notification on completion
- **Status:** Superseded by WOLVERINE-EXECUTION-MODEL.md

**Wolverine Agent Config:**
- Defined in `~/.openclaw/openclaw.json`
- Has workspace: `/Users/dave/.openclaw/workspace-wolverine`
- Has agent directory: `/Users/dave/.openclaw/agents/wolverine/agent/`
- Model: `anthropic/claude-sonnet-4-5`
- Configured as proper agent (not subagent)

**Current Spawning Method (WOLVERINE-EXECUTION-MODEL.md):**
```bash
exec pty:true workdir:/path background:true command:"claude --print 'task

FIRST: Run complexity check. If complex (2+ criteria), use /ralph-loop. 

When done: openclaw gateway wake --text \"Done: [summary]\" --mode now'"
```

**Problems with Current Approach:**
1. **No Plugin Access:** Ralph Wiggum commands in prompt are ignored (--print mode doesn't load plugins)
2. **Manual Process Management:** Gambit must poll/log/kill sessions manually
3. **No Agent Team Support:** Can't use `--swarm` with --print mode
4. **No Session Persistence:** Each task is fresh, can't resume
5. **Text Output Only:** Must parse stdout, no structured JSON
6. **No MCP Tools:** Can't add custom tools via MCP protocol

**Current Claude Code Settings:**
Located at `~/.claude/settings.json`:
```json
{
  "enabledPlugins": {
    "ralph-wiggum@claude-code-plugins": true,
    "claude-mem@thedotmack": true,
    "claude-supermemory@supermemory-plugins": false,
    "github@claude-plugins-official": false,
    "context7@claude-plugins-official": false
  },
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

**Note:** All plugins showing as "failed to load" currently (marketplace issues)

---

## Definition of Done

### Phase 1: Foundation (MVP)
- [ ] Wolverine spawns as OpenClaw agent with Claude Code as runtime
- [ ] Can accept coding tasks via `sessions_spawn agentId:wolverine task:"..."`
- [ ] Has access to ALL Claude Code features (plugins, MCP, agent teams)
- [ ] Session persistence works (can resume via session ID)
- [ ] Reports completion back to main agent
- [ ] Complexity check auto-triggers Ralph Wiggum loop
- [ ] Wake notifications work for async completion
- [ ] Documentation: Updated WOLVERINE-EXECUTION-MODEL.md with new patterns

### Phase 2: Agent Team Integration
- [ ] Wolverine can spawn agent teams for complex tasks
- [ ] Swarm mode triggers automatically for multi-module work
- [ ] Teammate coordination visible to Gambit
- [ ] Task list accessible for monitoring
- [ ] Team cleanup happens automatically

### Phase 3: MCP & Plugin Ecosystem
- [ ] Custom MCP servers configurable for Wolverine
- [ ] All Claude Code plugins working (Ralph Wiggum, GitHub, etc.)
- [ ] GitHub integration for PRs/issues
- [ ] claude-mem provides persistent memory across sessions
- [ ] Documentation: MCP server setup guide

### Phase 4: Quality Gates
- [ ] Wolverine auto-invokes Magneto validation on completion
- [ ] Structured output mode for machine-readable results
- [ ] Git commit automation with conventional commits
- [ ] Test execution before marking complete
- [ ] Shadow review (Logan's Shadow) integration

### Success Criteria
1. Wolverine responds to `sessions_spawn` like a normal agent
2. Can execute `/ralph-loop` commands (plugin works)
3. Can spawn agent teams with `--swarm` flag
4. Session IDs can be used to resume work
5. Gambit receives structured completion notifications
6. No more manual `exec pty:true` workarounds
7. 50%+ faster for parallelizable work (via agent teams)

---

## Tooling Choices

### Primary Integration Approach: **Option B - Native Agent**

**Why:** Full feature parity with Claude Code, proper agent lifecycle management, no hacky workarounds

**Architecture Components:**

1. **OpenClaw Gateway Changes**
   - New agent runtime type: `claudeCode`
   - Agent config: `"runtime": "claudeCode"`
   - Gateway spawns Claude Code process in interactive mode
   - Maintains bidirectional communication (stdin/stdout)
   - Translates OpenClaw tool calls ↔ Claude Code commands

2. **Wolverine Agent Configuration**
   ```json
   {
     "id": "wolverine",
     "runtime": "claudeCode",
     "model": "anthropic/claude-sonnet-4-5",
     "workspace": "/Users/dave/.openclaw/workspace-wolverine",
     "claudeCode": {
       "binaryPath": "/opt/homebrew/bin/claude",
       "permissionMode": "bypassPermissions",
       "sessionPersistence": true,
       "plugins": ["ralph-wiggum", "claude-mem", "github"],
       "mcpServers": [],
       "agentTeams": true
     }
   }
   ```

3. **Communication Protocol**
   - OpenClaw → Wolverine: Standard `sessions_spawn` with task
   - Wolverine → Claude Code: Task as prompt in interactive session
   - Claude Code → Wolverine: Stream output (JSON or text)
   - Wolverine → OpenClaw: Completion notification with results

4. **Fallback Strategy**
   - If Claude Code crashes, restart session
   - If plugin fails, fall back to --print mode
   - If agent teams unavailable, single-instance mode
   - Graceful degradation to current exec approach

### Alternative: **Option C - Hybrid (Phase 1 Fallback)**

If native integration proves too complex:
1. Keep Wolverine as normal OpenClaw agent
2. Create `@wolverine/spawn-claude-code` tool
3. Tool spawns Claude Code with full interactivity
4. Agent manages process lifecycle
5. Upgrade to Option B in Phase 2

### Tools Required

- **Node.js/Bun:** For OpenClaw Gateway modifications
- **Claude Code CLI:** Already installed at `/opt/homebrew/bin/claude`
- **Git:** For commit automation
- **tmux/iTerm2:** For agent team split panes (optional)

---

## Current System Context

### File Structure
```
/Users/dave/clawd/
├── scripts/
│   ├── wolverine.sh                    # Old bash wrapper (to be archived)
│   └── validation-flow.sh              # Magneto validation trigger
├── config/
│   └── wolverine.json                  # Wolverine-specific config (optional)
├── state/
│   └── wip.json                        # Work-in-progress tracking
└── docs/
    ├── WOLVERINE-EXECUTION-MODEL.md    # Current docs (needs update)
    └── AGENT-SWARMS.md                 # Agent teams research

/Users/dave/.openclaw/
├── openclaw.json                       # Main config
├── workspace-wolverine/                # Wolverine's workspace
│   ├── AGENTS.md                       # Behavior instructions
│   ├── SOUL.md                         # Personality
│   ├── USER.md                         # User profile
│   ├── TOOLS.md                        # Tool notes
│   └── IDENTITY.md                     # Agent identity
└── agents/wolverine/
    ├── agent/
    │   └── auth-profiles.json          # Auth config
    └── sessions/                       # Persistent sessions

/Users/dave/.claude/
├── settings.json                       # Claude Code settings
├── mcp_servers.json                    # MCP server config
├── plugins/                            # Installed plugins
└── projects/                           # Project-specific settings
```

### Dependencies
- **OpenClaw Version:** 2026.2.6-3
- **Claude Code Version:** 2.1.37+
- **Node.js:** v25.6.0
- **OS:** macOS 24.3.0 (arm64)
- **Auth:** Anthropic OAuth (Claude Max subscription)

### Integration Points
1. **Gambit (Main Agent):** Delegates work to Wolverine
2. **Magneto:** Validates Wolverine's output before delivery
3. **Cyclops:** May need Wolverine for image generation code
4. **Beast:** Writes PRDs that Wolverine implements
5. **XMen Orchestrator:** Tracks Wolverine's work in Trello

### Breaking Changes
- `scripts/wolverine.sh` deprecated (archive, don't delete)
- `exec pty:true command:"claude..."` pattern replaced
- WOLVERINE-EXECUTION-MODEL.md needs full rewrite
- coding-agent skill needs update for new spawning method

---

## Phases

### Phase 1: Foundation & Prototype (Week 1-2)
**Goal:** Prove native integration works

**Tasks:**
1. **Research Spike** (2 days)
   - Study OpenClaw agent spawning code
   - Understand Claude Code's stdio/interactive protocols
   - Prototype communication bridge
   - Document findings

2. **Gateway Integration** (3 days)
   - Add `claudeCode` runtime type to OpenClaw
   - Implement Claude Code process spawner
   - Build stdin/stdout communication layer
   - Handle session lifecycle (start/stop/restart)

3. **Basic Agent Spawning** (2 days)
   - Configure Wolverine with new runtime
   - Test `sessions_spawn agentId:wolverine`
   - Verify basic task completion
   - Confirm wake notifications work

4. **Plugin Verification** (1 day)
   - Test Ralph Wiggum loop access
   - Verify complexity check triggers
   - Confirm MCP servers load
   - Document plugin status

5. **Documentation** (1 day)
   - Update WOLVERINE-EXECUTION-MODEL.md
   - Create migration guide from old approach
   - Document troubleshooting steps
   - Write Phase 2 PRD

**Deliverables:**
- Working prototype: Wolverine spawns with Claude Code runtime
- Can complete simple coding tasks
- Ralph Wiggum accessible
- Documentation updated

**Success Metrics:**
- 5+ successful task completions
- Ralph Wiggum loop executed at least once
- No manual process management needed
- Session resume works

---

### Phase 2: Agent Teams & Advanced Features (Week 3-4)
**Goal:** Enable parallel work via agent teams

**Tasks:**
1. **Agent Team Integration** (3 days)
   - Enable `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`
   - Test team spawning from Wolverine
   - Implement task list monitoring
   - Handle team cleanup

2. **Complexity Auto-Detection** (2 days)
   - Build task analyzer
   - Auto-trigger agent teams for multi-module work
   - Fallback to single-instance for simple tasks
   - Tune heuristics based on results

3. **Monitoring & Visibility** (2 days)
   - Expose team status to Gambit
   - Task list accessible via OpenClaw tools
   - Real-time progress updates
   - Teammate-to-teammate messaging visibility

4. **Performance Optimization** (2 days)
   - Benchmark parallel vs sequential
   - Optimize team size recommendations
   - Reduce overhead for small teams
   - Memory usage optimization

5. **Documentation & Training** (1 day)
   - Agent teams guide
   - When to use swarms
   - Example workflows
   - Performance data

**Deliverables:**
- Agent teams functional
- Automatic swarm mode for complex tasks
- Monitoring dashboard for Gambit
- Performance benchmarks

**Success Metrics:**
- 2-4x speedup for parallelizable work
- Zero team coordination failures
- 10+ successful multi-teammate tasks
- Clear visibility into team status

---

### Phase 3: MCP Ecosystem & Plugins (Week 5-6)
**Goal:** Full plugin ecosystem operational

**Tasks:**
1. **Plugin Health Check** (1 day)
   - Fix "failed to load" errors
   - Update marketplace repos
   - Re-install all plugins
   - Verify versions

2. **GitHub Integration** (2 days)
   - Create GitHub Personal Access Token
   - Configure `GITHUB_PERSONAL_ACCESS_TOKEN`
   - Test PR operations
   - Automate issue updates

3. **Memory System** (2 days)
   - Configure claude-mem properly
   - Test memory persistence across sessions
   - Integrate with OpenClaw's MEMORY.md
   - Optimize memory search

4. **Custom MCP Servers** (3 days)
   - Identify needed tools (Git, Trello, validation)
   - Implement or install MCP servers
   - Configure via `claude mcp add`
   - Test tool availability

5. **Plugin Documentation** (1 day)
   - Document each plugin's purpose
   - Configuration guide
   - Troubleshooting
   - Best practices

**Deliverables:**
- All plugins operational
- GitHub integration live
- Custom MCP servers for project tools
- Complete plugin documentation

**Success Metrics:**
- 100% plugin load success
- GitHub operations work
- Memory persists across restarts
- Custom tools accessible

---

### Phase 4: Quality Gates & Production Hardening (Week 7-8)
**Goal:** Production-ready with quality gates

**Tasks:**
1. **Magneto Auto-Validation** (2 days)
   - Wolverine triggers Magneto on completion
   - Structured output for validation
   - Pass/fail feedback loop
   - Retry on failure

2. **Git Automation** (2 days)
   - Conventional commit format
   - Auto-commit on task completion
   - Branch creation for features
   - Conflict detection

3. **Test Execution** (2 days)
   - Pre-commit test runs
   - Coverage thresholds
   - Test failure handling
   - Report generation

4. **Error Handling & Recovery** (2 days)
   - Session crash recovery
   - Plugin failure fallbacks
   - Timeout handling
   - Dead session cleanup

5. **Production Deployment** (2 days)
   - Migrate all workflows to new system
   - Retire old wolverine.sh
   - Update orchestrator integration
   - Monitor for issues

6. **Documentation Finalization** (1 day)
   - Complete system docs
   - Migration guide
   - Troubleshooting runbook
   - Video walkthrough

**Deliverables:**
- Production-ready Wolverine agent
- Quality gates integrated
- All workflows migrated
- Complete documentation

**Success Metrics:**
- Zero session crashes in 7 days
- 100% validation pass rate (or clear reasons for failures)
- All tests passing before commits
- Old wolverine.sh unused

---

## Priority Score: 5 (Critical)

**Justification:**
1. **Current System Broken:** Ralph Wiggum doesn't work in --print mode (key feature lost)
2. **Competitive Advantage:** Agent teams provide 2-4x speedup for complex work
3. **Foundation for Future:** Other agents (Beast, Cyclops) may want Claude Code runtime
4. **Technical Debt:** Current exec approach is a hack, not sustainable
5. **User Experience:** Gambit's manual process management is fragile and hard to debug

**Cost of Delay:**
- Every complex task takes 2-4x longer (no parallelization)
- Ralph Wiggum unavailable means lower quality implementations
- Manual process management leads to stuck sessions and frustration
- Can't leverage Claude Code's full capabilities

---

## Complexity Score: L (Large)

**T-Shirt Sizing:**
- **S (Small):** < 1 week, single developer, low risk
- **M (Medium):** 1-2 weeks, clear path, moderate risk
- **L (Large):** 4-8 weeks, multiple phases, requires research
- **XL (Extra Large):** 8+ weeks, high uncertainty, architectural changes

**Why L:**
1. **Multi-Phase Project:** 4 distinct phases over 8 weeks
2. **Core Platform Changes:** Requires OpenClaw Gateway modifications
3. **Protocol Bridge:** Needs stdin/stdout communication layer
4. **Unknown Unknowns:** Claude Code's internals not fully documented
5. **Integration Complexity:** Multiple systems (OpenClaw, Claude Code, Git, Magneto)
6. **Breaking Changes:** Impacts existing workflows and scripts

**Risk Factors:**
- **Technical:** Claude Code's interactive protocol may be complex
- **Dependency:** Relies on experimental agent teams feature
- **Plugin Stability:** Plugins currently failing to load (marketplace issues)
- **Performance:** Unknown overhead of runtime bridge

**Mitigation:**
- Start with Phase 1 prototype to validate approach
- Fallback to hybrid approach (Option C) if native integration fails
- Incremental rollout (keep old system during transition)
- Extensive testing before production deployment

---

## Open Questions

1. **Gateway Architecture:** Does OpenClaw have a plugin system for custom runtimes, or do we modify core?
2. **Plugin Marketplace:** Why are all plugins failing to load? Upstream issue?
3. **Session State:** How to sync Claude Code session state with OpenClaw's session management?
4. **Authentication:** Does Wolverine inherit main agent's Anthropic auth, or need separate config?
5. **Resource Limits:** What's the max concurrent agent teams? Token budget per session?
6. **Fallback UX:** When Claude Code is unavailable, should Wolverine refuse tasks or fall back to basic mode?
7. **Cross-Agent Communication:** Can teammates message other OpenClaw agents (e.g., ask Cyclops for images)?

---

## Related Work

- **AGENT-SWARMS.md:** Research on Claude Code agent teams
- **WOLVERINE-EXECUTION-MODEL.md:** Current (broken) execution pattern
- **coding-agent skill:** Documents current exec-based approach
- **XMen Orchestrator:** Will need updates to track agent team work
- **Magneto Validation:** Integration point for quality gates

---

## Appendix A: Claude Code Command Reference

```bash
# Interactive session
claude

# Non-interactive (current approach)
claude --print "Your task"

# With specific model
claude --model opus "Your task"

# Permission modes
claude --permission-mode bypassPermissions "Your task"
claude --permission-mode delegate "Your task"

# Session management
claude --continue                     # Resume last in current dir
claude --resume <session-id>          # Resume specific session

# Agent teams
claude --print "Create agent team with 3 teammates to..."

# Plugin commands (in interactive session)
/ralph-loop "Your task" --max-iterations 5 --completion-promise "Tests pass"
/cancel-ralph

# MCP management
claude mcp add my-server -- npx my-mcp-server
claude mcp list
claude mcp remove my-server

# Plugin management
claude plugin list
claude plugin install <plugin>
claude plugin enable <plugin>
```

---

## Appendix B: OpenClaw Agent Communication

```javascript
// Current spawning (to be replaced)
exec({
  pty: true,
  workdir: '/path/to/project',
  background: true,
  command: 'claude --print "task"'
});

// Future spawning (native agent)
sessions_spawn({
  agentId: 'wolverine',
  task: 'Implement user auth module per PRD',
  options: {
    swarmMode: true,
    teammates: 3,
    permissionMode: 'bypassPermissions'
  }
});

// Agent-to-agent communication
agentToAgent({
  targetAgent: 'magneto',
  action: 'validate',
  payload: {
    files: ['src/auth.js', 'tests/auth.test.js'],
    description: 'User auth implementation'
  }
});
```

---

## Appendix C: Migration Path

**For Gambit (Main Agent):**

Old Pattern:
```javascript
exec({
  pty: true,
  background: true,
  command: `claude --print 'task' && openclaw gateway wake --text "Done" --mode now`
});
```

New Pattern:
```javascript
sessions_spawn({
  agentId: 'wolverine',
  task: 'task',
  onComplete: (result) => {
    // Automatic notification via agent system
  }
});
```

**For Wolverine Configuration:**

Old (in openclaw.json):
```json
{
  "id": "wolverine",
  "model": "anthropic/claude-sonnet-4-5",
  "workspace": "/Users/dave/.openclaw/workspace-wolverine"
}
```

New (in openclaw.json):
```json
{
  "id": "wolverine",
  "runtime": "claudeCode",
  "model": "anthropic/claude-sonnet-4-5",
  "workspace": "/Users/dave/.openclaw/workspace-wolverine",
  "claudeCode": {
    "binaryPath": "/opt/homebrew/bin/claude",
    "permissionMode": "bypassPermissions",
    "plugins": ["ralph-wiggum", "claude-mem"],
    "agentTeams": true
  }
}
```

---

*End of PRD*

**Next Steps:**
1. Review with Dave for approval
2. Create Phase 1 implementation tasks
3. Research OpenClaw agent spawning code
4. Prototype Claude Code communication bridge
5. Write Phase 1 detailed technical spec
