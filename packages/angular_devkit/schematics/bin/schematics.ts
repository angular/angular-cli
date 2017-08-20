#!/usr/bin/env node
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { createLogger } from '@angular-devkit/core';
import {
  DryRunEvent,
  DryRunSink,
  FileSystemSink,
  FileSystemTree,
  SchematicEngine,
  Tree,
} from '@angular-devkit/schematics';
import {
  FileSystemHost,
  FileSystemSchematicDesc,
  NodeModulesEngineHost,
} from '@angular-devkit/schematics/tools';
import { SchemaClassFactory } from '@ngtools/json-schema';
import * as minimist from 'minimist';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/ignoreElements';


/**
 * Show usage of the CLI tool, and exit the process.
 */
function usage(exitCode = 0): never {
  logger.info(`
    schematics [CollectionName:]SchematicName [options, ...]

    By default, if the collection name is not specified, use the internal collection provided
    by the Schematics CLI.

    Options:
        --dry-run           Do not output anything, but instead just show what actions would be
                            performed.
        --force             Force overwriting files that would otherwise be an error.
        --list-schematics   List all schematics from the collection, by name.
        --help              Show this message.

    Any additional option is passed to the Schematics depending on
  `.replace(/^\s\s\s\s/g, ''));  // To remove the indentation.

  process.exit(exitCode);
  throw 0;  // The node typing sometimes don't have a never type for process.exit().
}


/**
 * Parse the name of schematic passed in argument, and return a {collection, schematic} named
 * tuple. The user can pass in `collection-name:schematic-name`, and this function will either
 * return `{collection: 'collection-name', schematic: 'schematic-name'}`, or it will error out
 * and show usage.
 *
 * In the case where a collection name isn't part of the argument, the default is to use this
 * package (@schematics/angular) as the collection.
 *
 * This logic is entirely up to the tooling.
 *
 * @param str The argument to parse.
 * @return {{collection: string, schematic: (string)}}
 */
function parseSchematicName(str: string | null): { collection: string, schematic: string } {
  let collection = '@schematics/angular';

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
const argv = minimist(process.argv.slice(2), {
  boolean: [ 'dry-run', 'force', 'help', 'list-schematics', 'verbose' ],
});
/** Create the DevKit Logger used through the CLI. */
const logger = createLogger(argv['verbose']);

if (argv.help) {
  usage();
}

/** Get the collection an schematic name from the first argument. */
const {
  collection: collectionName,
  schematic: schematicName,
} = parseSchematicName(argv._.shift() || null);


/**
 * Create the SchematicEngine, which is used by the Schematic library as callbacks to load a
 * Collection or a Schematic.
 */
const engineHost = new NodeModulesEngineHost();
const engine = new SchematicEngine(engineHost);

// Add support for schemaJson.
engineHost.registerOptionsTransform((schematic: FileSystemSchematicDesc, options: {}) => {
  if (schematic.schema && schematic.schemaJson) {
    const SchemaMetaClass = SchemaClassFactory<{}>(schematic.schemaJson);
    const schemaClass = new SchemaMetaClass(options);

    return schemaClass.$$root();
  }

  return options;
});


/**
 * The collection to be used.
 * @type {Collection|any}
 */
const collection = engine.createCollection(collectionName);
if (collection === null) {
  logger.fatal(`Invalid collection name: "${collectionName}".`);
  process.exit(3);
  throw 3;  // TypeScript doesn't know that process.exit() never returns.
}


/** If the user wants to list schematics, we simply show all the schematic names. */
if (argv['list-schematics']) {
  logger.info(engineHost.listSchematics(collection).join('\n'));
  process.exit(0);
  throw 0;  // TypeScript doesn't know that process.exit() never returns.
}


/** Create the schematic from the collection. */
const schematic = collection.createSchematic(schematicName);

/** Gather the arguments for later use. */
const force = argv['force'];
const dryRun = argv['dry-run'];

/** This host is the original Tree created from the current directory. */
const host = Observable.of(new FileSystemTree(new FileSystemHost(process.cwd())));

// We need two sinks if we want to output what will happen, and actually do the work.
// Note that fsSink is technically not used if `--dry-run` is passed, but creating the Sink
// does not have any side effect.
const dryRunSink = new DryRunSink(process.cwd(), force);
const fsSink = new FileSystemSink(process.cwd(), force);


// We keep a boolean to tell us whether an error would occur if we were to commit to an
// actual filesystem. In this case we simply show the dry-run, but skip the fsSink commit.
let error = false;


const loggingQueue: string[] = [];

// Logs out dry run events.
dryRunSink.reporter.subscribe((event: DryRunEvent) => {
  switch (event.kind) {
    case 'error':
      const desc = event.description == 'alreadyExist' ? 'already exists' : 'does not exist.';
      logger.warn(`ERROR! ${event.path} ${desc}.`);
      error = true;
      break;
    case 'update':
      loggingQueue.push(`UPDATE ${event.path} (${event.content.length} bytes)`);
      break;
    case 'create':
      loggingQueue.push(`CREATE ${event.path} (${event.content.length} bytes)`);
      break;
    case 'delete':
      loggingQueue.push(`DELETE ${event.path}`);
      break;
    case 'rename':
      loggingQueue.push(`RENAME ${event.path} => ${event.to}`);
      break;
  }
});


/**
 * The main path. Call the schematic with the host. This creates a new Context for the schematic
 * to run in, then call the schematic rule using the input Tree. This returns a new Tree as if
 * the schematic was applied to it.
 *
 * We then optimize this tree. This removes any duplicated actions or actions that would result
 * in a noop (for example, creating then deleting a file). This is not necessary but will greatly
 * improve performance as hitting the file system is costly.
 *
 * Then we proceed to run the dryRun commit. We run this before we then commit to the filesystem
 * (if --dry-run was not passed or an error was detected by dryRun).
 */
schematic.call(argv, host)
  .map((tree: Tree) => Tree.optimize(tree))
  .concatMap((tree: Tree) => {
    return dryRunSink.commit(tree).ignoreElements().concat(Observable.of(tree));
  })
  .concatMap((tree: Tree) => {
    if (!error) {
      // Output the logging queue.
      loggingQueue.forEach(log => logger.info(log));
    }

    if (dryRun || error) {
      return Observable.of(tree);
    }

    return fsSink.commit(tree).ignoreElements().concat(Observable.of(tree));
  })
  .subscribe({
    error(err: Error) {
      logger.fatal(err.toString());
      process.exit(1);
    },
  });
