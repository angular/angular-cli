/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import * as lockfile from '@yarnpkg/lockfile';
import { existsSync, readFileSync } from 'fs';
import * as ini from 'ini';
import { homedir } from 'os';
import type { Manifest, Packument } from 'pacote';
import * as path from 'path';

export interface PackageMetadata extends Packument, NgPackageManifestProperties {
  tags: Record<string, PackageManifest>;
  versions: Record<string, PackageManifest>;
}

export interface NpmRepositoryPackageJson extends PackageMetadata {
  requestedName?: string;
}

export type NgAddSaveDependency = 'dependencies' | 'devDependencies' | boolean;

export interface PackageIdentifier {
  type: 'git' | 'tag' | 'version' | 'range' | 'file' | 'directory' | 'remote';
  name: string;
  scope: string | null;
  registry: boolean;
  raw: string;
  fetchSpec: string;
  rawSpec: string;
}

export interface NgPackageManifestProperties {
  'ng-add'?: {
    save?: NgAddSaveDependency;
  };
  'ng-update'?: {
    migrations?: string;
    packageGroup?: string[] | Record<string, string>;
    packageGroupName?: string;
    requirements?: string[] | Record<string, string>;
  };
}

export interface PackageManifest extends Manifest, NgPackageManifestProperties {
  deprecated?: boolean;
}

interface PackageManagerOptions extends Record<string, unknown> {
  forceAuth?: Record<string, unknown>;
}

let npmrc: PackageManagerOptions;
const npmPackageJsonCache = new Map<string, Promise<Partial<NpmRepositoryPackageJson>>>();

function ensureNpmrc(logger: logging.LoggerApi, usingYarn: boolean, verbose: boolean): void {
  if (!npmrc) {
    try {
      npmrc = readOptions(logger, false, verbose);
    } catch {}

    if (usingYarn) {
      try {
        npmrc = { ...npmrc, ...readOptions(logger, true, verbose) };
      } catch {}
    }
  }
}

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
    (!yarn && process.env.NPM_CONFIG_GLOBALCONFIG) || path.join(globalPrefix, 'etc', baseFilename),
    (!yarn && process.env.NPM_CONFIG_USERCONFIG) || path.join(homedir(), dotFilename),
  ];

  const projectConfigLocations: string[] = [path.join(cwd, dotFilename)];
  if (yarn) {
    const root = path.parse(cwd).root;
    for (let curDir = path.dirname(cwd); curDir && curDir !== root; curDir = path.dirname(curDir)) {
      projectConfigLocations.unshift(path.join(curDir, dotFilename));
    }
  }

  if (showPotentials) {
    logger.info(`Locating potential ${baseFilename} files:`);
  }

  let rcOptions: PackageManagerOptions = {};
  for (const location of [...defaultConfigLocations, ...projectConfigLocations]) {
    if (existsSync(location)) {
      if (showPotentials) {
        logger.info(`Trying '${location}'...found.`);
      }

      const data = readFileSync(location, 'utf8');
      // Normalize RC options that are needed by 'npm-registry-fetch'.
      // See: https://github.com/npm/npm-registry-fetch/blob/ebddbe78a5f67118c1f7af2e02c8a22bcaf9e850/index.js#L99-L126
      const rcConfig: PackageManagerOptions = yarn ? lockfile.parse(data) : ini.parse(data);

      rcOptions = normalizeOptions(rcConfig, location, rcOptions);
    }
  }

  const envVariablesOptions: PackageManagerOptions = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!value) {
      continue;
    }

    let normalizedName = key.toLowerCase();
    if (normalizedName.startsWith('npm_config_')) {
      normalizedName = normalizedName.substring(11);
    } else if (yarn && normalizedName.startsWith('yarn_')) {
      normalizedName = normalizedName.substring(5);
    } else {
      continue;
    }

    normalizedName = normalizedName.replace(/(?!^)_/g, '-'); // don't replace _ at the start of the key.s
    envVariablesOptions[normalizedName] = value;
  }

  return normalizeOptions(envVariablesOptions, undefined, rcOptions);
}

