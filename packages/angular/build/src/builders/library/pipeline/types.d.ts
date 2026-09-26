/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

declare module 'rolldown-plugin-dts' {
  import type { Plugin } from 'rolldown';
  import type { IsolatedDeclarationsOptions } from 'rolldown/experimental';

  interface Logger {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  }
  interface GeneralOptions {
    generator?: 'tsc' | 'oxc' | 'tsgo';
    entry?: string | string[];
    cwd?: string;
    dtsInput?: boolean;
    emitDtsOnly?: boolean;
    tsconfig?: string | boolean;
    tsconfigRaw?: unknown;
    compilerOptions?: unknown;
    sourcemap?: boolean;
    resolver?: 'oxc' | 'tsc';
    cjsDefault?: boolean;
    sideEffects?: boolean;
    logger?: Logger;
  }

  interface TscOptions {
    build?: boolean;
    incremental?: boolean;
    parallel?: boolean;
    eager?: boolean;
    newContext?: boolean;
    emitJs?: boolean;
  }

  interface Options extends GeneralOptions, TscOptions {
    oxc?: Omit<IsolatedDeclarationsOptions, 'sourcemap'>;
    tsgo?: TsgoOptions;
    customLanguages?: unknown[];
  }

  interface TsgoOptions {
    path?: string;
  }

  export declare function dts(options?: Options): Plugin[];
}
