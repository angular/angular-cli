/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview
 * Parses and validates the Vitest command line arguments provided via the builder's
 * `runnerArgs` option.
 *
 * Vitest's own command line parser is used to parse the arguments so that the value coercion and
 * dot-notation behavior matches the Vitest documentation. However, that parser accepts unknown
 * options, command names, and test file filters without error. The parsed result is therefore
 * validated against an explicit list of supported options.
 */

import type { CliOptions } from 'vitest/node';

/**
 * The portion of the `parseCLI` function from `vitest/node` used to parse the arguments.
 */
export type VitestCliParser = (argv: string[]) => { filter: string[]; options: object };

/**
 * The Vitest options created from the builder's `runnerArgs` option.
 */
export interface RunnerArgOptions {
  /** Options for the Vitest CLI level configuration. */
  cli: CliOptions;

  /**
   * Options for the Vitest project configuration.
   * Vitest only forwards a version specific subset of CLI options to a configured project.
   * The project applicable options are provided directly to the project to avoid relying
   * on that subset.
   */
  project: Record<string, unknown>;
}

interface SupportedOption {
  /** A description of the accepted values for use in error messages. */
  readonly expects: string;

  /** Determines if the parsed value is valid for the option. */
  readonly isValid: (value: unknown) => boolean;

  /** Indicates the option only applies to the root Vitest configuration. */
  readonly rootOnly?: boolean;
}

const isBoolean = (value: unknown): boolean => typeof value === 'boolean';
const isCount = (value: unknown): boolean =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const BOOLEAN_OPTION: SupportedOption = { expects: 'a boolean', isValid: isBoolean };
const COUNT_OPTION: SupportedOption = { expects: 'a non-negative integer', isValid: isCount };

const SUPPORTED_SEQUENCE_OPTIONS: ReadonlyMap<string, SupportedOption> = new Map([
  ['shuffle', BOOLEAN_OPTION],
  ['seed', COUNT_OPTION],
]);

/**
 * The Vitest CLI options that can be provided via the `runnerArgs` option.
 * The keys are the camel case option names as provided by the Vitest command line parser.
 */
const SUPPORTED_OPTIONS: ReadonlyMap<string, SupportedOption> = new Map<string, SupportedOption>([
  ['allowOnly', BOOLEAN_OPTION],
  ['bail', COUNT_OPTION],
  ['disableConsoleIntercept', BOOLEAN_OPTION],
  ['expandSnapshotDiff', BOOLEAN_OPTION],
  [
    'maxWorkers',
    {
      expects: 'a positive integer or a percentage',
      isValid: (value) =>
        (typeof value === 'number' && Number.isInteger(value) && value > 0) ||
        (typeof value === 'string' && /^\d+%$/.test(value)),
    },
  ],
  ['printConsoleTrace', BOOLEAN_OPTION],
  ['retry', COUNT_OPTION],
  [
    'sequence',
    {
      expects: `only the following options: ${[...SUPPORTED_SEQUENCE_OPTIONS.keys()]
        .map((name) => `"--sequence.${name}"`)
        .join(', ')}`,
      isValid: (value) =>
        typeof value === 'object' &&
        value !== null &&
        Object.entries(value).every(
          ([name, nestedValue]) =>
            SUPPORTED_SEQUENCE_OPTIONS.get(name)?.isValid(nestedValue) === true,
        ),
    },
  ],
  [
    'shard',
    {
      expects: 'a value in the form of <index>/<count>',
      isValid: (value) => typeof value === 'string' && /^\d+\/\d+$/.test(value),
      rootOnly: true,
    },
  ],
  ['testTimeout', COUNT_OPTION],
  [
    'update',
    {
      expects: 'a boolean, "all", "new", or "none"',
      isValid: (value) =>
        typeof value === 'boolean' || value === 'all' || value === 'new' || value === 'none',
    },
  ],
]);

/**
 * Vitest CLI options that are intentionally not supported along with the reason or alternative.
 */
const UNSUPPORTED_OPTIONS: ReadonlyMap<string, string> = new Map([
  ['browser', 'Use the "browsers" and "headless" options instead.'],
  [
    'changed',
    'Tests are executed from bundled output which prevents Vitest from determining the affected tests.',
  ],
  ['config', 'Use the "runnerConfig" option instead.'],
  ['coverage', 'Use the "coverage" options instead.'],
  [
    'dir',
    'Test discovery is managed by the builder. Use the "include" and "exclude" options instead.',
  ],
  ['exclude', 'Use the "exclude" option instead.'],
  ['globals', 'The option is managed by the builder.'],
  ['inspect', 'Use the "debug" option instead.'],
  ['inspectBrk', 'Use the "debug" option instead.'],
  ['isolate', 'Use the "isolate" option instead.'],
  ['mode', 'The option is managed by the builder.'],
  ['outputFile', 'Use the "outputFile" option instead.'],
  ['passWithNoTests', 'The builder requires at least one test file.'],
  ['project', 'The option is managed by the builder.'],
  [
    'related',
    'Tests are executed from bundled output which prevents Vitest from determining the affected tests.',
  ],
  ['reporter', 'Use the "reporters" option instead.'],
  ['root', 'The option is managed by the builder.'],
  ['run', 'Use the "watch" option instead.'],
  ['testNamePattern', 'Use the "filter" option instead.'],
  ['ui', 'Use the "ui" option instead.'],
  ['watch', 'Use the "watch" option instead.'],
]);

