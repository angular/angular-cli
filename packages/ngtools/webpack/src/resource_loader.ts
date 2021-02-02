/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// TODO: fix typings.
// tslint:disable-next-line:no-global-tslint-disable
// tslint:disable:no-any
import * as path from 'path';
import * as vm from 'vm';
import { RawSource } from 'webpack-sources';
import { normalizePath } from './ivy/paths';

const NodeTemplatePlugin = require('webpack/lib/node/NodeTemplatePlugin');
const NodeTargetPlugin = require('webpack/lib/node/NodeTargetPlugin');
const LibraryTemplatePlugin = require('webpack/lib/LibraryTemplatePlugin');
const SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin');


interface CompilationOutput {
  outputName: string;
  source: string;
  success: boolean;
}

export class WebpackResourceLoader {
  private _parentCompilation: any;
  private _fileDependencies = new Map<string, Set<string>>();
  private _reverseDependencies = new Map<string, Set<string>>();

  private cache = new Map<string, string>();
  private modifiedResources = new Set<string>();

  update(
    parentCompilation: import('webpack').compilation.Compilation,
    changedFiles?: Iterable<string>,
  ) {
    this._parentCompilation = parentCompilation;

    // Update resource cache and modified resources
    this.modifiedResources.clear();
    if (changedFiles) {
      for (const changedFile of changedFiles) {
        for (const affectedResource of this.getAffectedResources(changedFile)) {
          this.cache.delete(normalizePath(affectedResource));
          this.modifiedResources.add(affectedResource);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  getModifiedResourceFiles() {
    return this.modifiedResources;
  }

  getResourceDependencies(filePath: string) {
    return this._fileDependencies.get(filePath) || [];
  }

  getAffectedResources(file: string) {
    return this._reverseDependencies.get(file) || [];
  }

  setAffectedResources(file: string, resources: Iterable<string>) {
    this._reverseDependencies.set(file, new Set(resources));
  }

  private async _compile(filePath: string): Promise<CompilationOutput> {
    if (!this._parentCompilation) {
      throw new Error('WebpackResourceLoader cannot be used without parentCompilation');
    }

    // Simple sanity check.
    if (filePath.match(/\.[jt]s$/)) {
      return Promise.reject(
        `Cannot use a JavaScript or TypeScript file (${filePath}) in a component's styleUrls or templateUrl.`,
      );
    }

    const outputOptions = { filename: filePath };
    const context = this._parentCompilation.context;
    const relativePath = path.relative(context || '', filePath);
    const childCompiler = this._parentCompilation.createChildCompiler(relativePath, outputOptions);
    childCompiler.context = context;

    new NodeTemplatePlugin(outputOptions).apply(childCompiler);
    new NodeTargetPlugin().apply(childCompiler);
    new SingleEntryPlugin(context, filePath).apply(childCompiler);
    new LibraryTemplatePlugin('resource', 'var').apply(childCompiler);

    childCompiler.hooks.thisCompilation.tap('ngtools-webpack', (compilation: any) => {
      compilation.hooks.additionalAssets.tapPromise('ngtools-webpack', async () => {
        const asset = compilation.assets[filePath];
        if (!asset) {
          return;
        }

        const output = await this._evaluate(filePath, asset.source());
        compilation.assets[filePath] = new RawSource(output);
      });
    });

    // Compile and return a promise
    const childCompilation = await new Promise<any>((resolve, reject) => {
      childCompiler.compile((err: Error, childCompilation: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(childCompilation);
        }
      });
    });

    // Propagate warnings to parent compilation.
    const { warnings, errors } = childCompilation;
    if (warnings && warnings.length) {
      this._parentCompilation.warnings.push(...warnings);
    }
    if (errors && errors.length) {
      this._parentCompilation.errors.push(...errors);
    }

    Object.keys(childCompilation.assets).forEach((assetName) => {
      // Add all new assets to the parent compilation, with the exception of
      // the file we're loading and its sourcemap.
      if (
        assetName !== filePath &&
        assetName !== `${filePath}.map` &&
        this._parentCompilation.assets[assetName] == undefined
      ) {
        this._parentCompilation.assets[assetName] = childCompilation.assets[assetName];
      }
    });

    // Save the dependencies for this resource.
    this._fileDependencies.set(filePath, new Set(childCompilation.fileDependencies));
    for (const file of childCompilation.fileDependencies) {
      const resolvedFile = normalizePath(file);
      const entry = this._reverseDependencies.get(resolvedFile);
      if (entry) {
        entry.add(filePath);
      } else {
        this._reverseDependencies.set(resolvedFile, new Set([filePath]));
      }
    }

    const finalOutput = childCompilation.assets[filePath]?.source();

    return { outputName: filePath, source: finalOutput ?? '', success: !errors?.length };
  }

  private async _evaluate(filename: string, source: string): Promise<string> {
    // Evaluate code
    const context: { resource?: string | { default?: string } } = {};
    vm.runInNewContext(source, context, { filename });

    if (typeof context.resource === 'string') {
      return context.resource;
    } else if (typeof context.resource?.default === 'string') {
      return context.resource.default;
    }

    throw new Error(`The loader "${filename}" didn't return a string.`);
  }

  async get(filePath: string): Promise<string> {
    const normalizedFile = normalizePath(filePath);
    let data = this.cache.get(normalizedFile);

    if (data === undefined) {
      // cache miss so compile resource
      const compilationResult = await this._compile(filePath);
      data = compilationResult.source;

      // Only cache if compilation was successful
      if (compilationResult.success) {
        this.cache.set(normalizedFile, data);
      }
    }

    return data;
  }
}
