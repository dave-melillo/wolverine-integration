/**
 * Claude Code Process Spawner
 * Manages spawning and lifecycle of Claude Code processes for OpenClaw agents
 */

import { spawn as nodePtySpawn, IPty } from 'node-pty';
import { EventEmitter } from 'events';
import {
  AgentConfig,
  ClaudeCodeSpawnOptions,
  ClaudeCodeEvent,
  ClaudeCodeSession,
  ClaudeCodePermissionMode,
} from '../types/runtime';

export interface SpawnerOptions {
  /** Agent configuration */
  agent: AgentConfig;

  /** Logger function */
  logger?: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any) => void;
}

/**
 * Manages Claude Code process spawning and communication
 */
export class ClaudeCodeProcessSpawner extends EventEmitter {
  private agent: AgentConfig;
  private logger: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any) => void;
  private activeSessions: Map<string, { pty: IPty; session: ClaudeCodeSession }>;

  constructor(options: SpawnerOptions) {
    super();
    this.agent = options.agent;
    this.logger = options.logger || this.defaultLogger;
    this.activeSessions = new Map();
  }

  /**
   * Spawn a new Claude Code session
   */
  async spawn(options: ClaudeCodeSpawnOptions): Promise<ClaudeCodeSession> {
    const sessionId = this.generateSessionId();
    const claudeConfig = this.agent.claudeCode || {};

    this.logger('info', 'Spawning Claude Code session', {
      agentId: this.agent.id,
      sessionId,
      task: options.task.substring(0, 100),
    });

    // Build command arguments
    const args = this.buildCommandArgs(options);
    const binaryPath = claudeConfig.binaryPath || '/opt/homebrew/bin/claude';
    const workdir = options.continue ? claudeConfig.workdir || this.agent.workspace : this.agent.workspace;

    // Prepare environment variables
    const env = {
      ...process.env,
      ...claudeConfig.env,
    };

    // Enable agent teams if configured
    if (claudeConfig.agentTeams || options.enableTeams) {
      env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = '1';
    }

    // Spawn PTY process
    const pty = nodePtySpawn(binaryPath, args, {
      name: 'xterm-256color',
      cols: 120,
      rows: 40,
      cwd: workdir,
      env,
    });

    // Create session object
    const session: ClaudeCodeSession = {
      sessionId,
      agentId: this.agent.id,
      pid: pty.pid,
      workdir,
      task: options.task,
      startedAt: new Date(),
      lastActivity: new Date(),
      state: 'starting',
      outputBuffer: [],
    };

    // Store session
    this.activeSessions.set(sessionId, { pty, session });

    // Set up event handlers
    this.setupPtyHandlers(pty, session);

    // Send initial task if not resuming
    if (!options.resumeSessionId && !options.continue) {
      // Wait a bit for Claude Code to initialize
      await this.sleep(1000);
      this.sendTask(sessionId, options.task);
    }

    this.emit('started', {
      type: 'started',
      sessionId,
      pid: pty.pid,
    } as ClaudeCodeEvent);

    return session;
  }

  /**
   * Send input to a running session
   */
  write(sessionId: string, input: string): void {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }

    this.logger('debug', 'Writing to session', { sessionId, input: input.substring(0, 100) });
    sessionData.pty.write(input);
    sessionData.session.lastActivity = new Date();
  }

  /**
   * Stop a running session
   */
  async stop(sessionId: string, force: boolean = false): Promise<void> {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) {
      this.logger('warn', 'Attempted to stop non-existent session', { sessionId });
      return;
    }

    this.logger('info', 'Stopping Claude Code session', { sessionId, force });

    if (force) {
      sessionData.pty.kill('SIGKILL');
    } else {
      // Send Ctrl+C to gracefully stop
      sessionData.pty.write('\x03');

      // Wait for graceful shutdown, then force kill
      await this.sleep(3000);
      if (this.activeSessions.has(sessionId)) {
        sessionData.pty.kill('SIGTERM');
      }
    }

    sessionData.session.state = 'stopped';
    this.activeSessions.delete(sessionId);

    this.emit('stopped', {
      type: 'stopped',
      sessionId,
    } as ClaudeCodeEvent);
  }

  /**
   * Restart a session
   */
  async restart(sessionId: string): Promise<ClaudeCodeSession> {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }

    this.logger('info', 'Restarting Claude Code session', { sessionId });

    const { task, workdir } = sessionData.session;
    await this.stop(sessionId, true);

    // Respawn with same task
    return this.spawn({
      task,
      continue: false,
    });
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): ClaudeCodeSession | undefined {
    const sessionData = this.activeSessions.get(sessionId);
    return sessionData?.session;
  }

  /**
   * Get all active sessions for this agent
   */
  getAllSessions(): ClaudeCodeSession[] {
    return Array.from(this.activeSessions.values()).map((sd) => sd.session);
  }

  /**
   * Clean up all sessions
   */
  async cleanup(): Promise<void> {
    this.logger('info', 'Cleaning up all Claude Code sessions', {
      count: this.activeSessions.size,
    });

    const stopPromises = Array.from(this.activeSessions.keys()).map((sessionId) =>
      this.stop(sessionId, true)
    );

    await Promise.all(stopPromises);
  }

  // Private methods

  private setupPtyHandlers(pty: IPty, session: ClaudeCodeSession): void {
    pty.onData((data: string) => {
      session.lastActivity = new Date();
      session.outputBuffer.push(data);

      // Keep buffer size reasonable (last 100 lines)
      if (session.outputBuffer.length > 100) {
        session.outputBuffer.shift();
      }

      // Update session state based on output patterns
      if (session.state === 'starting' && data.includes('Claude Code')) {
        session.state = 'running';
      }

      this.emit('output', {
        type: 'output',
        sessionId: session.sessionId,
        data,
      } as ClaudeCodeEvent);

      this.logger('debug', 'PTY output', {
        sessionId: session.sessionId,
        output: data.substring(0, 200),
      });
    });

    pty.onExit((exitCode) => {
      this.logger('info', 'Claude Code process exited', {
        sessionId: session.sessionId,
        exitCode: exitCode.exitCode,
      });

      session.state = 'stopped';
      this.activeSessions.delete(session.sessionId);

      this.emit('stopped', {
        type: 'stopped',
        sessionId: session.sessionId,
        exitCode: exitCode.exitCode,
      } as ClaudeCodeEvent);
    });
  }

  private buildCommandArgs(options: ClaudeCodeSpawnOptions): string[] {
    const args: string[] = [];
    const claudeConfig = this.agent.claudeCode || {};

    // Resume or continue session
    if (options.resumeSessionId) {
      args.push('--resume', options.resumeSessionId);
    } else if (options.continue) {
      args.push('--continue');
    }

    // Permission mode
    const permissionMode = options.permissionMode || claudeConfig.permissionMode || 'bypassPermissions';
    args.push('--permission-mode', permissionMode);

    // Model selection
    const model = options.model || claudeConfig.model;
    if (model) {
      args.push('--model', model);
    }

    // Output format (default to text for interactive mode)
    if (options.outputFormat) {
      args.push('--output-format', options.outputFormat);
    }

    return args;
  }

  private sendTask(sessionId: string, task: string): void {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Send the task followed by Enter
    sessionData.pty.write(`${task}\n`);
    this.logger('debug', 'Task sent to Claude Code', {
      sessionId,
      task: task.substring(0, 100),
    });
  }

  private generateSessionId(): string {
    return `cc-${this.agent.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private defaultLogger(level: string, message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`);
  }
}
