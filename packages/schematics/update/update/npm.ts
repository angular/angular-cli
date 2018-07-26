/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging } from '@angular-devkit/core';
import { readFileSync } from 'fs';
import { Observable, ReplaySubject, of } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';
import * as url from 'url';
import { NpmRepositoryPackageJson } from './npm-package-json';

const RegistryClient = require('npm-registry-client');
const rc = require('rc');

const npmPackageJsonCache = new Map<string, Observable<NpmRepositoryPackageJson>>();

const npmConfig = rc('npm', {}, {}) as { [key: string]: string | boolean | number | undefined };

function getNpmConfigOption(
  option: string,
  scope?: string,
  tryWithoutScope?: boolean,
): string | boolean | number | undefined {
  if (scope && tryWithoutScope) {
    const value = getNpmConfigOption(option, scope);
    if (value === undefined) {
      return getNpmConfigOption(option);
    }

    return value;
  }

  const fullOption = `${scope ? scope + ':' : ''}${option}`;

  return npmConfig[fullOption];
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
  const scope = packageName.startsWith('@') ? packageName.split('/')[0] : undefined;

  return (
    registryUrl ? of(registryUrl) : of(getNpmConfigOption('registry', scope, true) as string)
  ).pipe(
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

      return fullUrl;
    }),
    concatMap(fullUrl => {
      let maybeRequest = npmPackageJsonCache.get(fullUrl.toString());
      if (maybeRequest) {
        return maybeRequest;
      }

      const registryKey = `//${fullUrl.host}/`;

      return of(null).pipe(
        concatMap(() => {
          const subject = new ReplaySubject<NpmRepositoryPackageJson>(1);

          const ssl: {
            strict?: boolean;
            ca?: Buffer;
          } = {};

          const strictSsl = getNpmConfigOption('strict-ssl');
          if (strictSsl !== undefined) {
            ssl.strict = strictSsl === 'false' ? false : !!strictSsl;
          }

          const cafile = getNpmConfigOption('cafile');
          if (typeof cafile === 'string') {
            try {
              ssl.ca = readFileSync(cafile);
            } catch { }
          }

          const auth: {
            token?: string,
            alwaysAuth?: boolean;
            username?: string;
            password?: string
          } = {};

          const alwaysAuth = getNpmConfigOption('alwaysAuth', registryKey, true);
          if (alwaysAuth !== undefined) {
            auth.alwaysAuth = alwaysAuth === 'false' ? false : !!alwaysAuth;
          }

          const authToken = getNpmConfigOption('_authToken', registryKey) as string;
          if (authToken) {
            auth.token = authToken;
          }

          const client = new RegistryClient({
            proxy: {
              http: getNpmConfigOption('proxy'),
              https: getNpmConfigOption('https-proxy'),
            },
            ssl,
          });
          client.log.level = 'silent';
          const params = {
            timeout: 30000,
            auth,
          };

          client.get(
            fullUrl.toString(),
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
