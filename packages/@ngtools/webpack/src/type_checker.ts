// @ignoreDep typescript
import * as process from 'process';
import * as ts from 'typescript';
import chalk from 'chalk';

import { WebpackCompilerHost } from './compiler_host';
import { time, timeEnd } from './benchmark';
import { CancellationToken, gatherDiagnostics } from './gather_diagnostics';
import {
  Program,
  CompilerOptions,
  CompilerHost,
  createProgram,
  createCompilerHost,
  formatDiagnostics,
} from './ngtools_api';

// Force basic color support on terminals with no color support.
// Chalk typings don't have the correct constructor parameters.
const chalkCtx = new (chalk.constructor as any)(chalk.supportsColor ? {} : { level: 1 });
const { bold, red, yellow } = chalkCtx;

export enum MESSAGE_KIND {
  Init,
  Update
}

export abstract class TypeCheckerMessage {
  constructor(public kind: MESSAGE_KIND) { }
}

export class InitMessage extends TypeCheckerMessage {
  constructor(
    public compilerOptions: ts.CompilerOptions,
    public basePath: string,
    public jitMode: boolean,
    public tsFilenames: string[],
  ) {
    super(MESSAGE_KIND.Init);
  }
}

export class UpdateMessage extends TypeCheckerMessage {
  constructor(public changedTsFiles: string[]) {
    super(MESSAGE_KIND.Update);
  }
}

let typeChecker: TypeChecker;
let lastCancellationToken: CancellationToken;

process.on('message', (message: TypeCheckerMessage) => {
  time('TypeChecker.message');
  switch (message.kind) {
    case MESSAGE_KIND.Init:
      const initMessage = message as InitMessage;
      typeChecker = new TypeChecker(
        initMessage.compilerOptions,
        initMessage.basePath,
        initMessage.jitMode,
        initMessage.tsFilenames,
      );
      break;
    case MESSAGE_KIND.Update:
      if (!typeChecker) {
        throw new Error('TypeChecker: update message received before initialization');
      }
      if (lastCancellationToken) {
        // This cancellation token doesn't seem to do much, messages don't seem to be processed
        // before the diagnostics finish.
        lastCancellationToken.requestCancellation();
      }
      const updateMessage = message as UpdateMessage;
      lastCancellationToken = new CancellationToken();
      typeChecker.update(updateMessage.changedTsFiles, lastCancellationToken);
      break;
    default:
      throw new Error(`TypeChecker: Unexpected message received: ${message}.`);
  }
  timeEnd('TypeChecker.message');
});


class TypeChecker {
  private _program: ts.Program | Program;
  private _angularCompilerHost: WebpackCompilerHost & CompilerHost;

  constructor(
    private _angularCompilerOptions: CompilerOptions,
    _basePath: string,
    private _JitMode: boolean,
    private _tsFilenames: string[],
  ) {
    time('TypeChecker.constructor');
    const compilerHost = new WebpackCompilerHost(_angularCompilerOptions, _basePath);
    compilerHost.enableCaching();
    this._angularCompilerHost = createCompilerHost({
      options: this._angularCompilerOptions,
      tsHost: compilerHost
    }) as CompilerHost & WebpackCompilerHost;
    timeEnd('TypeChecker.constructor');
  }

  private _updateTsFilenames(changedTsFiles: string[]) {
    time('TypeChecker._updateTsFilenames');
    changedTsFiles.forEach((fileName) => {
      this._angularCompilerHost.invalidate(fileName);
      if (!this._tsFilenames.includes(fileName)) {
        this._tsFilenames.push(fileName);
      }
    });
    timeEnd('TypeChecker._updateTsFilenames');
  }

  private _createOrUpdateProgram() {
    if (this._JitMode) {
      // Create the TypeScript program.
      time('TypeChecker._createOrUpdateProgram.ts.createProgram');
      this._program = ts.createProgram(
        this._tsFilenames,
        this._angularCompilerOptions,
        this._angularCompilerHost,
        this._program as ts.Program
      ) as ts.Program;
      timeEnd('TypeChecker._createOrUpdateProgram.ts.createProgram');
    } else {
      time('TypeChecker._createOrUpdateProgram.ng.createProgram');
      // Create the Angular program.
      this._program = createProgram({
        rootNames: this._tsFilenames,
        options: this._angularCompilerOptions,
        host: this._angularCompilerHost,
        oldProgram: this._program as Program
      }) as Program;
      timeEnd('TypeChecker._createOrUpdateProgram.ng.createProgram');
    }
  }

  private _diagnose(cancellationToken: CancellationToken) {
    const allDiagnostics = gatherDiagnostics(
      this._program, this._JitMode, 'TypeChecker', cancellationToken);

    // Report diagnostics.
    if (!cancellationToken.isCancellationRequested()) {
      const errors = allDiagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error);
      const warnings = allDiagnostics.filter((d) => d.category === ts.DiagnosticCategory.Warning);

      if (errors.length > 0) {
        const message = formatDiagnostics(errors);
        console.error(bold(red('ERROR in ' + message)));
      }

      if (warnings.length > 0) {
        const message = formatDiagnostics(warnings);
        console.log(bold(yellow('WARNING in ' + message)));
      }
    }
  }

  public update(changedTsFiles: string[], cancellationToken: CancellationToken) {
    this._updateTsFilenames(changedTsFiles);
    this._createOrUpdateProgram();
    this._diagnose(cancellationToken);
  }
}
