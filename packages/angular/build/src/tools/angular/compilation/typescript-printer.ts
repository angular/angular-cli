/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview Helper functions and typings for utilizing internal TypeScript printer
 * and sourcemap generation APIs.
 */

import assert from 'node:assert';
import { dirname } from 'node:path';
import ts from 'typescript';

/**
 * Partial interface representing the internal TypeScript `EmitTextWriter` API.
 * Used to collect printed text output from the printer.
 */
export interface EmitTextWriter {
  write(s: string): void;
  rawWrite(s: string): void;
  writeLine(force?: boolean): void;
  getText(): string;
  clear(): void;
  isAtStartOfLine(): boolean;
  getTextPos(): number;
  writeComment(s: string): void;
}

/**
 * Partial interface representing the internal TypeScript `SourceMapGenerator` API.
 * Used to construct mappings and serialize a sourcemap.
 */
export interface SourceMapGenerator {
  getSources(): string[];
  addSource(fileName: string): number;
  setSourceContent(sourceIndex: number, content: string | null): void;
  addMapping(
    generatedLine: number,
    generatedCharacter: number,
    sourceIndex: number,
    sourceLine: number,
    sourceCharacter: number,
    nameIndex?: number,
  ): void;
  toJSON(): object;
  toString(): string;
}

/**
 * Extended `ts.Printer` interface containing the internal `writeFile` method
 * which supports sourcemap generation.
 */
export interface ExtendedPrinter extends ts.Printer {
  writeFile(
    sourceFile: ts.SourceFile,
    writer: EmitTextWriter,
    sourceMapGenerator?: SourceMapGenerator,
  ): void;
}

/**
 * Typing structure for internal TypeScript module exports that are not exposed
 * in the public `@types/typescript` package.
 */
export interface TypeScriptInternals {
  createTextWriter(newLine: string): EmitTextWriter;
  createSourceMapGenerator(
    host: {
      getCurrentDirectory(): string;
      getCanonicalFileName(fileName: string): string;
    },
    file: string,
    sourceRoot: string | undefined,
    sourcesDirectoryPath: string,
    generatorOptions: ts.CompilerOptions,
  ): SourceMapGenerator;
}

const tsInternals = ts as unknown as TypeScriptInternals;

/**
 * Asserts that the required internal TypeScript APIs are present in the currently
 * loaded TypeScript module.
 *
 * @throws {AssertionError} If any required internal API is missing.
 */
export function assertTypeScriptPrinterInternals(): void {
  assert(
    typeof tsInternals.createTextWriter === 'function',
    'TypeScript internal "createTextWriter" is missing.',
  );
  assert(
    typeof tsInternals.createSourceMapGenerator === 'function',
    'TypeScript internal "createSourceMapGenerator" is missing.',
  );
}

/**
 * Result object returned from printing a source file.
 */
export interface PrintResult {
  /** The printed source code text. */
  code: string;

  /** The generated sourcemap JSON string, if sourcemap generation was requested. */
  map?: string;
}

/**
 * Prints a TypeScript source file AST to a string, optionally generating a sourcemap
 * using internal TypeScript APIs.
 *
 * @param sourceFile The TypeScript AST node representing the file to print.
 * @param printer The printer instance to print the file with.
 * @param compilerHost The TypeScript compiler host, used for path canonicalization and context.
 * @param compilerOptions The compiler options configured for the build target.
 * @returns A result containing the printed code and optional sourcemap text.
 */
export function printSourceFileWithMap(
  sourceFile: ts.SourceFile,
  printer: ts.Printer,
  compilerHost: ts.CompilerHost,
  compilerOptions: ts.CompilerOptions,
): PrintResult {
  const shouldGenerateMap = compilerOptions.sourceMap || compilerOptions.inlineSourceMap;
  if (!shouldGenerateMap) {
    return { code: printer.printFile(sourceFile) };
  }

  assertTypeScriptPrinterInternals();

  const extendedPrinter = printer as ExtendedPrinter;
  assert(
    typeof extendedPrinter.writeFile === 'function',
    'TypeScript Printer is missing internal "writeFile" method.',
  );

  const writer = tsInternals.createTextWriter(compilerHost.getNewLine());

  const sourceMapGenerator = tsInternals.createSourceMapGenerator(
    {
      getCurrentDirectory: () => compilerHost.getCurrentDirectory(),
      getCanonicalFileName: (fileName) => compilerHost.getCanonicalFileName(fileName),
    },
    sourceFile.fileName,
    compilerOptions.sourceRoot,
    dirname(sourceFile.fileName),
    compilerOptions,
  );

  extendedPrinter.writeFile(sourceFile, writer, sourceMapGenerator);

  const code = writer.getText();
  const map = sourceMapGenerator.toString();

  return { code, map };
}
