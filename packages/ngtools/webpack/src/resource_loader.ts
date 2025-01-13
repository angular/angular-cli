/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { Buffer } from 'node:buffer';
import * as path from 'node:path';
import * as vm from 'node:vm';
import type { Asset, Compilation } from 'webpack';
import { addError } from './ivy/diagnostics';
import { normalizePath } from './ivy/paths';
import {
  CompilationWithInlineAngularResource,
  InlineAngularResourceLoaderPath,
  InlineAngularResourceSymbol,
} from './loaders/inline-resource';
import { NG_COMPONENT_RESOURCE_QUERY } from './transformers/replace_resources';

interface CompilationOutput {
  content: string;
  map?: string;
  success: boolean;
}

export class WebpackResourceLoader {
  private _parentCompilation?: Compilation;
  private _fileDependencies = new Map<string, Set<string>>();
  private _reverseDependencies = new Map<string, Set<string>>();

  private fileCache?: Map<string, CompilationOutput>;
  private assetCache?: Map<string, Asset>;

  private modifiedResources = new Set<string>();
  private outputPathCounter = 1;

  private readonly inlineDataLoaderPath = InlineAngularResourceLoaderPath;

  constructor(shouldCache: boolean) {
    if (shouldCache) {
      this.fileCache = new Map();
      this.assetCache = new Map();
    }
  }

  update(parentCompilation: Compilation, changedFiles?: Iterable<string>): void {
    this._parentCompilation = parentCompilation;

    // Update resource cache and modified resources
    this.modifiedResources.clear();

    if (changedFiles) {
      for (const changedFile of changedFiles) {
        const changedFileNormalized = normalizePath(changedFile);
        this.assetCache?.delete(changedFileNormalized);

        for (const affectedResource of this.getAffectedResources(changedFile)) {
          const affectedResourceNormalized = normalizePath(affectedResource);
          this.fileCache?.delete(affectedResourceNormalized);
          this.modifiedResources.add(affectedResource);

          for (const effectedDependencies of this.getResourceDependencies(
            affectedResourceNormalized,
          )) {
            this.assetCache?.delete(normalizePath(effectedDependencies));
          }
        }
      }
    } else {
      this.fileCache?.clear();
      this.assetCache?.clear();
    }

    // Re-emit all assets for un-effected files
    if (this.assetCache) {
      for (const [, { name, source, info }] of this.assetCache) {
        this._parentCompilation.emitAsset(name, source, info);
      }
    }
  }

  clearParentCompilation(): void {
    this._parentCompilation = undefined;
  }

  getModifiedResourceFiles(): Set<string> {
    return this.modifiedResources;
  }

  getResourceDependencies(filePath: string): Iterable<string> {
    return this._fileDependencies.get(filePath) || [];
  }

  getAffectedResources(file: string): Iterable<string> {
    return this._reverseDependencies.get(file) || [];
  }

  setAffectedResources(file: string, resources: Iterable<string>): void {
    this._reverseDependencies.set(file, new Set(resources));
  }

