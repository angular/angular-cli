#!/usr/bin/env node
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// symbol polyfill must go first
import 'symbol-observable';
// tslint:disable-next-line:ordered-imports import-groups
import {
  JsonObject,
  logging,
  normalize,
  schema,
  tags,
  terminal,
  virtualFs,
} from '@angular-devkit/core';
import { NodeJsSyncHost, ProcessOutput, createConsoleLogger } from '@angular-devkit/core/node';
import {
  DryRunEvent,
  SchematicEngine,
  UnsuccessfulWorkflowExecution,
  formats,
} from '@angular-devkit/schematics';
import { NodeModulesEngineHost, NodeWorkflow, validateOptionsWithSchema } from '@angular-devkit/schematics/tools';
import * as inquirer from 'inquirer';
import * as minimist from 'minimist';


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
function parseSchematicName(str: string | null): { collection: string, schematic: string | null } {
  let collection = '@schematics/schematics';

  let schematic = str;
  if (schematic && schematic.indexOf(':') != -1) {
    [collection, schematic] = schematic.split(':', 2);
  }

  return { collection, schematic };
}


export interface MainOptions {
  args: string[];
  stdout?: ProcessOutput;
  stderr?: ProcessOutput;
}


function _listSchematics(collectionName: string, logger: logging.Logger) {
  try {
    const engineHost = new NodeModulesEngineHost();
    const engine = new SchematicEngine(engineHost);
    const collection = engine.createCollection(collectionName);
    logger.info(engine.listSchematicNames(collection).join('\n'));
  } catch (error) {
    logger.fatal(error.message);

    return 1;
  }

  return 0;
}

function _createPromptProvider(): schema.PromptProvider {
  return (definitions: Array<schema.PromptDefinition>) => {
    const questions: inquirer.Questions = definitions.map(definition => {
      const question: inquirer.Question = {
        name: definition.id,
        message: definition.message,
        default: definition.default,
      };

      const validator = definition.validator;
      if (validator) {
        question.validate = input => validator(input);
      }

      switch (definition.type) {
        case 'confirmation':
          return { ...question, type: 'confirm' };
        case 'list':
          return {
            ...question,
            type: !!definition.multiselect ? 'checkbox' : 'list',
            choices: definition.items && definition.items.map(item => {
              if (typeof item == 'string') {
                return item;
              } else {
                return {
                  name: item.label,
                  value: item.value,
                };
              }
            }),
          };
        default:
          return { ...question, type: definition.type };
      }
    });

    return inquirer.prompt(questions);
  };
}

