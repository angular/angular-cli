import {
  DryRunEvent,
  DryRunSink,
  EmptyTree,
  FileSystemSink,
  FileSystemTree,
  Schematic,
  Tree
} from '@angular-devkit/schematics';
import { FileSystemHost } from '@angular-devkit/schematics/tools';
import { Observable } from 'rxjs/Observable';
import * as path from 'path';
import chalk from 'chalk';
import { CliConfig } from '../models/config';
import 'rxjs/add/operator/concatMap';
import 'rxjs/add/operator/map';
import { getCollection, getSchematic } from '../utilities/schematics';

const { green, red, yellow } = chalk;
const Task = require('../ember-cli/lib/models/task');

export interface SchematicRunOptions {
  taskOptions: SchematicOptions;
  workingDir: string;
  emptyHost: boolean;
  collectionName: string;
  schematicName: string;
}

export interface SchematicOptions {
  dryRun: boolean;
  force: boolean;
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
    const { taskOptions, workingDir, emptyHost, collectionName, schematicName } = options;

    const ui = this.ui;

    const collection = getCollection(collectionName);
    const schematic = getSchematic(collection, schematicName);

    const projectRoot = !!this.project ? this.project.root : workingDir;

    const preppedOptions = prepOptions(schematic, taskOptions);
    const opts = { ...taskOptions, ...preppedOptions };

    const tree = emptyHost ? new EmptyTree() : new FileSystemTree(new FileSystemHost(workingDir));
    const host = Observable.of(tree);

    const dryRunSink = new DryRunSink(workingDir, opts.force);
    const fsSink = new FileSystemSink(workingDir, opts.force);

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

    return new Promise((resolve, reject) => {
      schematic.call(opts, host)
        .map((tree: Tree) => Tree.optimize(tree))
        .concatMap((tree: Tree) => {
          return dryRunSink.commit(tree).ignoreElements().concat(Observable.of(tree));
        })
        .concatMap((tree: Tree) => {
          if (!error) {
            // Output the logging queue.
            loggingQueue.forEach(log => ui.writeLine(`  ${log.color(log.keyword)} ${log.message}`));
          }

          if (opts.dryRun || error) {
            return Observable.of(tree);
          }
          return fsSink.commit(tree).ignoreElements().concat(Observable.of(tree));
        })
        .subscribe({
          error(err) {
            ui.writeLine(red(`Error: ${err.message}`));
            reject(err.message);
          },
          complete() {
            if (opts.dryRun) {
              ui.writeLine(yellow(`\nNOTE: Run with "dry run" no changes were made.`));
            }
            resolve({modifiedFiles});
          }
        });
    })
    .then((output: SchematicOutput) => {
      const modifiedFiles = output.modifiedFiles;
      const lintFix = taskOptions.lintFix !== undefined ?
        taskOptions.lintFix : CliConfig.getValue('defaults.lintFix');

      if (lintFix && modifiedFiles) {
        const LintTask = require('./lint').default;
        const lintTask = new LintTask({
          ui: this.ui,
          project: this.project
        });

        return lintTask.run({
          fix: true,
          force: true,
          silent: true,
          configs: [{
            files: modifiedFiles
              .filter((file: string) => /.ts$/.test(file))
              .map((file: string) => path.join(projectRoot, file))
          }]
        });
      }
    });
  }
});

function prepOptions(schematic: Schematic<{}, {}>, options: SchematicOptions): SchematicOptions {

  const properties = (<any>schematic.description).schemaJson.properties;
  const keys = Object.keys(properties);
  if (['component', 'c', 'directive', 'd'].indexOf(schematic.description.name) !== -1) {
    options.prefix = (options.prefix === 'false' || options.prefix === '')
      ? '' : options.prefix;
  }

  let preppedOptions = {
    ...options,
    ...readDefaults(schematic.description.name, keys, options)
  };
  preppedOptions = {
    ...preppedOptions,
    ...normalizeOptions(schematic.description.name, keys, options)
  };

  return preppedOptions;
}

function readDefaults(schematicName: string, optionKeys: string[], options: any): any {
  return optionKeys.reduce((acc: any, key) => {
    acc[key] = options[key] !== undefined ? options[key] : readDefault(schematicName, key);
    return acc;
  }, {});
}

const viewEncapsulationMap: any = {
  'emulated': 'Emulated',
  'native': 'Native',
  'none': 'None'
};

const changeDetectionMap: any = {
  'default': 'Default',
  'onpush': 'OnPush'
};

function normalizeOptions(schematicName: string, optionKeys: string[], options: any): any {
  return optionKeys.reduce((acc: any, key) => {

    if (schematicName === 'application' || schematicName === 'component') {
      if (key === 'viewEncapsulation' && options[key]) {
        acc[key] = viewEncapsulationMap[options[key].toLowerCase()];
      } else if (key === 'changeDetection' && options[key]) {
        acc[key] = changeDetectionMap[options[key].toLowerCase()];
      }
    }
    return acc;
  }, {});
}

function readDefault(schematicName: String, key: string) {
  const jsonPath = `defaults.${schematicName}.${key}`;
  return CliConfig.getValue(jsonPath);
}
