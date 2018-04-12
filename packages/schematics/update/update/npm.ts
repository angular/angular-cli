/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging } from '@angular-devkit/core';
import * as http from 'http';
import * as https from 'https';
import { Observable, ReplaySubject } from 'rxjs';
import * as url from 'url';
import { NpmRepositoryPackageJson } from './npm-package-json';


const npmPackageJsonCache = new Map<string, Observable<NpmRepositoryPackageJson>>();


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
  registryUrl: string,
  logger: logging.LoggerApi,
): Observable<Partial<NpmRepositoryPackageJson>> {
  let fullUrl = new url.URL(`http://${registryUrl}/${packageName.replace(/\//g, '%2F')}`);
  try {
    const registry = new url.URL(registryUrl);
    registry.pathname = (registry.pathname || '')
        .replace(/\/?$/, '/' + packageName.replace(/\//g, '%2F'));
    fullUrl = new url.URL(url.format(registry));
  } catch (_) {
  }

  logger.debug(
    `Getting package.json from ${JSON.stringify(packageName)} (url: ${JSON.stringify(fullUrl)})...`,
  );

  let maybeRequest = npmPackageJsonCache.get(fullUrl.toString());
  if (!maybeRequest) {
    const subject = new ReplaySubject<NpmRepositoryPackageJson>(1);

    const protocolPackage = (fullUrl.protocol == 'https' ? https : http) as typeof http;
    const request = protocolPackage.request(fullUrl, response => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          json.requestedName = packageName;
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
    npmPackageJsonCache.set(fullUrl.toString(), maybeRequest);
  }

  return maybeRequest;
}
