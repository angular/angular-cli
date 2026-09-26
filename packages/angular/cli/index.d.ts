/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

export declare class Version {
  readonly full: string;
  readonly major: string;
  readonly minor: string;
  readonly patch: string;
  constructor(full: string);
}

export declare const VERSION: Version;

export default function execute(options: { cliArgs: string[] }): Promise<number>;