function normalizeOptions(
  rawOptions: PackageManagerOptions,
  location = process.cwd(),
  existingNormalizedOptions: PackageManagerOptions = {},
): PackageManagerOptions {
  const options = { ...existingNormalizedOptions };

  for (const [key, value] of Object.entries(rawOptions)) {
    let substitutedValue = value;

    // Substitute any environment variable references.
    if (typeof value === 'string') {
      substitutedValue = value.replace(/\$\{([^}]+)\}/, (_, name) => process.env[name] || '');
    }

    switch (key) {
      // Unless auth options are scope with the registry url it appears that npm-registry-fetch ignores them,
      // even though they are documented.
      // https://github.com/npm/npm-registry-fetch/blob/8954f61d8d703e5eb7f3d93c9b40488f8b1b62ac/README.md
      // https://github.com/npm/npm-registry-fetch/blob/8954f61d8d703e5eb7f3d93c9b40488f8b1b62ac/auth.js#L45-L91
      case '_authToken':
      case 'token':
      case 'username':
      case 'password':
      case '_auth':
      case 'auth':
        options['forceAuth'] ??= {};
        options['forceAuth'][key] = substitutedValue;
        break;
      case 'noproxy':
      case 'no-proxy':
        options['noProxy'] = substitutedValue;
        break;
      case 'maxsockets':
        options['maxSockets'] = substitutedValue;
        break;
      case 'https-proxy':
      case 'proxy':
        options['proxy'] = substitutedValue;
        break;
      case 'strict-ssl':
        options['strictSSL'] = substitutedValue;
        break;
      case 'local-address':
        options['localAddress'] = substitutedValue;
        break;
      case 'cafile':
        if (typeof substitutedValue === 'string') {
          const cafile = path.resolve(path.dirname(location), substitutedValue);
          try {
            options['ca'] = readFileSync(cafile, 'utf8').replace(/\r?\n/g, '\n');
          } catch {}
        }
        break;
      default:
        options[key] = substitutedValue;
        break;
    }
  }

  return options;
}

export async function fetchPackageMetadata(
  name: string,
  logger: logging.LoggerApi,
  options?: {
    registry?: string;
    usingYarn?: boolean;
    verbose?: boolean;
  },
): Promise<PackageMetadata> {
  const { usingYarn, verbose, registry } = {
    registry: undefined,
    usingYarn: false,
    verbose: false,
    ...options,
  };

  ensureNpmrc(logger, usingYarn, verbose);
  const { packument } = await import('pacote');
  const response = await packument(name, {
    fullMetadata: true,
    ...npmrc,
    ...(registry ? { registry } : {}),
  });

  // Normalize the response
  const metadata: PackageMetadata = {
    ...response,
    tags: {},
  };

  if (response['dist-tags']) {
    for (const [tag, version] of Object.entries(response['dist-tags'])) {
      const manifest = metadata.versions[version];
      if (manifest) {
        metadata.tags[tag] = manifest;
      } else if (verbose) {
        logger.warn(`Package ${metadata.name} has invalid version metadata for '${tag}'.`);
      }
    }
  }

  return metadata;
}

export async function fetchPackageManifest(
  name: string,
  logger: logging.LoggerApi,
  options: {
    registry?: string;
    usingYarn?: boolean;
    verbose?: boolean;
  } = {},
): Promise<PackageManifest> {
  const { usingYarn = false, verbose = false, registry } = options;
  ensureNpmrc(logger, usingYarn, verbose);
  const { manifest } = await import('pacote');

  const response = await manifest(name, {
    fullMetadata: true,
    ...npmrc,
    ...(registry ? { registry } : {}),
  });

  return response;
}

export async function getNpmPackageJson(
  packageName: string,
  logger: logging.LoggerApi,
  options: {
    registry?: string;
    usingYarn?: boolean;
    verbose?: boolean;
  } = {},
): Promise<Partial<NpmRepositoryPackageJson>> {
  const cachedResponse = npmPackageJsonCache.get(packageName);
  if (cachedResponse) {
    return cachedResponse;
  }

  const { usingYarn = false, verbose = false, registry } = options;
  ensureNpmrc(logger, usingYarn, verbose);
  const { packument } = await import('pacote');
  const response = packument(packageName, {
    fullMetadata: true,
    ...npmrc,
    ...(registry ? { registry } : {}),
  });

  npmPackageJsonCache.set(packageName, response);

  return response;
}
