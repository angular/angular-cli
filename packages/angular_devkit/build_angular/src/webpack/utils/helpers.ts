/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import glob from 'glob';
import * as path from 'path';
import { Configuration, SourceMapDevToolPlugin } from 'webpack';
import { ExtraEntryPoint, ExtraEntryPointClass } from '../../builders/browser/schema';

export interface HashFormat {
  chunk: string;
  extract: string;
  file: string;
  script: string;
}

export function getOutputHashFormat(option: string, length = 20): HashFormat {
  const hashFormats: { [option: string]: HashFormat } = {
    none: { chunk: '', extract: '', file: '', script: '' },
    media: { chunk: '', extract: '', file: `.[hash:${length}]`, script: '' },
    bundles: {
      chunk: `.[chunkhash:${length}]`,
      extract: `.[contenthash:${length}]`,
      file: '',
      script: `.[hash:${length}]`,
    },
    all: {
      chunk: `.[chunkhash:${length}]`,
      extract: `.[contenthash:${length}]`,
      file: `.[hash:${length}]`,
      script: `.[hash:${length}]`,
    },
  };

  return hashFormats[option] || hashFormats['none'];
}

export type NormalizedEntryPoint = Required<ExtraEntryPointClass>;

export function normalizeExtraEntryPoints(
  extraEntryPoints: ExtraEntryPoint[],
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

export function getSourceMapDevTool(
  scriptsSourceMap: boolean | undefined,
  stylesSourceMap: boolean | undefined,
  hiddenSourceMap = false,
  inlineSourceMap = false,
): SourceMapDevToolPlugin {
  const include = [];
  if (scriptsSourceMap) {
    include.push(/js$/);
  }

  if (stylesSourceMap) {
    include.push(/css$/);
  }

  return new SourceMapDevToolPlugin({
    filename: inlineSourceMap ? undefined : '[file].map',
    include,
    // We want to set sourceRoot to  `webpack:///` for non
    // inline sourcemaps as otherwise paths to sourcemaps will be broken in browser
    // `webpack:///` is needed for Visual Studio breakpoints to work properly as currently
    // there is no way to set the 'webRoot'
    sourceRoot: 'webpack:///',
    moduleFilenameTemplate: '[resource-path]',
    append: hiddenSourceMap ? false : undefined,
  });
}

export function isPolyfillsEntry(name: string): boolean {
  return name === 'polyfills';
}

export function getWatchOptions(
  poll: number | undefined,
): NonNullable<Configuration['watchOptions']> {
  return {
    poll,
    ignored: poll === undefined ? '**/$_lazy_route_resources' : '**/node_modules/**',
  };
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
  sourceRoot: string,
  excludedPaths: string[],
): Set<string> {
  const excluded = new Set<string>();

  for (const excludeGlob of excludedPaths) {
    glob
      .sync(path.join(sourceRoot, excludeGlob), { nodir: true })
      .forEach((p) => excluded.add(path.normalize(p)));
  }

  return excluded;
}
