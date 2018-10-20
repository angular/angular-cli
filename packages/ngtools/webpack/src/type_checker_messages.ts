/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging } from '@angular-devkit/core';
import * as ts from 'typescript';


export enum MESSAGE_KIND {
  Init,
  Update,
  Log,
}

export abstract class TypeCheckerMessage {
  constructor(public kind: MESSAGE_KIND) { }
}

export class InitMessage extends TypeCheckerMessage {
  constructor(
    public compilerOptions: ts.CompilerOptions,
    public basePath: string,
    public jitMode: boolean,
    public rootNames: string[],
    public hostReplacementPaths: { [path: string]: string },
  ) {
    super(MESSAGE_KIND.Init);
  }
}

export class UpdateMessage extends TypeCheckerMessage {
  constructor(public rootNames: string[], public changedCompilationFiles: string[]) {
    super(MESSAGE_KIND.Update);
  }
}

export class LogMessage extends TypeCheckerMessage {
  constructor(public level: logging.LogLevel, public message: string) {
    super(MESSAGE_KIND.Log);
  }
}
