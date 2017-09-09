/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicPath, Tree, normalizePath, relativePath } from '@angular-devkit/schematics';
import { dasherize } from '../strings';


export interface ModuleOptions {
  module?: string;
  name: string;
  flat?: boolean;
  sourceDir?: string;
  path?: string;
  skipImport?: boolean;
}


/**
 * Find the module refered by a set of options passed to the schematics.
 */
export function findModuleFromOptions(host: Tree,
                                      options: ModuleOptions): SchematicPath | undefined {
  if (options.hasOwnProperty('skipImport') && options.skipImport) {
    return undefined;
  }

  if (!options.module) {
    const pathToCheck = (options.sourceDir || '') + '/' + (options.path || '')
                      + (options.flat ? '' : '/' + dasherize(options.name));

    return normalizePath(findModule(host, pathToCheck));
  } else {
    const modulePath = normalizePath(
      options.sourceDir + '/' + options.path + '/' + options.module);
    const moduleBaseName = normalizePath(modulePath).split('/').pop();

    if (host.exists(modulePath)) {
      return normalizePath(modulePath);
    } else if (host.exists(modulePath + '.ts')) {
      return normalizePath(modulePath + '.ts');
    } else if (host.exists(modulePath + '.module.ts')) {
      return normalizePath(modulePath + '.module.ts');
    } else if (host.exists(modulePath + '/' + moduleBaseName + '.module.ts')) {
      return normalizePath(modulePath + '/' + moduleBaseName + '.module.ts');
    } else {
      throw new Error('Specified module does not exist');
    }
  }
}

/**
 * Function to find the "closest" module to a generated file's path.
 */
export function findModule(host: Tree, generateDir: string): SchematicPath {
  let closestModule: string = normalizePath(generateDir.replace(/[\\/]$/, ''));
  const allFiles = host.files;

  let modulePath: string | null = null;
  const moduleRe = /\.module\.ts$/;
  const routingModuleRe = /-routing\.module\.ts/;

  while (closestModule) {
    const normalizedRoot = normalizePath(closestModule);
    const matches = allFiles
      .filter(p => moduleRe.test(p) &&
        !routingModuleRe.test(p) &&
        !/\//g.test(p.replace(normalizedRoot + '/', '')));

    if (matches.length == 1) {
      modulePath = matches[0];
      break;
    } else if (matches.length > 1) {
      throw new Error('More than one module matches. Use skip-import option to skip importing '
        + 'the component into the closest module.');
    }
    closestModule = closestModule.split('/').slice(0, -1).join('/');
  }

  if (!modulePath) {
    throw new Error('Could not find an NgModule for the new component. Use the skip-import '
      + 'option to skip importing components in NgModule.');
  }

  return normalizePath(modulePath);
}

/**
 * Build a relative path from one file path to another file path.
 */
export function buildRelativePath(from: string, to: string): string {
  from = normalizePath(from);
  to = normalizePath(to);

  // Convert to arrays.
  const fromParts = from.split('/');
  const toParts = to.split('/');

  // Remove file names (preserving destination)
  fromParts.pop();
  const toFileName = toParts.pop();

  const relative = relativePath(normalizePath(fromParts.join('/')),
                                normalizePath(toParts.join('/')));
  let pathPrefix = '';

  // Set the path prefix for same dir or child dir, parent dir starts with `..`
  if (!relative) {
    pathPrefix = '.';
  } else if (!relative.startsWith('.')) {
    pathPrefix = `./`;
  }
  if (pathPrefix && !pathPrefix.endsWith('/')) {
    pathPrefix += '/';
  }

  return pathPrefix + (relative ? relative + '/' : '') + toFileName;
}
