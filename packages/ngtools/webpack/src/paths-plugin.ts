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
  dtsModuleResolutionCache?: Map<string, string>,
) {
  if (!request || !request.request) {
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

  const moduleResolver = ts.resolveModuleName(
    originalRequest,
    request.contextInfo.issuer.replace(/\\/g, '/'),
    compilerOptions,
    host,
    cache,
  );

  const moduleFilePath = moduleResolver.resolvedModule
                         && moduleResolver.resolvedModule.resolvedFileName;

  // If there is no result, let webpack try to resolve
  if (!moduleFilePath) {
    return;
  }

  // If TypeScript gives us a `.d.ts`, it is probably a node module
  if (moduleFilePath.endsWith('.d.ts')) {
    // if it was already resolved return it from cache, so we avoid extra IO operations.
    const cachedResolution = dtsModuleResolutionCache
      && dtsModuleResolutionCache.get(moduleFilePath);

    if (cachedResolution) {
      request.request = cachedResolution;
      callback(null, request);

      return;
    }

    // TypeScript resolutions are as follow:
    // /node_modules/moduleB.ts
    // /node_modules/moduleB.tsx
    // /node_modules/moduleB.d.ts
    // /node_modules/moduleB/package.json (if it specifies a "types" property)
    // /node_modules/moduleB/index.ts
    // /node_modules/moduleB/index.tsx
    // /node_modules/moduleB/index.d.ts
    const pathNoExtension = moduleFilePath.slice(0, -5);
    const pathDirName = path.dirname(moduleFilePath);
    const packageRootPath = path.join(pathDirName, 'package.json');
    const jsFilePath = `${pathNoExtension}.js`;
    let resolvedPath: string | undefined;

    if (host.fileExists(pathNoExtension)) {
        // this is mainly for secondary entry point
        // such as 'node_modules/@angular/core/testing.d.ts'
        resolvedPath = pathNoExtension;
    }

    if (!resolvedPath && host.fileExists(packageRootPath)) {
        const content = ts.sys.readFile(packageRootPath);
        if (content) {
          const { main, module, es2015, browser } = JSON.parse(content);
          // If a package doesn't have entryfields like '@angular/common/locales'
          // this cannot be resolved by webpack from the 'package.json'.
          if (main || module || es2015 || browser) {
            resolvedPath = pathDirName;
          }
        }
    }

    if (!resolvedPath && host.fileExists(jsFilePath)) {
      // Otherwise, if there is a file with a .js extension use that
      resolvedPath = jsFilePath;
    }

    if (resolvedPath) {
      request.request = resolvedPath;
    }

    if (dtsModuleResolutionCache) {
      // store the resolved request path in cache, so we avoid doing extra future IO operations
      dtsModuleResolutionCache.set(moduleFilePath, request.request);
    }

    callback(null, request);

    return;
  }

  request.request = moduleFilePath;
  callback(null, request);
}
