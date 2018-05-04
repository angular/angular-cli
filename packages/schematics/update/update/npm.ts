/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging } from '@angular-devkit/core';
import { exec } from 'child_process';
import { Observable, ReplaySubject, concat, of } from 'rxjs';
import { concatMap, filter, first, map, toArray } from 'rxjs/operators';
import * as url from 'url';
import { NpmRepositoryPackageJson } from './npm-package-json';

const RegistryClient = require('npm-registry-client');

const npmPackageJsonCache = new Map<string, Observable<NpmRepositoryPackageJson>>();


function getNpmConfigOption(option: string) {
  return new Observable<string | undefined>(obs => {
    try {
      exec(`npm get ${option}`, (error, data) => {
        if (error) {
          obs.next();
        } else {
          data = data.trim();
          if (!data || data === 'undefined' || data === 'null') {
            obs.next();
          } else {
            obs.next(data);
          }
        }

        obs.complete();
      });
    } catch {
      obs.next();
      obs.complete();
    }
  });
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
  logger: logging.LoggerApi,
): Observable<Partial<NpmRepositoryPackageJson>> {
  const scope = packageName.startsWith('@') ? packageName.split('/')[0] : null;

  return concat(
    of(registryUrl),
    scope ? getNpmConfigOption(scope + ':registry') : of(undefined),
    getNpmConfigOption('registry'),
  ).pipe(
    filter(partialUrl => !!partialUrl),
    first(),
    map(partialUrl => {
      if (!partialUrl) {
        partialUrl = 'https://registry.npmjs.org/';
      }
      const partial = url.parse(partialUrl);
      let fullUrl = new url.URL(`http://${partial.host}/${packageName.replace(/\//g, '%2F')}`);
      try {
        const registry = new url.URL(partialUrl);
        registry.pathname = (registry.pathname || '')
            .replace(/\/?$/, '/' + packageName.replace(/\//g, '%2F'));
        fullUrl = new url.URL(url.format(registry));
      } catch {}

      logger.debug(
        `Getting package.json from '${packageName}' (url: ${JSON.stringify(fullUrl)})...`,
      );

      return fullUrl.toString();
    }),
    concatMap(fullUrl => {
      let maybeRequest = npmPackageJsonCache.get(fullUrl);
      if (maybeRequest) {
        return maybeRequest;
      }

      return concat(
        getNpmConfigOption('proxy'),
        getNpmConfigOption('https-proxy'),
      ).pipe(
        toArray(),
        concatMap(options => {
          const subject = new ReplaySubject<NpmRepositoryPackageJson>(1);

          const client = new RegistryClient({
            proxy: {
              http: options[0],
              https: options[1],
            },
          });
          client.log.level = 'silent';
          const params = {
            timeout: 30000,
          };

          client.get(
            fullUrl,
            params,
            (error: object, data: NpmRepositoryPackageJson) => {
            if (error) {
              subject.error(error);
            }

            subject.next(data);
            subject.complete();
          });

          maybeRequest = subject.asObservable();
          npmPackageJsonCache.set(fullUrl.toString(), maybeRequest);

          return maybeRequest;
        }),
      );
    }),
  );

}
