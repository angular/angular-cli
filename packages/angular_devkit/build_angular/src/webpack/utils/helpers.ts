/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { ObjectPattern } from 'copy-webpack-plugin';
import { createHash } from 'crypto';
import glob from 'glob';
import * as path from 'path';
import type { Configuration, WebpackOptionsNormalized } from 'webpack';
import {
  AssetPatternClass,
  OutputHashing,
  ScriptElement,
  StyleElement,
} from '../../builders/browser/schema';
import { WebpackConfigOptions } from '../../utils/build-options';
import { VERSION } from '../../utils/package-version';

export interface HashFormat {
  chunk: string;
  extract: string;
  file: string;
  script: string;
}

export type WebpackStatsOptions = Exclude<Configuration['stats'], string | boolean | undefined>;

export function getOutputHashFormat(outputHashing = OutputHashing.None, length = 20): HashFormat {
  const hashTemplate = `.[contenthash:${length}]`;

  switch (outputHashing) {
    case 'media':
      return {
        chunk: '',
        extract: '',
        file: hashTemplate,
        script: '',
      };
    case 'bundles':
      return {
        chunk: hashTemplate,
        extract: hashTemplate,
        file: '',
        script: hashTemplate,
      };
    case 'all':
      return {
        chunk: hashTemplate,
        extract: hashTemplate,
        file: hashTemplate,
        script: hashTemplate,
      };
    case 'none':
    default:
      return {
        chunk: '',
        extract: '',
        file: '',
        script: '',
      };
  }
}

export type NormalizedEntryPoint = Required<Exclude<ScriptElement | StyleElement, string>>;

export function normalizeExtraEntryPoints(
  extraEntryPoints: (ScriptElement | StyleElement)[],
  defaultBundleName: string,
): NormalizedEntryPoint[] {
  return extraEntryPoints.map((entry) => {
    if (typeof entry === 'string') {
      return { input: entry, inject: true, bundleName: defaultBundleName };
    }

    const { inject = true, ...newEntry } = entry;
    let bundleName;
    if (entry.bundleName) {
      bundleName = entry.bundleName;
    } else if (!inject) {
      // Lazy entry points use the file name as bundle name.
      bundleName = path.parse(entry.input).name;
    } else {
      bundleName = defaultBundleName;
    }

    return { ...newEntry, inject, bundleName };
  });
}

export function assetNameTemplateFactory(hashFormat: HashFormat): (resourcePath: string) => string {
  const visitedFiles = new Map<string, string>();

  return (resourcePath: string) => {
    if (hashFormat.file) {
      // File names are hashed therefore we don't need to handle files with the same file name.
      return `[name]${hashFormat.file}.[ext]`;
    }

    const filename = path.basename(resourcePath);
    // Check if the file with the same name has already been processed.
    const visited = visitedFiles.get(filename);
    if (!visited) {
      // Not visited.
      visitedFiles.set(filename, resourcePath);

      return filename;
    } else if (visited === resourcePath) {
      // Same file.
      return filename;
    }

    // File has the same name but it's in a different location.
    return '[path][name].[ext]';
  };
}

export function getInstrumentationExcludedPaths(
  root: string,
  excludedPaths: string[],
): Set<string> {
  const excluded = new Set<string>();

  for (const excludeGlob of excludedPaths) {
    glob
      .sync(excludeGlob, { nodir: true, cwd: root, root, nomount: true })
      .forEach((p) => excluded.add(path.join(root, p)));
  }

  return excluded;
}

export function normalizeGlobalStyles(styleEntrypoints: StyleElement[]): {
  entryPoints: Record<string, string[]>;
  noInjectNames: string[];
} {
  const entryPoints: Record<string, string[]> = {};
  const noInjectNames: string[] = [];

  if (styleEntrypoints.length === 0) {
    return { entryPoints, noInjectNames };
  }

  for (const style of normalizeExtraEntryPoints(styleEntrypoints, 'styles')) {
    // Add style entry points.
    entryPoints[style.bundleName] ??= [];
    entryPoints[style.bundleName].push(style.input);

    // Add non injected styles to the list.
    if (!style.inject) {
      noInjectNames.push(style.bundleName);
    }
  }

  return { entryPoints, noInjectNames };
}

