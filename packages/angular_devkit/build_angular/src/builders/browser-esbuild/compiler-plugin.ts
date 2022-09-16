/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { CompilerHost } from '@angular/compiler-cli';
import { transformAsync } from '@babel/core';
import * as assert from 'assert';
import type {
  OnStartResult,
  OutputFile,
  PartialMessage,
  PartialNote,
  Plugin,
  PluginBuild,
} from 'esbuild';
import { promises as fs } from 'fs';
import * as path from 'path';
import ts from 'typescript';
import angularApplicationPreset from '../../babel/presets/application';
import { requiresLinking } from '../../babel/webpack-loader';
import { loadEsmModule } from '../../utils/load-esm';
import { BundleStylesheetOptions, bundleStylesheetFile, bundleStylesheetText } from './stylesheets';

interface EmitFileResult {
  content?: string;
  map?: string;
  dependencies: readonly string[];
  hash?: Uint8Array;
}
type FileEmitter = (file: string) => Promise<EmitFileResult | undefined>;

/**
 * Converts TypeScript Diagnostic related information into an esbuild compatible note object.
 * Related information is a subset of a full TypeScript Diagnostic and also used for diagnostic
 * notes associated with the main Diagnostic.
 * @param diagnostic The TypeScript diagnostic relative information to convert.
 * @param host A TypeScript FormatDiagnosticsHost instance to use during conversion.
 * @returns An esbuild diagnostic message as a PartialMessage object
 */
function convertTypeScriptDiagnosticInfo(
  info: ts.DiagnosticRelatedInformation,
  host: ts.FormatDiagnosticsHost,
  textPrefix?: string,
): PartialNote {
  let text = ts.flattenDiagnosticMessageText(info.messageText, host.getNewLine());
  if (textPrefix) {
    text = textPrefix + text;
  }

  const note: PartialNote = { text };

  if (info.file) {
    note.location = {
      file: info.file.fileName,
      length: info.length,
    };

    // Calculate the line/column location and extract the full line text that has the diagnostic
    if (info.start) {
      const { line, character } = ts.getLineAndCharacterOfPosition(info.file, info.start);
      note.location.line = line + 1;
      note.location.column = character;

      // The start position for the slice is the first character of the error line
      const lineStartPosition = ts.getPositionOfLineAndCharacter(info.file, line, 0);

      // The end position for the slice is the first character of the next line or the length of
      // the entire file if the line is the last line of the file (getPositionOfLineAndCharacter
      // will error if a nonexistent line is passed).
      const { line: lastLineOfFile } = ts.getLineAndCharacterOfPosition(
        info.file,
        info.file.text.length - 1,
      );
      const lineEndPosition =
        line < lastLineOfFile
          ? ts.getPositionOfLineAndCharacter(info.file, line + 1, 0)
          : info.file.text.length;

      note.location.lineText = info.file.text.slice(lineStartPosition, lineEndPosition).trimEnd();
    }
  }

  return note;
}

/**
 * Converts a TypeScript Diagnostic message into an esbuild compatible message object.
 * @param diagnostic The TypeScript diagnostic to convert.
 * @param host A TypeScript FormatDiagnosticsHost instance to use during conversion.
 * @returns An esbuild diagnostic message as a PartialMessage object
 */
function convertTypeScriptDiagnostic(
  diagnostic: ts.Diagnostic,
  host: ts.FormatDiagnosticsHost,
): PartialMessage {
  let codePrefix = 'TS';
  let code = `${diagnostic.code}`;
  if (diagnostic.source === 'ngtsc') {
    codePrefix = 'NG';
    // Remove `-99` Angular prefix from diagnostic code
    code = code.slice(3);
  }

  const message: PartialMessage = {
    ...convertTypeScriptDiagnosticInfo(diagnostic, host, `${codePrefix}${code}: `),
    // Store original diagnostic for reference if needed downstream
    detail: diagnostic,
  };

  if (diagnostic.relatedInformation?.length) {
    message.notes = diagnostic.relatedInformation.map((info) =>
      convertTypeScriptDiagnosticInfo(info, host),
    );
  }

  return message;
}

