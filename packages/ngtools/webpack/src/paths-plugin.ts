/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as path from 'path';
import * as ts from 'typescript';
import {
  Callback,
  NormalModuleFactoryRequest,
} from './webpack';


export function resolveWithPaths(
  request: NormalModuleFactoryRequest,
  callback: Callback<NormalModuleFactoryRequest>,
  compilerOptions: ts.CompilerOptions,
  host: ts.CompilerHost,
  cache?: ts.ModuleResolutionCache,
) {
  if (!request || !request.request || !compilerOptions.paths) {
    callback(null, request);

    return;
  }

  // Only work on Javascript/TypeScript issuers.
  if (!request.contextInfo.issuer || !request.contextInfo.issuer.match(/\.[jt]s$/)) {
    callback(null, request);

    return;
  }

  const originalRequest = request.request.trim();

  // Relative requests are not mapped
  if (originalRequest.startsWith('.') || originalRequest.startsWith('/')) {
    callback(null, request);

    return;
  }

  // Amd requests are not mapped
  if (originalRequest.startsWith('!!webpack amd')) {
    callback(null, request);

    return;
  }

  // check if any path mapping rules are relevant
  const pathMapOptions = [];
  for (const pattern in compilerOptions.paths) {
      // can only contain zero or one
      const starIndex = pattern.indexOf('*');
      if (starIndex === -1) {
        if (pattern === originalRequest) {
          pathMapOptions.push({
            partial: '',
            potentials: compilerOptions.paths[pattern],
          });
        }
      } else if (starIndex === 0 && pattern.length === 1) {
        pathMapOptions.push({
          partial: originalRequest,
          potentials: compilerOptions.paths[pattern],
        });
      } else if (starIndex === pattern.length - 1) {
        if (originalRequest.startsWith(pattern.slice(0, -1))) {
          pathMapOptions.push({
            partial: originalRequest.slice(pattern.length - 1),
            potentials: compilerOptions.paths[pattern],
          });
        }
      } else {
        const [prefix, suffix] = pattern.split('*');
        if (originalRequest.startsWith(prefix) && originalRequest.endsWith(suffix)) {
          pathMapOptions.push({
            partial: originalRequest.slice(prefix.length).slice(0, -suffix.length),
            potentials: compilerOptions.paths[pattern],
          });
        }
      }
  }

  if (pathMapOptions.length === 0) {
    callback(null, request);

    return;
  }

  if (pathMapOptions.length === 1 && pathMapOptions[0].potentials.length === 1) {
    const onlyPotential = pathMapOptions[0].potentials[0];
    let replacement;
    const starIndex = onlyPotential.indexOf('*');
    if (starIndex === -1) {
      replacement = onlyPotential;
    } else if (starIndex === onlyPotential.length - 1) {
      replacement = onlyPotential.slice(0, -1) + pathMapOptions[0].partial;
    } else {
      const [prefix, suffix] = onlyPotential.split('*');
      replacement = prefix + pathMapOptions[0].partial + suffix;
    }

    request.request = path.resolve(compilerOptions.baseUrl || '', replacement);
    callback(null, request);

    return;
  }

  const moduleResolver = ts.resolveModuleName(
    originalRequest,
    request.contextInfo.issuer,
    compilerOptions,
    host,
    cache,
  );

  const moduleFilePath = moduleResolver.resolvedModule
                         && moduleResolver.resolvedModule.resolvedFileName;

  // If there is no result, let webpack try to resolve
  if (!moduleFilePath) {
    callback(null, request);

    return;
  }

  // If TypeScript gives us a `.d.ts`, it is probably a node module
  if (moduleFilePath.endsWith('.d.ts')) {
    // If in a package, let webpack resolve the package
    const packageRootPath = path.join(path.dirname(moduleFilePath), 'package.json');
    if (!host.fileExists(packageRootPath)) {
      // Otherwise, if there is a file with a .js extension use that
      const jsFilePath = moduleFilePath.slice(0, -5) + '.js';
      if (host.fileExists(jsFilePath)) {
        request.request = jsFilePath;
      }
    }

    callback(null, request);

    return;
  }

  request.request = moduleFilePath;
  callback(null, request);
}
