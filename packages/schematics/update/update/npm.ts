/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging } from '@angular-devkit/core';
import { readFileSync } from 'fs';
import { Observable, from } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { NpmRepositoryPackageJson } from './npm-package-json';

const pacote = require('pacote');

const npmPackageJsonCache = new Map<string, Observable<NpmRepositoryPackageJson>>();

let npmrc: { [key: string]: string };
try {
  npmrc = _readNpmRc();
} catch {
  npmrc = {};
}


function _readNpmRc(): { [key: string]: string } {
  // TODO: have a way to read options without using fs directly.
  const path = require('path');
  const fs = require('fs');
  const perProjectNpmrc = path.resolve('.npmrc');

  const configs: string[] = [];

  if (process.platform === 'win32') {
    if (process.env.LOCALAPPDATA) {
      configs.push(fs.readFileSync(path.join(process.env.LOCALAPPDATA, '.npmrc'), 'utf8'));
    }
  } else {
    if (process.env.HOME) {
      configs.push(fs.readFileSync(path.join(process.env.HOME, '.npmrc'), 'utf8'));
    }
  }

  if (fs.existsSync(perProjectNpmrc)) {
    configs.push(fs.readFileSync(perProjectNpmrc, 'utf8'));
  }

  const allOptions: { [key: string]: string } = {};
  for (const config of configs) {
    const allOptionsArr = config.split(/\r?\n/).map(x => x.trim());

    allOptionsArr.forEach(x => {
      const [key, ...value] = x.split('=');
      const fullValue = value.join('=').trim();
      if (key && fullValue && fullValue !== 'null') {
        allOptions[key.trim()] = fullValue;
      }
    });

    if (allOptions.cafile) {
      const cafile = allOptions.cafile;
      delete allOptions.cafile;
      try {
        allOptions.ca = readFileSync(cafile, 'utf8');
        allOptions.ca = allOptions.ca.replace(/\r?\n/, '\\n');
      } catch { }
    }
  }

  return allOptions;
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
): Observable<Partial<NpmRepositoryPackageJson>> {
  const cachedResponse = npmPackageJsonCache.get(packageName);
  if (cachedResponse) {
    return cachedResponse;
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
