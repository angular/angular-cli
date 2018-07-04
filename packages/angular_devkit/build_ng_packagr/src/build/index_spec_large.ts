/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { TargetSpecifier } from '@angular-devkit/architect';
import { TestProjectHost, runTargetSpec } from '@angular-devkit/architect/testing';
import { join, normalize } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';


const devkitRoot = normalize((global as any)._DevKitRoot); // tslint:disable-line:no-any
const workspaceRoot = join(devkitRoot, 'tests/@angular_devkit/build_ng_packagr/ng-packaged/');
export const host = new TestProjectHost(workspaceRoot);

describe('NgPackagr Builder', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    const targetSpec: TargetSpecifier = { project: 'lib', target: 'build' };

    runTargetSpec(host, targetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).toPromise().then(done, done.fail);
  });

  it('tests works', (done) => {
    const targetSpec: TargetSpecifier = { project: 'lib', target: 'test' };

    runTargetSpec(host, targetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).toPromise().then(done, done.fail);
  });

  it('lint works', (done) => {
    const targetSpec: TargetSpecifier = { project: 'lib', target: 'lint' };

    runTargetSpec(host, targetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).toPromise().then(done, done.fail);
  });
});
