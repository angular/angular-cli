// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.

import * as path from 'path';
import { basename, normalize } from '@angular-devkit/core';
import { ExtraEntryPoint, ExtraEntryPointObject } from '../../../browser/schema';

export const ngAppResolve = (resolvePath: string): string => {
  return path.resolve(process.cwd(), resolvePath);
};

const webpackOutputOptions = {
  colors: true,
  hash: true, // required by custom stat output
  timings: true, // required by custom stat output
  chunks: true, // required by custom stat output
  chunkModules: false,
  children: false, // listing all children is very noisy in AOT and hides warnings/errors
  modules: false,
  reasons: false,
  warnings: true,
  errors: true,
  assets: true, // required by custom stat output
  version: false,
  errorDetails: false,
  moduleTrace: false,
};

const verboseWebpackOutputOptions = {
  children: true,
  assets: true,
  version: true,
  reasons: true,
  chunkModules: false, // TODO: set to true when console to file output is fixed
  errorDetails: true,
  moduleTrace: true,
};

export function getWebpackStatsConfig(verbose = false) {
  return verbose
    ? Object.assign(webpackOutputOptions, verboseWebpackOutputOptions)
    : webpackOutputOptions;
}

export interface HashFormat {
  chunk: string;
  extract: string;
  file: string;
  script: string;
}

export function getOutputHashFormat(option: string, length = 20): HashFormat {
  /* tslint:disable:max-line-length */
  const hashFormats: { [option: string]: HashFormat } = {
    none:    { chunk: '',                       extract: '',                         file: ''                 , script: '' },
    media:   { chunk: '',                       extract: '',                         file: `.[hash:${length}]`, script: ''  },
    bundles: { chunk: `.[chunkhash:${length}]`, extract: `.[contenthash:${length}]`, file: ''                 , script: `.[hash:${length}]`  },
    all:     { chunk: `.[chunkhash:${length}]`, extract: `.[contenthash:${length}]`, file: `.[hash:${length}]`, script: `.[hash:${length}]`  },
  };
  /* tslint:enable:max-line-length */
  return hashFormats[option] || hashFormats['none'];
}

export type NormalizedEntryPoint = ExtraEntryPointObject & { bundleName: string };

export function normalizeExtraEntryPoints(
  extraEntryPoints: ExtraEntryPoint[],
  defaultBundleName: string
): NormalizedEntryPoint[] {
  return extraEntryPoints.map(entry => {
    let normalizedEntry;

    if (typeof entry === 'string') {
      normalizedEntry = { input: entry, lazy: false, bundleName: defaultBundleName };
    } else {
      let bundleName;

      if (entry.bundleName) {
        bundleName = entry.bundleName;
      } else if (entry.lazy) {
        // Lazy entry points use the file name as bundle name.
        bundleName = basename(
          normalize(entry.input.replace(/\.(js|css|scss|sass|less|styl)$/i, '')),
        );
      } else {
        bundleName = defaultBundleName;
      }

      normalizedEntry = {...entry, bundleName};
    }

    return normalizedEntry;
  })
}
