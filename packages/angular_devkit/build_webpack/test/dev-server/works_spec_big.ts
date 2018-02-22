/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { normalize } from '@angular-devkit/core';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { concatMap, take, tap } from 'rxjs/operators';
import {
  TestProjectHost,
  browserWorkspaceTarget,
  devServerWorkspaceTarget,
  makeWorkspace,
  request,
  workspaceRoot,
} from '../utils';


describe('Dev Server Builder', () => {
  const host = new TestProjectHost(workspaceRoot);
  const architect = new Architect(normalize(workspaceRoot), host);

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('works', (done) => {
    architect.loadWorkspaceFromJson(makeWorkspace([
      browserWorkspaceTarget,
      devServerWorkspaceTarget,
    ])).pipe(
      concatMap(() => architect.run(architect.getTarget())),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      concatMap(() => fromPromise(request('http://localhost:4200/index.html'))),
      tap(response => expect(response).toContain('<title>HelloWorldApp</title>')),
      take(1),
    ).subscribe(undefined, done.fail, done);
  }, 30000);
});
