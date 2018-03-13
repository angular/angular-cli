/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging } from '@angular-devkit/core';
import * as http from 'http';
import { Observable } from 'rxjs/Observable';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { NpmRepositoryPackageJson } from './npm-package-json';


const npmPackageJsonCache = new Map<string, Observable<NpmRepositoryPackageJson>>();


/**
 * Get the NPM repository's package.json for a package. This is p
 * @param {string} packageName The package name to fetch.
 * @param {LoggerApi} logger A logger instance to log debug information.
 * @returns An observable that will put the pacakge.json content.
 * @private
 */
export function getNpmPackageJson(
  packageName: string,
  logger: logging.LoggerApi,
): Observable<NpmRepositoryPackageJson> {
  const url = `http://registry.npmjs.org/${packageName.replace(/\//g, '%2F')}`;
  logger.debug(
    `Getting package.json from ${JSON.stringify(packageName)} (url: ${JSON.stringify(url)})...`,
  );

  let maybeRequest = npmPackageJsonCache.get(url);
  if (!maybeRequest) {
    const subject = new ReplaySubject<NpmRepositoryPackageJson>(1);

    const request = http.request(url, response => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          subject.next(json as NpmRepositoryPackageJson);
          subject.complete();
        } catch (err) {
          subject.error(err);
        }
      });
      response.on('error', err => subject.error(err));
    });
    request.end();

    maybeRequest = subject.asObservable();
    npmPackageJsonCache.set(url, maybeRequest);
  }

  return maybeRequest;
}
