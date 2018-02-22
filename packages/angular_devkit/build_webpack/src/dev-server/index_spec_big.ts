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
import { IncomingMessage } from 'http';
import { relative, resolve } from 'path';
import * as _request from 'request';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { concatMap, take, tap } from 'rxjs/operators';
import { getWorkspace as getBrowserWorkspace } from '../browser/index_spec_big';


const devkitRoot = (global as any)._DevKitRoot; // tslint:disable-line:no-any
const root = resolve(devkitRoot, 'tests/@angular_devkit/build_webpack/hello-world-app/');
const builderPath = resolve(devkitRoot, 'packages/angular_devkit/build_webpack');
const relativeBuilderPath = relative(root, builderPath);
const host = new NodeJsSyncHost();

export const getWorkspace = (): Workspace => {
  const workspace = getBrowserWorkspace();
  workspace.projects.app.defaultTarget = 'devServer';
  workspace.projects.app.targets['devServer'] = {
    builder: `${relativeBuilderPath}:devServer`,
    options: {
      browserTarget: 'app:browser',
      watch: false,
    },
  };

  return workspace;
};

describe('Dev Server Target', () => {
  it('runs', (done) => {
    const architect = new Architect(normalize(root), host);
    architect.loadWorkspaceFromJson(getWorkspace()).pipe(
      concatMap((architect) => architect.run(architect.getTarget())),
      concatMap(() => fromPromise(request('http://localhost:4200/index.html'))),
      tap(response => expect(response).toContain('<title>HelloWorldApp</title>')),
      take(1),
    ).subscribe(undefined, done.fail, done);
  }, 30000);
});

export function request(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      url: url,
      headers: { 'Accept': 'text/html' },
      agentOptions: { rejectUnauthorized: false },
    };
    // tslint:disable-next-line:no-any
    _request(options, (error: any, response: IncomingMessage, body: string) => {
      if (error) {
        reject(error);
      } else if (response.statusCode && response.statusCode >= 400) {
        reject(new Error(`Requesting "${url}" returned status code ${response.statusCode}.`));
      } else {
        resolve(body);
      }
    });
  });
}
