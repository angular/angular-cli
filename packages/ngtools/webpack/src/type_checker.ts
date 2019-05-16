/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { normalize, resolve, virtualFs } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import {
  CompilerHost,
  CompilerOptions,
  Program,
  createCompilerHost,
  createProgram,
  formatDiagnostics,
} from '@angular/compiler-cli';
import * as ts from 'typescript';
import { time, timeEnd } from './benchmark';
import { WebpackCompilerHost } from './compiler_host';
import { CancellationToken, DiagnosticMode, gatherDiagnostics } from './gather_diagnostics';
import { LogMessage, TypeCheckerMessage } from './type_checker_messages';


// This file should run in a child process with the AUTO_START_ARG argument
export const AUTO_START_ARG = '9d93e901-158a-4cf9-ba1b-2f0582ffcfeb';

export class TypeChecker {
  private _program: ts.Program | Program;
  private _compilerHost: WebpackCompilerHost & CompilerHost;

  constructor(
    private _compilerOptions: CompilerOptions,
    _basePath: string,
    private _JitMode: boolean,
    private _rootNames: string[],
    hostReplacementPaths: { [path: string]: string },
  ) {
    time('TypeChecker.constructor');
    const host = new virtualFs.AliasHost(new NodeJsSyncHost());

    // Add file replacements.
    for (const from in hostReplacementPaths) {
      const normalizedFrom = resolve(normalize(_basePath), normalize(from));
      const normalizedWith = resolve(
        normalize(_basePath),
        normalize(hostReplacementPaths[from]),
      );
      host.aliases.set(normalizedFrom, normalizedWith);
    }

    const compilerHost = new WebpackCompilerHost(
      _compilerOptions,
      _basePath,
      host,
      true,
    );
    // We don't set a async resource loader on the compiler host because we only support
    // html templates, which are the only ones that can throw errors, and those can be loaded
    // synchronously.
    // If we need to also report errors on styles then we'll need to ask the main thread
    // for these resources.
    this._compilerHost = createCompilerHost({
      options: this._compilerOptions,
      tsHost: compilerHost,
    }) as CompilerHost & WebpackCompilerHost;
    timeEnd('TypeChecker.constructor');
  }

  private _update(rootNames: string[], changedCompilationFiles: string[]) {
    time('TypeChecker._update');
    this._rootNames = rootNames;
    changedCompilationFiles.forEach((fileName) => {
      this._compilerHost.invalidate(fileName);
    });
    timeEnd('TypeChecker._update');
  }

  private _createOrUpdateProgram() {
    if (this._JitMode) {
      // Create the TypeScript program.
      time('TypeChecker._createOrUpdateProgram.ts.createProgram');
      this._program = ts.createProgram(
        this._rootNames,
        this._compilerOptions,
        this._compilerHost,
        this._program as ts.Program,
      ) as ts.Program;
      timeEnd('TypeChecker._createOrUpdateProgram.ts.createProgram');
    } else {
      time('TypeChecker._createOrUpdateProgram.ng.createProgram');
      // Create the Angular program.
      this._program = createProgram({
        rootNames: this._rootNames,
        options: this._compilerOptions,
        host: this._compilerHost,
        oldProgram: this._program as Program,
      }) as Program;
      timeEnd('TypeChecker._createOrUpdateProgram.ng.createProgram');
    }
  }

  private _diagnose(cancellationToken: CancellationToken) {
    const allDiagnostics = gatherDiagnostics(
      this._program, this._JitMode, 'TypeChecker', DiagnosticMode.Semantic, cancellationToken);

    // Report diagnostics.
    if (!cancellationToken.isCancellationRequested()) {
      const errors = allDiagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error);
      const warnings = allDiagnostics.filter((d) => d.category === ts.DiagnosticCategory.Warning);

      if (errors.length > 0) {
        const message = formatDiagnostics(errors);
        this.sendMessage(new LogMessage('error', 'ERROR in ' + message));
      } else {
        // Reset the changed file tracker only if there are no errors.
        this._compilerHost.resetChangedFileTracker();
      }

      if (warnings.length > 0) {
        const message = formatDiagnostics(warnings);
        this.sendMessage(new LogMessage('warn', 'WARNING in ' + message));
      }
    }
  }

  private sendMessage(msg: TypeCheckerMessage) {
    if (process.send) {
      process.send(msg);
    }
  }

  public update(rootNames: string[], changedCompilationFiles: string[],
                cancellationToken: CancellationToken) {
    this._update(rootNames, changedCompilationFiles);
    this._createOrUpdateProgram();
    this._diagnose(cancellationToken);
  }
}
