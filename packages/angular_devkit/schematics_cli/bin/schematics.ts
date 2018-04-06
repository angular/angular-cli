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
import {
  JsonObject,
  normalize,
  tags,
  terminal,
  virtualFs,
} from '@angular-devkit/core';
import { NodeJsSyncHost, createConsoleLogger } from '@angular-devkit/core/node';
import { DryRunEvent, UnsuccessfulWorkflowExecution } from '@angular-devkit/schematics';
import { NodeWorkflow } from '@angular-devkit/schematics/tools';
import * as minimist from 'minimist';


/**
 * Show usage of the CLI tool, and exit the process.
 */
function usage(exitCode = 0): never {
  logger.info(tags.stripIndent`
    schematics [CollectionName:]SchematicName [options, ...]

    By default, if the collection name is not specified, use the internal collection provided
    by the Schematics CLI.

    Options:
        --debug             Debug mode. This is true by default if the collection is a relative
                            path (in that case, turn off with --debug=false).
        --allowPrivate      Allow private schematics to be run from the command line. Default to
                            false.
        --dry-run           Do not output anything, but instead just show what actions would be
                            performed. Default to true if debug is also true.
        --force             Force overwriting files that would otherwise be an error.
        --list-schematics   List all schematics from the collection, by name.
        --verbose           Show more information.

        --help              Show this message.

    Any additional option is passed to the Schematics depending on
  `);

  process.exit(exitCode);
  throw 0;  // The node typing sometimes don't have a never type for process.exit().
}


/**
 * Parse the name of schematic passed in argument, and return a {collection, schematic} named
 * tuple. The user can pass in `collection-name:schematic-name`, and this function will either
 * return `{collection: 'collection-name', schematic: 'schematic-name'}`, or it will error out
 * and show usage.
 *
 * In the case where a collection name isn't part of the argument, the default is to use the
 * schematics package (@schematics/schematics) as the collection.
 *
 * This logic is entirely up to the tooling.
 *
 * @param str The argument to parse.
 * @return {{collection: string, schematic: (string)}}
 */
function parseSchematicName(str: string | null): { collection: string, schematic: string } {
  let collection = '@schematics/schematics';

  if (!str || str === null) {
    usage(1);
  }

  let schematic: string = str as string;
  if (schematic.indexOf(':') != -1) {
    [collection, schematic] = schematic.split(':', 2);

    if (!schematic) {
      usage(2);
    }
  }

  return { collection, schematic };
}


/** Parse the command line. */
const booleanArgs = [
  'allowPrivate',
  'debug',
  'dry-run',
  'force',
  'help',
  'list-schematics',
  'verbose',
];
const argv = minimist(process.argv.slice(2), {
  boolean: booleanArgs,
  default: {
    'debug': null,
    'dry-run': null,
  },
  '--': true,
});

/** Create the DevKit Logger used through the CLI. */
const logger = createConsoleLogger(argv['verbose']);

if (argv.help) {
  usage();
}

/** Get the collection an schematic name from the first argument. */
const {
  collection: collectionName,
  schematic: schematicName,
} = parseSchematicName(argv._.shift() || null);
const isLocalCollection = collectionName.startsWith('.') || collectionName.startsWith('/');


/** If the user wants to list schematics, we simply show all the schematic names. */
if (argv['list-schematics']) {
  // logger.info(engine.listSchematicNames(collection).join('\n'));
  process.exit(0);
  throw 0;  // TypeScript doesn't know that process.exit() never returns.
}


/** Gather the arguments for later use. */
const debug: boolean = argv.debug === null ? isLocalCollection : argv.debug;
const dryRun: boolean = argv['dry-run'] === null ? debug : argv['dry-run'];
const force = argv['force'];
const allowPrivate = argv['allowPrivate'];

/** Create a Virtual FS Host scoped to where the process is being run. **/
const fsHost = new virtualFs.ScopedHost(new NodeJsSyncHost(), normalize(process.cwd()));

/** Create the workflow that will be executed with this run. */
const workflow = new NodeWorkflow(fsHost, { force, dryRun });

// Indicate to the user when nothing has been done. This is automatically set to off when there's
// a new DryRunEvent.
let nothingDone = true;

// Logging queue that receives all the messages to show the users. This only get shown when no
// errors happened.
let loggingQueue: string[] = [];
let error = false;

/**
 * Logs out dry run events.
 *
 * All events will always be executed here, in order of discovery. That means that an error would
 * be shown along other events when it happens. Since errors in workflows will stop the Observable
 * from completing successfully, we record any events other than errors, then on completion we
 * show them.
 *
 * This is a simple way to only show errors when an error occur.
 */
workflow.reporter.subscribe((event: DryRunEvent) => {
  nothingDone = false;

  switch (event.kind) {
    case 'error':
      error = true;

      const desc = event.description == 'alreadyExist' ? 'already exists' : 'does not exist.';
      logger.warn(`ERROR! ${event.path} ${desc}.`);
      break;
    case 'update':
      loggingQueue.push(tags.oneLine`
        ${terminal.white('UPDATE')} ${event.path} (${event.content.length} bytes)
      `);
      break;
    case 'create':
      loggingQueue.push(tags.oneLine`
        ${terminal.green('CREATE')} ${event.path} (${event.content.length} bytes)
      `);
      break;
    case 'delete':
      loggingQueue.push(`${terminal.yellow('DELETE')} ${event.path}`);
      break;
    case 'rename':
      loggingQueue.push(`${terminal.blue('RENAME')} ${event.path} => ${event.to}`);
      break;
  }
});


/**
 * Listen to lifecycle events of the workflow to flush the logs between each phases.
 */
workflow.lifeCycle.subscribe(event => {
  if (event.kind == 'workflow-end' || event.kind == 'post-tasks-start') {
    if (!error) {
      // Flush the log queue and clean the error state.
      loggingQueue.forEach(log => logger.info(log));
    }

    loggingQueue = [];
    error = false;
  }
});


/**
 * Remove every options from argv that we support in schematics itself.
 */
const args = Object.assign({}, argv);
delete args['--'];
for (const key of booleanArgs) {
  delete args[key];
}

/**
 * Add options from `--` to args.
 */
const argv2 = minimist(argv['--']);
for (const key of Object.keys(argv2)) {
  args[key] = argv2[key];
}

// Pass the rest of the arguments as the smart default "argv". Then delete it.
workflow.registry.addSmartDefaultProvider('argv', (schema: JsonObject) => {
  if ('index' in schema) {
    return argv._[Number(schema['index'])];
  } else {
    return argv._;
  }
});
delete args._;


/**
 *  Execute the workflow, which will report the dry run events, run the tasks, and complete
 *  after all is done.
 *
 *  The Observable returned will properly cancel the workflow if unsubscribed, error out if ANY
 *  step of the workflow failed (sink or task), with details included, and will only complete
 *  when everything is done.
 */
workflow.execute({
  collection: collectionName,
  schematic: schematicName,
  options: args,
  allowPrivate: allowPrivate,
  debug: debug,
  logger: logger,
})
.subscribe({
  error(err: Error) {
    // In case the workflow was not successful, show an appropriate error message.
    if (err instanceof UnsuccessfulWorkflowExecution) {
      // "See above" because we already printed the error.
      logger.fatal('The Schematic workflow failed. See above.');
    } else if (debug) {
      logger.fatal('An error occured:\n' + err.stack);
    } else {
      logger.fatal(err.message);
    }

    process.exit(1);
  },
  complete() {
    if (nothingDone) {
      logger.info('Nothing to be done.');
    }
  },
});
