/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  NormalizedRoot,
  Path,
  dirname,
  join,
  normalize,
  relative,
} from '@angular-devkit/core';
import { DirEntry, Tree } from '@angular-devkit/schematics';


export interface ModuleOptions {
  module?: string;
  name: string;
  flat?: boolean;
  path?: string;
  skipImport?: boolean;
  moduleExt?: string;
  routingModuleExt?: string;
}

export const MODULE_EXT = '.module.ts';
export const ROUTING_MODULE_EXT = '-routing.module.ts';

/**
 * Find the module referred by a set of options passed to the schematics.
 */
export function findModuleFromOptions(host: Tree, options: ModuleOptions): Path | undefined {
  if (options.hasOwnProperty('skipImport') && options.skipImport) {
    return undefined;
  }

  const moduleExt = options.moduleExt || MODULE_EXT;
  const routingModuleExt = options.routingModuleExt || ROUTING_MODULE_EXT;

  if (!options.module) {
    const pathToCheck = (options.path || '') + '/' + options.name;

    return normalize(findModule(host, pathToCheck, moduleExt, routingModuleExt));
  } else {
    const modulePath = normalize(`/${options.path}/${options.module}`);
    const componentPath = normalize(`/${options.path}/${options.name}`);
    const moduleBaseName = normalize(modulePath).split('/').pop();

    const candidateSet = new Set<Path>([
      normalize(options.path || '/'),
    ]);

    for (let dir = modulePath; dir != NormalizedRoot; dir = dirname(dir)) {
      candidateSet.add(dir);
    }
    for (let dir = componentPath; dir != NormalizedRoot; dir = dirname(dir)) {
      candidateSet.add(dir);
    }

    const candidatesDirs = [...candidateSet].sort((a, b) => b.length - a.length);
    for (const c of candidatesDirs) {
      const candidateFiles = [
        '',
        `${moduleBaseName}.ts`,
        `${moduleBaseName}${moduleExt}`,
      ].map(x => join(c, x));

      for (const sc of candidateFiles) {
        if (host.exists(sc)) {
          return normalize(sc);
        }
      }
    }

    throw new Error(
      `Specified module '${options.module}' does not exist.\n`
        + `Looked in the following directories:\n    ${candidatesDirs.join('\n    ')}`,
    );
  }
}

/**
 * Function to find the "closest" module to a generated file's path.
 */
export function findModule(host: Tree, generateDir: string,
                           moduleExt = MODULE_EXT, routingModuleExt = ROUTING_MODULE_EXT): Path {

  let dir: DirEntry | null = host.getDir('/' + generateDir);
  let foundRoutingModule = false;

  while (dir) {
    const allMatches = dir.subfiles.filter(p => p.endsWith(moduleExt));
    const filteredMatches = allMatches.filter(p => !p.endsWith(routingModuleExt));

    foundRoutingModule = foundRoutingModule || allMatches.length !== filteredMatches.length;

    if (filteredMatches.length == 1) {
      return join(dir.path, filteredMatches[0]);
    } else if (filteredMatches.length > 1) {
      throw new Error('More than one module matches. Use skip-import option to skip importing '
        + 'the component into the closest module.');
    }

    dir = dir.parent;
  }

  const errorMsg = foundRoutingModule ? 'Could not find a non Routing NgModule.'
    + `\nModules with suffix '${routingModuleExt}' are strictly reserved for routing.`
    + '\nUse the skip-import option to skip importing in NgModule.'
    : 'Could not find an NgModule. Use the skip-import option to skip importing in NgModule.';

  throw new Error(errorMsg);
}

/**
 * Build a relative path from one file path to another file path.
 */
export function buildRelativePath(from: string, to: string): string {
  from = normalize(from);
  to = normalize(to);

  // Convert to arrays.
  const fromParts = from.split('/');
  const toParts = to.split('/');

  // Remove file names (preserving destination)
  fromParts.pop();
  const toFileName = toParts.pop();

  const relativePath = relative(normalize(fromParts.join('/') || '/'),
   normalize(toParts.join('/') || '/'));
  let pathPrefix = '';

  // Set the path prefix for same dir or child dir, parent dir starts with `..`
  if (!relativePath) {
    pathPrefix = '.';
  } else if (!relativePath.startsWith('.')) {
    pathPrefix = `./`;
  }
  if (pathPrefix && !pathPrefix.endsWith('/')) {
    pathPrefix += '/';
  }

  return pathPrefix + (relativePath ? relativePath + '/' : '') + toFileName;
}
