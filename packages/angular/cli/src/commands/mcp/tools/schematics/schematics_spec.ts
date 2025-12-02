/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { McpToolContext } from '../tool-registry';
import { LIST_SCHEMATICS_TOOL } from './list-schematics';
import { RUN_SCHEMATIC_TOOL, normalizeOptions } from './run-schematic';
import { emitKebabCaseHints, getSchematicDocLink } from './utils';

// Shared mocks for MCP tool tests
// Mock schematic collection and workspace context
const mockSchematicCollection = {
  schematics: {
    component: {
      name: 'component',
      aliases: ['c'],
      options: [
        { name: 'name', type: 'string', required: true },
        { name: 'skipImport', type: 'boolean' },
        { name: 'fooBar', type: 'number' },
      ],
      required: ['name'],
      hidden: false,
      private: false,
    },
    directive: {
      name: 'directive',
      aliases: ['d'],
      options: [{ name: 'name', type: 'string', required: true }],
      required: ['name'],
      hidden: false,
      private: false,
    },
    hiddenSchematic: {
      name: 'hiddenSchematic',
      aliases: ['h'],
      options: [{ name: 'name', type: 'string', required: true }],
      required: ['name'],
      hidden: true,
      private: false,
    },
    privateSchematic: {
      name: 'privateSchematic',
      aliases: ['p'],
      options: [{ name: 'name', type: 'string', required: true }],
      required: ['name'],
      hidden: false,
      private: true,
    },
  },
};

// Loader function for dependency injection
function mockSchematicMetaLoader() {
  return Promise.resolve({
    meta: Object.values(mockSchematicCollection.schematics),
  });
}

const mockWorkspaceContext = {
  workspacePath: '.',
  collection: mockSchematicCollection,
  schematicMetaLoader: mockSchematicMetaLoader,
};

const mockServer = {
  server: {} as unknown,
  connect: () => {},
  close: () => {},
  _toolHandlersInitialized: false,
  on: () => {},
  emit: () => {},
  registerTool: () => {},
  registerResource: () => {},
  registerResourceTemplate: () => {},
  sendNotification: () => Promise.resolve(),
  sendRequest: () => Promise.resolve({}),
  // Mock schematic collection and workspace context for tool logic
  getSchematicCollection: () => mockSchematicCollection,
  getWorkspaceContext: () => mockWorkspaceContext,
  schematicMetaLoader: mockSchematicMetaLoader,
  setToolRequestHandlers: () => {},
  createToolError: () => {},
  _completionHandlerInitialized: false,
  setCompletionRequestHandler: () => {},
  _resourceHandlersInitialized: false,
  setResourceRequestHandlers: () => {},
  setPromptRequestHandlers: () => {},
  setResourceCompletionHandler: () => {},
  setPromptCompletionHandler: () => {},
  setToolCompletionHandler: () => {},
  _toolCompletionHandlerInitialized: false,
  _promptCompletionHandlerInitialized: false,
  _resourceCompletionHandlerInitialized: false,
  handlePromptCompletion: () => {},
  handleResourceCompletion: () => {},
  _promptHandlersInitialized: false,
  resource: {},
  prompt: {},
  tool: {},
  _resourceHandlers: [],
  _promptHandlers: [],
  _toolHandlers: [],
  _resourceCompletionHandler: () => {},
  _promptCompletionHandler: () => {},
  _toolCompletionHandler: () => {},
  _createRegisteredResource: () => {},
  _createRegisteredResourceTemplate: () => {},
  _createRegisteredPrompt: () => {},
  _createRegisteredTool: () => {},
  _resource: {},
  _prompt: {},
  _tool: {},
  registerPrompt: () => {},
  isConnected: () => true,
  sendLoggingMessage: () => {},
  sendResourceListChanged: () => {},
  sendPromptListChanged: () => {},
  sendToolListChanged: () => {},
} as unknown as McpServer;

