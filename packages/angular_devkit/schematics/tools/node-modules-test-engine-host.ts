/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { TaskConfiguration, TaskConfigurationGenerator, TaskId } from '../src/engine';
import { FileSystemSchematicContext } from './description';
import { NodeModulesEngineHost } from './node-module-engine-host';


/**
 * An EngineHost that uses a registry to super seed locations of collection.json files, but
 * revert back to using node modules resolution. This is done for testing.
 */
export class NodeModulesTestEngineHost extends NodeModulesEngineHost {
  private _collections = new Map<string, string>();
  private _tasks = [] as TaskConfiguration[];

  get tasks() { return this._tasks; }

  clearTasks() { this._tasks = []; }

  registerCollection(name: string, path: string) {
    this._collections.set(name, path);
  }

  transformContext(context: FileSystemSchematicContext): FileSystemSchematicContext {
    const oldAddTask = context.addTask;
    context.addTask = (task: TaskConfigurationGenerator<{}>, dependencies?: Array<TaskId>) => {
      this._tasks.push(task.toConfiguration());

      return oldAddTask.call(context, task, dependencies);
    };

    return context;
  }

  protected _resolveCollectionPath(name: string): string {
    const maybePath = this._collections.get(name);
    if (maybePath) {
      return maybePath;
    }

    return super._resolveCollectionPath(name);
  }
}