  // eslint-disable-next-line max-lines-per-function
  private async _compile(
    filePath?: string,
    data?: string,
    fileExtension?: string,
    resourceType?: 'style' | 'template',
    containingFile?: string,
  ): Promise<CompilationOutput> {
    if (!this._parentCompilation) {
      throw new Error('WebpackResourceLoader cannot be used without parentCompilation');
    }

    const { context, webpack } = this._parentCompilation.compiler;
    const {
      EntryPlugin,
      NormalModule,
      library,
      node,
      sources,
      util: { createHash },
    } = webpack;

    const getEntry = (): string => {
      if (filePath) {
        return `${filePath}?${NG_COMPONENT_RESOURCE_QUERY}`;
      } else if (resourceType) {
        return (
          // app.component.ts-2.css?ngResource!=!@ngtools/webpack/src/loaders/inline-resource.js!app.component.ts
          `${containingFile}-${this.outputPathCounter}.${fileExtension}` +
          `?${NG_COMPONENT_RESOURCE_QUERY}!=!${this.inlineDataLoaderPath}!${containingFile}`
        );
      } else if (data) {
        // Create a special URL for reading the resource from memory
        return `angular-resource:${resourceType},${createHash('xxhash64')
          .update(data)
          .digest('hex')}`;
      }

      throw new Error(`"filePath", "resourceType" or "data" must be specified.`);
    };

    const entry = getEntry();

    // Simple sanity check.
    if (filePath?.match(/\.[jt]s$/)) {
      throw new Error(
        `Cannot use a JavaScript or TypeScript file (${filePath}) in a component's styleUrls or templateUrl.`,
      );
    }

    const outputFilePath =
      filePath ||
      `${containingFile}-angular-inline--${this.outputPathCounter++}.${
        resourceType === 'template' ? 'html' : 'css'
      }`;
    const outputOptions = {
      filename: outputFilePath,
      library: {
        type: 'var',
        name: 'resource',
      },
    };

    const childCompiler = this._parentCompilation.createChildCompiler(
      'angular-compiler:resource',
      outputOptions,
      [
        new node.NodeTemplatePlugin(),
        new node.NodeTargetPlugin(),
        new EntryPlugin(context, entry, { name: 'resource' }),
        new library.EnableLibraryPlugin('var'),
      ],
    );

    childCompiler.hooks.thisCompilation.tap(
      'angular-compiler',
      (compilation, { normalModuleFactory }) => {
        // If no data is provided, the resource will be read from the filesystem
        if (data !== undefined) {
          normalModuleFactory.hooks.resolveForScheme
            .for('angular-resource')
            .tap('angular-compiler', (resourceData) => {
              if (filePath) {
                resourceData.path = filePath;
                resourceData.resource = filePath;
              }

              return true;
            });
          NormalModule.getCompilationHooks(compilation)
            .readResourceForScheme.for('angular-resource')
            .tap('angular-compiler', () => data);

          (compilation as CompilationWithInlineAngularResource)[InlineAngularResourceSymbol] = data;
        }

        compilation.hooks.additionalAssets.tap('angular-compiler', () => {
          const asset = compilation.assets[outputFilePath];
          if (!asset) {
            return;
          }

          try {
            const output = this._evaluate(outputFilePath, asset.source().toString());

            if (typeof output === 'string') {
              compilation.assets[outputFilePath] = new sources.RawSource(output);
            }
          } catch (error) {
            assert(error instanceof Error, 'catch clause variable is not an Error instance');
            // Use compilation errors, as otherwise webpack will choke
            addError(compilation, error.message);
          }
        });
      },
    );

    let finalContent: string | undefined;
    childCompiler.hooks.compilation.tap('angular-compiler', (childCompilation) => {
      childCompilation.hooks.processAssets.tap(
        { name: 'angular-compiler', stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT },
        () => {
          finalContent = childCompilation.assets[outputFilePath]?.source().toString();

          for (const { files } of childCompilation.chunks) {
            for (const file of files) {
              childCompilation.deleteAsset(file);
            }
          }
        },
      );
    });

    return new Promise<CompilationOutput>((resolve, reject) => {
      childCompiler.runAsChild((error, _, childCompilation) => {
        if (error) {
          reject(error);

          return;
        } else if (!childCompilation) {
          reject(new Error('Unknown child compilation error'));

          return;
        }

        // Workaround to attempt to reduce memory usage of child compilations.
        // This removes the child compilation from the main compilation and manually propagates
        // all dependencies, warnings, and errors.
        const parent = childCompiler.parentCompilation;
        if (parent) {
          parent.children = parent.children.filter((child) => child !== childCompilation);
          let fileDependencies: Set<string> | undefined;

          for (const dependency of childCompilation.fileDependencies) {
            // Skip paths that do not appear to be files (have no extension).
            // `fileDependencies` can contain directories and not just files which can
            // cause incorrect cache invalidation on rebuilds.
            if (!path.extname(dependency)) {
              continue;
            }

            if (data && containingFile && dependency.endsWith(entry)) {
              // use containing file if the resource was inline
              parent.fileDependencies.add(containingFile);
            } else {
              parent.fileDependencies.add(dependency);
            }

            // Save the dependencies for this resource.
            if (filePath) {
              const resolvedFile = normalizePath(dependency);
              const entry = this._reverseDependencies.get(resolvedFile);
              if (entry) {
                entry.add(filePath);
              } else {
                this._reverseDependencies.set(resolvedFile, new Set([filePath]));
              }

              if (fileDependencies) {
                fileDependencies.add(dependency);
              } else {
                fileDependencies = new Set([dependency]);
                this._fileDependencies.set(filePath, fileDependencies);
              }
            }
          }

          parent.contextDependencies.addAll(childCompilation.contextDependencies);
          parent.missingDependencies.addAll(childCompilation.missingDependencies);
          parent.buildDependencies.addAll(childCompilation.buildDependencies);

          parent.warnings.push(...childCompilation.warnings);
          parent.errors.push(...childCompilation.errors);

          if (this.assetCache) {
            for (const { info, name, source } of childCompilation.getAssets()) {
              // Use the originating file as the cache key if present
              // Otherwise, generate a cache key based on the generated name
              const cacheKey = info.sourceFilename ?? `!![GENERATED]:${name}`;

              this.assetCache.set(cacheKey, { info, name, source });
            }
          }
        }

        resolve({
          content: finalContent ?? '',
          success: childCompilation.errors?.length === 0,
        });
      });
    });
  }

  private _evaluate(filename: string, source: string): string | null {
    // Evaluate code

    // css-loader requires the btoa function to exist to correctly generate inline sourcemaps
    const context: { btoa: (input: string) => string; resource?: string | { default?: string } } = {
      btoa(input) {
        return Buffer.from(input).toString('base64');
      },
    };

    try {
      vm.runInNewContext(source, context, { filename });
    } catch {
      // Error are propagated through the child compilation.
      return null;
    }

    if (typeof context.resource === 'string') {
      return context.resource;
    } else if (typeof context.resource?.default === 'string') {
      return context.resource.default;
    }

    throw new Error(`The loader "${filename}" didn't return a string.`);
  }

  async get(filePath: string): Promise<string> {
    const normalizedFile = normalizePath(filePath);
    let compilationResult = this.fileCache?.get(normalizedFile);

    if (compilationResult === undefined) {
      // cache miss so compile resource
      compilationResult = await this._compile(filePath);

      // Only cache if compilation was successful
      if (this.fileCache && compilationResult.success) {
        this.fileCache.set(normalizedFile, compilationResult);
      }
    }

    return compilationResult.content;
  }

  async process(
    data: string,
    fileExtension: string | undefined,
    resourceType: 'template' | 'style',
    containingFile?: string,
  ): Promise<string> {
    if (data.trim().length === 0) {
      return '';
    }

    const compilationResult = await this._compile(
      undefined,
      data,
      fileExtension,
      resourceType,
      containingFile,
    );

    return compilationResult.content;
  }
}
