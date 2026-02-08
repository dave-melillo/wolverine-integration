/**
 * Wolverine Claude Code Integration for OpenClaw Gateway
 * Phase 1: Foundation
 *
 * This module provides Claude Code runtime integration for OpenClaw agents,
 * enabling Wolverine to run as a native OpenClaw agent with full access to
 * Claude Code's agentic features, plugins, and agent teams.
 *
 * @packageDocumentation
 */

// Main runtime
export { ClaudeCodeRuntime } from './runtime/ClaudeCodeRuntime';
export { ClaudeCodeProcessSpawner } from './runtime/ClaudeCodeProcessSpawner';
export { ClaudeCodeCommunicator, DefaultOutputParser, JsonOutputParser } from './runtime/ClaudeCodeCommunicator';

// Type definitions
export type {
  RuntimeType,
  ClaudeCodePermissionMode,
  ClaudeCodeModel,
  ClaudeCodeConfig,
  AgentConfig,
  ClaudeCodeSpawnOptions,
  ClaudeCodeSession,
  ClaudeCodeEvent,
  ClaudeCodeRuntimeOptions,
} from './types/runtime';

// Configuration
export { wolverineConfig, wolverineDevConfig, createWolverineConfig } from './config/wolverine-config';

// Version
export const VERSION = '0.1.0';
