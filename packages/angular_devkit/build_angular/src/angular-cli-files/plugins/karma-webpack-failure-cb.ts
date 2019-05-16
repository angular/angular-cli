/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.

// Force Webpack to throw compilation errors. Useful with karma-webpack when in single-run mode.
// Workaround for https://github.com/webpack-contrib/karma-webpack/issues/66

export class KarmaWebpackFailureCb {
  constructor(private callback: (error: string | undefined, errors: string[]) => void) { }

  apply(compiler: any): void {
    compiler.hooks.done.tap('KarmaWebpackFailureCb', (stats: any) => {
      if (stats.compilation.errors.length > 0) {
        this.callback(undefined, stats.compilation.errors.map((error: any) => error.message? error.message : error.toString()));
      }
    });
  }
}
