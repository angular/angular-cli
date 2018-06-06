/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Stats } from 'fs';

// Declarations for (some) Webpack types. Only what's needed.

export interface Request {
  request?: Request;
  relativePath: string;
}

export interface Callback<T> {
  (err?: Error | null, result?: T): void;
}

export interface ResolverCallback {
  (request: Request, callback: Callback<void>): void;
}

export interface Tapable {
  apply(plugin: ResolverPlugin): void;
}

export interface ResolverPlugin extends Tapable {
  plugin(source: string, cb: ResolverCallback): void;
  // tslint:disable-next-line:no-any
  doResolve(target: string, req: Request, desc: string, callback: Callback<any>): void;
  join(relativePath: string, innerRequest: Request): Request;
}

export interface LoaderCallback {
  (err: Error | null, source?: string, sourceMap?: string): void;
}

export interface NormalModuleFactory {
  plugin(event: string,
         // tslint:disable-next-line:no-any
         callback: (data: NormalModuleFactoryRequest, callback: Callback<any>) => void): any;
}

export interface NormalModuleFactoryRequest {
  request: string;
  contextInfo: { issuer: string };
}

export interface InputFileSystem {
  stat(path: string, callback: Callback<Stats>): void;
  readdir(path: string, callback: Callback<string[]>): void;
  readFile(path: string, callback: Callback<string | Buffer>): void;
  // tslint:disable-next-line:no-any
  readJson(path: string, callback: Callback<any>): void;
  readlink(path: string, callback: Callback<string>): void;
  statSync(path: string): Stats;
  readdirSync(path: string): string[];
  readFileSync(path: string): string | Buffer;
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