/**
 * The single character aliases of the Vitest CLI options and their full option names.
 * The Vitest command line parser provides both the alias and the full name within its result.
 */
const OPTION_ALIASES: ReadonlyMap<string, string> = new Map([
  ['c', 'config'],
  ['p', 'project'],
  ['r', 'root'],
  ['t', 'testNamePattern'],
  ['u', 'update'],
  ['w', 'watch'],
]);

/**
 * The names of the Vitest CLI commands. The Vitest command line parser consumes
 * a command name without including it in the parsed result.
 */
const VITEST_COMMANDS: ReadonlySet<string> = new Set([
  'bench',
  'dev',
  'init',
  'list',
  'related',
  'run',
  'watch',
]);

function toFlag(name: string): string {
  return `--${name}`;
}

/**
 * Parses and validates the Vitest command line arguments provided via the `runnerArgs` option.
 *
 * @param runnerArgs The Vitest command line arguments.
 * @param parseCLI The `parseCLI` function from the project's `vitest/node` package.
 * @returns The validated Vitest options.
 * @throws An error describing each argument that is not supported.
 */
export function parseRunnerArgs(
  runnerArgs: readonly string[],
  parseCLI: VitestCliParser,
): RunnerArgOptions {
  const errors: string[] = [];

  // Arguments following a `--` separator are not interpreted by the parser and cannot be a command.
  const separatorIndex = runnerArgs.indexOf('--');
  const interpretedArgs = separatorIndex === -1 ? runnerArgs : runnerArgs.slice(0, separatorIndex);
  const commands = new Set(interpretedArgs.filter((arg) => VITEST_COMMANDS.has(arg)));
  for (const command of commands) {
    errors.push(`The Vitest "${command}" command is not supported.`);
  }

  let parsed: ReturnType<VitestCliParser>;
  try {
    // The parser requires the executable name as the first element and modifies the provided array.
    parsed = parseCLI(['vitest', ...runnerArgs]);
  } catch (e) {
    throw new Error(
      `Vitest was unable to parse the "runnerArgs" option: ${e instanceof Error ? e.message : String(e)}`,
      { cause: e },
    );
  }
  const { filter, options } = parsed;

  if (filter.length > 0) {
    errors.push(
      `Test file filters are not supported (${filter.map((value) => `"${value}"`).join(', ')}). ` +
        'Use the "include" option instead.',
    );
  }

  const cli: Record<string, unknown> = {};
  const project: Record<string, unknown> = {};
  const parsedOptions = options as Record<string, unknown>;

  for (const [name, value] of Object.entries(parsedOptions)) {
    if (name === '--') {
      if (Array.isArray(value) && value.length > 0) {
        errors.push(
          `Arguments following "--" are not supported (${value.map((arg) => `"${String(arg)}"`).join(', ')}).`,
        );
      }

      continue;
    }

    // `color` is always present with a default value of `true`.
    if (name === 'color' && value === true) {
      continue;
    }

    // Some commands are also represented as an option. The command has already been reported.
    if (commands.has(name) && value === true) {
      continue;
    }

    // Skip an alias when the full option name is also present.
    const aliasedName = OPTION_ALIASES.get(name);
    if (aliasedName !== undefined && aliasedName in parsedOptions) {
      continue;
    }

    const supported = SUPPORTED_OPTIONS.get(name);
    if (supported) {
      if (supported.isValid(value)) {
        cli[name] = value;
        if (!supported.rootOnly) {
          project[name] = value;
        }
      } else {
        errors.push(`The Vitest "${toFlag(name)}" option requires ${supported.expects}.`);
      }

      continue;
    }

    const unsupportedReason = UNSUPPORTED_OPTIONS.get(name);
    errors.push(
      `The Vitest "${toFlag(name)}" option is not supported.` +
        (unsupportedReason ? ` ${unsupportedReason}` : ''),
    );
  }

  if (errors.length > 0) {
    throw new Error(
      'The "runnerArgs" option contains unsupported values:\n' +
        errors.map((error) => `  - ${error}`).join('\n') +
        `\nSupported Vitest options: ${[...SUPPORTED_OPTIONS.keys()].map(toFlag).join(', ')}`,
    );
  }

  return { cli: cli as unknown as CliOptions, project };
}
