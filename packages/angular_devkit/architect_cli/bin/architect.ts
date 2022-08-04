#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect, BuilderInfo, BuilderProgressState, Target } from '@angular-devkit/architect';
import { WorkspaceNodeModulesArchitectHost } from '@angular-devkit/architect/node';
import { JsonValue, json, logging, schema, tags, workspaces } from '@angular-devkit/core';
import { NodeJsSyncHost, createConsoleLogger } from '@angular-devkit/core/node';
import * as ansiColors from 'ansi-colors';
import { existsSync } from 'fs';
import * as path from 'path';
import yargsParser, { camelCase, decamelize } from 'yargs-parser';
import { MultiProgressBar } from '../src/progress';

function findUp(names: string | string[], from: string) {
  if (!Array.isArray(names)) {
    names = [names];
  }
  const root = path.parse(from).root;

  let currentDir = from;
  while (currentDir && currentDir !== root) {
    for (const name of names) {
      const p = path.join(currentDir, name);
      if (existsSync(p)) {
        return p;
      }
    }

    currentDir = path.dirname(currentDir);
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

function _targetStringFromTarget({ project, target, configuration }: Target) {
  return `${project}:${target}${configuration !== undefined ? ':' + configuration : ''}`;
}

interface BarInfo {
  status?: string;
  builder: BuilderInfo;
  target?: Target;
}

// Create a separate instance to prevent unintended global changes to the color configuration
const colors = ansiColors.create();

async function _executeTarget(
  parentLogger: logging.Logger,
  workspace: workspaces.WorkspaceDefinition,
  root: string,
  argv: ReturnType<typeof yargsParser>,
  registry: schema.SchemaRegistry,
) {
  const architectHost = new WorkspaceNodeModulesArchitectHost(workspace, root);
  const architect = new Architect(architectHost, registry);

  // Split a target into its parts.
  const {
    _: [targetStr = ''],
    help,
    ...options
  } = argv;
  const [project, target, configuration] = targetStr.toString().split(':');
  const targetSpec = { project, target, configuration };

  const logger = new logging.Logger('jobs');
  const logs: logging.LogEntry[] = [];
  logger.subscribe((entry) => logs.push({ ...entry, message: `${entry.name}: ` + entry.message }));

  // Camelize options as yargs will return the object in kebab-case when camel casing is disabled.
  const camelCasedOptions: json.JsonObject = {};
  for (const [key, value] of Object.entries(options)) {
    if (/[A-Z]/.test(key)) {
      throw new Error(`Unknown argument ${key}. Did you mean ${decamelize(key)}?`);
    }

    camelCasedOptions[camelCase(key)] = value as JsonValue;
  }

  const run = await architect.scheduleTarget(targetSpec, camelCasedOptions, { logger });
  const bars = new MultiProgressBar<number, BarInfo>(':name :bar (:current/:total) :status');

  run.progress.subscribe((update) => {
    const data = bars.get(update.id) || {
      id: update.id,
      builder: update.builder,
      target: update.target,
      status: update.status || '',
      name: (
        (update.target ? _targetStringFromTarget(update.target) : update.builder.name) +
        ' '.repeat(80)
      ).substring(0, 40),
    };

    if (update.status !== undefined) {
      data.status = update.status;
    }

    switch (update.state) {
      case BuilderProgressState.Error:
        data.status = 'Error: ' + update.error;
        bars.update(update.id, data);
        break;

      case BuilderProgressState.Stopped:
        data.status = 'Done.';
        bars.complete(update.id);
        bars.update(update.id, data, update.total, update.total);
        break;

      case BuilderProgressState.Waiting:
        bars.update(update.id, data);
        break;

      case BuilderProgressState.Running:
        bars.update(update.id, data, update.current, update.total);
        break;
    }

    bars.render();
  });

  // Wait for full completion of the builder.
  try {
    const result = await run.output.toPromise();
    if (result.success) {
      parentLogger.info(colors.green('SUCCESS'));
    } else {
      parentLogger.info(colors.red('FAILURE'));
    }
    parentLogger.info('Result: ' + JSON.stringify({ ...result, info: undefined }, null, 4));

    parentLogger.info('\nLogs:');
    logs.forEach((l) => parentLogger.next(l));
    logs.splice(0);

    await run.stop();
    bars.terminate();

    return result.success ? 0 : 1;
  } catch (err) {
    parentLogger.info(colors.red('ERROR'));
    parentLogger.info('\nLogs:');
    logs.forEach((l) => parentLogger.next(l));

    parentLogger.fatal('Exception:');
    parentLogger.fatal((err instanceof Error && err.stack) || `${err}`);

    return 2;
  }
}

async function main(args: string[]): Promise<number> {
  /** Parse the command line. */
  const argv = yargsParser(args, {
    boolean: ['help'],
    configuration: {
      'dot-notation': false,
      'boolean-negation': true,
      'strip-aliased': true,
      'camel-case-expansion': false,
    },
  });

  /** Create the DevKit Logger used through the CLI. */
  const logger = createConsoleLogger(argv['verbose'], process.stdout, process.stderr, {
    info: (s) => s,
    debug: (s) => s,
    warn: (s) => colors.bold.yellow(s),
    error: (s) => colors.bold.red(s),
    fatal: (s) => colors.bold.red(s),
  });

  // Check the target.
  const targetStr = argv._[0] || '';
  if (!targetStr || argv.help) {
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

  return await _executeTarget(logger, workspace, root, argv, registry);
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
