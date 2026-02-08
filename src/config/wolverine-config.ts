/**
 * Wolverine Agent Configuration for OpenClaw
 * Example configuration showing how to set up Wolverine with Claude Code runtime
 */

import { AgentConfig } from '../types/runtime';

/**
 * Default Wolverine agent configuration with Claude Code runtime
 */
export const wolverineConfig: AgentConfig = {
  id: 'wolverine',
  name: 'Wolverine',
  runtime: 'claudeCode',
  model: 'anthropic/claude-sonnet-4-5',
  workspace: '/Users/dave/.openclaw/workspace-wolverine',
  agentDir: '/Users/dave/.openclaw/agents/wolverine/agent',
  identity: {
    name: 'Wolverine',
    emoji: '🐺',
  },
  claudeCode: {
    // Path to Claude Code binary
    binaryPath: '/opt/homebrew/bin/claude',

    // Permission mode for autonomous operation
    permissionMode: 'bypassPermissions',

    // Enable session persistence and resume
    sessionPersistence: true,

    // Enabled plugins
    plugins: [
      'ralph-wiggum',
      'claude-mem',
      'github',
    ],

    // MCP servers (if any configured)
    mcpServers: [],

    // Enable agent teams (experimental)
    agentTeams: true,

    // Default model for tasks
    model: 'sonnet',

    // Working directory (defaults to workspace)
    workdir: '/Users/dave/.openclaw/workspace-wolverine',

    // Environment variables
    env: {
      CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1',
    },
  },
};

/**
 * Alternative configuration for testing/development
 */
export const wolverineDevConfig: AgentConfig = {
  ...wolverineConfig,
  id: 'wolverine-dev',
  name: 'Wolverine (Dev)',
  workspace: '/Users/dave/.openclaw/workspace-wolverine-dev',
  claudeCode: {
    ...wolverineConfig.claudeCode,
    permissionMode: 'dontAsk', // More permissive for dev
    model: 'haiku', // Faster/cheaper for testing
  },
};

/**
 * Helper function to create custom Wolverine configurations
 */
export function createWolverineConfig(overrides: Partial<AgentConfig>): AgentConfig {
  return {
    ...wolverineConfig,
    ...overrides,
    claudeCode: {
      ...wolverineConfig.claudeCode,
      ...overrides.claudeCode,
    },
  };
}
