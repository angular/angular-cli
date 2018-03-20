/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect, BuildEvent, TargetSpecifier } from '@angular-devkit/architect';
import { experimental, join, logging, normalize } from '@angular-devkit/core';
import { createConsoleLogger } from '@angular-devkit/core/node';
import { Observable } from 'rxjs/Observable';
import { concatMap } from 'rxjs/operators';
import { TestProjectHost } from '../utils/test-project-host';


const workspaceFile = normalize('.angular.json');
const devkitRoot = normalize((global as any)._DevKitRoot); // tslint:disable-line:no-any

export const workspaceRoot = join(devkitRoot,
  'tests/@angular_devkit/build_webpack/hello-world-app/');
export const host = new TestProjectHost(workspaceRoot);
export const outputPath = normalize('dist');
export const browserTargetSpec = { project: 'app', target: 'build' };
export const devServerTargetSpec = { project: 'app', target: 'serve' };
export const extractI18nTargetSpec = { project: 'app', target: 'extract-i18n' };
export const karmaTargetSpec = { project: 'app', target: 'test' };
export const tslintTargetSpec = { project: 'app', target: 'lint' };
export const protractorTargetSpec = { project: 'app-e2e', target: 'e2e' };

export function runTargetSpec(
  host: TestProjectHost,
  targetSpec: TargetSpecifier,
  overrides = {},
  logger: logging.Logger = createConsoleLogger(),
): Observable<BuildEvent> {
  targetSpec = { ...targetSpec, overrides };
  const workspace = new experimental.workspace.Workspace(workspaceRoot, host);

  return workspace.loadWorkspaceFromHost(workspaceFile).pipe(
    concatMap(ws => new Architect(ws).loadArchitect()),
    concatMap(arch => arch.run(arch.getBuilderConfiguration(targetSpec), { logger })),
  );
}
