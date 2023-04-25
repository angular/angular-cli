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
  Plugin,
  PluginBuild,
} from 'esbuild';
import * as assert from 'node:assert';
import { realpath } from 'node:fs/promises';
import { platform } from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { maxWorkers } from '../../../utils/environment-options';
import { JavaScriptTransformer } from '../javascript-transformer';
import { LoadResultCache, MemoryLoadResultCache } from '../load-result-cache';
import {
  logCumulativeDurations,
  profileAsync,
  profileSync,
  resetCumulativeDurations,
} from '../profiling';
import { BundleStylesheetOptions, bundleComponentStylesheet } from '../stylesheets/bundle-options';
import { AngularCompilation, FileEmitter } from './angular-compilation';
import { AngularHostOptions } from './angular-host';
import { AotCompilation } from './aot-compilation';
import { convertTypeScriptDiagnostic } from './diagnostics';
import { JitCompilation } from './jit-compilation';
import { setupJitPluginCallbacks } from './jit-plugin-callbacks';

const USING_WINDOWS = platform() === 'win32';
const WINDOWS_SEP_REGEXP = new RegExp(`\\${path.win32.sep}`, 'g');

export class SourceFileCache extends Map<string, ts.SourceFile> {
  readonly modifiedFiles = new Set<string>();
  readonly babelFileCache = new Map<string, Uint8Array>();
  readonly typeScriptFileCache = new Map<string, Uint8Array>();
  readonly loadResultCache = new MemoryLoadResultCache();

  invalidate(files: Iterable<string>): void {
    this.modifiedFiles.clear();
    for (let file of files) {
      this.babelFileCache.delete(file);
      this.typeScriptFileCache.delete(pathToFileURL(file).href);
      this.loadResultCache.invalidate(file);

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
  jit?: boolean;
  advancedOptimizations?: boolean;
  thirdPartySourcemaps?: boolean;
  fileReplacements?: Record<string, string>;
  sourceFileCache?: SourceFileCache;
  loadResultCache?: LoadResultCache;
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
      let setupWarnings: PartialMessage[] | undefined = [];

      const preserveSymlinks = build.initialOptions.preserveSymlinks;
      let tsconfigPath = pluginOptions.tsconfig;
      if (!preserveSymlinks) {
        // Use the real path of the tsconfig if not preserving symlinks.
        // This ensures the TS source file paths are based on the real path of the configuration.
        try {
          tsconfigPath = await realpath(tsconfigPath);
        } catch {}
      }

      // Initialize a worker pool for JavaScript transformations
      const javascriptTransformer = new JavaScriptTransformer(pluginOptions, maxWorkers);

      // Setup defines based on the values provided by the Angular compiler-cli
      const { GLOBAL_DEFS_FOR_TERSER_WITH_AOT } = await AngularCompilation.loadCompilerCli();
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

      // The file emitter created during `onStart` that will be used during the build in `onLoad` callbacks for TS files
      let fileEmitter: FileEmitter | undefined;

      // The stylesheet resources from component stylesheets that will be added to the build results output files
      let stylesheetResourceFiles: OutputFile[] = [];
      let stylesheetMetafiles: Metafile[];

      // Create new reusable compilation for the appropriate mode based on the `jit` plugin option
      const compilation: AngularCompilation = pluginOptions.jit
        ? new JitCompilation()
        : new AotCompilation();

      // Determines if TypeScript should process JavaScript files based on tsconfig `allowJs` option
      let shouldTsIgnoreJs = true;

      build.onStart(async () => {
        const result: OnStartResult = {
          warnings: setupWarnings,
        };

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
              styleOptions.inlineStyleLanguage,
              data,
              filename,
              !stylesheetFile,
              styleOptions,
              pluginOptions.loadResultCache,
            );

            const { contents, resourceFiles, errors, warnings } = stylesheetResult;
            if (errors) {
              (result.errors ??= []).push(...errors);
            }
            (result.warnings ??= []).push(...warnings);
            stylesheetResourceFiles.push(...resourceFiles);
            if (stylesheetResult.metafile) {
              stylesheetMetafiles.push(stylesheetResult.metafile);
            }

            return contents;
          },
        };

        // Initialize the Angular compilation for the current build.
        // In watch mode, previous build state will be reused.
        const {
          affectedFiles,
          compilerOptions: { allowJs },
        } = await compilation.initialize(tsconfigPath, hostOptions, (compilerOptions) => {
          if (
            compilerOptions.target === undefined ||
            compilerOptions.target < ts.ScriptTarget.ES2022
          ) {
            // If 'useDefineForClassFields' is already defined in the users project leave the value as is.
            // Otherwise fallback to false due to https://github.com/microsoft/TypeScript/issues/45995
            // which breaks the deprecated `@Effects` NGRX decorator and potentially other existing code as well.
            compilerOptions.target = ts.ScriptTarget.ES2022;
            compilerOptions.useDefineForClassFields ??= false;

            // Only add the warning on the initial build
            setupWarnings?.push({
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

          return {
            ...compilerOptions,
            noEmitOnError: false,
            inlineSources: pluginOptions.sourcemap,
            inlineSourceMap: pluginOptions.sourcemap,
            mapRoot: undefined,
            sourceRoot: undefined,
            preserveSymlinks,
          };
        });
        shouldTsIgnoreJs = !allowJs;

        // Clear affected files from the cache (if present)
        if (pluginOptions.sourceFileCache) {
          for (const affected of affectedFiles) {
            pluginOptions.sourceFileCache.typeScriptFileCache.delete(
              pathToFileURL(affected.fileName).href,
            );
          }
        }

        profileSync('NG_DIAGNOSTICS_TOTAL', () => {
          for (const diagnostic of compilation.collectDiagnostics()) {
            const message = convertTypeScriptDiagnostic(diagnostic);
            if (diagnostic.category === ts.DiagnosticCategory.Error) {
              (result.errors ??= []).push(message);
            } else {
              (result.warnings ??= []).push(message);
            }
          }
        });

        fileEmitter = compilation.createFileEmitter();

        // Reset the setup warnings so that they are only shown during the first build.
        setupWarnings = undefined;

        return result;
      });

      build.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, (args) =>
        profileAsync(
          'NG_EMIT_TS*',
          async () => {
            assert.ok(fileEmitter, 'Invalid plugin execution order');

            const request = pluginOptions.fileReplacements?.[args.path] ?? args.path;

            // Skip TS load attempt if JS TypeScript compilation not enabled and file is JS
            if (shouldTsIgnoreJs && /\.[cm]?js$/.test(request)) {
              return undefined;
            }

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
                if (!shouldTsIgnoreJs && /\.[cm]?js$/.test(request)) {
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
              contents = await javascriptTransformer.transformFile(args.path, pluginOptions.jit);
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

      // Setup bundling of component templates and stylesheets when in JIT mode
      if (pluginOptions.jit) {
        setupJitPluginCallbacks(
          build,
          styleOptions,
          stylesheetResourceFiles,
          pluginOptions.loadResultCache,
        );
      }

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
