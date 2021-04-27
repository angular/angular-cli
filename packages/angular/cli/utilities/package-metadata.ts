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

const ini = require('ini');
const lockfile = require('@yarnpkg/lockfile');
const pacote = require('pacote');

export interface PackageDependencies {
  [dependency: string]: string;
}

export type NgAddSaveDepedency = 'dependencies' | 'devDependencies' | boolean;

export interface PackageIdentifier {
  type: 'git' | 'tag' | 'version' | 'range' | 'file' | 'directory' | 'remote';
  name: string;
  scope: string | null;
  registry: boolean;
  raw: string;
  fetchSpec: string;
  rawSpec: string;
}

export interface PackageManifest {
  name: string;
  version: string;
  license?: string;
  private?: boolean;
  deprecated?: boolean;

  dependencies: PackageDependencies;
  devDependencies: PackageDependencies;
  peerDependencies: PackageDependencies;
  optionalDependencies: PackageDependencies;
  'ng-add'?: {
    save?: NgAddSaveDepedency;
  };
  'ng-update'?: {
    migrations: string;
    packageGroup: { [name: string]: string };
  };
}

export interface PackageMetadata {
  name: string;
  tags: { [tag: string]: PackageManifest | undefined };
  versions: Record<string, PackageManifest>;
  'dist-tags'?: unknown;
}

type PackageManagerOptions = Record<string, unknown>;

let npmrc: PackageManagerOptions;

function ensureNpmrc(logger: logging.LoggerApi, usingYarn: boolean, verbose: boolean): void {
  if (!npmrc) {
    try {
      npmrc = readOptions(logger, false, verbose);
    } catch { }

    if (usingYarn) {
      try {
        npmrc = { ...npmrc, ...readOptions(logger, true, verbose) };
      } catch { }
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

function normalizeManifest(rawManifest: { name: string; version: string }): PackageManifest {
  // TODO: Fully normalize and sanitize

  return {
    dependencies: {},
    devDependencies: {},
    peerDependencies: {},
    optionalDependencies: {},
    ...rawManifest,
  };
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

  const response = await pacote.packument(name, {
    fullMetadata: true,
    ...npmrc,
    ...(registry ? { registry } : {}),
  });

  // Normalize the response
  const metadata: PackageMetadata = {
    name: response.name,
    tags: {},
    versions: {},
  };

  if (response.versions) {
    for (const [version, manifest] of Object.entries(response.versions)) {
      metadata.versions[version] = normalizeManifest(manifest as { name: string; version: string });
    }
  }

  if (response['dist-tags']) {
    // Store this for use with other npm utility packages
    metadata['dist-tags'] = response['dist-tags'];

    for (const [tag, version] of Object.entries(response['dist-tags'])) {
      const manifest = metadata.versions[version as string];
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
  options?: {
    registry?: string;
    usingYarn?: boolean;
    verbose?: boolean;
  },
): Promise<PackageManifest> {
  const { usingYarn, verbose, registry } = {
    registry: undefined,
    usingYarn: false,
    verbose: false,
    ...options,
  };

  ensureNpmrc(logger, usingYarn, verbose);

  const response = await pacote.manifest(name, {
    fullMetadata: true,
    ...npmrc,
    ...(registry ? { registry } : {}),
  });

  return normalizeManifest(response);
}
