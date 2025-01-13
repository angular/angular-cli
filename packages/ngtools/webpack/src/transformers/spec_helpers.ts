/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { basename } from 'node:path';
import ts from 'typescript';

// Test transform helpers.
const basefileName = 'test-file.ts';

export function createTypescriptContext(
  content: string,
  additionalFiles?: Record<string, string>,
  useLibs = false,
  extraCompilerOptions: ts.CompilerOptions = {},
  jsxFile = false,
): {
  compilerHost: ts.CompilerHost;
  program: ts.Program;
} {
  const fileName = basefileName + (jsxFile ? 'x' : '');
  // Set compiler options.
  const compilerOptions: ts.CompilerOptions = {
    noEmitOnError: useLibs,
    allowJs: true,
    newLine: ts.NewLineKind.LineFeed,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    module: ts.ModuleKind.ES2020,
    target: ts.ScriptTarget.ES2020,
    skipLibCheck: true,
    sourceMap: false,
    importHelpers: true,
    experimentalDecorators: true,
    types: [],
    ...extraCompilerOptions,
  };

  // Create compiler host.
  const compilerHost = ts.createCompilerHost(compilerOptions, true);

  const baseFileExists = compilerHost.fileExists;
  compilerHost.fileExists = function (compilerFileName: string) {
    return (
      compilerFileName === fileName ||
      !!additionalFiles?.[basename(compilerFileName)] ||
      baseFileExists(compilerFileName)
    );
  };

  const baseReadFile = compilerHost.readFile;
  compilerHost.readFile = function (compilerFileName: string) {
    if (compilerFileName === fileName) {
      return content;
    } else if (additionalFiles?.[basename(compilerFileName)]) {
      return additionalFiles[basename(compilerFileName)];
    } else {
      return baseReadFile(compilerFileName);
    }
  };

  // Create the TypeScript program.
  const program = ts.createProgram([fileName], compilerOptions, compilerHost);

  return { compilerHost, program };
}

export function transformTypescript(
  content: string | undefined,
  transformers: ts.TransformerFactory<ts.SourceFile>[],
  program?: ts.Program,
  compilerHost?: ts.CompilerHost,
): string | undefined {
  // Use given context or create a new one.
  if (content !== undefined) {
    const typescriptContext = createTypescriptContext(content);
    if (!program) {
      program = typescriptContext.program;
    }
    if (!compilerHost) {
      compilerHost = typescriptContext.compilerHost;
    }
  } else if (!program || !compilerHost) {
    throw new Error('transformTypescript needs either `content` or a `program` and `compilerHost');
  }

  const outputFileName = basefileName.replace(/\.tsx?$/, '.js');
  let outputContent;
  // Emit.
  const { emitSkipped, diagnostics } = program.emit(
    undefined,
    (filename, data) => {
      if (filename === outputFileName) {
        outputContent = data;
      }
    },
    undefined,
    undefined,
    { before: transformers },
  );

  // Throw error with diagnostics if emit wasn't successfull.
  if (emitSkipped) {
    throw new Error(ts.formatDiagnostics(diagnostics, compilerHost));
  }

  // Return the transpiled js.
  return outputContent;
}
