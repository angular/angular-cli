/*
An async version of `performCompilation`
https://github.com/angular/angular/blob/master/packages/compiler-cli/src/perform_compile.ts

This implementation will invoke `program.loadNgStructureAsync()` before moving on with
compilation, allowing resources to load async an so enabling webpack integration.

TODO: Move to native implementation when/if https://github.com/angular/angular/issues/20130

Additional code copied per need (e.g. `createEmitCallback`).
This code should also get removed once async is implemented in compiler-cli.
*/

import * as ts from 'typescript';
import * as tsickle from 'tsickle';
import {isSyntaxError} from '@angular/compiler';
import {
  Program,
  CompilerHost,
  CompilerOptions,
  TsEmitCallback,
  CustomTransformers,
  PerformCompilationResult,
  createCompilerHost,
  createProgram,
  Diagnostic,
  Diagnostics,
  EmitFlags,
  DEFAULT_ERROR_CODE,
  UNKNOWN_ERROR_CODE,
  SOURCE
} from '@angular/compiler-cli';

export function performCompilationAsync({
                                          rootNames, options, host, oldProgram, emitCallback,
                                          gatherDiagnostics = asyncDiagnostics,
                                          customTransformers, emitFlags = EmitFlags.Default
                                        }: {
  rootNames: string[],
  options: CompilerOptions,
  host?: CompilerHost,
  oldProgram?: Program,
  emitCallback?: TsEmitCallback,
  gatherDiagnostics?: (program: Program) => Diagnostics,
  customTransformers?: CustomTransformers,
  emitFlags?: EmitFlags
}): Promise<PerformCompilationResult> {
  let program: Program | undefined;
  let emitResult: ts.EmitResult | undefined;
  let allDiagnostics: Diagnostics = [];

  return Promise.resolve()
    .then(() => {
      if (!host) {
        host = createCompilerHost({options});
      }
      program = createProgram({rootNames, host, options, oldProgram});
      return program.loadNgStructureAsync();
    })
    .then(() => {
      const beforeDiags = Date.now();
      allDiagnostics.push(...gatherDiagnostics(program !));
      if (options.diagnostics) {
        const afterDiags = Date.now();
        allDiagnostics.push(
          createMessageDiagnostic(`Time for diagnostics: ${afterDiags - beforeDiags}ms.`));
      }

      if (!hasErrors(allDiagnostics)) {
        emitResult = program !.emit({emitCallback, customTransformers, emitFlags});
        allDiagnostics.push(...emitResult.diagnostics);
        return {diagnostics: allDiagnostics, program, emitResult};
      }
      return {diagnostics: allDiagnostics, program};
    })
    .catch(e => {
      let errMsg: string;
      let code: number;
      if (isSyntaxError(e)) {
        // don't report the stack for syntax errors as they are well known errors.
        errMsg = e.message;
        code = DEFAULT_ERROR_CODE;
      } else {
        errMsg = e.stack;
        // It is not a syntax error we might have a program with unknown state, discard it.
        program = undefined;
        code = UNKNOWN_ERROR_CODE;
      }
      allDiagnostics.push(
        {category: ts.DiagnosticCategory.Error, messageText: errMsg, code, source: SOURCE});
      return {diagnostics: allDiagnostics, program};
    });
}

function asyncDiagnostics(angularProgram: Program): Diagnostics {
  const allDiagnostics: Diagnostics = [];

  // Check Angular structural diagnostics.
  allDiagnostics.push(...angularProgram.getNgStructuralDiagnostics());

  // Check TypeScript parameter diagnostics.
  allDiagnostics.push(...angularProgram.getTsOptionDiagnostics());

  // Check Angular parameter diagnostics.
  allDiagnostics.push(...angularProgram.getNgOptionDiagnostics());


  function checkDiagnostics(diags: Diagnostics | undefined) {
    if (diags) {
      allDiagnostics.push(...diags);
      return !hasErrors(diags);
    }
    return true;
  }

  let checkOtherDiagnostics = true;
  // Check TypeScript syntactic diagnostics.
  checkOtherDiagnostics = checkOtherDiagnostics &&
    checkDiagnostics(angularProgram.getTsSyntacticDiagnostics(undefined));

  // Check TypeScript semantic and Angular structure diagnostics.
  checkOtherDiagnostics = checkOtherDiagnostics &&
    checkDiagnostics(angularProgram.getTsSemanticDiagnostics(undefined));

  // Check Angular semantic diagnostics
  if (checkOtherDiagnostics) {
    checkDiagnostics(angularProgram.getNgSemanticDiagnostics(undefined));
  }

  return allDiagnostics;
}

export const GENERATED_FILES = /(.*?)\.(ngfactory|shim\.ngstyle|ngstyle|ngsummary)\.(js|d\.ts|ts)$/;
export const DTS = /\.d\.ts$/;
export function createEmitCallback(options: CompilerOptions): TsEmitCallback | undefined {
  const transformDecorators = options.annotationsAs !== 'decorators';
  const transformTypesToClosure = options.annotateForClosureCompiler;
  if (!transformDecorators && !transformTypesToClosure) {
    return undefined;
  }
  if (transformDecorators) {
    // This is needed as a workaround for https://github.com/angular/tsickle/issues/635
    // Otherwise tsickle might emit references to non imported values
    // as TypeScript elided the import.
    options.emitDecoratorMetadata = true;
  }
  const tsickleHost: tsickle.TsickleHost = {
    shouldSkipTsickleProcessing: fileName => DTS.test(fileName) || GENERATED_FILES.test(fileName),
    pathToModuleName: () => '',
    shouldIgnoreWarningsForPath: () => false,
    fileNameToModuleId: (fileName) => fileName,
    googmodule: false,
    untyped: true,
    convertIndexImportShorthand: false, transformDecorators, transformTypesToClosure,
  };

  return ({
            program,
            targetSourceFile,
            writeFile,
            cancellationToken,
            emitOnlyDtsFiles,
            customTransformers = {},
            host,
            options
          }) =>
    tsickle.emitWithTsickle(
      program,
      tsickleHost,
      host,
      options,
      targetSourceFile,
      writeFile,
      cancellationToken,
      emitOnlyDtsFiles,
      {
        beforeTs: customTransformers.before,
        afterTs: customTransformers.after,
      }
    );
}

function hasErrors(diags: Diagnostics) {
  return diags.some(d => d.category === ts.DiagnosticCategory.Error);
}

function createMessageDiagnostic(messageText: string): ts.Diagnostic & Diagnostic {
  return {
    file: undefined,
    start: undefined,
    length: undefined,
    category: ts.DiagnosticCategory.Message, messageText,
    code: DEFAULT_ERROR_CODE,
    source: SOURCE,
  };
}
