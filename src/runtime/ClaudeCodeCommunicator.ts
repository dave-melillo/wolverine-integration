/**
 * Claude Code Communicator
 * Handles bidirectional communication with Claude Code via stdin/stdout
 * Translates between OpenClaw messages and Claude Code commands
 */

import { EventEmitter } from 'events';
import { ClaudeCodeProcessSpawner } from './ClaudeCodeProcessSpawner';
import { ClaudeCodeEvent } from '../types/runtime';

export interface CommunicatorOptions {
  /** Process spawner instance */
  spawner: ClaudeCodeProcessSpawner;

  /** Parser for Claude Code output */
  outputParser?: OutputParser;

  /** Logger function */
  logger?: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any) => void;
}

export interface OutputParser {
  /** Parse Claude Code output and extract structured data */
  parse(output: string): ParsedOutput;
}

export interface ParsedOutput {
  /** Output type */
  type: 'status' | 'result' | 'error' | 'prompt' | 'raw';

  /** Parsed content */
  content: string;

  /** Structured data (if JSON output mode) */
  data?: any;

  /** Whether this indicates task completion */
  isComplete?: boolean;

  /** Error message if type === 'error' */
  error?: string;
}

/**
 * Default output parser for Claude Code text mode
 */
export class DefaultOutputParser implements OutputParser {
  private buffer: string = '';

  parse(output: string): ParsedOutput {
    this.buffer += output;

    // Detect completion patterns
    if (this.buffer.includes('Task completed') || this.buffer.includes('Done')) {
      return {
        type: 'result',
        content: this.buffer,
        isComplete: true,
      };
    }

    // Detect error patterns
    if (this.buffer.includes('Error:') || this.buffer.includes('Failed')) {
      return {
        type: 'error',
        content: this.buffer,
        error: this.extractError(this.buffer),
      };
    }

    // Detect prompts (Claude asking for input)
    if (this.buffer.endsWith('?') || this.buffer.includes('Please provide')) {
      return {
        type: 'prompt',
        content: this.buffer,
      };
    }

    // Regular output
    return {
      type: 'raw',
      content: output,
    };
  }

  private extractError(text: string): string {
    const errorMatch = text.match(/Error:\s*(.+?)(?:\n|$)/);
    return errorMatch ? errorMatch[1] : text;
  }

  reset(): void {
    this.buffer = '';
  }
}

/**
 * JSON output parser for structured Claude Code responses
 */
export class JsonOutputParser implements OutputParser {
  parse(output: string): ParsedOutput {
    try {
      const data = JSON.parse(output);

      if (data.type === 'completion') {
        return {
          type: 'result',
          content: data.result || '',
          data,
          isComplete: true,
        };
      }

      if (data.type === 'error') {
        return {
          type: 'error',
          content: data.message || '',
          data,
          error: data.message,
        };
      }

      return {
        type: 'status',
        content: JSON.stringify(data, null, 2),
        data,
      };
    } catch {
      // Not valid JSON, treat as raw output
      return {
        type: 'raw',
        content: output,
      };
    }
  }
}

/**
 * Manages communication with Claude Code sessions
 */
