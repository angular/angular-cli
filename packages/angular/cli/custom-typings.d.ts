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

declare module 'json-schema-traverse' {
  import { JsonObject } from '@angular-devkit/core';
  interface TraverseOptions {
    allKeys?: boolean;
  }
  type TraverseCallback = (
    schema: JsonObject,
    jsonPointer: string,
    rootSchema: string,
    parentJsonPointer: string,
    parentKeyword: string,
    parentSchema: string,
    property: string) => void;

  interface TraverseCallbacks {
    pre?: TraverseCallback;
    post?: TraverseCallback;
  }

  const traverse: (schema: object, options: TraverseOptions, cbs: TraverseCallbacks) => void;

  export = traverse;
}
