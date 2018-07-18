/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Stats } from 'fs';

// Declarations for (some) Webpack types. Only what's needed.

// tslint:disable-next-line:no-any
export interface Callback<T = any> {
  (err?: Error | null, result?: T): void;
}

export interface NormalModuleFactoryRequest {
  request: string;
  context: { issuer: string };
  contextInfo: { issuer: string };
  typescriptPathMapped?: boolean;
}

export interface InputFileSystem {
  stat(path: string, callback: Callback<Stats>): void;
  readdir(path: string, callback: Callback<string[]>): void;
  readFile(path: string, callback: Callback<Buffer>): void;
  readJson(path: string, callback: Callback): void;
  readlink(path: string, callback: Callback<string>): void;
  statSync(path: string): Stats;
  readdirSync(path: string): string[];
  readFileSync(path: string): Buffer;
  // tslint:disable-next-line:no-any
  readJsonSync(path: string): any;
  readlinkSync(path: string): string;
  purge(changes?: string[] | string): void;
}

export interface NodeWatchFileSystemInterface {
  inputFileSystem: InputFileSystem;
  new(inputFileSystem: InputFileSystem): NodeWatchFileSystemInterface;
  // tslint:disable-next-line:no-any
  watch(files: any, dirs: any, missing: any, startTime: any, options: any, callback: any,
        // tslint:disable-next-line:no-any
        callbackUndelayed: any): any;
}
