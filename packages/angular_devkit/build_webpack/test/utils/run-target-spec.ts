/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect, BuildEvent, Target } from '@angular-devkit/architect';
import { experimental, logging } from '@angular-devkit/core';
import { Observable } from 'rxjs/Observable';
import { concatMap, tap } from 'rxjs/operators';
import { TestProjectHost, workspaceRoot } from '../utils';
import { makeWorkspace } from './default-workspaces';


export function runTargetSpec(
  host: TestProjectHost,
  targets: Target<{}> | Target<{}>[],
  overrides = {},
  logger: logging.Logger = new logging.NullLogger(),
): Observable<BuildEvent> {
  if (!Array.isArray(targets)) {
    targets = [targets];
  }

  const targetName = targets[targets.length - 1].builder;
  const targetSpec = { project: 'app', target: targetName, overrides };
  const workspace = new experimental.workspace.Workspace(workspaceRoot, host);
  let architect: Architect;

  return workspace.loadWorkspaceFromJson(makeWorkspace(targets)).pipe(
    concatMap(ws => new Architect(ws).loadArchitect()),
    tap(arch => architect = arch),
    concatMap(() => architect.getBuilderConfiguration(targetSpec)),
    concatMap(cfg => architect.run(cfg, { logger })),
  );
}
