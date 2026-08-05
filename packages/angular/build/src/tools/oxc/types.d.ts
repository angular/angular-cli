/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

declare module 'istanbul-lib-instrument' {
  export interface Instrumenter {
    instrumentSync(code: string, filename: string, inputSourceMap?: object): string;
    lastSourceMap(): object | undefined;
  }

  export function createInstrumenter(options?: {
    produceSourceMap?: boolean;
    esModules?: boolean;
    coverageVariable?: string;
  }): Instrumenter;
}
