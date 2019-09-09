/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
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

  'ng-add'?: {};
  'ng-update'?: {
    migrations: string;
    packageGroup: { [name: string]: string };
  };
}

export interface PackageMetadata {
  name: string;
  tags: { [tag: string]: PackageManifest | undefined };
  versions: Map<string, PackageManifest>;
}

let npmrc: { [key: string]: string };

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
): Record<string, string> {
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

  let options: { [key: string]: string } = {};
  for (const location of [...defaultConfigLocations, ...projectConfigLocations]) {
    if (existsSync(location)) {
      if (showPotentials) {
        logger.info(`Trying '${location}'...found.`);
      }

      const data = readFileSync(location, 'utf8');
      options = {
        ...options,
        ...(yarn ? lockfile.parse(data) : ini.parse(data)),
      };

      if (options.cafile) {
        const cafile = path.resolve(path.dirname(location), options.cafile);
        delete options.cafile;
        try {
          options.ca = readFileSync(cafile, 'utf8').replace(/\r?\n/, '\\n');
        } catch {}
      }
    } else if (showPotentials) {
      logger.info(`Trying '${location}'...not found.`);
    }
  }

  // Substitute any environment variable references
  for (const key in options) {
    if (typeof options[key] === 'string') {
      options[key] = options[key].replace(/\$\{([^\}]+)\}/, (_, name) => process.env[name] || '');
    }
  }

  return options;
}

function normalizeManifest(rawManifest: {}): PackageManifest {
  // TODO: Fully normalize and sanitize

  return {
    dependencies: {},
    devDependencies: {},
    peerDependencies: {},
    optionalDependencies: {},
    // tslint:disable-next-line:no-any
    ...(rawManifest as any),
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
    'full-metadata': true,
    ...npmrc,
    ...(registry ? { registry } : {}),
  });

  // Normalize the response
  const metadata: PackageMetadata = {
    name: response.name,
    tags: {},
    versions: new Map(),
  };

  if (response.versions) {
    for (const [version, manifest] of Object.entries(response.versions)) {
      metadata.versions.set(version, normalizeManifest(manifest as {}));
    }
  }

  if (response['dist-tags']) {
    for (const [tag, version] of Object.entries(response['dist-tags'])) {
      const manifest = metadata.versions.get(version as string);
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
    'full-metadata': true,
    ...npmrc,
    ...(registry ? { registry } : {}),
  });

  return normalizeManifest(response);
}