const mockExtra = {
  signal: new AbortController().signal,
  requestId: 'test',
  sendNotification: () => Promise.resolve(),
  sendRequest: () => Promise.resolve({}),
};

/**
 * Schematics MCP tool tests
 *
 * Covers: run_schematic, list_schematics, option normalization, kebab-case flags, doc links, and error handling.
 */
describe('Schematics MCP Tools', () => {
  it('getSchematicDocLink returns correct per-schematic doc URL', () => {
    expect(getSchematicDocLink('component')).toBe('https://angular.dev/cli/generate/component');
    expect(getSchematicDocLink('directive')).toBe('https://angular.dev/cli/generate/directive');
  });

  it('emitKebabCaseHints emits hints for camelCase keys', () => {
    const opts = { skipImport: true, flat: false, fooBarBaz: 1 };
    const hints = emitKebabCaseHints(opts);
    expect(hints).toContain("Option 'skipImport' emitted as '--skip-import'");
  });

  it('normalizeOptions normalizes booleans, numbers, enums, arrays', () => {
    const meta = {
      name: 'test',
      options: [
        { name: 'flag', type: 'boolean' },
        { name: 'count', type: 'number' },
        { name: 'mode', type: 'string', enum: ['fast', 'slow'] },
        { name: 'tags', type: 'array' },
      ],
    };
    const input = {
      flag: 'true',
      count: '42',
      mode: 'FAST',
      tags: 'a,b,c',
    };
    const { normalized, hints } = normalizeOptions(meta, input);
    expect(normalized.flag).toBe(true);
    expect(normalized.count).toBe(42);
    expect(normalized.tags).toEqual(['a', 'b', 'c']);
    // Check that hints include coercion info
    expect(hints.some((h) => h.includes('coerced'))).toBe(true);
  });

  describe('run_schematic', () => {
    it('fails with unknown schematic', async () => {
      const input = { schematic: 'notarealschematic', workspacePath: '.', options: {} };
      const context: McpToolContext = {
        server: mockServer,
        devServers: new Map(),
        logger: { warn: () => {} },
        schematicMetaLoader: mockSchematicMetaLoader,
      };
      const toolCallback = await RUN_SCHEMATIC_TOOL.factory(context);
      const raw = await toolCallback(input, mockExtra);
      const text = typeof raw.content?.[0]?.text === 'string' ? raw.content[0].text : '{}';
      // Type guard for JSON.parse
      const result = typeof text === 'string' ? JSON.parse(text) : {};
      expect(result.runResult.success).toBe(false);
      expect(Array.isArray(result.instructions)).toBe(true);
    });

    it('fails with missing required options', async () => {
      const input = { schematic: 'component', workspacePath: '.', options: {} };
      const context: McpToolContext = {
        server: mockServer,
        devServers: new Map(),
        logger: { warn: () => {} },
        schematicMetaLoader: mockSchematicMetaLoader,
      };
      const toolCallback = await RUN_SCHEMATIC_TOOL.factory(context);
      const raw = await toolCallback(input, mockExtra);
      const text = typeof raw.content?.[0]?.text === 'string' ? raw.content[0].text : '{}';
      const result = JSON.parse(text);
      expect(result.runResult.success).toBe(false);
      expect(Array.isArray(result.instructions)).toBe(true);
      expect(result.instructions?.some((i: string) => i.includes('Missing required option'))).toBe(
        true,
      );
    });

    it('converts camelCase options to kebab-case flags in preview', async () => {
      const input = {
        schematic: 'component',
        workspacePath: '.',
        options: { skipImport: true, fooBar: 1 },
        previewOnly: true,
      };
      const context: McpToolContext = {
        server: mockServer,
        devServers: new Map(),
        logger: { warn: () => {} },
        schematicMetaLoader: mockSchematicMetaLoader,
      };
      const toolCallback = await RUN_SCHEMATIC_TOOL.factory(context);
      const raw = await toolCallback(input, mockExtra);
      const text = typeof raw.content?.[0]?.text === 'string' ? raw.content[0].text : '{}';
      const result = JSON.parse(text);
      expect(Array.isArray(result.runResult.hints)).toBe(true);
      expect(result.runResult.hints?.some((h: string) => h.includes('--skip-import'))).toBe(true);
      expect(result.runResult.hints?.some((h: string) => h.includes('--foo-bar'))).toBe(true);
    });

    it('emits per-schematic doc link in hints', async () => {
      const input = {
        schematic: 'component',
        workspacePath: '.',
        options: { name: 'test' },
        previewOnly: true,
      };
      const context: McpToolContext = {
        server: mockServer,
        devServers: new Map(),
        logger: { warn: () => {} },
        schematicMetaLoader: mockSchematicMetaLoader,
      };
      const toolCallback = await RUN_SCHEMATIC_TOOL.factory(context);
      const raw = await toolCallback(input, mockExtra);
      const text = typeof raw.content?.[0]?.text === 'string' ? raw.content[0].text : '{}';
      const result = JSON.parse(text);
      expect(Array.isArray(result.runResult.hints)).toBe(true);
      expect(
        result.runResult.hints?.some((h: string) =>
          h.includes('https://angular.dev/cli/generate/component'),
        ),
      ).toBe(true);
    });

    it('handles unknown option keys gracefully', async () => {
      const input = {
        schematic: 'component',
        workspacePath: '.',
        options: { name: 'test', unknownOpt: 123 },
        previewOnly: true,
      };
      const context: McpToolContext = {
        server: mockServer,
        devServers: new Map(),
        logger: { warn: () => {} },
        schematicMetaLoader: mockSchematicMetaLoader,
      };
      const toolCallback = await RUN_SCHEMATIC_TOOL.factory(context);
      const raw = await toolCallback(input, mockExtra);
      const text = typeof raw.content?.[0]?.text === 'string' ? raw.content[0].text : '{}';
      const result = JSON.parse(text);
      expect(result.runResult.success).toBe(false);
      expect(Array.isArray(result.runResult.hints)).toBe(true);
    });

    it('previewOnly returns command and does not execute', async () => {
      const input = {
        schematic: 'component',
        workspacePath: '.',
        options: { name: 'test' },
        previewOnly: true,
      };
      const context: McpToolContext = {
        server: mockServer,
        devServers: new Map(),
        logger: { warn: () => {} },
        schematicMetaLoader: mockSchematicMetaLoader,
      };
      const toolCallback = await RUN_SCHEMATIC_TOOL.factory(context);
      const resultRaw = await toolCallback(input, mockExtra);
      const text =
        typeof resultRaw.content?.[0]?.text === 'string' ? resultRaw.content[0].text : '{}';
      const result = JSON.parse(text);
      expect(result.runResult.success).toBe(false);
      expect(Array.isArray(result.instructions)).toBe(true);
      expect(result.instructions?.some((i: string) => i.includes('Preview only'))).toBe(true);
    });

    it('infers required options from prompt', async () => {
      const input = {
        schematic: 'component',
        workspacePath: '.',
        options: {},
        prompt: 'Create a component called MyTest in src/app',
      };
      const context: McpToolContext = {
        server: mockServer,
        devServers: new Map(),
        logger: { warn: () => {} },
        schematicMetaLoader: mockSchematicMetaLoader,
      };
      const toolCallback = await RUN_SCHEMATIC_TOOL.factory(context);
      const resultRaw = await toolCallback(input, mockExtra);
      const text =
        typeof resultRaw.content?.[0]?.text === 'string' ? resultRaw.content[0].text : '{}';
      const result = JSON.parse(text);
      expect(Array.isArray(result.runResult.hints)).toBe(true);
      expect(
        result.runResult.hints?.some((h: string) => h.includes('Inferred required option')),
      ).toBe(true);
    });
  });

  describe('list_schematics', () => {
    it('returns all available schematics with metadata', async () => {
      const input = { workspacePath: '.' };
      const context: McpToolContext = {
        server: mockServer,
        devServers: new Map(),
        logger: { warn: () => {} },
        schematicMetaLoader: mockSchematicMetaLoader,
      };
      const toolCallback = await LIST_SCHEMATICS_TOOL.factory(context);
      const resultRaw = await toolCallback(input, mockExtra);
      const text =
        typeof resultRaw.content?.[0]?.text === 'string' ? resultRaw.content[0].text : '{}';
      const result = typeof text === 'string' ? JSON.parse(text) : {};
      expect(Array.isArray(result.schematics)).toBe(true);
      expect(result.schematics.length).toBeGreaterThan(0);
      expect(result.schematics.some((s: { name?: string }) => typeof s.name === 'string')).toBe(
        true,
      );
      expect(result.schematics.some((s: { options?: unknown }) => s.options !== undefined)).toBe(
        true,
      );
    });

    it('includes aliases, required options, and option types', async () => {
      const input = { workspacePath: '.' };
      const context: McpToolContext = {
        server: mockServer,
        devServers: new Map(),
        logger: { warn: () => {} },
        schematicMetaLoader: mockSchematicMetaLoader,
      };
      const toolCallback = await LIST_SCHEMATICS_TOOL.factory(context);
      const resultRaw = await toolCallback(input, mockExtra);
      const text =
        typeof resultRaw.content?.[0]?.text === 'string' ? resultRaw.content[0].text : '{}';
      const result = typeof text === 'string' ? JSON.parse(text) : {};
      // Use a more specific type for schematic
      const schematic = Array.isArray(result.schematics)
        ? result.schematics.find((s: { name?: string }) => s.name === 'component')
        : undefined;
      expect(schematic).toBeDefined();
      if (schematic) {
        expect(Array.isArray(schematic.aliases)).toBe(true);
        expect(Array.isArray(schematic.required)).toBe(true);
        expect(Array.isArray(schematic.options)).toBe(true);
        if (schematic.options && schematic.options.length > 0) {
          expect(typeof schematic.options[0].type).toBe('string');
        }
      }
    });

    it('includes hidden/private schematics', async () => {
      const input = { workspacePath: '.' };
      const context: McpToolContext = {
        server: mockServer,
        devServers: new Map(),
        logger: { warn: () => {} },
        schematicMetaLoader: mockSchematicMetaLoader,
      };
      const toolCallback = await LIST_SCHEMATICS_TOOL.factory(context);
      const resultRaw = await toolCallback(input, mockExtra);
      const text =
        typeof resultRaw.content?.[0]?.text === 'string' ? resultRaw.content[0].text : '{}';
      const result = typeof text === 'string' ? JSON.parse(text) : {};
      const hasHiddenOrPrivate =
        Array.isArray(result.schematics) &&
        result.schematics.some(
          (s: { hidden?: boolean; private?: boolean }) => s.hidden === true || s.private === true,
        );
      expect(hasHiddenOrPrivate).toBe(true);
    });

    it('handles missing or invalid workspace gracefully', async () => {
      const input = { workspacePath: 'not-a-real-path' };
      const context: McpToolContext = {
        server: mockServer,
        devServers: new Map(),
        logger: { warn: () => {} },
        schematicMetaLoader: async () => ({ meta: [] }),
      };
      const toolCallback = await LIST_SCHEMATICS_TOOL.factory(context);
      const resultRaw = await toolCallback(input, mockExtra);
      const text =
        typeof resultRaw.content?.[0]?.text === 'string' ? resultRaw.content[0].text : '{}';
      const result = typeof text === 'string' ? JSON.parse(text) : {};
      expect(Array.isArray(result.schematics)).toBe(true);
      expect(result.schematics.length).toBe(0);
    });
  });
});
