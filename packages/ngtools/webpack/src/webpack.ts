/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { InputFileSystem } from 'webpack';

// Declarations for (some) Webpack types. Only what's needed.

export interface NormalModuleFactoryRequest {
  request: string;
  context: { issuer: string };
  contextInfo: { issuer: string };
  typescriptPathMapped?: boolean;
}

export interface NodeWatchFileSystemInterface {
  inputFileSystem: InputFileSystem;
  new(inputFileSystem: InputFileSystem): NodeWatchFileSystemInterface;
  // tslint:disable-next-line:no-any
  watch(files: any, dirs: any, missing: any, startTime: any, options: any, callback: any,
        // tslint:disable-next-line:no-any
        callbackUndelayed: any): any;
}
