/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { dirname, join } from 'node:path';
import { z } from 'zod';
import { type Host, LocalWorkspaceHost } from '../../host';
import { createStructuredContentOutput, findAngularJsonDir } from '../../utils';
import { type McpToolContext, type McpToolDeclaration, declareTool } from '../tool-registry';
import type { SchematicMeta, SchematicMetaOption } from './types';
import {
  buildAlternativeCommandPreviews,
  emitKebabCaseHints,
  getSchematicDocLink,
  inferRequiredOptions,
  loadSchematicsMetadata,
  toKebabCase,
} from './utils';

/**
 * Runs the ng CLI command for a schematic and handles errors/logs.
 * Uses host.runCommand and provides troubleshooting info on failure.
 */
async function runNgSchematicCommand(
  host: Host,
  angularRoot: string,
  args: string[],
): Promise<{ logs: string[]; success: boolean; invoked: string }> {
  let logs: string[] = [];
  let success = false;
  let invoked = `'ng' (PATH)`;
  let ngBin: string | undefined;
  const potentialBins = [
    join(angularRoot, 'node_modules', '@angular', 'cli', 'bin', 'ng.js'),
    join(angularRoot, 'node_modules', '.bin', 'ng'),
  ];
  for (const p of potentialBins) {
    if (host.existsSync(p)) {
      ngBin = p;
      break;
    }
  }
  const isJsEntrypoint = ngBin?.endsWith('ng.js');
  const cmd = isJsEntrypoint ? 'node' : 'ng';
  const finalArgs = isJsEntrypoint ? [ngBin as string, ...args] : args;
  invoked = ngBin ? ngBin : 'ng (PATH)';
  try {
    const result = await host.runCommand(cmd, finalArgs, { cwd: angularRoot });
    logs = result.logs;
    success = true;
  } catch (e) {
    if (e instanceof Error && 'logs' in e) {
      const err = e as Error & { logs?: string[] };
      if (err.logs) {
        logs = err.logs;
      }
    }
    logs.push((e as Error).message);
    logs.push(`Invocation attempted via ${invoked}`);
    logs.push(
      'Troubleshooting: Ensure @angular/cli is installed locally (npm i -D @angular/cli) and node_modules/.bin is accessible.',
    );
  }

  return { logs, success, invoked };
}

const runInputSchema = z.object({
  schematic: z.string().describe('Schematic name or alias to execute (e.g. "component" or "c").'),
  workspacePath: z
    .string()
    .describe(
      'Path to an angular.json file OR a directory within the workspace from which to search upward for angular.json.',
    ),
  options: z
    .record(z.any())
    .optional()
    .describe('Options passed to the schematic. Keys must match schema property names or aliases.'),
  prompt: z
    .string()
    .optional()
    .describe(
      'Natural language user instruction that led to this schematic invocation (used for inferring missing required options).',
    ),
  previewOnly: z
    .boolean()
    .optional()
    .describe(
      'If true, do not run the schematic; instead return the exact CLI command (with inferred options) that would be executed.',
    ),
});

const runOutputSchema = z.object({
  runResult: z.object({
    schematic: z.string(),
    success: z.boolean(),
    message: z.string().optional(),
    logs: z.array(z.string()).optional(),
    hints: z.array(z.string()).optional(),
  }),
  instructions: z.array(z.string()).optional(),
});

export type RunSchematicInput = z.infer<typeof runInputSchema>;
export type RunSchematicOutput = z.infer<typeof runOutputSchema>;

export function normalizeOptions(
  found: SchematicMeta,
  inputOptions: Record<string, unknown>,
): { normalized: Record<string, unknown>; hints: string[] } {
  const normalized = { ...inputOptions };
  const hints: string[] = [];
  if (!found.options) {
    return { normalized, hints };
  }
  for (const optMeta of found.options) {
    if (!(optMeta.name in normalized)) {
      continue;
    }
    let val = normalized[optMeta.name];
    const enumResult = normalizeEnum(val, optMeta);
    val = enumResult.value;
    if (enumResult.hint) {
      hints.push(enumResult.hint);
    }
    const boolResult = normalizeBoolean(val, optMeta);
    val = boolResult.value;
    if (boolResult.hint) {
      hints.push(boolResult.hint);
    }
    const numResult = normalizeNumber(val, optMeta);
    val = numResult.value;
    if (numResult.hint) {
      hints.push(numResult.hint);
    }
    const jsonResult = normalizeJson(val, optMeta);
    val = jsonResult.value;
    if (jsonResult.hint) {
      hints.push(jsonResult.hint);
    }
    const arrResult = normalizeArray(val, optMeta);
    val = arrResult.value;
    if (arrResult.hint) {
      hints.push(arrResult.hint);
    }
    normalized[optMeta.name] = val;
  }

  return { normalized, hints };
}

