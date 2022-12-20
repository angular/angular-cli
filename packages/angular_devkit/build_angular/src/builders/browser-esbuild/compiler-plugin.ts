/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type {
  Metafile,
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
import { AngularCompilation, FileEmitter } from './angular-compilation';
import { AngularHostOptions } from './angular-host';
import { JavaScriptTransformer } from './javascript-transformer';
import {
  logCumulativeDurations,
  profileAsync,
  profileSync,
  resetCumulativeDurations,
} from './profiling';
import { BundleStylesheetOptions, bundleComponentStylesheet } from './stylesheets';

/**
 * A counter for component styles used to generate unique build-time identifiers for each stylesheet.
 */
let componentStyleCounter = 0;

/**
 * Converts TypeScript Diagnostic related information into an esbuild compatible note object.
 * Related information is a subset of a full TypeScript Diagnostic and also used for diagnostic
 * notes associated with the main Diagnostic.
 * @param info The TypeScript diagnostic relative information to convert.
 * @returns An esbuild diagnostic message as a PartialMessage object
 */
function convertTypeScriptDiagnosticInfo(
  info: ts.DiagnosticRelatedInformation,
  textPrefix?: string,
): PartialNote {
  const newLine = platform() === 'win32' ? '\r\n' : '\n';
  let text = ts.flattenDiagnosticMessageText(info.messageText, newLine);
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
 * @returns An esbuild diagnostic message as a PartialMessage object
 */
function convertTypeScriptDiagnostic(diagnostic: ts.Diagnostic): PartialMessage {
  let codePrefix = 'TS';
  let code = `${diagnostic.code}`;
  if (diagnostic.source === 'ngtsc') {
    codePrefix = 'NG';
    // Remove `-99` Angular prefix from diagnostic code
    code = code.slice(3);
  }

  const message: PartialMessage = {
    ...convertTypeScriptDiagnosticInfo(diagnostic, `${codePrefix}${code}: `),
    // Store original diagnostic for reference if needed downstream
    detail: diagnostic,
  };

  if (diagnostic.relatedInformation?.length) {
    message.notes = diagnostic.relatedInformation.map((info) =>
      convertTypeScriptDiagnosticInfo(info),
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

// eslint-disable-next-line max-lines-per-function
export function createCompilerPlugin(
  pluginOptions: CompilerPluginOptions,
  styleOptions: BundleStylesheetOptions & { inlineStyleLanguage: string },
): Plugin {
  return {
    name: 'angular-compiler',
    // eslint-disable-next-line max-lines-per-function
    async setup(build: PluginBuild): Promise<void> {
      let setupWarnings: PartialMessage[] | undefined;

      // Initialize a worker pool for JavaScript transformations
      const javascriptTransformer = new JavaScriptTransformer(pluginOptions, maxWorkers);

      const { GLOBAL_DEFS_FOR_TERSER_WITH_AOT, readConfiguration } =
        await AngularCompilation.loadCompilerCli();

      // Setup defines based on the values provided by the Angular compiler-cli
      build.initialOptions.define ??= {};
      for (const [key, value] of Object.entries(GLOBAL_DEFS_FOR_TERSER_WITH_AOT)) {
        if (key in build.initialOptions.define) {
          // Skip keys that have been manually provided
          continue;
        }
        if (key === 'ngDevMode') {
          // ngDevMode is already set based on the builder's script optimization option
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

      let stylesheetMetafiles: Metafile[];

      let compilation: AngularCompilation | undefined;

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
        stylesheetMetafiles = [];

        // Create Angular compiler host options
        const hostOptions: AngularHostOptions = {
          fileReplacements: pluginOptions.fileReplacements,
          modifiedFiles: pluginOptions.sourceFileCache?.modifiedFiles,
          sourceFileCache: pluginOptions.sourceFileCache,
          async transformStylesheet(data, containingFile, stylesheetFile) {
            // Stylesheet file only exists for external stylesheets
            const filename = stylesheetFile ?? containingFile;

            const stylesheetResult = await bundleComponentStylesheet(
              // TODO: Evaluate usage of a fast hash instead
              `${++componentStyleCounter}`,
              styleOptions.inlineStyleLanguage,
              data,
              filename,
              !stylesheetFile,
              styleOptions,
            );

            const { contents, resourceFiles, errors, warnings } = stylesheetResult;
            (result.errors ??= []).push(...errors);
            (result.warnings ??= []).push(...warnings);
            stylesheetResourceFiles.push(...resourceFiles);
            if (stylesheetResult.metafile) {
              stylesheetMetafiles.push(stylesheetResult.metafile);
            }

            return contents;
          },
        };

        // Create new compilation if first build; otherwise, use existing for rebuilds
        compilation ??= new AngularCompilation();

        // Initialize the Angular compilation for the current build.
        // In watch mode, previous build state will be reused.
        const { affectedFiles } = await compilation.initialize(
          rootNames,
          compilerOptions,
          hostOptions,
          configurationDiagnostics,
        );

        // Clear affected files from the cache (if present)
        if (pluginOptions.sourceFileCache) {
          for (const affected of affectedFiles) {
            pluginOptions.sourceFileCache.typeScriptFileCache.delete(
              pathToFileURL(affected.fileName).href,
            );
          }
        }

        profileSync('NG_DIAGNOSTICS_TOTAL', () => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          for (const diagnostic of compilation!.collectDiagnostics()) {
            const message = convertTypeScriptDiagnostic(diagnostic);
            if (diagnostic.category === ts.DiagnosticCategory.Error) {
              (result.errors ??= []).push(message);
            } else {
              (result.warnings ??= []).push(message);
            }
          }
        });

        fileEmitter = compilation.createFileEmitter();

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
        // Add any component stylesheet resource files to the output files
        if (stylesheetResourceFiles.length) {
          result.outputFiles?.push(...stylesheetResourceFiles);
        }

        // Combine component stylesheet metafiles with main metafile
        if (result.metafile && stylesheetMetafiles.length) {
          for (const metafile of stylesheetMetafiles) {
            result.metafile.inputs = { ...result.metafile.inputs, ...metafile.inputs };
            result.metafile.outputs = { ...result.metafile.outputs, ...metafile.outputs };
          }
        }

        logCumulativeDurations();
      });
    },
  };
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
