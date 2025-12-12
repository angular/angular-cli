/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { TaskConfiguration, TaskConfigurationGenerator, TaskId } from '../src/engine';
import { FileSystemSchematicContext } from './description';
import { NodeModulesEngineHost } from './node-module-engine-host';

/**
 * An EngineHost that uses a registry to super seed locations of collection.json files, but
 * revert back to using node modules resolution. This is done for testing.
 */
export class NodeModulesTestEngineHost extends NodeModulesEngineHost {
  #collections = new Map<string, string>();
  #tasks: TaskConfiguration[] = [];

  get tasks(): TaskConfiguration[] {
    return this.#tasks;
  }

  clearTasks(): void {
    this.#tasks = [];
  }

  registerCollection(name: string, path: string): void {
    this.#collections.set(name, path);
  }

  override transformContext(context: FileSystemSchematicContext): FileSystemSchematicContext {
    const oldAddTask = context.addTask.bind(context);
    context.addTask = (task: TaskConfigurationGenerator, dependencies?: TaskId[]) => {
      this.#tasks.push(task.toConfiguration());

      return oldAddTask(task, dependencies);
    };

    return context;
  }

  protected override _resolveCollectionPath(name: string, requester?: string): string {
    return this.#collections.get(name) ?? super._resolveCollectionPath(name, requester);
  }
}