async function resolveWorkspaceRoot(
  input: RunSchematicInput,
  host: Host,
): Promise<{ angularRoot?: string; searchDir: string }> {
  const pathStat = await host.stat(input.workspacePath).catch(() => undefined);
  const searchDir = pathStat?.isDirectory() ? input.workspacePath : dirname(input.workspacePath);
  const angularRoot = findAngularJsonDir(searchDir, host) ?? undefined;

  return { angularRoot, searchDir };
}

async function executeSchematic(input: RunSchematicInput, host: Host, context: McpToolContext) {
  let { meta } = await loadSchematicsMetadata(
    input.workspacePath,
    context.logger,
    typeof context.schematicMetaLoader === 'function' ? context.schematicMetaLoader : undefined,
  );
  if (meta.length === 0) {
    // Fallback for unit tests: use a mock server-provided collection if available
    if (typeof context.schematicMetaLoader === 'function') {
      ({ meta } = await context.schematicMetaLoader());
    }
  }
  if (meta.length === 0) {
    return createStructuredContentOutput<RunSchematicOutput>({
      instructions: [
        "Could not load '@schematics/angular'. Ensure Angular CLI dependencies are installed (try 'npm install' or 'pnpm install').",
      ],
      runResult: {
        schematic: input.schematic,
        success: false,
        message: 'Failed before execution: schematics metadata unavailable.',
      },
    });
  }
  const found = meta.find(
    (m) => m.name === input.schematic || (m.aliases?.includes(input.schematic) ?? false),
  );
  if (!found) {
    const instructions = [
      `Schematic '${input.schematic}' not found.`,
      'Run `list_schematics` to view all available schematics.',
    ];

    return createStructuredContentOutput<RunSchematicOutput>({
      instructions,
      runResult: {
        schematic: input.schematic,
        success: false,
        message: `Unknown schematic '${input.schematic}'.`,
      },
    });
  }
  // Unknown option names (non-fatal)
  const providedOptions = Object.keys(input.options ?? {});
  if (providedOptions.length > 0 && found.options) {
    const validNames = new Set(found.options.map((o) => o.name));
    const unknown = providedOptions.filter((k) => !validNames.has(k));
    if (unknown.length > 0) {
      context.logger.warn(
        `Unknown schematic option(s) for '${found.name}': ${unknown.join(', ')} (will still attempt execution).`,
      );
    }
  }
  // Workspace root resolution (needed for inference logic).
  // Prefer workspace context from the test server when available to avoid touching the real FS during unit tests.
  let angularRoot: string | undefined;
  const server = (context as unknown as { server?: { getWorkspaceContext?: () => unknown } })
    .server;
  if (server && typeof server.getWorkspaceContext === 'function') {
    try {
      const workspaceCtx = server.getWorkspaceContext();
      if (workspaceCtx && typeof workspaceCtx === 'object' && 'workspacePath' in workspaceCtx) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        angularRoot = (workspaceCtx as any).workspacePath as string;
      }
    } catch {
      // ignore and fallback
    }
  }

  if (!angularRoot) {
    const resolved = await resolveWorkspaceRoot(input, host);
    angularRoot = resolved.angularRoot;
  }

  if (!angularRoot) {
    return createStructuredContentOutput<RunSchematicOutput>({
      instructions: [
        'Could not locate angular.json by searching upward from the provided workspacePath.',
      ],
      runResult: {
        schematic: input.schematic,
        success: false,
        message: 'Workspace root not found.',
      },
    });
  }

  // Infer missing required options BEFORE validation if possible.
  const inference = await inferRequiredOptions(found, angularRoot, input.prompt, {
    ...(input.options ?? {}),
  });

  // Normalize + serialize options
  const { normalized, hints } = normalizeOptions(found, inference.options);
  const optionArgs = serializeOptions(normalized);
  const schematicName = found.name;
  const args: string[] = ['generate', `@schematics/angular:${schematicName}`, ...optionArgs];
  const previewCommand = `ng ${args.join(' ')}`;
  const alternativeCommands = buildAlternativeCommandPreviews(
    schematicName,
    inference.options,
    inference.nameCandidates,
  );

  // Add hint entries for any key whose original form differs from kebab-case flag.
  // Use the normalized options for hint emission to reflect any coercions/normalization.
  hints.push(...emitKebabCaseHints(normalized));

  // Add per-schematic doc link once, not per option
  const schematicDoc = getSchematicDocLink(schematicName);
  if (!hints.some((h) => h.includes(schematicDoc))) {
    hints.push(`Docs '${schematicName}': ${schematicDoc}`);
  }

  if (input.previewOnly) {
    const previewHints = [...(inference.hints ?? []), ...hints];

    return createStructuredContentOutput<RunSchematicOutput>({
      instructions: [
        'Preview only (no execution). Review primary and alternative commands; rerun without previewOnly to execute.',
        `Primary: ${previewCommand}`,
        ...(alternativeCommands.length > 1
          ? ['Alternatives:', ...alternativeCommands.filter((c) => c !== previewCommand)]
          : []),
      ],
      runResult: {
        schematic: schematicName,
        success: false,
        message: 'Preview mode: schematic not executed.',
        logs: [],
        hints: previewHints,
      },
    });
  }

  // If not preview, abort early when required options are still missing
  if (inference.missingAfter.length > 0) {
    return createStructuredContentOutput<RunSchematicOutput>({
      instructions: [
        `Missing required option(s) for schematic '${found.name}': ${inference.missingAfter.join(', ')}`,
        'Provide all required options. Use list_schematics to inspect option metadata.',
      ],
      runResult: {
        schematic: found.name,
        success: false,
        message: `Aborted before execution: missing required option(s): ${inference.missingAfter.join(', ')}`,
        logs: [
          `Required: ${inference.missingAfter.join(', ')}`,
          'No process spawned; validation failed early.',
        ],
        hints: inference.hints.length ? inference.hints : undefined,
      },
    });
  }

  // Execution
  const { logs, success, invoked } = await runNgSchematicCommand(host, angularRoot, args);

  return createStructuredContentOutput<RunSchematicOutput>({
    instructions: [
      `About to execute primary: ${previewCommand}`,
      ...(alternativeCommands.length > 1
        ? [
            'Name alternatives (adjust --name to use):',
            ...alternativeCommands.filter((c) => c !== previewCommand),
          ]
        : []),
    ],
    runResult: {
      schematic: schematicName,
      success,
      message: success
        ? `Executed schematic '${schematicName}' successfully.`
        : `Failed to execute schematic '${schematicName}'.`,
      logs,
      hints: [...inference.hints, ...hints].length ? [...inference.hints, ...hints] : undefined,
    },
  });
}