export async function main({
  args,
  stdout = process.stdout,
  stderr = process.stderr,
}: MainOptions): Promise<0 | 1> {
  const argv = parseArgs(args);

  /** Create the DevKit Logger used through the CLI. */
  const logger = createConsoleLogger(argv['verbose'], stdout, stderr);
  if (argv.help) {
    logger.info(getUsage());

    return 0;
  }

  /** Get the collection an schematic name from the first argument. */
  const {
    collection: collectionName,
    schematic: schematicName,
  } = parseSchematicName(argv._.shift() || null);
  const isLocalCollection = collectionName.startsWith('.') || collectionName.startsWith('/');

  /** If the user wants to list schematics, we simply show all the schematic names. */
  if (argv['list-schematics']) {
    return _listSchematics(collectionName, logger);
  }

  if (!schematicName) {
    logger.info(getUsage());

    return 1;
  }

  /** Gather the arguments for later use. */
  const debug: boolean = argv.debug === null ? isLocalCollection : argv.debug;
  const dryRun: boolean = argv['dry-run'] === null ? debug : argv['dry-run'];
  const force = argv['force'];
  const allowPrivate = argv['allow-private'];

  /** Create a Virtual FS Host scoped to where the process is being run. **/
  const fsHost = new virtualFs.ScopedHost(new NodeJsSyncHost(), normalize(process.cwd()));
  const registry = new schema.CoreSchemaRegistry(formats.standardFormats);

  /** Create the workflow that will be executed with this run. */
  const workflow = new NodeWorkflow(fsHost, { force, dryRun, registry });
  registry.addPostTransform(schema.transforms.addUndefinedDefaults);
  workflow.engineHost.registerOptionsTransform(validateOptionsWithSchema(registry));

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

        const desc = event.description == 'alreadyExist' ? 'already exists' : 'does not exist';
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
  const parsedArgs = Object.assign({}, argv);
  delete parsedArgs['--'];
  for (const key of booleanArgs) {
    delete parsedArgs[key];
  }

  /**
   * Add options from `--` to args.
   */
  const argv2 = minimist(argv['--']);
  for (const key of Object.keys(argv2)) {
    parsedArgs[key] = argv2[key];
  }

  // Pass the rest of the arguments as the smart default "argv". Then delete it.
  workflow.registry.addSmartDefaultProvider('argv', (schema: JsonObject) => {
    if ('index' in schema) {
      return argv._[Number(schema['index'])];
    } else {
      return argv._;
    }
  });
  delete parsedArgs._;

  // Add prompts.
  workflow.registry.usePromptProvider(_createPromptProvider());


  /**
   *  Execute the workflow, which will report the dry run events, run the tasks, and complete
   *  after all is done.
   *
   *  The Observable returned will properly cancel the workflow if unsubscribed, error out if ANY
   *  step of the workflow failed (sink or task), with details included, and will only complete
   *  when everything is done.
   */
  try {
    await workflow.execute({
      collection: collectionName,
      schematic: schematicName,
      options: parsedArgs,
      allowPrivate: allowPrivate,
      debug: debug,
      logger: logger,
    })
      .toPromise();

    if (nothingDone) {
      logger.info('Nothing to be done.');
    }

    return 0;

  } catch (err) {
    if (err instanceof UnsuccessfulWorkflowExecution) {
      // "See above" because we already printed the error.
      logger.fatal('The Schematic workflow failed. See above.');
    } else if (debug) {
      logger.fatal('An error occured:\n' + err.stack);
    } else {
      logger.fatal(err.stack || err.message);
    }

    return 1;
  }
}

 /**
 * Get usage of the CLI tool.
 */
function getUsage(): string {
  return tags.stripIndent`
  schematics [CollectionName:]SchematicName [options, ...]

  By default, if the collection name is not specified, use the internal collection provided
  by the Schematics CLI.

  Options:
      --debug             Debug mode. This is true by default if the collection is a relative
                          path (in that case, turn off with --debug=false).

      --allow-private     Allow private schematics to be run from the command line. Default to
                          false.

      --dry-run           Do not output anything, but instead just show what actions would be
                          performed. Default to true if debug is also true.

      --force             Force overwriting files that would otherwise be an error.

      --list-schematics   List all schematics from the collection, by name. A collection name
                          should be suffixed by a colon. Example: '@schematics/schematics:'.

      --verbose           Show more information.

      --help              Show this message.

  Any additional option is passed to the Schematics depending on
  `;
}

/** Parse the command line. */
const booleanArgs = [
  'allowPrivate',
  'allow-private',
  'debug',
  'dry-run',
  'dryRun',
  'force',
  'help',
  'list-schematics',
  'listSchematics',
  'verbose',
];

function parseArgs(args: string[] | undefined): minimist.ParsedArgs {
    return minimist(args, {
      boolean: booleanArgs,
      alias: {
        'dryRun': 'dry-run',
        'listSchematics': 'list-schematics',
        'allowPrivate': 'allow-private',
      },
      default: {
        'debug': null,
        'dryRun': null,
      },
      '--': true,
    });
}

if (require.main === module) {
  const args = process.argv.slice(2);
  main({ args })
    .then(exitCode => process.exitCode = exitCode)
    .catch(e => { throw (e); });
}
