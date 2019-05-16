/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */


import { TestProjectHost } from '@angular-devkit/architect/testing';
import { getSystemPath, join } from '@angular-devkit/core';
import { ScriptTarget } from 'typescript';
import { isDifferentialLoadingNeeded } from './differential-loading';

const devkitRoot = (global as any)._DevKitRoot; // tslint:disable-line:no-any
const workspaceRoot = join(
  devkitRoot,
  'tests/angular_devkit/build_angular/hello-world-app/');

const host = new TestProjectHost(workspaceRoot);


describe('differential loading', () => {

  beforeEach(async () => host.initialize().toPromise());
  afterEach(async () => host.restore().toPromise());

  it('detects the need for differential loading for IE 9-11 and ES2015', () => {
    host.writeMultipleFiles({
      'browserslist': 'IE 9-11',
    });

    const needed = isDifferentialLoadingNeeded(getSystemPath(host.root()), ScriptTarget.ES2015);
    expect(needed).toBe(true);
  });

  it('detects no need for differential loading for Chrome and ES2015', () => {
    host.writeMultipleFiles({
      'browserslist': 'last 1 chrome version',
    });

    const needed = isDifferentialLoadingNeeded(getSystemPath(host.root()), ScriptTarget.ES2015);

    expect(needed).toBe(false);
  });

  it('detects no need for differential loading for target is ES5', () => {
    host.writeMultipleFiles({
      'browserslist': 'last 1 chrome version',
    });

    const needed = isDifferentialLoadingNeeded(getSystemPath(host.root()), ScriptTarget.ES5);

    expect(needed).toBe(false);
  });
});