export class ClaudeCodeCommunicator extends EventEmitter {
  private spawner: ClaudeCodeProcessSpawner;
  private parser: OutputParser;
  private logger: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any) => void;
  private outputHandlers: Map<string, (output: ParsedOutput) => void>;

  constructor(options: CommunicatorOptions) {
    super();
    this.spawner = options.spawner;
    this.parser = options.outputParser || new DefaultOutputParser();
    this.logger = options.logger || this.defaultLogger;
    this.outputHandlers = new Map();

    this.setupSpawnerHandlers();
  }

  /**
   * Send a message to Claude Code session
   */
  async sendMessage(sessionId: string, message: string): Promise<void> {
    this.logger('info', 'Sending message to Claude Code', {
      sessionId,
      message: message.substring(0, 100),
    });

    // Format message for Claude Code
    const formattedMessage = this.formatMessage(message);
    this.spawner.write(sessionId, formattedMessage);
  }

  /**
   * Send a command to Claude Code (e.g., /ralph-loop)
   */
  async sendCommand(sessionId: string, command: string, args?: string): Promise<void> {
    const fullCommand = args ? `${command} ${args}` : command;

    this.logger('info', 'Sending command to Claude Code', {
      sessionId,
      command: fullCommand,
    });

    this.spawner.write(sessionId, `${fullCommand}\n`);
  }

  /**
   * Register a handler for parsed output from a specific session
   */
  onOutput(sessionId: string, handler: (output: ParsedOutput) => void): void {
    this.outputHandlers.set(sessionId, handler);
  }

  /**
   * Remove output handler for a session
   */
  offOutput(sessionId: string): void {
    this.outputHandlers.delete(sessionId);
  }

  /**
   * Wait for task completion
   */
  async waitForCompletion(sessionId: string, timeoutMs: number = 300000): Promise<ParsedOutput> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.offOutput(sessionId);
        reject(new Error(`Timeout waiting for completion: ${sessionId}`));
      }, timeoutMs);

      this.onOutput(sessionId, (output) => {
        if (output.isComplete || output.type === 'error') {
          clearTimeout(timeout);
          this.offOutput(sessionId);

          if (output.type === 'error') {
            reject(new Error(output.error || 'Task failed'));
          } else {
            resolve(output);
          }
        }
      });
    });
  }

  /**
   * Respond to a Claude Code prompt
   */
  async respondToPrompt(sessionId: string, response: string): Promise<void> {
    this.logger('info', 'Responding to Claude Code prompt', {
      sessionId,
      response: response.substring(0, 100),
    });

    this.spawner.write(sessionId, `${response}\n`);
  }

  /**
   * Send interrupt signal (Ctrl+C)
   */
  async interrupt(sessionId: string): Promise<void> {
    this.logger('info', 'Interrupting Claude Code session', { sessionId });
    this.spawner.write(sessionId, '\x03');
  }

  /**
   * Clean up handlers
   */
  cleanup(): void {
    this.outputHandlers.clear();
  }

  // Private methods

  private setupSpawnerHandlers(): void {
    this.spawner.on('output', (event: ClaudeCodeEvent) => {
      if (event.type !== 'output') return;

      const { sessionId, data } = event as Extract<ClaudeCodeEvent, { type: 'output' }>;

      // Parse output
      const parsed = this.parser.parse(data);

      // Emit parsed output
      this.emit('parsed-output', { sessionId, output: parsed });

      // Call session-specific handler
      const handler = this.outputHandlers.get(sessionId);
      if (handler) {
        handler(parsed);
      }

      this.logger('debug', 'Parsed output', {
        sessionId,
        type: parsed.type,
        isComplete: parsed.isComplete,
      });
    });

    this.spawner.on('error', (event: ClaudeCodeEvent) => {
      if (event.type !== 'error') return;

      const { sessionId, error } = event as Extract<ClaudeCodeEvent, { type: 'error' }>;

      this.logger('error', 'Claude Code error', { sessionId, error });
      this.emit('error', { sessionId, error });
    });

    this.spawner.on('completed', (event: ClaudeCodeEvent) => {
      if (event.type !== 'completed') return;

      const { sessionId } = event as Extract<ClaudeCodeEvent, { type: 'completed' }>;

      this.logger('info', 'Claude Code task completed', { sessionId });
      this.emit('completed', { sessionId });

      // Clean up handler
      this.offOutput(sessionId);
    });
  }

  private formatMessage(message: string): string {
    // Ensure message ends with newline for Claude Code to process
    return message.endsWith('\n') ? message : `${message}\n`;
  }

  private defaultLogger(level: string, message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`);
  }
}
