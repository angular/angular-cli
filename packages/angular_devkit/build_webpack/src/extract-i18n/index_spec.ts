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
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { relative, resolve } from 'path';
import { concatMap, tap, toArray } from 'rxjs/operators';
import { getWorkspace as getBrowserWorkspace } from '../browser/index_spec';


describe('Extract i18n Target', () => {
  const devkitRoot = (global as any)._DevKitRoot; // tslint:disable-line:no-any
  const root = resolve(devkitRoot, 'tests/@angular_devkit/build_webpack/hello-world-app/');
  const builderPath = resolve(devkitRoot, 'packages/angular_devkit/build_webpack');
  const relativeBuilderPath = relative(root, builderPath);
  const host = new NodeJsSyncHost();
  const extractionFile = resolve(root, 'src', 'messages.xlf');

  const getWorkspace = (): Workspace => {
    const workspace = getBrowserWorkspace();
    workspace.projects.app.defaultTarget = 'extractI18n';
    workspace.projects.app.targets['extractI18n'] = {
      builder: `${relativeBuilderPath}:extractI18n`,
      options: {
        browserTarget: 'app:browser',
      },
    };

    return workspace;
  };

  beforeEach(() => {
    if (existsSync(extractionFile)) {
      unlinkSync(extractionFile);
    }
  });

  it('builds targets', (done) => {
    const architect = new Architect(normalize(root), host);
    architect.loadWorkspaceFromJson(getWorkspace()).pipe(
      concatMap((architect) => architect.run(architect.getTarget())),
      toArray(),
      tap(events => expect(events.length).toBe(0)),
      tap(() => {
        expect(existsSync(extractionFile)).toBe(true);
        expect(readFileSync(extractionFile)).toMatch(/i18n test/);
      }),
    ).subscribe(done, done.fail);
  }, 30000);
});
