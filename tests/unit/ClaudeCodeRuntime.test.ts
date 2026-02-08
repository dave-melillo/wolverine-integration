/**
 * Unit tests for ClaudeCodeRuntime
 */

import { ClaudeCodeRuntime } from '../../src/runtime/ClaudeCodeRuntime';
import { AgentConfig } from '../../src/types/runtime';

describe('ClaudeCodeRuntime', () => {
  let testConfig: AgentConfig;

  beforeEach(() => {
    testConfig = {
      id: 'test-agent',
      name: 'Test Agent',
      runtime: 'claudeCode',
      model: 'anthropic/claude-sonnet-4-5',
      workspace: '/tmp/test-workspace',
      agentDir: '/tmp/test-agent',
      claudeCode: {
        binaryPath: '/opt/homebrew/bin/claude',
        permissionMode: 'bypassPermissions',
        sessionPersistence: true,
      },
    };
  });

  describe('constructor', () => {
    it('should initialize with valid configuration', () => {
      expect(() => {
        new ClaudeCodeRuntime({
          agent: testConfig,
        });
      }).not.toThrow();
    });

    it('should throw error if agent id is missing', () => {
      const invalidConfig = { ...testConfig, id: '' };

      expect(() => {
        new ClaudeCodeRuntime({
          agent: invalidConfig,
        });
      }).toThrow('Agent configuration missing required field: id');
    });

    it('should throw error if workspace is missing', () => {
      const invalidConfig = { ...testConfig, workspace: '' };

      expect(() => {
        new ClaudeCodeRuntime({
          agent: invalidConfig,
        });
      }).toThrow('Agent configuration missing required field: workspace');
    });

    it('should throw error if runtime type is not claudeCode', () => {
      const invalidConfig = { ...testConfig, runtime: 'default' as any };

      expect(() => {
        new ClaudeCodeRuntime({
          agent: invalidConfig,
        });
      }).toThrow('Invalid runtime type: default. Expected \'claudeCode\'.');
    });
  });

  describe('checkAvailability', () => {
    it('should check if Claude Code is available', async () => {
      const runtime = new ClaudeCodeRuntime({
        agent: testConfig,
      });

      const result = await runtime.checkAvailability();

      expect(result).toHaveProperty('available');
      expect(typeof result.available).toBe('boolean');

      if (result.available) {
        expect(result.version).toBeDefined();
      } else {
        expect(result.error).toBeDefined();
      }

      await runtime.shutdown();
    });
  });

  describe('session management', () => {
    it('should throw error if methods called before initialization', async () => {
      const runtime = new ClaudeCodeRuntime({
        agent: testConfig,
      });

      await runtime.shutdown(); // Shutdown to make it uninitialized

      await expect(
        runtime.startSession({ task: 'test' })
      ).rejects.toThrow('Claude Code Runtime is not initialized');
    });
  });

  describe('getAllSessions', () => {
    it('should return empty array when no sessions active', () => {
      const runtime = new ClaudeCodeRuntime({
        agent: testConfig,
      });

      const sessions = runtime.getAllSessions();
      expect(sessions).toEqual([]);
    });
  });
});
