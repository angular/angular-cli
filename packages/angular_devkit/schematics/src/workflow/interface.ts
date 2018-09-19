/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging } from '@angular-devkit/core';
import { Observable } from 'rxjs';

export interface RequiredWorkflowExecutionContext {
  collection: string;
  schematic: string;
  options: object;
}

export interface WorkflowExecutionContext extends RequiredWorkflowExecutionContext {
  debug: boolean;
  logger: logging.Logger;
  parentContext?: Readonly<WorkflowExecutionContext>;
  allowPrivate?: boolean;
}

export interface LifeCycleEvent {
  kind: 'start' | 'end'  // Start and end of the full workflow execution.
    | 'workflow-start' | 'workflow-end'  // Start and end of a workflow execution. Can be more.
    | 'post-tasks-start' | 'post-tasks-end';  // Start and end of the post tasks execution.
}

export interface Workflow {
  readonly context: Readonly<WorkflowExecutionContext>;

  execute(
    options: Partial<WorkflowExecutionContext> & RequiredWorkflowExecutionContext,
  ): Observable<void>;
}
