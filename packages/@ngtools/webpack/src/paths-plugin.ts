// @ignoreDep typescript
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
  if (!request || !request.request) {
    callback(null, request);
    return;
  }

  // Only work on Javascript/TypeScript issuers.
  if (!request.contextInfo.issuer || !request.contextInfo.issuer.match(/\.[jt]s$/)) {
    callback(null, request);
    return;
  }

  // check if any path mapping rules are relevant
  const isPathMapped = compilerOptions.paths && Object.keys(compilerOptions.paths)
    .some(pattern => {
      // can only contain zero or one
      const starIndex = pattern.indexOf('*');
      if (starIndex === -1) {
        return pattern === request.request;
      } else if (starIndex === pattern.length - 1) {
        return request.request.startsWith(pattern.slice(0, -1));
      } else {
        const [prefix, suffix] = pattern.split('*');
        return request.request.startsWith(prefix) && request.request.endsWith(suffix);
      }
    });

  if (!isPathMapped) {
    callback(null, request);
    return;
  }

  const moduleResolver = ts.resolveModuleName(
    request.request,
    request.contextInfo.issuer,
    compilerOptions,
    host,
    cache
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
