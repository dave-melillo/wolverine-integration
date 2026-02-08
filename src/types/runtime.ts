/**
 * Type definitions for Claude Code runtime integration with OpenClaw Gateway
 * Phase 1: Foundation
 */

/**
 * Runtime type identifier for Claude Code agents
 */
export type RuntimeType = 'default' | 'claudeCode';

/**
 * Permission modes supported by Claude Code
 */
export type ClaudeCodePermissionMode =
  | 'bypassPermissions'
  | 'acceptEdits'
  | 'delegate'
  | 'plan'
  | 'dontAsk';

/**
 * Claude Code model options
 */
export type ClaudeCodeModel =
  | 'opus'
  | 'sonnet'
  | 'haiku'
  | 'anthropic/claude-opus-4-6'
  | 'anthropic/claude-sonnet-4-5'
  | 'anthropic/claude-haiku-4-5';

/**
 * Claude Code configuration for OpenClaw agents
 */
export interface ClaudeCodeConfig {
  /** Path to claude binary (defaults to /opt/homebrew/bin/claude) */
  binaryPath?: string;

  /** Permission mode for autonomous operation */
  permissionMode?: ClaudeCodePermissionMode;

  /** Enable session persistence and resume */
  sessionPersistence?: boolean;

  /** Enabled plugins (e.g., 'ralph-wiggum', 'claude-mem', 'github') */
  plugins?: string[];

  /** MCP server names to load */
  mcpServers?: string[];

  /** Enable agent teams (experimental) */
  agentTeams?: boolean;

  /** Model to use for this agent */
  model?: ClaudeCodeModel;

  /** Working directory for Claude Code sessions */
  workdir?: string;

  /** Environment variables to pass to Claude Code */
  env?: Record<string, string>;
}

/**
 * Extended OpenClaw agent configuration with Claude Code runtime support
 */
export interface AgentConfig {
  /** Unique agent identifier */
  id: string;

  /** Human-readable agent name */
  name: string;

  /** Runtime type - 'default' uses standard Moltbot, 'claudeCode' uses Claude Code */
  runtime?: RuntimeType;

  /** Model identifier (for default runtime) */
  model?: string;

  /** Agent workspace directory */
  workspace: string;

  /** Agent directory with personality files */
  agentDir: string;

  /** Claude Code specific configuration (only used when runtime === 'claudeCode') */
  claudeCode?: ClaudeCodeConfig;

  /** Agent identity */
  identity?: {
    name: string;
    emoji?: string;
  };
}

/**
 * Session spawn options for Claude Code agents
 */
export interface ClaudeCodeSpawnOptions {
  /** The task/prompt to execute */
  task: string;

  /** Session ID to resume (optional) */
  resumeSessionId?: string;

  /** Continue last session in workdir (optional) */
  continue?: boolean;

  /** Permission mode override */
  permissionMode?: ClaudeCodePermissionMode;

  /** Model override */
  model?: ClaudeCodeModel;

  /** Enable agent teams for this task */
  enableTeams?: boolean;

  /** Number of teammates to spawn (requires enableTeams) */
  teammates?: number;

  /** Output format: 'text', 'json', 'stream-json' */
  outputFormat?: 'text' | 'json' | 'stream-json';
}

/**
 * Session state for active Claude Code processes
 */
export interface ClaudeCodeSession {
  /** Unique session identifier */
  sessionId: string;

  /** Agent ID that owns this session */
  agentId: string;

  /** Process ID of Claude Code instance */
  pid: number;

  /** Working directory */
  workdir: string;

  /** Current task being executed */
  task: string;

  /** Session start timestamp */
  startedAt: Date;

  /** Session state */
  state: 'starting' | 'running' | 'idle' | 'error' | 'stopped';

  /** Last activity timestamp */
  lastActivity: Date;

  /** Error message if state === 'error' */
  error?: string;

  /** Output buffer (recent output) */
  outputBuffer: string[];
}

/**
 * Event types emitted by Claude Code runtime
 */
export type ClaudeCodeEvent =
  | { type: 'started'; sessionId: string; pid: number }
  | { type: 'output'; sessionId: string; data: string }
  | { type: 'error'; sessionId: string; error: string }
  | { type: 'completed'; sessionId: string; result?: string }
  | { type: 'stopped'; sessionId: string; exitCode?: number };

/**
 * Options for creating a Claude Code runtime instance
 */
export interface ClaudeCodeRuntimeOptions {
  /** Agent configuration */
  agent: AgentConfig;

  /** Callback for runtime events */
  onEvent?: (event: ClaudeCodeEvent) => void;

  /** Logger function */
  logger?: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any) => void;
}