export const RUN_SCHEMATIC_TOOL: McpToolDeclaration<
  typeof runInputSchema.shape,
  typeof runOutputSchema.shape
> = declareTool({
  name: 'run_schematic',
  title: 'Run an Angular Schematic',
  description: `
<Purpose>
Executes a single Angular schematic (generator) from @schematics/angular with user-supplied options.
</Purpose>
<Use Cases>
* Generate components, directives, pipes, services, modules, libraries, etc.
* Apply refactor schematics (e.g. jasmine-to-vitest) after inspecting options.
</Use Cases>
<Operational Notes>
* **Project-Specific Use (Recommended):** Provide the workspacePath argument to get the collection matching the project's Angular version.
* Always call 'list_schematics' first to validate the schematic name and review option types.
* Options serialization follows CLI conventions: arrays of primitives repeat the flag; complex values are JSON.
* Logs include both stdout and stderr merged in order.
 * CamelCase schema option keys are automatically converted to kebab-case CLI flags (e.g. skipImport -> --skip-import).
 * Official docs: https://angular.dev/tools/cli/schematics and https://angular.dev/cli/generate
</Operational Notes>
`,
  inputSchema: runInputSchema.shape,
  outputSchema: runOutputSchema.shape,
  isLocalOnly: true,
  isReadOnly: false,
  factory: (context) => (input) => executeSchematic(input, LocalWorkspaceHost, context),
});

