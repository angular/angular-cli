/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException, PriorityQueue } from '@angular-devkit/core';
import { Observable } from 'rxjs/Observable';
import { SchematicContext } from './interface';

export class UnknownTaskDependencyException extends BaseException {
  constructor(id: TaskId) {
    super(`Unknown task dependency [ID: ${id.id}].`);
  }
}

export interface TaskConfiguration<T = {}> {
  name: string;
  dependencies?: Array<TaskId>;
  options?: T;
}

export interface TaskConfigurationGenerator<T = {}> {
  toConfiguration(): TaskConfiguration<T>;
}

export type TaskExecutor<T = {}>
  = (options: T | undefined, context: SchematicContext) => Promise<void> | Observable<void>;

export interface TaskExecutorFactory<T> {
  readonly name: string;
  create(options?: T): Promise<TaskExecutor> | Observable<TaskExecutor>;
}

export interface TaskId {
  readonly id: number;
}

export interface TaskInfo {
  readonly id: number;
  readonly priority:  number;
  readonly configuration: TaskConfiguration;
  readonly context: SchematicContext;
}

export class TaskScheduler {
  private _queue = new PriorityQueue<TaskInfo>((x, y) => x.priority - y.priority);
  private _taskIds = new Map<TaskId, TaskInfo>();
  private static _taskIdCounter = 1;

  constructor(private _context: SchematicContext) {}

  private _calculatePriority(dependencies: Set<TaskInfo>): number {
    if (dependencies.size === 0) {
      return 0;
    }

    const prio = [...dependencies].reduce((prio, task) => prio + task.priority, 1);

    return prio;
  }

  private _mapDependencies(dependencies?: Array<TaskId>): Set<TaskInfo> {
    if (!dependencies) {
      return new Set();
    }

    const tasks = dependencies.map(dep => {
      const task = this._taskIds.get(dep);
      if (!task) {
        throw new UnknownTaskDependencyException(dep);
      }

      return task;
    });

    return new Set(tasks);
  }

  schedule<T>(taskConfiguration: TaskConfiguration<T>): TaskId {
    const dependencies = this._mapDependencies(taskConfiguration.dependencies);
    const priority = this._calculatePriority(dependencies);

    const task = {
      id: TaskScheduler._taskIdCounter++,
      priority,
      configuration: taskConfiguration,
      context: this._context,
    };

    this._queue.push(task);

    const id = { id: task.id };
    this._taskIds.set(id, task);

    return id;
  }

  finalize(): ReadonlyArray<TaskInfo> {
    const tasks = this._queue.toArray();
    this._queue.clear();
    this._taskIds.clear();

    return tasks;
  }

}
