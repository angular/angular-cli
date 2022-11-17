/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { NgtscProgram } from '@angular/compiler-cli';
import type {
  OnStartResult,
  OutputFile,
  PartialMessage,
  PartialNote,
  Plugin,
  PluginBuild,
} from 'esbuild';
import * as assert from 'node:assert';
import { platform } from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { maxWorkers } from '../../utils/environment-options';
import { loadEsmModule } from '../../utils/load-esm';
import { createAngularCompilerHost, ensureSourceFileVersions } from './angular-host';
import { JavaScriptTransformer } from './javascript-transformer';
import {
  logCumulativeDurations,
  profileAsync,
  profileSync,
  resetCumulativeDurations,
} from './profiling';
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
 * @param info The TypeScript diagnostic relative information to convert.
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

const USING_WINDOWS = platform() === 'win32';
const WINDOWS_SEP_REGEXP = new RegExp(`\\${path.win32.sep}`, 'g');

export class SourceFileCache extends Map<string, ts.SourceFile> {
  readonly modifiedFiles = new Set<string>();
  readonly babelFileCache = new Map<string, Uint8Array>();
  readonly typeScriptFileCache = new Map<string, Uint8Array>();

  invalidate(files: Iterable<string>): void {
    this.modifiedFiles.clear();
    for (let file of files) {
      this.babelFileCache.delete(file);
      this.typeScriptFileCache.delete(pathToFileURL(file).href);

      // Normalize separators to allow matching TypeScript Host paths
      if (USING_WINDOWS) {
        file = file.replace(WINDOWS_SEP_REGEXP, path.posix.sep);
      }

      this.delete(file);
      this.modifiedFiles.add(file);
    }
  }
}

export interface CompilerPluginOptions {
  sourcemap: boolean;
  tsconfig: string;
  advancedOptimizations?: boolean;
  thirdPartySourcemaps?: boolean;
  fileReplacements?: Record<string, string>;
  sourceFileCache?: SourceFileCache;
}

