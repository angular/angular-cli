#!/usr/bin/env node
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect, BuilderInfo, BuilderProgressState, Target } from '@angular-devkit/architect';
import { WorkspaceNodeModulesArchitectHost } from '@angular-devkit/architect/node';
import { logging, schema, tags, terminal, workspaces } from '@angular-devkit/core';
import { NodeJsSyncHost, createConsoleLogger } from '@angular-devkit/core/node';
import { existsSync } from 'fs';
import * as minimist from 'minimist';
import * as path from 'path';
import { tap } from 'rxjs/operators';
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

async function _executeTarget(
  parentLogger: logging.Logger,
  workspace: workspaces.WorkspaceDefinition,
  root: string,
  argv: minimist.ParsedArgs,
  registry: schema.SchemaRegistry,
) {
  const architectHost = new WorkspaceNodeModulesArchitectHost(workspace, root);
  const architect = new Architect(architectHost, registry);

  // Split a target into its parts.
  const targetStr = argv._.shift() || '';
  const [project, target, configuration] = targetStr.split(':');
  const targetSpec = { project, target, configuration };

  delete argv['help'];
  delete argv['_'];

  const logger = new logging.Logger('jobs');
  const logs: logging.LogEntry[] = [];
  logger.subscribe(entry => logs.push({ ...entry, message: `${entry.name}: ` + entry.message }));

  const run = await architect.scheduleTarget(targetSpec, argv, { logger });
  const bars = new MultiProgressBar<number, BarInfo>(':name :bar (:current/:total) :status');

  run.progress.subscribe(update => {
    const data = bars.get(update.id) || {
      id: update.id,
      builder: update.builder,
      target: update.target,
      status: update.status || '',
      name: (
        (update.target ? _targetStringFromTarget(update.target) : update.builder.name) +
        ' '.repeat(80)
      ).substr(0, 40),
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
    const { success } = await run.output
      .pipe(
        tap(result => {
          if (result.success) {
            parentLogger.info(terminal.green('SUCCESS'));
          } else {
            parentLogger.info(terminal.yellow('FAILURE'));
          }
          parentLogger.info('Result: ' + JSON.stringify({ ...result, info: undefined }, null, 4));

          parentLogger.info('\nLogs:');
          logs.forEach(l => parentLogger.next(l));
          logs.splice(0);
        }),
      )
      .toPromise();

    await run.stop();
    bars.terminate();

    return success ? 0 : 1;
  } catch (err) {
    parentLogger.info(terminal.red('ERROR'));
    parentLogger.info('\nLogs:');
    logs.forEach(l => parentLogger.next(l));

    parentLogger.fatal('Exception:');
    parentLogger.fatal(err.stack);

    return 2;
  }
}

async function main(args: string[]): Promise<number> {
  /** Parse the command line. */
  const argv = minimist(args, { boolean: ['help'] });

  /** Create the DevKit Logger used through the CLI. */
  const logger = createConsoleLogger(argv['verbose']);

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

  const { workspace } = await workspaces.readWorkspace(
    configFilePath,
    workspaces.createWorkspaceHost(new NodeJsSyncHost()),
  );

  // Clear the console.
  process.stdout.write('\u001Bc');

  return await _executeTarget(logger, workspace, root, argv, registry);
}

main(process.argv.slice(2)).then(
  code => {
    process.exit(code);
  },
  err => {
    // tslint:disable-next-line: no-console
    console.error('Error: ' + err.stack || err.message || err);
    process.exit(-1);
  },
);
