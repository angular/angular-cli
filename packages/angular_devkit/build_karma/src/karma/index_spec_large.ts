/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { TestProjectHost, runTargetSpec } from '@angular-devkit/architect/testing';
import { join, normalize } from '@angular-devkit/core';
import { tap, toArray } from 'rxjs/operators';


const devkitRoot = normalize((global as any)._DevKitRoot); // tslint:disable-line:no-any
const basicWorkspaceRoot = join(devkitRoot, 'tests/@angular_devkit/build_webpack/basic-app/');
export const basicHost = new TestProjectHost(basicWorkspaceRoot);
const angularWorkspaceRoot = join(devkitRoot, 'tests/@angular_devkit/build_webpack/angular-app/');
export const angularHost = new TestProjectHost(angularWorkspaceRoot);

describe('Karma Builder', () => {
  describe('basic app', () => {
    const targetSpec = { project: 'app', target: 'test' };

    beforeEach(done => basicHost.initialize().subscribe(undefined, done.fail, done));
    afterEach(done => basicHost.restore().subscribe(undefined, done.fail, done));

    it('works', (done) => {
      runTargetSpec(basicHost, targetSpec).pipe(
        toArray(),
        tap((buildEvents) => expect(buildEvents).toEqual([{ success: true }])),
      ).toPromise().then(done, done.fail);
    }, 30000);
  });

  describe('Angular app', () => {
    const targetSpec = { project: 'app', target: 'test-karma' };

    beforeEach(done => angularHost.initialize().subscribe(undefined, done.fail, done));
    afterEach(done => angularHost.restore().subscribe(undefined, done.fail, done));

    it('works', (done) => {
      runTargetSpec(angularHost, targetSpec).pipe(
        toArray(),
        tap((buildEvents) => expect(buildEvents).toEqual([{ success: true }])),
      ).toPromise().then(done, done.fail);
    }, 30000);
  });
});
