/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging } from '@angular-devkit/core';
import { readFileSync } from 'fs';
import * as npm from 'npm';
import { Observable, ReplaySubject } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';
import * as url from 'url';
import { NpmRepositoryPackageJson } from './npm-package-json';

const RegistryClient = require('npm-registry-client');

const npmPackageJsonCache = new Map<string, Observable<NpmRepositoryPackageJson>>();

const ensuredNpm = new Observable(subject => {
  npm.load(() => {
    subject.next();
    subject.complete();
  });
}).pipe(shareReplay());

function getNpmConfigOption(option: string, scope?: string): string {
  if (scope) {
    return npm.config.get(`${scope}:${option}`) || getNpmConfigOption(option);
  }

  return npm.config.get(option);
}

function getNpmClientSslOptions(strictSsl?: string, cafile?: string) {
  const sslOptions: { strict?: boolean, ca?: Buffer } = {};

  if (strictSsl === 'false') {
    sslOptions.strict = false;
  } else if (strictSsl === 'true') {
    sslOptions.strict = true;
  }

  if (cafile) {
    sslOptions.ca = readFileSync(cafile);
  }

  return sslOptions;
}

/**
 * Get the NPM repository's package.json for a package. This is p
 * @param {string} packageName The package name to fetch.
 * @param {string} registryUrl The NPM Registry URL to use.
 * @param {LoggerApi} logger A logger instance to log debug information.
 * @returns An observable that will put the package.json content.
 * @private
 */
export function getNpmPackageJson(
  packageName: string,
  registryUrl: string | undefined,
  logger: logging.LoggerApi,
): Observable<Partial<NpmRepositoryPackageJson>> {
  const scope = packageName.startsWith('@') ? packageName.split('/')[0] : undefined;

  return ensuredNpm.pipe(
    map(() => {
      const partialUrl = registryUrl
        || getNpmConfigOption('registry', scope)
        || 'https://registry.npmjs.org/';

      const partial = url.parse(partialUrl);
      let fullUrl = new url.URL(`http://${partial.host}/${packageName.replace(/\//g, '%2F')}`);
      try {
        const registry = new url.URL(partialUrl);
        registry.pathname = (registry.pathname || '')
          .replace(/\/?$/, '/' + packageName.replace(/\//g, '%2F'));
        fullUrl = new url.URL(url.format(registry));
      } catch { }

      logger.debug(
        `Getting package.json from '${packageName}' (url: ${JSON.stringify(fullUrl)})...`,
      );

      return fullUrl;
    }),
    switchMap(fullUrl => {
      let maybeRequest = npmPackageJsonCache.get(fullUrl.toString());

      if (maybeRequest) {
        return maybeRequest;
      }

      const subject = new ReplaySubject<NpmRepositoryPackageJson>(1);
      const auth = npm.config.getCredentialsByURI(fullUrl.toString());
      const client = new RegistryClient({
        proxy: {
          http: getNpmConfigOption('proxy'),
          https: getNpmConfigOption('https-proxy'),
        },
        ssl: getNpmClientSslOptions(getNpmConfigOption('strict-ssl'), getNpmConfigOption('cafile')),
      });

      client.log.level = 'silent';

      client.get(
        fullUrl.toString(),
        { auth, timeout: 30000 },
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
}
