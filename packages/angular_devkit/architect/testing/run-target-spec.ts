/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Path, experimental, logging, normalize } from '@angular-devkit/core';
import { Observable } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { Architect, BuildEvent, TargetSpecifier } from '../src';
import { TestProjectHost } from './test-project-host';


export function runTargetSpec(
  host: TestProjectHost,
  targetSpec: TargetSpecifier,
  overrides = {},
  logger: logging.Logger = new logging.NullLogger(),
): Observable<BuildEvent> {
  targetSpec = { ...targetSpec, overrides };
  const workspaceFile = normalize('angular.json');
  const workspace = new experimental.workspace.Workspace(host.root(), host);

  return workspace.loadWorkspaceFromHost(workspaceFile).pipe(
    concatMap(ws => new Architect(ws).loadArchitect()),
    concatMap(arch => arch.run(arch.getBuilderConfiguration(targetSpec), { logger })),
  );
}
