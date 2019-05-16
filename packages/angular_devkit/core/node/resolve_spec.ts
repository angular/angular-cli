/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-any
// tslint:disable-next-line:no-implicit-dependencies
import { resolve } from '@angular-devkit/core/node';

describe('resolve', () => {

  it('works', () => {
    const tslintRe = /[\\/]node_modules[\\/]tslint[\\/]lib[\\/]index.js$/;
    expect(resolve('tslint', { basedir: __dirname })).toMatch(tslintRe);

    expect(() => resolve('npm', { basedir: '/' })).toThrow();

    expect(() => resolve('npm', { basedir: '/', checkGlobal: true })).not.toThrow();
  });

});
