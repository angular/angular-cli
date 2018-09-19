/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { experimental, logging, normalize } from '@angular-devkit/core';
import { Observable, merge, throwError, timer } from 'rxjs';
import { concatMap, concatMapTo, finalize, takeUntil } from 'rxjs/operators';
import { Architect, BuildEvent, TargetSpecifier } from '../src';
import { TestProjectHost } from './test-project-host';

export const DefaultTimeout = 45000;

export function runTargetSpec(
  host: TestProjectHost,
  targetSpec: TargetSpecifier,
  overrides = {},
  timeout = DefaultTimeout,
  logger: logging.Logger = new logging.NullLogger(),
): Observable<BuildEvent> {
  targetSpec = { ...targetSpec, overrides };
  const workspaceFile = normalize('angular.json');
  const workspace = new experimental.workspace.Workspace(host.root(), host);

  // Emit when runArchitect$ completes or errors.
  // TODO: There must be a better way of doing this...
  let finalizeCB = () => { };
  const runArchitectFinalize$ = new Observable(obs => {
    finalizeCB = () => obs.next();
  });

  // Load the workspace from the root of the host, then run a target.
  const runArchitect$ = workspace.loadWorkspaceFromHost(workspaceFile).pipe(
    concatMap(ws => new Architect(ws).loadArchitect()),
    concatMap(arch => arch.run(arch.getBuilderConfiguration(targetSpec), { logger })),
    finalize(() => finalizeCB()),
  );

  // Error out after the timeout if runArchitect$ hasn't finalized.
  const timeout$ = timer(timeout).pipe(
    takeUntil(runArchitectFinalize$),
    concatMapTo(throwError(`runTargetSpec timeout (${timeout}) reached.`)),
  );

  return merge(
    timeout$,
    runArchitect$,
  );
}
