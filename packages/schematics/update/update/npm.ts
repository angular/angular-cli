/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging } from '@angular-devkit/core';
import { exec } from 'child_process';
import { readFileSync } from 'fs';
import { Observable, ReplaySubject, concat, of } from 'rxjs';
import { concatMap, defaultIfEmpty, filter, first, map, toArray } from 'rxjs/operators';
import * as url from 'url';
import { NpmRepositoryPackageJson } from './npm-package-json';

const RegistryClient = require('npm-registry-client');

const npmPackageJsonCache = new Map<string, Observable<NpmRepositoryPackageJson>>();
const npmConfigOptionCache = new Map<string, Observable<string | undefined>>();

function getNpmConfigOption(
  option: string,
  scope?: string,
  tryWithoutScope?: boolean,
): Observable<string | undefined> {
  if (scope && tryWithoutScope) {
    return concat(
      getNpmConfigOption(option, scope),
      getNpmConfigOption(option),
    ).pipe(
      filter(result => !!result),
      defaultIfEmpty(),
      first(),
    );
  }

  const fullOption = `${scope ? scope + ':' : ''}${option}`;

  let value = npmConfigOptionCache.get(fullOption);
  if (value) {
    return value;
  }

  const subject = new ReplaySubject<string | undefined>(1);

  try {
    exec(`npm get ${fullOption}`, (error, data) => {
      if (error) {
        subject.next();
      } else {
        data = data.trim();
        if (!data || data === 'undefined' || data === 'null') {
          subject.next();
        } else {
          subject.next(data);
        }
      }

      subject.complete();
    });
  } catch {
    subject.next();
    subject.complete();
  }

  value = subject.asObservable();
  npmConfigOptionCache.set(fullOption, value);

  return value;
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
    registryUrl ? of(registryUrl) : getNpmConfigOption('registry', scope, true)
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

      return concat(
        getNpmConfigOption('proxy'),
        getNpmConfigOption('https-proxy'),
        getNpmConfigOption('strict-ssl'),
        getNpmConfigOption('cafile'),
        getNpmConfigOption('_auth', registryKey, true),
        getNpmConfigOption('username', registryKey, true),
        getNpmConfigOption('password', registryKey, true),
        getNpmConfigOption('alwaysAuth', registryKey, true),
      ).pipe(
        toArray(),
        concatMap(options => {
          const [
            http,
            https,
            strictSsl,
            cafile,
            token,
            username,
            password,
            alwaysAuth,
          ] = options;

          const subject = new ReplaySubject<NpmRepositoryPackageJson>(1);

          const sslOptions = getNpmClientSslOptions(strictSsl, cafile);

          let auth;
          if (token) {
            auth = { token, alwaysAuth };
          } else if (username) {
            auth = { username, password, alwaysAuth };
          }

          const client = new RegistryClient({
            proxy: { http, https },
            ssl: sslOptions,
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
