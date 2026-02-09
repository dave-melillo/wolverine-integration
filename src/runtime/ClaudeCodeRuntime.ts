/**
 * Claude Code Runtime
 * Main runtime manager for Claude Code integration with OpenClaw Gateway
 * Provides session lifecycle management (start/stop/restart)
 */

import { EventEmitter } from 'events';
import { ClaudeCodeProcessSpawner } from './ClaudeCodeProcessSpawner';
import { ClaudeCodeCommunicator } from './ClaudeCodeCommunicator';
import {
  AgentConfig,
  ClaudeCodeSpawnOptions,
  ClaudeCodeSession,
  ClaudeCodeEvent,
  ClaudeCodeRuntimeOptions,
} from '../types/runtime';

/**
 * Main runtime for Claude Code agent integration
 */
export class ClaudeCodeRuntime extends EventEmitter {
  private agent: AgentConfig;
  private spawner: ClaudeCodeProcessSpawner;
  private communicator: ClaudeCodeCommunicator;
  private logger: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any) => void;
  private isInitialized: boolean = false;

  constructor(options: ClaudeCodeRuntimeOptions) {
    super();
    this.agent = options.agent;
    this.logger = options.logger || this.defaultLogger;

    // Validate agent configuration
    this.validateAgentConfig();

    // Initialize spawner
    this.spawner = new ClaudeCodeProcessSpawner({
      agent: this.agent,
      logger: this.logger,
    });

    // Initialize communicator
    this.communicator = new ClaudeCodeCommunicator({
      spawner: this.spawner,
      logger: this.logger,
    });

    // Forward events from spawner
    this.setupEventForwarding(options.onEvent);

    this.isInitialized = true;
    this.logger('info', 'Claude Code Runtime initialized', {
      agentId: this.agent.id,
      workspace: this.agent.workspace,
    });
  }

  /**
   * Start a new Claude Code session
   */
  async startSession(options: ClaudeCodeSpawnOptions): Promise<ClaudeCodeSession> {
    this.ensureInitialized();

    this.logger('info', 'Starting Claude Code session', {
      agentId: this.agent.id,
      task: options.task.substring(0, 100),
      resume: options.resumeSessionId,
      continue: options.continue,
    });

    try {
      const session = await this.spawner.spawn(options);

      this.logger('info', 'Claude Code session started', {
        sessionId: session.sessionId,
        pid: session.pid,
      });

      return session;
    } catch (error) {
      this.logger('error', 'Failed to start Claude Code session', {
        agentId: this.agent.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Stop a running session
   */
  async stopSession(sessionId: string, force: boolean = false): Promise<void> {
    this.ensureInitialized();

    this.logger('info', 'Stopping Claude Code session', { sessionId, force });

    try {
      await this.spawner.stop(sessionId, force);
      this.communicator.offOutput(sessionId);

      this.logger('info', 'Claude Code session stopped', { sessionId });
    } catch (error) {
      this.logger('error', 'Failed to stop Claude Code session', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Restart a session
   */
  async restartSession(sessionId: string): Promise<ClaudeCodeSession> {
    this.ensureInitialized();

    this.logger('info', 'Restarting Claude Code session', { sessionId });

    try {
      const newSession = await this.spawner.restart(sessionId);

      this.logger('info', 'Claude Code session restarted', {
        oldSessionId: sessionId,
        newSessionId: newSession.sessionId,
      });

      return newSession;
    } catch (error) {
      this.logger('error', 'Failed to restart Claude Code session', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Resume a previous session by ID
   */
  async resumeSession(sessionId: string, task?: string): Promise<ClaudeCodeSession> {
    this.ensureInitialized();

    this.logger('info', 'Resuming Claude Code session', { sessionId });

    return this.startSession({
      task: task || 'Continue',
      resumeSessionId: sessionId,
    });
  }

  /**
   * Continue the last session in the workspace
   */
  async continueLastSession(task?: string): Promise<ClaudeCodeSession> {
    this.ensureInitialized();

    this.logger('info', 'Continuing last Claude Code session', {
      workspace: this.agent.workspace,
    });

    return this.startSession({
      task: task || 'Continue',
      continue: true,
    });
  }

  /**
   * Send a message to a running session
   */
  async sendMessage(sessionId: string, message: string): Promise<void> {
    this.ensureInitialized();
    await this.communicator.sendMessage(sessionId, message);
  }

  /**
   * Send a command to a running session (e.g., /ralph-loop)
   */
  async sendCommand(sessionId: string, command: string, args?: string): Promise<void> {
    this.ensureInitialized();
    await this.communicator.sendCommand(sessionId, command, args);
  }

  /**
   * Wait for a session to complete
   */
  async waitForCompletion(sessionId: string, timeoutMs?: number): Promise<any> {
    this.ensureInitialized();
    return this.communicator.waitForCompletion(sessionId, timeoutMs);
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): ClaudeCodeSession | undefined {
    this.ensureInitialized();
    return this.spawner.getSession(sessionId);
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): ClaudeCodeSession[] {
    this.ensureInitialized();
    return this.spawner.getAllSessions();
  }

  /**
   * Interrupt a running session (send Ctrl+C)
   */
  async interruptSession(sessionId: string): Promise<void> {
    this.ensureInitialized();
    await this.communicator.interrupt(sessionId);
  }

  /**
   * Check if Claude Code is available
   */
  async checkAvailability(): Promise<{ available: boolean; version?: string; error?: string }> {
    const claudeConfig = this.agent.claudeCode || {};
    const binaryPath = claudeConfig.binaryPath || '/opt/homebrew/bin/claude';

    try {
      const childProcess = await import('child_process');
      const output = childProcess.execSync(`${binaryPath} --version`, {
        encoding: 'utf-8',
        timeout: 5000,
      });

      const version = output.trim();

      this.logger('info', 'Claude Code availability check', {
        available: true,
        version,
        binaryPath,
      });

      return { available: true, version };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      this.logger('warn', 'Claude Code not available', {
        binaryPath,
        error: errorMsg,
      });

      return {
        available: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Shutdown the runtime and clean up all sessions
   */
  async shutdown(): Promise<void> {
    this.logger('info', 'Shutting down Claude Code Runtime', {
      agentId: this.agent.id,
      activeSessions: this.spawner.getAllSessions().length,
    });

    try {
      await this.spawner.cleanup();
      this.communicator.cleanup();
      this.isInitialized = false;

      this.logger('info', 'Claude Code Runtime shutdown complete', {
        agentId: this.agent.id,
      });
    } catch (error) {
      this.logger('error', 'Error during shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Private methods

  private validateAgentConfig(): void {
    if (!this.agent.id) {
      throw new Error('Agent configuration missing required field: id');
    }

    if (!this.agent.workspace) {
      throw new Error('Agent configuration missing required field: workspace');
    }

    if (this.agent.runtime !== 'claudeCode') {
      throw new Error(
        `Invalid runtime type: ${this.agent.runtime}. Expected 'claudeCode'.`
      );
    }

    this.logger('debug', 'Agent configuration validated', {
      agentId: this.agent.id,
      workspace: this.agent.workspace,
    });
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Claude Code Runtime is not initialized');
    }
  }

  private setupEventForwarding(onEvent?: (event: ClaudeCodeEvent) => void): void {
    // Forward all spawner events
    this.spawner.on('started', (event: ClaudeCodeEvent) => {
      this.emit('started', event);
      if (onEvent) onEvent(event);
    });

    this.spawner.on('output', (event: ClaudeCodeEvent) => {
      this.emit('output', event);
      if (onEvent) onEvent(event);
    });

    this.spawner.on('error', (event: ClaudeCodeEvent) => {
      this.emit('error', event);
      if (onEvent) onEvent(event);
    });

    this.spawner.on('completed', (event: ClaudeCodeEvent) => {
      this.emit('completed', event);
      if (onEvent) onEvent(event);
    });

    this.spawner.on('stopped', (event: ClaudeCodeEvent) => {
      this.emit('stopped', event);
      if (onEvent) onEvent(event);
    });

    // Forward communicator events
    this.communicator.on('parsed-output', (data) => {
      this.emit('parsed-output', data);
    });
  }

  private defaultLogger(level: string, message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    console.log(`[${timestamp}] [${level.toUpperCase()}] [ClaudeCodeRuntime] ${message}${metaStr}`);
  }
}
