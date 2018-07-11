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
    // get potentials and remove duplicates; JS Set maintains insertion order
    const potentials = Array.from(new Set(compilerOptions.paths[pattern]));
    if (potentials.length === 0) {
      // no potential replacements so skip
      continue;
    }

    // can only contain zero or one
    const starIndex = pattern.indexOf('*');
    if (starIndex === -1) {
      if (pattern === originalRequest) {
        pathMapOptions.push({
          starIndex,
          partial: '',
          potentials,
        });
      }
    } else if (starIndex === 0 && pattern.length === 1) {
      pathMapOptions.push({
        starIndex,
        partial: originalRequest,
        potentials,
      });
    } else if (starIndex === pattern.length - 1) {
      if (originalRequest.startsWith(pattern.slice(0, -1))) {
        pathMapOptions.push({
          starIndex,
          partial: originalRequest.slice(pattern.length - 1),
          potentials,
        });
      }
    } else {
      const [prefix, suffix] = pattern.split('*');
      if (originalRequest.startsWith(prefix) && originalRequest.endsWith(suffix)) {
        pathMapOptions.push({
          starIndex,
          partial: originalRequest.slice(prefix.length).slice(0, -suffix.length),
          potentials,
        });
      }
    }
  }

  if (pathMapOptions.length === 0) {
    callback(null, request);

    return;
  }

  // exact matches take priority then largest prefix match
  pathMapOptions.sort((a, b) => {
    if (a.starIndex === -1) {
      return -1;
    } else if (b.starIndex === -1) {
      return 1;
    } else {
      return b.starIndex - a.starIndex;
    }
  });

  if (pathMapOptions[0].potentials.length === 1) {
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

  // TODO: The following is used when there is more than one potential and will not be
  //       needed once this is turned into a full webpack resolver plugin

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
    const pathNoExtension = moduleFilePath.slice(0, -5);
    const pathDirName = path.dirname(moduleFilePath);
    const packageRootPath = path.join(pathDirName, 'package.json');
    const jsFilePath = `${pathNoExtension}.js`;

    if (host.fileExists(pathNoExtension)) {
      // This is mainly for secondary entry points
      // ex: 'node_modules/@angular/core/testing.d.ts' -> 'node_modules/@angular/core/testing'
      request.request = pathNoExtension;
    } else {
      const packageJsonContent = host.readFile(packageRootPath);
      let newRequest: string | undefined;

      if (packageJsonContent) {
        try {
          const packageJson = JSON.parse(packageJsonContent);

          // Let webpack resolve the correct module format IIF there is a module resolution field
          // in the package.json. These are all official fields that Angular uses.
          if (typeof packageJson.main == 'string'
              || typeof packageJson.browser == 'string'
              || typeof packageJson.module == 'string'
              || typeof packageJson.es2015 == 'string'
              || typeof packageJson.fesm5 == 'string'
              || typeof packageJson.fesm2015 == 'string') {
            newRequest = pathDirName;
          }
        } catch {
          // Ignore exceptions and let it fall through (ie. if package.json file is invalid).
        }
      }

      if (newRequest === undefined && host.fileExists(jsFilePath)) {
        // Otherwise, if there is a file with a .js extension use that
        newRequest = jsFilePath;
      }

      if (newRequest !== undefined) {
        request.request = newRequest;
      }
    }

    callback(null, request);

    return;
  }

  request.request = moduleFilePath;
  callback(null, request);
}
