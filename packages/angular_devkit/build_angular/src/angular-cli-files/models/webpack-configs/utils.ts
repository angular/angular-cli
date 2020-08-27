/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.

import { basename, normalize } from '@angular-devkit/core';
import { ExtraEntryPoint, ExtraEntryPointClass } from '../../../browser/schema';
import { SourceMapDevToolPlugin } from 'webpack';
import { ScriptTarget } from 'typescript';

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
  return extraEntryPoints.map(entry => {
    if (typeof entry === 'string') {
      return { input: entry, inject: true, bundleName: defaultBundleName };
    }

    const { inject = true, ...newEntry } = entry;
    let bundleName;
    if (entry.bundleName) {
      bundleName = entry.bundleName;
    } else if (!inject) {
      // Lazy entry points use the file name as bundle name.
      bundleName = basename(
        normalize(entry.input.replace(/\.(js|css|scss|sass|less|styl)$/i, '')),
      );
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
    sourceRoot: inlineSourceMap ? '' : 'webpack:///',
    moduleFilenameTemplate: '[resource-path]',
    append: hiddenSourceMap ? false : undefined,
  });
}

/**
 * Returns an ES version file suffix to differentiate between various builds.
 */
export function getEsVersionForFileName(
  scriptTargetOverride: ScriptTarget | undefined,
  esVersionInFileName = false,
): string {
  if (!esVersionInFileName || scriptTargetOverride === undefined) {
    return '';
  }

  if (scriptTargetOverride === ScriptTarget.ESNext) {
    return '-esnext';
  }

  return '-' + ScriptTarget[scriptTargetOverride].toLowerCase();
}

export function isPolyfillsEntry(name: string) {
  return name === 'polyfills' || name === 'polyfills-es5';
}
