/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { CompilerHost, NgtscProgram } from '@angular/compiler-cli';
import { transformAsync } from '@babel/core';
import type {
  OnStartResult,
  OutputFile,
  PartialMessage,
  PartialNote,
  Plugin,
  PluginBuild,
} from 'esbuild';
import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import { platform } from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import angularApplicationPreset from '../../babel/presets/application';
import { requiresLinking } from '../../babel/webpack-loader';
import { loadEsmModule } from '../../utils/load-esm';
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
      const babelDataCache = new Map<string, Uint8Array>();
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

        // Temporary deep import for host augmentation support
        const {
          augmentHostWithCaching,
          augmentHostWithReplacements,
          augmentProgramWithVersioning,
        } = require('@ngtools/webpack/src/ivy/host');

        // Augment TypeScript Host for file replacements option
        if (pluginOptions.fileReplacements) {
          augmentHostWithReplacements(host, pluginOptions.fileReplacements);
        }

        // Augment TypeScript Host with source file caching if provided
        if (pluginOptions.sourceFileCache) {
          augmentHostWithCaching(host, pluginOptions.sourceFileCache);
          // Allow the AOT compiler to request the set of changed templates and styles
          (host as CompilerHost).getModifiedResourceFiles = function () {
            return pluginOptions.sourceFileCache?.modifiedFiles;
          };
        }

        // Create the Angular specific program that contains the Angular compiler
        const angularProgram = profileSync(
          'NG_CREATE_PROGRAM',
          () => new NgtscProgram(rootNames, compilerOptions, host, previousAngularProgram),
        );
        previousAngularProgram = angularProgram;
        const angularCompiler = angularProgram.compiler;
        const typeScriptProgram = angularProgram.getTsProgram();
        augmentProgramWithVersioning(typeScriptProgram);

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

              // The filename is currently used as a cache key. Since the cache is memory only,
              // the options cannot change and do not need to be represented in the key. If the
              // cache is later stored to disk, then the options that affect transform output
              // would need to be added to the key as well as a check for any change of content.
              let contents = pluginOptions.sourceFileCache?.typeScriptFileCache.get(
                pathToFileURL(args.path).href,
              );

              if (contents === undefined) {
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
                        text: `File '${args.path}' is missing from the TypeScript compilation.`,
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
                // The pre-transformed data is used as a cache key. Since the cache is memory only,
                // the options cannot change and do not need to be represented in the key. If the
                // cache is later stored to disk, then the options that affect transform output
                // would need to be added to the key as well.
                contents = babelDataCache.get(data);
                if (contents === undefined) {
                  const transformedData = await transformWithBabel(args.path, data, pluginOptions);
                  contents = Buffer.from(transformedData, 'utf-8');
                  babelDataCache.set(data, contents);
                }

                pluginOptions.sourceFileCache?.typeScriptFileCache.set(
                  pathToFileURL(args.path).href,
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
              const data = await fs.readFile(args.path, 'utf-8');
              const transformedData = await transformWithBabel(args.path, data, pluginOptions);
              contents = Buffer.from(transformedData, 'utf-8');
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

async function transformWithBabel(
  filename: string,
  data: string,
  pluginOptions: CompilerPluginOptions,
): Promise<string> {
  const forceAsyncTransformation =
    !/[\\/][_f]?esm2015[\\/]/.test(filename) && /async\s+function\s*\*/.test(data);
  const shouldLink = await requiresLinking(filename, data);
  const useInputSourcemap =
    pluginOptions.sourcemap &&
    (!!pluginOptions.thirdPartySourcemaps || !/[\\/]node_modules[\\/]/.test(filename));

  // If no additional transformations are needed, return the data directly
  if (!forceAsyncTransformation && !pluginOptions.advancedOptimizations && !shouldLink) {
    // Strip sourcemaps if they should not be used
    return useInputSourcemap ? data : data.replace(/^\/\/# sourceMappingURL=[^\r\n]*/gm, '');
  }

  const angularPackage = /[\\/]node_modules[\\/]@angular[\\/]/.test(filename);

  const linkerPluginCreator = shouldLink
    ? (
        await loadEsmModule<typeof import('@angular/compiler-cli/linker/babel')>(
          '@angular/compiler-cli/linker/babel',
        )
      ).createEs2015LinkerPlugin
    : undefined;

  const result = await transformAsync(data, {
    filename,
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

  return result?.code ?? data;
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
