import {
  DryRunEvent,
  DryRunSink,
  EmptyTree,
  FileSystemSink,
  FileSystemTree,
  Tree
} from '@angular-devkit/schematics';
import { BuiltinTaskExecutor } from '@angular-devkit/schematics/tasks/node';
import { FileSystemHost } from '@angular-devkit/schematics/tools';
import { of as observableOf } from 'rxjs/observable/of';
import chalk from 'chalk';
import { CliConfig } from '../models/config';
import { concat, concatMap, ignoreElements, map } from 'rxjs/operators';
import { getCollection, getSchematic, getEngineHost, getEngine } from '../utilities/schematics';

const { green, red, yellow } = chalk;
const SilentError = require('silent-error');
const Task = require('../ember-cli/lib/models/task');

export interface SchematicRunOptions {
  dryRun: boolean;
  force: boolean;
  taskOptions: SchematicOptions;
  workingDir: string;
  emptyHost: boolean;
  collectionName: string;
  schematicName: string;
  allowPrivate?: boolean;
}

export interface SchematicOptions {
  [key: string]: any;
}

export interface SchematicOutput {
  modifiedFiles: string[];
}

interface OutputLogging {
  color: (msg: string) => string;
  keyword: string;
  message: string;
}

export default Task.extend({
  run: function (options: SchematicRunOptions): Promise<SchematicOutput> {
    const {
      taskOptions,
      force,
      dryRun,
      workingDir,
      emptyHost,
      collectionName,
      schematicName
    } = options;

    const ui = this.ui;

    const packageManager = CliConfig.fromGlobal().get('packageManager');
    const engineHost = getEngineHost();
    engineHost.registerTaskExecutor(
      BuiltinTaskExecutor.NodePackage,
      {
        rootDirectory: workingDir,
        packageManager: packageManager === 'default' ? 'npm' : packageManager,
      },
    );
    engineHost.registerTaskExecutor(
      BuiltinTaskExecutor.RepositoryInitializer,
      { rootDirectory: workingDir },
    );

    const collection = getCollection(collectionName);
    const schematic = getSchematic(collection, schematicName, options.allowPrivate);

    const tree = emptyHost ? new EmptyTree() : new FileSystemTree(new FileSystemHost(workingDir));
    const host = observableOf(tree);

    const dryRunSink = new DryRunSink(workingDir, force);
    const fsSink = new FileSystemSink(workingDir, force);

    let error = false;
    const loggingQueue: OutputLogging[] = [];
    const modifiedFiles: string[] = [];

    dryRunSink.reporter.subscribe((event: DryRunEvent) => {
      const eventPath = event.path.startsWith('/') ? event.path.substr(1) : event.path;
      switch (event.kind) {
        case 'error':
          const desc = event.description == 'alreadyExist' ? 'already exists' : 'does not exist.';
          ui.writeLine(`error! ${eventPath} ${desc}.`);
          error = true;
          break;
        case 'update':
          loggingQueue.push({
            color: yellow,
            keyword: 'update',
            message: `${eventPath} (${event.content.length} bytes)`
          });
          modifiedFiles.push(event.path);
          break;
        case 'create':
          loggingQueue.push({
            color: green,
            keyword: 'create',
            message: `${eventPath} (${event.content.length} bytes)`
          });
          modifiedFiles.push(event.path);
          break;
        case 'delete':
          loggingQueue.push({
            color: red,
            keyword: 'remove',
            message: `${eventPath}`
          });
          break;
        case 'rename':
          const eventToPath = event.to.startsWith('/') ? event.to.substr(1) : event.to;
          loggingQueue.push({
            color: yellow,
            keyword: 'rename',
            message: `${eventPath} => ${eventToPath}`
          });
          modifiedFiles.push(event.to);
          break;
      }
    });

    return schematic.call(taskOptions, host).pipe(
      map((tree: Tree) => Tree.optimize(tree)),
      concatMap((tree: Tree) => {
        return dryRunSink.commit(tree).pipe(
          ignoreElements(),
          concat(observableOf(tree)));
      }),
      concatMap((tree: Tree) => {
        if (!error) {
          // Output the logging queue.
          loggingQueue.forEach(log => ui.writeLine(`  ${log.color(log.keyword)} ${log.message}`));
        } else {
          throw new SilentError();
        }

        if (dryRun) {
          return observableOf(tree);
        }
        return fsSink.commit(tree).pipe(
          ignoreElements(),
          concat(observableOf(tree)));
      }),
      concatMap(() => {
        if (!dryRun) {
          return getEngine().executePostTasks();
        } else {
          return [];
        }
      }))
      .toPromise()
      .then(() => {
        if (dryRun) {
          ui.writeLine(yellow(`\nNOTE: Run with "dry run" no changes were made.`));
        }
        return {modifiedFiles};
      });
  }
});
