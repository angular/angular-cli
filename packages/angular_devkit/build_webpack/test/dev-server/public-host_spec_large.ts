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
import { DevServerBuilderOptions } from '../../src';
import {
  TestProjectHost,
  browserWorkspaceTarget,
  devServerWorkspaceTarget,
  makeWorkspace,
  request,
  workspaceRoot,
} from '../utils';


describe('Dev Server Builder public host', () => {
  const host = new TestProjectHost(workspaceRoot);
  const architect = new Architect(normalize(workspaceRoot), host);
  // We have to spoof the host to a non-numeric one because Webpack Dev Server does not
  // check the hosts anymore when requests come from numeric IP addresses.
  const headers = { host: 'http://spoofy.mcspoofface' };

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('works', (done) => {
    architect.loadWorkspaceFromJson(makeWorkspace([
      browserWorkspaceTarget,
      devServerWorkspaceTarget,
    ])).pipe(
      concatMap(() => architect.run(architect.getTarget())),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      concatMap(() => fromPromise(request('http://localhost:4200/', headers))),
      tap(response => expect(response).toContain('Invalid Host header')),
      take(1),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('works', (done) => {
    const overrides: Partial<DevServerBuilderOptions> = { publicHost: headers.host };

    architect.loadWorkspaceFromJson(makeWorkspace([
      browserWorkspaceTarget,
      devServerWorkspaceTarget,
    ])).pipe(
      concatMap(() => architect.run(architect.getTarget({ overrides }))),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      concatMap(() => fromPromise(request('http://localhost:4200/', headers))),
      tap(response => expect(response).toContain('<title>HelloWorldApp</title>')),
      take(1),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('works', (done) => {
    const overrides: Partial<DevServerBuilderOptions> = { disableHostCheck: true };

    architect.loadWorkspaceFromJson(makeWorkspace([
      browserWorkspaceTarget,
      devServerWorkspaceTarget,
    ])).pipe(
      concatMap(() => architect.run(architect.getTarget({ overrides }))),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      concatMap(() => fromPromise(request('http://localhost:4200/', headers))),
      tap(response => expect(response).toContain('<title>HelloWorldApp</title>')),
      take(1),
    ).subscribe(undefined, done.fail, done);
  }, 30000);
});