function serializeOptions(options: Record<string, unknown>): string[] {
  const args: string[] = [];
  for (const [rawKey, value] of Object.entries(options)) {
    if (value === undefined || value === null) {
      continue;
    }
    const key = toKebabCase(rawKey);
    if (typeof value === 'boolean') {
      args.push(`--${key}=${value}`);
    } else if (Array.isArray(value)) {
      if (value.every((v) => ['string', 'number', 'boolean'].includes(typeof v))) {
        for (const v of value) {
          args.push(`--${key}=${String(v)}`);
        }
      } else {
        args.push(`--${key}=${JSON.stringify(value)}`);
      }
    } else if (typeof value === 'object') {
      args.push(`--${key}=${JSON.stringify(value)}`);
    } else {
      args.push(`--${key}=${String(value)}`);
    }
  }

  return args;
}

/* Option normalization helpers for schematic input values. */

function normalizeEnum(
  val: unknown,
  optMeta: SchematicMetaOption,
): { value: unknown; hint?: string } {
  if (
    optMeta.enum &&
    typeof val === 'string' &&
    !optMeta.enum.includes(val) &&
    optMeta.enum.some((e: unknown) => typeof e === 'string')
  ) {
    const lower = val.toLowerCase();
    const match = optMeta.enum.find(
      (e: unknown) => typeof e === 'string' && e.toLowerCase() === lower,
    );
    if (match) {
      return {
        value: match,
        hint: `Option '${optMeta.name}': coerced value '${val}' to enum '${match}' (case-insensitive match)`,
      };
    }
  }

  return { value: val };
}

function normalizeBoolean(
  val: unknown,
  optMeta: SchematicMetaOption,
): { value: unknown; hint?: string } {
  if (Array.isArray(optMeta.type) ? optMeta.type.includes('boolean') : optMeta.type === 'boolean') {
    if (typeof val === 'string') {
      const lower = val.toLowerCase();
      if (['true', 'false', '1', '0', 'yes', 'no'].includes(lower)) {
        const boolVal = ['true', '1', 'yes'].includes(lower);

        return {
          value: boolVal,
          hint: `Option '${optMeta.name}': coerced string '${val}' -> boolean ${boolVal}`,
        };
      }
    }
  }

  return { value: val };
}

function normalizeNumber(
  val: unknown,
  optMeta: SchematicMetaOption,
): { value: unknown; hint?: string } {
  if (
    (Array.isArray(optMeta.type)
      ? optMeta.type.includes('number') || optMeta.type.includes('integer')
      : optMeta.type === 'number' || optMeta.type === 'integer') &&
    typeof val === 'string'
  ) {
    if (/^[+-]?\d+(\.\d+)?$/.test(val)) {
      const num = Number(val);
      if (!Number.isNaN(num)) {
        return {
          value: num,
          hint: `Option '${optMeta.name}': coerced string '${val}' -> number ${num}`,
        };
      }
    }
  }

  return { value: val };
}

function normalizeJson(
  val: unknown,
  optMeta: SchematicMetaOption,
): { value: unknown; hint?: string } {
  if (
    (Array.isArray(optMeta.type)
      ? optMeta.type.includes('object') || optMeta.type.includes('array')
      : optMeta.type === 'object' || optMeta.type === 'array') &&
    typeof val === 'string' &&
    /^[[{].*[}]]$/.test(val.trim())
  ) {
    try {
      const parsed = JSON.parse(val);

      return {
        value: parsed,
        hint: `Option '${optMeta.name}': parsed JSON string into ${Array.isArray(parsed) ? 'array' : 'object'}`,
      };
    } catch {
      // ignore parse error
    }
  }

  return { value: val };
}

function normalizeArray(
  val: unknown,
  optMeta: SchematicMetaOption,
): { value: unknown; hint?: string } {
  if (
    (Array.isArray(optMeta.type) ? optMeta.type.includes('array') : optMeta.type === 'array') &&
    typeof val === 'string' &&
    val.includes(',')
  ) {
    const split = val
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (split.length > 1) {
      return {
        value: split,
        hint: `Option '${optMeta.name}': split comma-delimited string into array [${split.join(', ')}]`,
      };
    }
  }

  return { value: val };
}
