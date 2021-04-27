/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging } from '@angular-devkit/core';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import * as path from 'path';
import { NpmRepositoryPackageJson } from './npm-package-json';

const ini = require('ini');
const lockfile = require('@yarnpkg/lockfile');
const pacote = require('pacote');

type PackageManagerOptions = Record<string, unknown>;

const npmPackageJsonCache = new Map<string, Promise<Partial<NpmRepositoryPackageJson>>>();
let npmrc: PackageManagerOptions;

function readOptions(
  logger: logging.LoggerApi,
  yarn = false,
  showPotentials = false,
): PackageManagerOptions {
  const cwd = process.cwd();
  const baseFilename = yarn ? 'yarnrc' : 'npmrc';
  const dotFilename = '.' + baseFilename;

  let globalPrefix: string;
  if (process.env.PREFIX) {
    globalPrefix = process.env.PREFIX;
  } else {
    globalPrefix = path.dirname(process.execPath);
    if (process.platform !== 'win32') {
      globalPrefix = path.dirname(globalPrefix);
    }
  }

  const defaultConfigLocations = [
    path.join(globalPrefix, 'etc', baseFilename),
    path.join(homedir(), dotFilename),
  ];

  const projectConfigLocations: string[] = [
    path.join(cwd, dotFilename),
  ];
  const root = path.parse(cwd).root;
  for (let curDir = path.dirname(cwd); curDir && curDir !== root; curDir = path.dirname(curDir)) {
    projectConfigLocations.unshift(path.join(curDir, dotFilename));
  }

  if (showPotentials) {
    logger.info(`Locating potential ${baseFilename} files:`);
  }

  const options: PackageManagerOptions = {};
  for (const location of [...defaultConfigLocations, ...projectConfigLocations]) {
    if (existsSync(location)) {
      if (showPotentials) {
        logger.info(`Trying '${location}'...found.`);
      }

      const data = readFileSync(location, 'utf8');
      // Normalize RC options that are needed by 'npm-registry-fetch'.
      // See: https://github.com/npm/npm-registry-fetch/blob/ebddbe78a5f67118c1f7af2e02c8a22bcaf9e850/index.js#L99-L126
      const rcConfig: PackageManagerOptions = yarn ? lockfile.parse(data) : ini.parse(data);
      for (const [key, value] of Object.entries(rcConfig)) {
        switch (key) {
          case 'noproxy':
          case 'no-proxy':
            options['noProxy'] = value;
            break;
          case 'maxsockets':
            options['maxSockets'] = value;
            break;
          case 'https-proxy':
          case 'proxy':
            options['proxy'] = value;
            break;
          case 'strict-ssl':
            options['strictSSL'] = value;
            break;
          case 'local-address':
            options['localAddress'] = value;
            break;
          case 'cafile':
            if (typeof value === 'string') {
              const cafile = path.resolve(path.dirname(location), value);
              try {
                options['ca'] = readFileSync(cafile, 'utf8').replace(/\r?\n/g, '\n');
              } catch { }
            }
            break;
          default:
            options[key] = value;
            break;
        }
      }
    } else if (showPotentials) {
      logger.info(`Trying '${location}'...not found.`);
    }
  }

  // Substitute any environment variable references
  for (const key in options) {
    const value = options[key];
    if (typeof value === 'string') {
      options[key] = value.replace(/\$\{([^\}]+)\}/, (_, name) => process.env[name] || '');
    }
  }

  return options;
}

/**
 * Get the NPM repository's package.json for a package. This is p
 * @param {string} packageName The package name to fetch.
 * @param {string} registryUrl The NPM Registry URL to use.
 * @param {LoggerApi} logger A logger instance to log debug information.
 * @returns An observable that will put the pacakge.json content.
 * @private
 */
export function getNpmPackageJson(
  packageName: string,
  logger: logging.LoggerApi,
  options?: {
    registryUrl?: string;
    usingYarn?: boolean;
    verbose?: boolean;
  },
): Promise<Partial<NpmRepositoryPackageJson>> {
  const cachedResponse = npmPackageJsonCache.get(packageName);
  if (cachedResponse) {
    return cachedResponse;
  }

  if (!npmrc) {
    try {
      npmrc = readOptions(logger, false, options && options.verbose);
    } catch { }

    if (options && options.usingYarn) {
      try {
        npmrc = { ...npmrc, ...readOptions(logger, true, options && options.verbose) };
      } catch { }
    }
  }

  const resultPromise: Promise<NpmRepositoryPackageJson> = pacote.packument(
    packageName,
    {
      fullMetadata: true,
      ...npmrc,
      ...(options && options.registryUrl ? { registry: options.registryUrl } : {}),
    },
  );

  // TODO: find some way to test this
  const response = resultPromise.catch((err) => {
    logger.warn(err.message || err);

    return { requestedName: packageName };
  });
  npmPackageJsonCache.set(packageName, response);

  return response;
}
