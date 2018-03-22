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
}

export interface Workflow {
  readonly context: Readonly<WorkflowExecutionContext>;

  execute(
    options: Partial<WorkflowExecutionContext> & RequiredWorkflowExecutionContext,
  ): Observable<void>;
}
