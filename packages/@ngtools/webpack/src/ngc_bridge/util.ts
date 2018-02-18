import * as Path from 'path';
import * as ts from 'typescript';
import {
  CompilerOptions,
  exitCodeFromResult,
  formatDiagnostics,
  Diagnostics,
  filterErrorsAndWarnings
} from '@angular/compiler-cli';


function normalizeSeparators(path: string): string {
  return path.replace(/\\/g, '/');
}

/* COPIED FROM `@angular/compiler-cli` */
/**
 * Returns a function that can adjust a path from source path to out path,
 * based on an existing mapping from source to out path.
 *
 * TODO(tbosch): talk to the TypeScript team to expose their logic for calculating the `rootDir`
 * if none was specified.
 *
 * Note: This function works on normalized paths from typescript.
 */
export function createSrcToOutPathMapper(outDir: string | undefined,
                                         sampleSrcFileName: string | undefined,
                                         sampleOutFileName: string | undefined,
                                         host: {
                                           dirname: typeof Path.dirname,
                                           resolve: typeof Path.resolve,
                                           relative: typeof Path.relative
                                         } = Path
): (srcFileName: string, reverse?: boolean) => string {
  let srcToOutPath: (srcFileName: string) => string;
  if (outDir) {
    // let Path: {} = {};  // Ensure we error if we use `path` instead of `host`.
    if (sampleSrcFileName == null || sampleOutFileName == null) {
      throw new Error(`Can't calculate the rootDir without a sample srcFileName / outFileName. `);
    }
    const srcFileDir = normalizeSeparators(host.dirname(sampleSrcFileName));
    const outFileDir = normalizeSeparators(host.dirname(sampleOutFileName));
    if (srcFileDir === outFileDir) {
      return (srcFileName) => srcFileName;
    }
    // calculate the common suffix, stopping
    // at `outDir`.
    const srcDirParts = srcFileDir.split('/');
    const outDirParts = normalizeSeparators(host.relative(outDir, outFileDir)).split('/');
    let i = 0;
    while (i < Math.min(srcDirParts.length, outDirParts.length) &&
    srcDirParts[srcDirParts.length - 1 - i] === outDirParts[outDirParts.length - 1 - i]) {
      i++;
    }
    const rootDir = srcDirParts.slice(0, srcDirParts.length - i).join('/');
    srcToOutPath = (srcFileName, reverse?) => reverse
      ? host.resolve(rootDir, host.relative(outDir, srcFileName))
      : host.resolve(outDir, host.relative(rootDir, srcFileName))
    ;
  } else {
    srcToOutPath = (srcFileName) => srcFileName;
  }
  return srcToOutPath;
}

export interface ParsedDiagnostics {
  exitCode: number;
  error?: Error;
}

export function parseDiagnostics(allDiagnostics: Diagnostics,
                                 options?: CompilerOptions): ParsedDiagnostics {
  const result: ParsedDiagnostics = { exitCode: exitCodeFromResult(allDiagnostics) };

  const errorsAndWarnings = filterErrorsAndWarnings(allDiagnostics);
  if (errorsAndWarnings.length) {
    let currentDir = options ? options.basePath : undefined;
    const formatHost: ts.FormatDiagnosticsHost = {
      getCurrentDirectory: () => currentDir || ts.sys.getCurrentDirectory(),
      getCanonicalFileName: fileName => fileName,
      getNewLine: () => ts.sys.newLine
    };
    result.error = new Error(formatDiagnostics(errorsAndWarnings, formatHost));
  }
  return result;
}
