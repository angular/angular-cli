#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { JsonValue, json, logging, schema, strings, tags, workspaces } from '@angular-devkit/core';
import { NodeJsSyncHost, createConsoleLogger } from '@angular-devkit/core/node';
import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { parseArgs, styleText } from 'node:util';
import { Architect } from '../index';
import { WorkspaceNodeModulesArchitectHost } from '../node/index';

function findUp(names: string | string[], from: string) {
  const filenames = Array.isArray(names) ? names : [names];

  let currentDir = path.resolve(from);
  while (true) {
    for (const name of filenames) {
      const p = path.join(currentDir, name);
      if (existsSync(p)) {
        return p;
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  return null;
}

/**
 * Show usage of the CLI tool, and exit the process.
 */
function usage(logger: logging.Logger, exitCode = 0): never {
  logger.info(tags.stripIndent`
    architect [project][:target][:configuration] [options, ...]

    Run a project target.
    If project/target/configuration are not specified, the workspace defaults will be used.

    Options:
        --help              Show available options for project target.
                            Shows this message instead when ran without the run argument.


    Any additional option is passed the target, overriding existing options.
  `);

  return process.exit(exitCode);
}

async function _executeTarget(
  parentLogger: logging.Logger,
  workspace: workspaces.WorkspaceDefinition,
  root: string,
  targetStr: string,
  options: json.JsonObject,
  registry: schema.SchemaRegistry,
) {
  const architectHost = new WorkspaceNodeModulesArchitectHost(workspace, root);
  const architect = new Architect(architectHost, registry);

  // Split a target into its parts.
  const [project, target, configuration] = targetStr.split(':');
  const targetSpec = { project, target, configuration };

  const logger = new logging.Logger('jobs');
  const logs: logging.LogEntry[] = [];
  logger.subscribe((entry) => logs.push({ ...entry, message: `${entry.name}: ` + entry.message }));

  const run = await architect.scheduleTarget(targetSpec, options, { logger });

  // Wait for full completion of the builder.
  try {
    const result = await run.lastOutput;
    if (result.success) {
      parentLogger.info(styleText(['green'], 'SUCCESS'));
    } else {
      parentLogger.info(styleText(['red'], 'FAILURE'));
    }
    parentLogger.info('Result: ' + JSON.stringify({ ...result, info: undefined }, null, 4));

    parentLogger.info('\nLogs:');
    logs.forEach((l) => parentLogger.next(l));
    logs.splice(0);

    await run.stop();

    return result.success ? 0 : 1;
  } catch (err) {
    parentLogger.info(styleText(['red'], 'ERROR'));
    parentLogger.info('\nLogs:');
    logs.forEach((l) => parentLogger.next(l));

    parentLogger.fatal('Exception:');
    parentLogger.fatal((err instanceof Error && err.stack) || `${err}`);

    return 2;
  }
}

const CLI_OPTION_DEFINITIONS = {
  'help': { type: 'boolean' },
  'verbose': { type: 'boolean' },
} as const;

interface Options {
  positionals: string[];
  builderOptions: json.JsonObject;
  cliOptions: Partial<Record<keyof typeof CLI_OPTION_DEFINITIONS, boolean>>;
}

/** Parse the command line. */
function parseOptions(args: string[]): Options {
  const { values, tokens } = parseArgs({
    args,
    strict: false,
    tokens: true,
    allowPositionals: true,
    allowNegative: true,
    options: CLI_OPTION_DEFINITIONS,
  });

  const builderOptions: json.JsonObject = {};
  const positionals: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.kind === 'positional') {
      positionals.push(token.value);
      continue;
    }

    if (token.kind !== 'option') {
      continue;
    }

    const name = token.name;
    let value: JsonValue = token.value ?? true;

    // `parseArgs` already handled known boolean args and their --no- forms.
    // Only process options not in CLI_OPTION_DEFINITIONS here.
    if (name in CLI_OPTION_DEFINITIONS) {
      continue;
    }

    if (/[A-Z]/.test(name)) {
      throw new Error(
        `Unknown argument ${name}. Did you mean ${strings.decamelize(name).replaceAll('_', '-')}?`,
      );
    }

    // Handle --no-flag for unknown options, treating it as false
    if (name.startsWith('no-')) {
      const realName = name.slice(3);
      builderOptions[strings.camelize(realName)] = false;
      continue;
    }

    // Handle value for unknown options
    if (token.inlineValue === undefined) {
      // Look ahead
      const nextToken = tokens[i + 1];
      if (nextToken?.kind === 'positional') {
        value = nextToken.value;
        i++; // Consume next token
      } else {
        value = true; // Treat as boolean if no value follows
      }
    }

    // Type inference for numbers
    if (typeof value === 'string' && !isNaN(Number(value))) {
      value = Number(value);
    }

    const camelName = strings.camelize(name);
    if (Object.prototype.hasOwnProperty.call(builderOptions, camelName)) {
      const existing = builderOptions[camelName];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        builderOptions[camelName] = [existing, value] as JsonValue;
      }
    } else {
      builderOptions[camelName] = value;
    }
  }

  return {
    positionals,
    builderOptions,
    cliOptions: values as Options['cliOptions'],
  };
}

async function main(args: string[]): Promise<number> {
  /** Parse the command line. */
  const { positionals, cliOptions, builderOptions } = parseOptions(args);

  /** Create the DevKit Logger used through the CLI. */
  const logger = createConsoleLogger(!!cliOptions['verbose'], process.stdout, process.stderr, {
    info: (s) => s,
    debug: (s) => s,
    warn: (s) => styleText(['yellow', 'bold'], s),
    error: (s) => styleText(['red', 'bold'], s),
    fatal: (s) => styleText(['red', 'bold'], s),
  });

  // Check the target.
  const targetStr = positionals[0];
  if (!targetStr || cliOptions.help) {
    // Show architect usage if there's no target.
    usage(logger);
  }

  // Load workspace configuration file.
  const currentPath = process.cwd();
  const configFileNames = ['angular.json', '.angular.json', 'workspace.json', '.workspace.json'];

  const configFilePath = findUp(configFileNames, currentPath);

  if (!configFilePath) {
    logger.fatal(
      `Workspace configuration file (${configFileNames.join(', ')}) cannot be found in ` +
        `'${currentPath}' or in parent directories.`,
    );

    return 3;
  }

  const root = path.dirname(configFilePath);

  const registry = new schema.CoreSchemaRegistry();
  registry.addPostTransform(schema.transforms.addUndefinedDefaults);

  // Show usage of deprecated options
  registry.useXDeprecatedProvider((msg) => logger.warn(msg));

  const { workspace } = await workspaces.readWorkspace(
    configFilePath,
    workspaces.createWorkspaceHost(new NodeJsSyncHost()),
  );

  // Clear the console.
  process.stdout.write('\u001Bc');

  return await _executeTarget(logger, workspace, root, targetStr, builderOptions, registry);
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exit(code);
  },
  (err) => {
    // eslint-disable-next-line no-console
    console.error('Error: ' + err.stack || err.message || err);
    process.exit(-1);
  },
);
