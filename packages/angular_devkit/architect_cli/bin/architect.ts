#!/usr/bin/env node
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { index2 } from '@angular-devkit/architect';
import { WorkspaceNodeModulesArchitectHost } from '@angular-devkit/architect/node';
import {
  dirname,
  experimental,
  json,
  logging,
  normalize,
  schema,
  tags, terminal,
} from '@angular-devkit/core';
import { NodeJsSyncHost, createConsoleLogger } from '@angular-devkit/core/node';
import { existsSync, readFileSync } from 'fs';
import * as minimist from 'minimist';
import * as path from 'path';
import { last } from 'rxjs/operators';
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

  process.exit(exitCode);
  throw 0;  // The node typing sometimes don't have a never type for process.exit().
}

function _targetStringFromTarget({project, target, configuration}: index2.Target) {
  return `${project}:${target}${configuration !== undefined ? ':' + configuration : ''}`;
}


interface BarInfo {
  status?: string;
  builder: index2.BuilderInfo;
  target?: index2.Target;
}


async function _executeTarget(
  parentLogger: logging.Logger,
  workspace: experimental.workspace.Workspace,
  root: string,
  argv: minimist.ParsedArgs,
  registry: json.schema.SchemaRegistry,
) {
  const architectHost = new WorkspaceNodeModulesArchitectHost(workspace, root);
  const architect = new index2.Architect(architectHost, registry);

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

  run.progress.subscribe(
    update => {
      const data = bars.get(update.id) || {
        id: update.id,
        builder: update.builder,
        target: update.target,
        status: update.status || '',
        name: ((update.target ? _targetStringFromTarget(update.target) : update.builder.name)
                + ' '.repeat(80)
              ).substr(0, 40),
      };

      if (update.status !== undefined) {
        data.status = update.status;
      }

      switch (update.state) {
        case index2.BuilderProgressState.Error:
          data.status = 'Error: ' + update.error;
          bars.update(update.id, data);
          break;

        case index2.BuilderProgressState.Stopped:
          data.status = 'Done.';
          bars.complete(update.id);
          bars.update(update.id, data, update.total, update.total);
          break;

        case index2.BuilderProgressState.Waiting:
          bars.update(update.id, data);
          break;

        case index2.BuilderProgressState.Running:
          bars.update(update.id, data, update.current, update.total);
          break;
      }

      bars.render();
    },
  );

  // Wait for full completion of the builder.
  try {
    const result = await run.output.pipe(last()).toPromise();

    if (result.success) {
      parentLogger.info(terminal.green('SUCCESS'));
    } else {
      parentLogger.info(terminal.yellow('FAILURE'));
    }

    parentLogger.info('\nLogs:');
    logs.forEach(l => parentLogger.next(l));

    await run.stop();
    bars.terminate();

    return result.success ? 0 : 1;
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
  const configFileNames = [
    'angular.json',
    '.angular.json',
    'workspace.json',
    '.workspace.json',
  ];

  const configFilePath = findUp(configFileNames, currentPath);

  if (!configFilePath) {
    logger.fatal(`Workspace configuration file (${configFileNames.join(', ')}) cannot be found in `
      + `'${currentPath}' or in parent directories.`);

    return 3;
  }

  const root = path.dirname(configFilePath);
  const configContent = readFileSync(configFilePath, 'utf-8');
  const workspaceJson = JSON.parse(configContent);

  const registry = new schema.CoreSchemaRegistry();
  registry.addPostTransform(schema.transforms.addUndefinedDefaults);

  const host = new NodeJsSyncHost();
  const workspace = new experimental.workspace.Workspace(normalize(root), host);

  await workspace.loadWorkspaceFromJson(workspaceJson).toPromise();

  return await _executeTarget(logger, workspace, root, argv, registry);
}

main(process.argv.slice(2))
  .then(code => {
    process.exit(code);
  }, err => {
    console.error('Error: ' + err.stack || err.message || err);
    process.exit(-1);
  });