// This is a non-watch version of the compiler code from `@ngtools/webpack` augmented for esbuild
// eslint-disable-next-line max-lines-per-function
export function createCompilerPlugin(
  pluginOptions: {
    sourcemap: boolean;
    tsconfig: string;
    advancedOptimizations?: boolean;
    thirdPartySourcemaps?: boolean;
    fileReplacements?: Record<string, string>;
  },
  styleOptions: BundleStylesheetOptions,
): Plugin {
  return {
    name: 'angular-compiler',
    // eslint-disable-next-line max-lines-per-function
    async setup(build: PluginBuild): Promise<void> {
      // This uses a wrapped dynamic import to load `@angular/compiler-cli` which is ESM.
      // Once TypeScript provides support for retaining dynamic imports this workaround can be dropped.
      const compilerCli = await loadEsmModule<typeof import('@angular/compiler-cli')>(
        '@angular/compiler-cli',
      );

      // Temporary deep import for transformer support
      const {
        mergeTransformers,
        replaceBootstrap,
      } = require('@ngtools/webpack/src/ivy/transformation');

      // Setup defines based on the values provided by the Angular compiler-cli
      build.initialOptions.define ??= {};
      for (const [key, value] of Object.entries(compilerCli.GLOBAL_DEFS_FOR_TERSER_WITH_AOT)) {
        if (key in build.initialOptions.define) {
          // Skip keys that have been manually provided
          continue;
        }
        // esbuild requires values to be a string (actual strings need to be quoted).
        // In this case, all provided values are booleans.
        build.initialOptions.define[key] = value.toString();
      }

      // The tsconfig is loaded in setup instead of in start to allow the esbuild target build option to be modified.
      // esbuild build options can only be modified in setup prior to starting the build.
      const {
        options: compilerOptions,
        rootNames,
        errors: configurationDiagnostics,
      } = compilerCli.readConfiguration(pluginOptions.tsconfig, {
        noEmitOnError: false,
        suppressOutputPathCheck: true,
        outDir: undefined,
        inlineSources: pluginOptions.sourcemap,
        inlineSourceMap: pluginOptions.sourcemap,
        sourceMap: false,
        mapRoot: undefined,
        sourceRoot: undefined,
        declaration: false,
        declarationMap: false,
        allowEmptyCodegenFiles: false,
        annotationsAs: 'decorators',
        enableResourceInlining: false,
      });

      // Adjust the esbuild output target based on the tsconfig target
      if (
        compilerOptions.target === undefined ||
        compilerOptions.target <= ts.ScriptTarget.ES2015
      ) {
        build.initialOptions.target = 'es2015';
      } else if (compilerOptions.target >= ts.ScriptTarget.ESNext) {
        build.initialOptions.target = 'esnext';
      } else {
        build.initialOptions.target = ts.ScriptTarget[compilerOptions.target].toLowerCase();
      }

      // The file emitter created during `onStart` that will be used during the build in `onLoad` callbacks for TS files
      let fileEmitter: FileEmitter | undefined;

      // The stylesheet resources from component stylesheets that will be added to the build results output files
      let stylesheetResourceFiles: OutputFile[];

      build.onStart(async () => {
        const result: OnStartResult = {};

        // Reset stylesheet resource output files
        stylesheetResourceFiles = [];

        // Create TypeScript compiler host
        const host = ts.createIncrementalCompilerHost(compilerOptions);

        // Temporarily process external resources via readResource.
        // The AOT compiler currently requires this hook to allow for a transformResource hook.
        // Once the AOT compiler allows only a transformResource hook, this can be reevaluated.
        (host as CompilerHost).readResource = async function (fileName) {
          // Template resources (.html/.svg) files are not bundled or transformed
          if (fileName.endsWith('.html') || fileName.endsWith('.svg')) {
            return this.readFile(fileName) ?? '';
          }

          const { contents, resourceFiles, errors, warnings } = await bundleStylesheetFile(
            fileName,
            styleOptions,
          );

          (result.errors ??= []).push(...errors);
          (result.warnings ??= []).push(...warnings);
          stylesheetResourceFiles.push(...resourceFiles);

          return contents;
        };

        // Add an AOT compiler resource transform hook
        (host as CompilerHost).transformResource = async function (data, context) {
          // Only inline style resources are transformed separately currently
          if (context.resourceFile || context.type !== 'style') {
            return null;
          }

          // The file with the resource content will either be an actual file (resourceFile)
          // or the file containing the inline component style text (containingFile).
          const file = context.resourceFile ?? context.containingFile;

          const { contents, resourceFiles, errors, warnings } = await bundleStylesheetText(
            data,
            {
              resolvePath: path.dirname(file),
              virtualName: file,
            },
            styleOptions,
          );

          (result.errors ??= []).push(...errors);
          (result.warnings ??= []).push(...warnings);
          stylesheetResourceFiles.push(...resourceFiles);

          return { content: contents };
        };

        // Augment TypeScript Host for file replacements option
        if (pluginOptions.fileReplacements) {
          // Temporary deep import for file replacements support
          const { augmentHostWithReplacements } = require('@ngtools/webpack/src/ivy/host');
          augmentHostWithReplacements(host, pluginOptions.fileReplacements);
        }

        // Create the Angular specific program that contains the Angular compiler
        const angularProgram = new compilerCli.NgtscProgram(rootNames, compilerOptions, host);
        const angularCompiler = angularProgram.compiler;
        const { ignoreForDiagnostics } = angularCompiler;
        const typeScriptProgram = angularProgram.getTsProgram();

        const builder = ts.createAbstractBuilder(typeScriptProgram, host);

        await angularCompiler.analyzeAsync();

        function* collectDiagnostics() {
          // Collect program level diagnostics
          yield* configurationDiagnostics;
          yield* angularCompiler.getOptionDiagnostics();
          yield* builder.getOptionsDiagnostics();
          yield* builder.getGlobalDiagnostics();

          // Collect source file specific diagnostics
          const OptimizeFor = compilerCli.OptimizeFor;
          for (const sourceFile of builder.getSourceFiles()) {
            if (ignoreForDiagnostics.has(sourceFile)) {
              continue;
            }

            yield* builder.getSyntacticDiagnostics(sourceFile);
            yield* builder.getSemanticDiagnostics(sourceFile);

            const angularDiagnostics = angularCompiler.getDiagnosticsForFile(
              sourceFile,
              OptimizeFor.WholeProgram,
            );
            yield* angularDiagnostics;
          }
        }

        for (const diagnostic of collectDiagnostics()) {
          const message = convertTypeScriptDiagnostic(diagnostic, host);
          if (diagnostic.category === ts.DiagnosticCategory.Error) {
            (result.errors ??= []).push(message);
          } else {
            (result.warnings ??= []).push(message);
          }
        }

        fileEmitter = createFileEmitter(
          builder,
          mergeTransformers(angularCompiler.prepareEmit().transformers, {
            before: [replaceBootstrap(() => builder.getProgram().getTypeChecker())],
          }),
          () => [],
        );

        return result;
      });

      build.onLoad(
        { filter: compilerOptions.allowJs ? /\.[cm]?[jt]sx?$/ : /\.[cm]?tsx?$/ },
        async (args) => {
          assert.ok(fileEmitter, 'Invalid plugin execution order');

          const typescriptResult = await fileEmitter(
            pluginOptions.fileReplacements?.[args.path] ?? args.path,
          );
          if (!typescriptResult) {
            // No TS result indicates the file is not part of the TypeScript program.
            // If allowJs is enabled and the file is JS then defer to the next load hook.
            if (compilerOptions.allowJs && /\.[cm]?js$/.test(args.path)) {
              return undefined;
            }

            // Otherwise return an error
            return {
              errors: [
                {
                  text: 'File is missing from the TypeScript compilation.',
                  location: { file: args.path },
                  notes: [
                    {
                      text: `Ensure the file is part of the TypeScript program via the 'files' or 'include' property.`,
                    },
                  ],
                },
              ],
            };
          }

          const data = typescriptResult.content ?? '';
          const forceAsyncTransformation = /async\s+function\s*\*/.test(data);
          const useInputSourcemap =
            pluginOptions.sourcemap &&
            (!!pluginOptions.thirdPartySourcemaps || !/[\\/]node_modules[\\/]/.test(args.path));

          // If no additional transformations are needed, return the TypeScript output directly
          if (!forceAsyncTransformation && !pluginOptions.advancedOptimizations) {
            return {
              // Strip sourcemaps if they should not be used
              contents: useInputSourcemap
                ? data
                : data.replace(/^\/\/# sourceMappingURL=[^\r\n]*/gm, ''),
              loader: 'js',
            };
          }

          const babelResult = await transformAsync(data, {
            filename: args.path,
            inputSourceMap: (useInputSourcemap ? undefined : false) as undefined,
            sourceMaps: pluginOptions.sourcemap ? 'inline' : false,
            compact: false,
            configFile: false,
            babelrc: false,
            browserslistConfigFile: false,
            plugins: [],
            presets: [
              [
                angularApplicationPreset,
                {
                  forceAsyncTransformation,
                  optimize: pluginOptions.advancedOptimizations && {},
                },
              ],
            ],
          });

          return {
            contents: babelResult?.code ?? '',
            loader: 'js',
          };
        },
      );

      build.onLoad({ filter: /\.[cm]?js$/ }, async (args) => {
        const data = await fs.readFile(args.path, 'utf-8');
        const forceAsyncTransformation =
          !/[\\/][_f]?esm2015[\\/]/.test(args.path) && /async\s+function\s*\*/.test(data);
        const shouldLink = await requiresLinking(args.path, data);
        const useInputSourcemap =
          pluginOptions.sourcemap &&
          (!!pluginOptions.thirdPartySourcemaps || !/[\\/]node_modules[\\/]/.test(args.path));

        // If no additional transformations are needed, return the TypeScript output directly
        if (!forceAsyncTransformation && !pluginOptions.advancedOptimizations && !shouldLink) {
          return {
            // Strip sourcemaps if they should not be used
            contents: useInputSourcemap
              ? data
              : data.replace(/^\/\/# sourceMappingURL=[^\r\n]*/gm, ''),
            loader: 'js',
          };
        }

        const angularPackage = /[\\/]node_modules[\\/]@angular[\\/]/.test(args.path);

        const linkerPluginCreator = (
          await loadEsmModule<typeof import('@angular/compiler-cli/linker/babel')>(
            '@angular/compiler-cli/linker/babel',
          )
        ).createEs2015LinkerPlugin;

        const result = await transformAsync(data, {
          filename: args.path,
          inputSourceMap: (useInputSourcemap ? undefined : false) as undefined,
          sourceMaps: pluginOptions.sourcemap ? 'inline' : false,
          compact: false,
          configFile: false,
          babelrc: false,
          browserslistConfigFile: false,
          plugins: [],
          presets: [
            [
              angularApplicationPreset,
              {
                angularLinker: {
                  shouldLink,
                  jitMode: false,
                  linkerPluginCreator,
                },
                forceAsyncTransformation,
                optimize: pluginOptions.advancedOptimizations && {
                  looseEnums: angularPackage,
                  pureTopLevel: angularPackage,
                },
              },
            ],
          ],
        });

        return {
          contents: result?.code ?? data,
          loader: 'js',
        };
      });

      build.onEnd((result) => {
        if (stylesheetResourceFiles.length) {
          result.outputFiles?.push(...stylesheetResourceFiles);
        }
      });
    },
  };
}

function createFileEmitter(
  program: ts.BuilderProgram,
  transformers: ts.CustomTransformers = {},
  onAfterEmit?: (sourceFile: ts.SourceFile) => void,
): FileEmitter {
  return async (file: string) => {
    const sourceFile = program.getSourceFile(file);
    if (!sourceFile) {
      return undefined;
    }

    let content: string | undefined;
    program.emit(
      sourceFile,
      (filename, data) => {
        if (/\.[cm]?js$/.test(filename)) {
          content = data;
        }
      },
      undefined /* cancellationToken */,
      undefined /* emitOnlyDtsFiles */,
      transformers,
    );

    onAfterEmit?.(sourceFile);

    return { content, dependencies: [] };
  };
}
