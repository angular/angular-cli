/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect, Workspace } from '@angular-devkit/architect';
import { normalize } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { relative, resolve } from 'path';
import { concatMap, take } from 'rxjs/operators';
import { getWorkspace as getDevServerWorkspace } from '../dev-server/index_spec';


describe('Protractor Target', () => {
  const devkitRoot = (global as any)._DevKitRoot; // tslint:disable-line:no-any
  const root = resolve(devkitRoot, 'tests/@angular_devkit/build_webpack/hello-world-app/');
  const builderPath = resolve(devkitRoot, 'packages/angular_devkit/build_webpack');
  const relativeBuilderPath = relative(root, builderPath);
  const host = new NodeJsSyncHost();

  const getWorkspace = (): Workspace => {
    const workspace = getDevServerWorkspace();
    workspace.projects.app.defaultTarget = 'protractor';
    workspace.projects.app.targets['protractor'] = {
      builder: `${relativeBuilderPath}:protractor`,
      options: {
        protractorConfig: '../protractor.conf.js',
        devServerTarget: 'app:devServer',
      },
    };

    return workspace;
  };

  it('runs', (done) => {
    const architect = new Architect(normalize(root), host);
    architect.loadWorkspaceFromJson(getWorkspace()).pipe(
      concatMap((architect) => architect.run(architect.getTarget())),
      take(1),
    ).subscribe(done, done.fail);
  }, 30000);
});
