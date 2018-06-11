/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable:no-global-tslint-disable no-any
declare module 'yargs-parser' {
  const parseOptions: any;
  const yargsParser: <T = any>(args: string | string[], options?: typeof parseOptions) => T;
  export = yargsParser;
}
