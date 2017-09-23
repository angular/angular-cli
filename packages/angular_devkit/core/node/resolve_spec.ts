/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-any
import { resolve } from '@angular-devkit/core/node';
import * as path from 'path';

const devKitRoot = (global as any)._DevKitRoot;

describe('resolve', () => {

  it('works', () => {
    expect(resolve('tslint', { basedir: __dirname }))
      .toBe(path.join(devKitRoot, 'node_modules/tslint/lib/index.js'));

    expect(() => resolve('npm', { basedir: '/' })).toThrow();

    expect(() => resolve('npm', { basedir: '/', checkGlobal: true })).not.toThrow();
  });

});
