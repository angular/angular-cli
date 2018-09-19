/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { RawSourceMap } from 'source-map';
import * as ts from 'typescript';


export interface TransformJavascriptOptions {
  content: string;
  inputFilePath?: string;
  outputFilePath?: string;
  emitSourceMap?: boolean;
  strict?: boolean;
  typeCheck?: boolean;
  getTransforms: Array<(program?: ts.Program) => ts.TransformerFactory<ts.SourceFile>>;
}

export interface TransformJavascriptOutput {
  content: string | null;
  sourceMap: RawSourceMap | null;
  emitSkipped: boolean;
}

interface DiagnosticSourceFile extends ts.SourceFile {
  readonly parseDiagnostics?: ReadonlyArray<ts.Diagnostic>;
}

function validateDiagnostics(diagnostics: ReadonlyArray<ts.Diagnostic>, strict?: boolean): boolean {
  // Print error diagnostics.

  const hasError = diagnostics.some(diag => diag.category === ts.DiagnosticCategory.Error);
  if (hasError) {
    // Throw only if we're in strict mode, otherwise return original content.
    if (strict) {
      const errorMessages = ts.formatDiagnostics(diagnostics, {
        getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
        getNewLine: () => ts.sys.newLine,
        getCanonicalFileName: (f: string) => f,
      });

      throw new Error(`
        TS failed with the following error messages:

        ${errorMessages}
      `);
    } else {
      return false;
    }
  }

  return true;
}

export function transformJavascript(
  options: TransformJavascriptOptions,
): TransformJavascriptOutput {

  const {
    content,
    getTransforms,
    emitSourceMap,
    inputFilePath,
    outputFilePath,
    strict,
  } = options;

  // Bail if there's no transform to do.
  if (getTransforms.length === 0) {
    return {
      content: null,
      sourceMap: null,
      emitSkipped: true,
    };
  }

  const allowFastPath = options.typeCheck === false && !emitSourceMap;
  const outputs = new Map<string, string>();
  const tempFilename = 'bo-default-file.js';
  const tempSourceFile = ts.createSourceFile(
    tempFilename,
    content,
    ts.ScriptTarget.Latest,
    allowFastPath,
  );
  const parseDiagnostics = (tempSourceFile as DiagnosticSourceFile).parseDiagnostics;

  const tsOptions: ts.CompilerOptions = {
    // We target latest so that there is no downleveling.
    target: ts.ScriptTarget.Latest,
    isolatedModules: true,
    suppressOutputPathCheck: true,
    allowNonTsExtensions: true,
    noLib: true,
    noResolve: true,
    sourceMap: emitSourceMap,
    inlineSources: emitSourceMap,
    inlineSourceMap: false,
  };

  if (allowFastPath && parseDiagnostics) {
    if (!validateDiagnostics(parseDiagnostics, strict)) {
      return {
        content: null,
        sourceMap: null,
        emitSkipped: true,
      };
    }

    const transforms = getTransforms.map((getTf) => getTf(undefined));

    const result = ts.transform(tempSourceFile, transforms, tsOptions);
    if (result.transformed.length === 0 || result.transformed[0] === tempSourceFile) {
      return {
        content: null,
        sourceMap: null,
        emitSkipped: true,
      };
    }

    const printer = ts.createPrinter(
      undefined,
      {
        onEmitNode: result.emitNodeWithNotification,
        substituteNode: result.substituteNode,
      },
    );

    const output = printer.printFile(result.transformed[0]);

    result.dispose();

    return {
      content: output,
      sourceMap: null,
      emitSkipped: false,
    };
  }

  const host: ts.CompilerHost = {
    getSourceFile: (fileName) => {
      if (fileName !== tempFilename) {
        throw new Error(`File ${fileName} does not have a sourceFile.`);
      }

      return tempSourceFile;
    },
    getDefaultLibFileName: () => 'lib.d.ts',
    getCurrentDirectory: () => '',
    getDirectories: () => [],
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: (fileName) => fileName === tempFilename,
    readFile: (_fileName) => '',
    writeFile: (fileName, text) => outputs.set(fileName, text),
  };

  const program = ts.createProgram([tempFilename], tsOptions, host);

  const diagnostics = program.getSyntacticDiagnostics(tempSourceFile);
  if (!validateDiagnostics(diagnostics, strict)) {
    return {
      content: null,
      sourceMap: null,
      emitSkipped: true,
    };
  }

  // We need the checker inside transforms.
  const transforms = getTransforms.map((getTf) => getTf(program));

  program.emit(undefined, undefined, undefined, undefined, { before: transforms, after: [] });

  let transformedContent = outputs.get(tempFilename);

  if (!transformedContent) {
    return {
      content: null,
      sourceMap: null,
      emitSkipped: true,
    };
  }

  let sourceMap: RawSourceMap | null = null;
  const tsSourceMap = outputs.get(`${tempFilename}.map`);

  if (emitSourceMap && tsSourceMap) {
    const urlRegExp = /^\/\/# sourceMappingURL=[^\r\n]*/gm;
    sourceMap = JSON.parse(tsSourceMap) as RawSourceMap;
    // Fix sourcemaps file references.
    if (outputFilePath) {
      sourceMap.file = outputFilePath;
      transformedContent = transformedContent.replace(urlRegExp,
        `//# sourceMappingURL=${sourceMap.file}.map\n`);
      if (inputFilePath) {
        sourceMap.sources = [inputFilePath];
      } else {
        sourceMap.sources = [''];
      }
    } else {
      // TODO: figure out if we should inline sources here.
      transformedContent = transformedContent.replace(urlRegExp, '');
      sourceMap.file = '';
      sourceMap.sources = [''];
    }
  }

  return {
    content: transformedContent,
    sourceMap,
    emitSkipped: false,
  };
}
