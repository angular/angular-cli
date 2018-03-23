#!/usr/bin/env node
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import 'symbol-observable';
// symbol polyfill must go first
// tslint:disable-next-line:ordered-imports import-groups
import { Architect } from '@angular-devkit/architect';
import { dirname, experimental, normalize, tags } from '@angular-devkit/core';
import { NodeJsSyncHost, createConsoleLogger } from '@angular-devkit/core/node';
import { existsSync, readFileSync } from 'fs';
import * as minimist from 'minimist';
import * as path from 'path';
import { throwError } from 'rxjs';
import { concatMap } from 'rxjs/operators';


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
function usage(exitCode = 0): never {
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

/** Parse the command line. */
const argv = minimist(process.argv.slice(2), { boolean: ['help'] });

/** Create the DevKit Logger used through the CLI. */
const logger = createConsoleLogger(argv['verbose']);

// Check the target.
const targetStr = argv._.shift();
if (!targetStr && argv.help) {
  // Show architect usage if there's no target.
  usage();
}

// Split a target into its parts.
let project: string, targetName: string, configuration: string;
if (targetStr) {
  [project, targetName, configuration] = targetStr.split(':');
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
  process.exit(3);
  throw 3;  // TypeScript doesn't know that process.exit() never returns.
}

const root = dirname(normalize(configFilePath));
const configContent = readFileSync(configFilePath, 'utf-8');
const workspaceJson = JSON.parse(configContent);

const host = new NodeJsSyncHost();
const workspace = new experimental.workspace.Workspace(root, host);

let lastBuildEvent = { success: true };

workspace.loadWorkspaceFromJson(workspaceJson).pipe(
  concatMap(ws => new Architect(ws).loadArchitect()),
  concatMap(architect => {

    const overrides = { ...argv };
    delete overrides['help'];
    delete overrides['_'];

    const targetSpec = {
      project,
      target: targetName,
      configuration,
      overrides,
    };

    // TODO: better logging of what's happening.
    if (argv.help) {
      // TODO: add target help
      return throwError('Target help NYI.');
      // architect.help(targetOptions, logger);
    } else {
      const builderConfig = architect.getBuilderConfiguration(targetSpec);

      return architect.run(builderConfig, { logger });
    }
  }),
).subscribe({
  next: (buildEvent => lastBuildEvent = buildEvent),
  complete: () => process.exit(lastBuildEvent.success ? 0 : 1),
  error: (err: Error) => {
    logger.fatal(err.message);
    if (err.stack) {
      logger.fatal(err.stack);
    }
    process.exit(1);
  },
});