export function getCacheSettings(
  wco: WebpackConfigOptions,
  angularVersion: string,
): WebpackOptionsNormalized['cache'] {
  const { enabled, path: cacheDirectory } = wco.buildOptions.cache;
  if (enabled) {
    return {
      type: 'filesystem',
      profile: wco.buildOptions.verbose,
      cacheDirectory: path.join(cacheDirectory, 'angular-webpack'),
      maxMemoryGenerations: 1,
      // We use the versions and build options as the cache name. The Webpack configurations are too
      // dynamic and shared among different build types: test, build and serve.
      // None of which are "named".
      name: createHash('sha1')
        .update(angularVersion)
        .update(VERSION)
        .update(wco.projectRoot)
        .update(JSON.stringify(wco.tsConfig))
        .update(
          JSON.stringify({
            ...wco.buildOptions,
            // Needed because outputPath changes on every build when using i18n extraction
            // https://github.com/angular/angular-cli/blob/736a5f89deaca85f487b78aec9ff66d4118ceb6a/packages/angular_devkit/build_angular/src/utils/i18n-options.ts#L264-L265
            outputPath: undefined,
          }),
        )
        .digest('hex'),
    };
  }

  if (wco.buildOptions.watch) {
    return {
      type: 'memory',
      maxGenerations: 1,
    };
  }

  return false;
}

export function globalScriptsByBundleName(
  scripts: ScriptElement[],
): { bundleName: string; inject: boolean; paths: string[] }[] {
  return normalizeExtraEntryPoints(scripts, 'scripts').reduce(
    (prev: { bundleName: string; paths: string[]; inject: boolean }[], curr) => {
      const { bundleName, inject, input } = curr;

      const existingEntry = prev.find((el) => el.bundleName === bundleName);
      if (existingEntry) {
        if (existingEntry.inject && !inject) {
          // All entries have to be lazy for the bundle to be lazy.
          throw new Error(`The ${bundleName} bundle is mixing injected and non-injected scripts.`);
        }

        existingEntry.paths.push(input);
      } else {
        prev.push({
          bundleName,
          inject,
          paths: [input],
        });
      }

      return prev;
    },
    [],
  );
}

export function assetPatterns(root: string, assets: AssetPatternClass[]) {
  return assets.map((asset: AssetPatternClass, index: number): ObjectPattern => {
    // Resolve input paths relative to workspace root and add slash at the end.
    // eslint-disable-next-line prefer-const
    let { input, output, ignore = [], glob } = asset;
    input = path.resolve(root, input).replace(/\\/g, '/');
    input = input.endsWith('/') ? input : input + '/';
    output = output.endsWith('/') ? output : output + '/';

    if (output.startsWith('..')) {
      throw new Error('An asset cannot be written to a location outside of the output path.');
    }

    return {
      context: input,
      // Now we remove starting slash to make Webpack place it from the output root.
      to: output.replace(/^\//, ''),
      from: glob,
      noErrorOnMissing: true,
      force: true,
      globOptions: {
        dot: true,
        followSymbolicLinks: !!asset.followSymlinks,
        ignore: [
          '.gitkeep',
          '**/.DS_Store',
          '**/Thumbs.db',
          // Negate patterns needs to be absolute because copy-webpack-plugin uses absolute globs which
          // causes negate patterns not to match.
          // See: https://github.com/webpack-contrib/copy-webpack-plugin/issues/498#issuecomment-639327909
          ...ignore,
        ].map((i) => path.posix.join(input, i)),
      },
      priority: index,
    };
  });
}

export function getStatsOptions(verbose = false): WebpackStatsOptions {
  const webpackOutputOptions: WebpackStatsOptions = {
    all: false, // Fallback value for stats options when an option is not defined. It has precedence over local webpack defaults.
    colors: true,
    hash: true, // required by custom stat output
    timings: true, // required by custom stat output
    chunks: true, // required by custom stat output
    builtAt: true, // required by custom stat output
    warnings: true,
    errors: true,
    assets: true, // required by custom stat output
    cachedAssets: true, // required for bundle size calculators

    // Needed for markAsyncChunksNonInitial.
    ids: true,
    entrypoints: true,
  };

  const verboseWebpackOutputOptions: WebpackStatsOptions = {
    // The verbose output will most likely be piped to a file, so colors just mess it up.
    colors: false,
    usedExports: true,
    optimizationBailout: true,
    reasons: true,
    children: true,
    assets: true,
    version: true,
    chunkModules: true,
    errorDetails: true,
    errorStack: true,
    moduleTrace: true,
    logging: 'verbose',
    modulesSpace: Infinity,
  };

  return verbose
    ? { ...webpackOutputOptions, ...verboseWebpackOutputOptions }
    : webpackOutputOptions;
}

/**
 * @param root the workspace root
 * @returns `true` when `@angular/platform-server` is installed.
 */
export function isPlatformServerInstalled(root: string): boolean {
  try {
    require.resolve('@angular/platform-server', { paths: [root] });

    return true;
  } catch {
    return false;
  }
}
