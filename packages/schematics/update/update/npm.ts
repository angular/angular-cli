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
import {
  catchError,
  concatMap,
  defaultIfEmpty,
  filter,
  first,
  map,
  shareReplay,
  toArray,
} from 'rxjs/operators';
import * as url from 'url';
import { NpmRepositoryPackageJson } from './npm-package-json';

const RegistryClient = require('npm-registry-client');

const npmPackageJsonCache = new Map<string, Observable<NpmRepositoryPackageJson>>();
const npmConfigOptionCache = new Map<string, Observable<string | undefined>>();


function _readNpmRc(): Observable<{ [key: string]: string }> {
  return new Observable<{ [key: string]: string }>(subject => {
    // TODO: have a way to read options without using fs directly.
    const path = require('path');
    const fs = require('fs');

    let npmrc = '';
    if (process.platform === 'win32') {
      if (process.env.LOCALAPPDATA) {
        npmrc = fs.readFileSync(path.join(process.env.LOCALAPPDATA, '.npmrc')).toString('utf-8');
      }
    } else {
      if (process.env.HOME) {
        npmrc = fs.readFileSync(path.join(process.env.HOME, '.npmrc')).toString('utf-8');
      }
    }

    const allOptionsArr = npmrc.split(/\r?\n/).map(x => x.trim());
    const allOptions: { [key: string]: string } = {};

    allOptionsArr.forEach(x => {
      const [key, ...value] = x.split('=');
      allOptions[key] = value.join('=');
    });

    subject.next(allOptions);
    subject.complete();
  }).pipe(
    catchError(() => of({})),
    shareReplay(),
  );
}


function getOptionFromNpmRc(option: string): Observable<string | undefined> {
  return _readNpmRc().pipe(
    map(options => options[option]),
  );
}

function getOptionFromNpmCli(option: string): Observable<string | undefined> {
  return new Observable<string | undefined>(subject => {
    exec(`npm get ${option}`, (error, data) => {
      if (error) {
        throw error;
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
  }).pipe(
    catchError(() => of(undefined)),
    shareReplay(),
  );
}

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

  value = option.startsWith('_')
      ? getOptionFromNpmRc(fullOption)
      : getOptionFromNpmCli(fullOption);

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
        getNpmConfigOption('_auth'),
        getNpmConfigOption('_authToken', registryKey),
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
            authToken,
            username,
            password,
            alwaysAuth,
          ] = options;

          const subject = new ReplaySubject<NpmRepositoryPackageJson>(1);

          const sslOptions = getNpmClientSslOptions(strictSsl, cafile);

          const auth: {
            token?: string,
            alwaysAuth?: boolean;
            username?: string;
            password?: string
          } = {};

          if (alwaysAuth !== undefined) {
            auth.alwaysAuth = alwaysAuth === 'false' ? false : !!alwaysAuth;
          }

          if (authToken) {
            auth.token = authToken;
          } else if (token) {
            auth.token = token;
          } else if (username) {
            auth.username = username;
            auth.password = password;
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
