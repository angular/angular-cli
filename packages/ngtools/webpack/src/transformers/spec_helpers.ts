/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { virtualFs } from '@angular-devkit/core';
import { readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join } from 'path';
import * as ts from 'typescript';
import { WebpackCompilerHost } from '../compiler_host';


// Test transform helpers.
const basePath = '/project/src/';
const fileName = basePath + 'test-file.ts';
const typeScriptLibFiles = loadTypeScriptLibFiles();
const tsLibFiles = loadTsLibFiles();

export function createTypescriptContext(
  content: string,
  additionalFiles?: Record<string, string>,
  useLibs = false,
  extraCompilerOptions: ts.CompilerOptions = {},
) {
  // Set compiler options.
  const compilerOptions: ts.CompilerOptions = {
    noEmitOnError: useLibs,
    allowJs: true,
    newLine: ts.NewLineKind.LineFeed,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ESNext,
    skipLibCheck: true,
    sourceMap: false,
    importHelpers: true,
    experimentalDecorators: true,
    ...extraCompilerOptions,
  };

  // Create compiler host.
  const compilerHost = new WebpackCompilerHost(
    compilerOptions,
    basePath,
    new virtualFs.SimpleMemoryHost(),
    false,
  );

  // Add a dummy file to host content.
  compilerHost.writeFile(fileName, content, false);

  if (useLibs) {
    // Write the default libs.
    // These are needed for tests that use import(), because it relies on a Promise being there.
    const compilerLibFolder = dirname(compilerHost.getDefaultLibFileName(compilerOptions));
    for (const [k, v] of Object.entries(typeScriptLibFiles)) {
      compilerHost.writeFile(join(compilerLibFolder, k), v, false);
    }
  }

  if (compilerOptions.importHelpers) {
    for (const [k, v] of Object.entries(tsLibFiles)) {
      compilerHost.writeFile(k, v, false);
    }
  }

  if (additionalFiles) {
    for (const key in additionalFiles) {
      compilerHost.writeFile(basePath + key, additionalFiles[key], false);
    }
  }

  // Create the TypeScript program.
  const program = ts.createProgram([fileName], compilerOptions, compilerHost);

  return { compilerHost, program };
}

export function transformTypescript(
  content: string | undefined,
  transformers: ts.TransformerFactory<ts.SourceFile>[],
  program?: ts.Program,
  compilerHost?: WebpackCompilerHost,
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

  // Emit.
  const { emitSkipped, diagnostics } = program.emit(
    undefined, undefined, undefined, undefined, { before: transformers },
  );

  // Throw error with diagnostics if emit wasn't successfull.
  if (emitSkipped) {
    throw new Error(ts.formatDiagnostics(diagnostics, compilerHost));
  }

  // Return the transpiled js.
  return compilerHost.readFile(fileName.replace(/\.tsx?$/, '.js'));
}

function loadTypeScriptLibFiles(): Record<string, string> {
  const libFolderPath = dirname(require.resolve('typescript/lib/lib.d.ts'));
  const libFolderFiles = readdirSync(libFolderPath);
  const libFileNames = libFolderFiles.filter(f => f.startsWith('lib.') && f.endsWith('.d.ts'));

  // Return a map of the lib names to their content.
  const libs: Record<string, string> = {};
  for (const f of libFileNames) {
    libs[f] = readFileSync(join(libFolderPath, f), 'utf-8');
  }

  return libs;
}

function loadTsLibFiles(): Record<string, string> {
  const libFolderPath = dirname(require.resolve('tslib/package.json'));
  const libFolderFiles = readdirSync(libFolderPath)
    .filter(p => statSync(join(libFolderPath, p)).isFile());

  // Return a map of the lib names to their content.
  const libs: Record<string, string> = {};
  for (const f of libFolderFiles) {
    libs[join('node_modules/tslib', f)] = readFileSync(join(libFolderPath, f), 'utf-8');
  }

  return libs;
}