// This is a non-watch version of the compiler code from `@ngtools/webpack` augmented for esbuild
// eslint-disable-next-line max-lines-per-function
export function createCompilerPlugin(
  pluginOptions: CompilerPluginOptions,
  styleOptions: BundleStylesheetOptions,
): Plugin {
  return {
    name: 'angular-compiler',
    // eslint-disable-next-line max-lines-per-function
    async setup(build: PluginBuild): Promise<void> {
      let setupWarnings: PartialMessage[] | undefined;

      // Initialize a worker pool for JavaScript transformations
      const javascriptTransformer = new JavaScriptTransformer(pluginOptions, maxWorkers);

      // This uses a wrapped dynamic import to load `@angular/compiler-cli` which is ESM.
      // Once TypeScript provides support for retaining dynamic imports this workaround can be dropped.
      const { GLOBAL_DEFS_FOR_TERSER_WITH_AOT, NgtscProgram, OptimizeFor, readConfiguration } =
        await loadEsmModule<typeof import('@angular/compiler-cli')>('@angular/compiler-cli');

      // Temporary deep import for transformer support
      const {
        mergeTransformers,
        replaceBootstrap,
      } = require('@ngtools/webpack/src/ivy/transformation');

      // Setup defines based on the values provided by the Angular compiler-cli
      build.initialOptions.define ??= {};
      for (const [key, value] of Object.entries(GLOBAL_DEFS_FOR_TERSER_WITH_AOT)) {
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
      } = profileSync('NG_READ_CONFIG', () =>
        readConfiguration(pluginOptions.tsconfig, {
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
        }),
      );

      if (compilerOptions.target === undefined || compilerOptions.target < ts.ScriptTarget.ES2022) {
        // If 'useDefineForClassFields' is already defined in the users project leave the value as is.
        // Otherwise fallback to false due to https://github.com/microsoft/TypeScript/issues/45995
        // which breaks the deprecated `@Effects` NGRX decorator and potentially other existing code as well.
        compilerOptions.target = ts.ScriptTarget.ES2022;
        compilerOptions.useDefineForClassFields ??= false;

        (setupWarnings ??= []).push({
          text:
            'TypeScript compiler options "target" and "useDefineForClassFields" are set to "ES2022" and ' +
            '"false" respectively by the Angular CLI.',
          location: { file: pluginOptions.tsconfig },
          notes: [
            {
              text:
                'To control ECMA version and features use the Browerslist configuration. ' +
                'For more information, see https://angular.io/guide/build#configuring-browser-compatibility',
            },
          ],
        });
      }

      // The file emitter created during `onStart` that will be used during the build in `onLoad` callbacks for TS files
      let fileEmitter: FileEmitter | undefined;

      // The stylesheet resources from component stylesheets that will be added to the build results output files
      let stylesheetResourceFiles: OutputFile[];

      let previousBuilder: ts.EmitAndSemanticDiagnosticsBuilderProgram | undefined;
      let previousAngularProgram: NgtscProgram | undefined;
      const diagnosticCache = new WeakMap<ts.SourceFile, ts.Diagnostic[]>();

      build.onStart(async () => {
        const result: OnStartResult = {
          warnings: setupWarnings,
        };

        // Reset the setup warnings so that they are only shown during the first build.
        setupWarnings = undefined;

        // Reset debug performance tracking
        resetCumulativeDurations();

        // Reset stylesheet resource output files
        stylesheetResourceFiles = [];

        // Create Angular compiler host
        const host = createAngularCompilerHost(compilerOptions, {
          fileReplacements: pluginOptions.fileReplacements,
          modifiedFiles: pluginOptions.sourceFileCache?.modifiedFiles,
          sourceFileCache: pluginOptions.sourceFileCache,
          async transformStylesheet(data, containingFile, stylesheetFile) {
            // Stylesheet file only exists for external stylesheets
            const filename = stylesheetFile ?? containingFile;

            // Temporary workaround for lack of virtual file support in the Sass plugin.
            // External Sass stylesheets are transformed using the file instead of the already read content.
            let stylesheetResult;
            if (filename.endsWith('.scss') || filename.endsWith('.sass')) {
              stylesheetResult = await bundleStylesheetFile(filename, styleOptions);
            } else {
              stylesheetResult = await bundleStylesheetText(
                data,
                {
                  resolvePath: path.dirname(filename),
                  virtualName: filename,
                },
                styleOptions,
              );
            }

            const { contents, resourceFiles, errors, warnings } = stylesheetResult;
            (result.errors ??= []).push(...errors);
            (result.warnings ??= []).push(...warnings);
            stylesheetResourceFiles.push(...resourceFiles);

            return contents;
          },
        });

        // Create the Angular specific program that contains the Angular compiler
        const angularProgram = profileSync(
          'NG_CREATE_PROGRAM',
          () => new NgtscProgram(rootNames, compilerOptions, host, previousAngularProgram),
        );
        previousAngularProgram = angularProgram;
        const angularCompiler = angularProgram.compiler;
        const typeScriptProgram = angularProgram.getTsProgram();
        ensureSourceFileVersions(typeScriptProgram);

        const builder = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
          typeScriptProgram,
          host,
          previousBuilder,
          configurationDiagnostics,
        );
        previousBuilder = builder;

        await profileAsync('NG_ANALYZE_PROGRAM', () => angularCompiler.analyzeAsync());
        const affectedFiles = profileSync('NG_FIND_AFFECTED', () =>
          findAffectedFiles(builder, angularCompiler),
        );

        if (pluginOptions.sourceFileCache) {
          for (const affected of affectedFiles) {
            pluginOptions.sourceFileCache.typeScriptFileCache.delete(
              pathToFileURL(affected.fileName).href,
            );
          }
        }

        function* collectDiagnostics(): Iterable<ts.Diagnostic> {
          // Collect program level diagnostics
          yield* builder.getConfigFileParsingDiagnostics();
          yield* angularCompiler.getOptionDiagnostics();
          yield* builder.getOptionsDiagnostics();
          yield* builder.getGlobalDiagnostics();

          // Collect source file specific diagnostics
          const optimizeFor =
            affectedFiles.size > 1 ? OptimizeFor.WholeProgram : OptimizeFor.SingleFile;
          for (const sourceFile of builder.getSourceFiles()) {
            if (angularCompiler.ignoreForDiagnostics.has(sourceFile)) {
              continue;
            }

            // TypeScript will use cached diagnostics for files that have not been
            // changed or affected for this build when using incremental building.
            yield* profileSync(
              'NG_DIAGNOSTICS_SYNTACTIC',
              () => builder.getSyntacticDiagnostics(sourceFile),
              true,
            );
            yield* profileSync(
              'NG_DIAGNOSTICS_SEMANTIC',
              () => builder.getSemanticDiagnostics(sourceFile),
              true,
            );

            // Declaration files cannot have template diagnostics
            if (sourceFile.isDeclarationFile) {
              continue;
            }

            // Only request Angular template diagnostics for affected files to avoid
            // overhead of template diagnostics for unchanged files.
            if (affectedFiles.has(sourceFile)) {
              const angularDiagnostics = profileSync(
                'NG_DIAGNOSTICS_TEMPLATE',
                () => angularCompiler.getDiagnosticsForFile(sourceFile, optimizeFor),
                true,
              );
              diagnosticCache.set(sourceFile, angularDiagnostics);
              yield* angularDiagnostics;
            } else {
              const angularDiagnostics = diagnosticCache.get(sourceFile);
              if (angularDiagnostics) {
                yield* angularDiagnostics;
              }
            }
          }
        }

        profileSync('NG_DIAGNOSTICS_TOTAL', () => {
          for (const diagnostic of collectDiagnostics()) {
            const message = convertTypeScriptDiagnostic(diagnostic, host);
            if (diagnostic.category === ts.DiagnosticCategory.Error) {
              (result.errors ??= []).push(message);
            } else {
              (result.warnings ??= []).push(message);
            }
          }
        });

        fileEmitter = createFileEmitter(
          builder,
          mergeTransformers(angularCompiler.prepareEmit().transformers, {
            before: [replaceBootstrap(() => builder.getProgram().getTypeChecker())],
          }),
          (sourceFile) => angularCompiler.incrementalCompilation.recordSuccessfulEmit(sourceFile),
        );

        return result;
      });

      build.onLoad(
        { filter: compilerOptions.allowJs ? /\.[cm]?[jt]sx?$/ : /\.[cm]?tsx?$/ },
        (args) =>
          profileAsync(
            'NG_EMIT_TS*',
            async () => {
              assert.ok(fileEmitter, 'Invalid plugin execution order');

              const request = pluginOptions.fileReplacements?.[args.path] ?? args.path;

              // The filename is currently used as a cache key. Since the cache is memory only,
              // the options cannot change and do not need to be represented in the key. If the
              // cache is later stored to disk, then the options that affect transform output
              // would need to be added to the key as well as a check for any change of content.
              let contents = pluginOptions.sourceFileCache?.typeScriptFileCache.get(
                pathToFileURL(request).href,
              );

              if (contents === undefined) {
                const typescriptResult = await fileEmitter(request);
                if (!typescriptResult?.content) {
                  // No TS result indicates the file is not part of the TypeScript program.
                  // If allowJs is enabled and the file is JS then defer to the next load hook.
                  if (compilerOptions.allowJs && /\.[cm]?js$/.test(request)) {
                    return undefined;
                  }

                  // Otherwise return an error
                  return {
                    errors: [
                      createMissingFileError(
                        request,
                        args.path,
                        build.initialOptions.absWorkingDir ?? '',
                      ),
                    ],
                  };
                }

                contents = await javascriptTransformer.transformData(
                  request,
                  typescriptResult.content,
                  true /* skipLinker */,
                );

                pluginOptions.sourceFileCache?.typeScriptFileCache.set(
                  pathToFileURL(request).href,
                  contents,
                );
              }

              return {
                contents,
                loader: 'js',
              };
            },
            true,
          ),
      );

      build.onLoad({ filter: /\.[cm]?js$/ }, (args) =>
        profileAsync(
          'NG_EMIT_JS*',
          async () => {
            // The filename is currently used as a cache key. Since the cache is memory only,
            // the options cannot change and do not need to be represented in the key. If the
            // cache is later stored to disk, then the options that affect transform output
            // would need to be added to the key as well as a check for any change of content.
            let contents = pluginOptions.sourceFileCache?.babelFileCache.get(args.path);
            if (contents === undefined) {
              contents = await javascriptTransformer.transformFile(args.path);
              pluginOptions.sourceFileCache?.babelFileCache.set(args.path, contents);
            }

            return {
              contents,
              loader: 'js',
            };
          },
          true,
        ),
      );

      build.onEnd((result) => {
        if (stylesheetResourceFiles.length) {
          result.outputFiles?.push(...stylesheetResourceFiles);
        }

        logCumulativeDurations();
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

function findAffectedFiles(
  builder: ts.EmitAndSemanticDiagnosticsBuilderProgram,
  { ignoreForDiagnostics, ignoreForEmit, incrementalCompilation }: NgtscProgram['compiler'],
): Set<ts.SourceFile> {
  const affectedFiles = new Set<ts.SourceFile>();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = builder.getSemanticDiagnosticsOfNextAffectedFile(undefined, (sourceFile) => {
      // If the affected file is a TTC shim, add the shim's original source file.
      // This ensures that changes that affect TTC are typechecked even when the changes
      // are otherwise unrelated from a TS perspective and do not result in Ivy codegen changes.
      // For example, changing @Input property types of a directive used in another component's
      // template.
      // A TTC shim is a file that has been ignored for diagnostics and has a filename ending in `.ngtypecheck.ts`.
      if (ignoreForDiagnostics.has(sourceFile) && sourceFile.fileName.endsWith('.ngtypecheck.ts')) {
        // This file name conversion relies on internal compiler logic and should be converted
        // to an official method when available. 15 is length of `.ngtypecheck.ts`
        const originalFilename = sourceFile.fileName.slice(0, -15) + '.ts';
        const originalSourceFile = builder.getSourceFile(originalFilename);
        if (originalSourceFile) {
          affectedFiles.add(originalSourceFile);
        }

        return true;
      }

      return false;
    });

    if (!result) {
      break;
    }

    affectedFiles.add(result.affected as ts.SourceFile);
  }

  // A file is also affected if the Angular compiler requires it to be emitted
  for (const sourceFile of builder.getSourceFiles()) {
    if (ignoreForEmit.has(sourceFile) || incrementalCompilation.safeToSkipEmit(sourceFile)) {
      continue;
    }

    affectedFiles.add(sourceFile);
  }

  return affectedFiles;
}

function createMissingFileError(request: string, original: string, root: string): PartialMessage {
  const error = {
    text: `File '${path.relative(root, request)}' is missing from the TypeScript compilation.`,
    notes: [
      {
        text: `Ensure the file is part of the TypeScript program via the 'files' or 'include' property.`,
      },
    ],
  };

  if (request !== original) {
    error.notes.push({
      text: `File is requested from a file replacement of '${path.relative(root, original)}'.`,
    });
  }

  return error;
}
