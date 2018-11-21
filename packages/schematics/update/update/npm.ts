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
import { Observable, from } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { NpmRepositoryPackageJson } from './npm-package-json';

const ini = require('ini');
const lockfile = require('@yarnpkg/lockfile');
const pacote = require('pacote');

const npmPackageJsonCache = new Map<string, Observable<NpmRepositoryPackageJson>>();
let npmrc: { [key: string]: string };


function readOptions(yarn = false): { [key: string]: string } {
  // TODO: have a way to read options without using fs directly.
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

  const projectConfigLocations: string[] = [];
  const root = path.parse(cwd).root;
  for (let curDir = path.dirname(cwd); curDir && curDir !== root; curDir = path.dirname(curDir)) {
    projectConfigLocations.unshift(path.join(curDir, dotFilename));
  }
  projectConfigLocations.push(path.join(cwd, dotFilename));

  let options: { [key: string]: string } = {};
  for (const location of [...defaultConfigLocations, ...projectConfigLocations]) {
    if (existsSync(location)) {
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
        } catch { }
      }
    }
  }

  // Substitute any environment variable references
  for (const key in options) {
    options[key] = options[key].replace(/\$\{([^\}]+)\}/, (_, name) => process.env[name] || '');
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
  registryUrl: string | undefined,
  _logger: logging.LoggerApi,
  usingYarn = false,
): Observable<Partial<NpmRepositoryPackageJson>> {
  const cachedResponse = npmPackageJsonCache.get(packageName);
  if (cachedResponse) {
    return cachedResponse;
  }

  if (!npmrc) {
    try {
      npmrc = readOptions();
    } catch { }

    if (usingYarn) {
      try {
        npmrc = { ...npmrc, ...readOptions(true) };
      } catch { }
    }
  }

  const resultPromise = pacote.packument(
    packageName,
    {
      'full-metadata': true,
      ...npmrc,
      registry: registryUrl,
    },
  );

  const response = from<NpmRepositoryPackageJson>(resultPromise).pipe(shareReplay());
  npmPackageJsonCache.set(packageName, response);

  return response;
}
