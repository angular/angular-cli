/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { NormalizedRoot, Path, dirname, join, normalize, relative } from '@angular-devkit/core';
import { DirEntry, Tree } from '@angular-devkit/schematics';

export interface ModuleOptions {
  module?: string;
  name: string;
  flat?: boolean;
  path?: string;
  skipImport?: boolean;
  moduleExt?: string;
  routingModuleExt?: string;
  standalone?: boolean;
}

export const MODULE_EXT = '-module.ts';
export const ROUTING_MODULE_EXT = '-routing-module.ts';
export const MODULE_EXT_LEGACY = '.module.ts';
export const ROUTING_MODULE_EXT_LEGACY = '-routing.module.ts';

/**
 * Find the module referred by a set of options passed to the schematics.
 */
export function findModuleFromOptions(host: Tree, options: ModuleOptions): Path | undefined {
  if (options.standalone || options.skipImport) {
    return undefined;
  }

  if (!options.module) {
    const pathToCheck = (options.path || '') + '/' + options.name;

    return normalize(findModule(host, pathToCheck, options.moduleExt, options.routingModuleExt));
  } else {
    const modulePath = normalize(`/${options.path}/${options.module}`);
    const componentPath = normalize(`/${options.path}/${options.name}`);
    const moduleBaseName = normalize(modulePath).split('/').pop();

    const candidateSet = new Set<Path>([normalize(options.path || '/')]);

    for (let dir = modulePath; dir != NormalizedRoot; dir = dirname(dir)) {
      candidateSet.add(dir);
    }
    for (let dir = componentPath; dir != NormalizedRoot; dir = dirname(dir)) {
      candidateSet.add(dir);
    }

    const candidatesDirs = [...candidateSet].sort((a, b) => b.length - a.length);
    const candidateFiles: string[] = ['', `${moduleBaseName}.ts`];
    if (options.moduleExt) {
      candidateFiles.push(`${moduleBaseName}${options.moduleExt}`);
    } else {
      candidateFiles.push(
        `${moduleBaseName}${MODULE_EXT}`,
        `${moduleBaseName}${MODULE_EXT_LEGACY}`,
      );
    }

    for (const c of candidatesDirs) {
      for (const sc of candidateFiles) {
        const scPath = join(c, sc);
        if (host.exists(scPath) && host.readText(scPath).includes('@NgModule')) {
          return normalize(scPath);
        }
      }
    }

    throw new Error(
      `Specified module '${options.module}' does not exist.\n` +
        `Looked in the following directories:\n    ${candidatesDirs.join('\n    ')}`,
    );
  }
}

/**
 * Function to find the "closest" module to a generated file's path.
 */
export function findModule(
  host: Tree,
  generateDir: string,
  moduleExt?: string,
  routingModuleExt?: string,
): Path {
  let dir: DirEntry | null = host.getDir('/' + generateDir);
  let foundRoutingModule = false;

  const moduleExtensions: string[] = moduleExt ? [moduleExt] : [MODULE_EXT, MODULE_EXT_LEGACY];
  const routingModuleExtensions: string[] = routingModuleExt
    ? [routingModuleExt]
    : [ROUTING_MODULE_EXT, ROUTING_MODULE_EXT_LEGACY];

  while (dir) {
    const allMatches = dir.subfiles.filter((p) => moduleExtensions.some((m) => p.endsWith(m)));
    const filteredMatches = allMatches.filter(
      (p) => !routingModuleExtensions.some((m) => p.endsWith(m)),
    );

    foundRoutingModule = foundRoutingModule || allMatches.length !== filteredMatches.length;

    if (filteredMatches.length == 1) {
      return join(dir.path, filteredMatches[0]);
    } else if (filteredMatches.length > 1) {
      throw new Error(
        `More than one module matches. Use the '--skip-import' option to skip importing ` +
          'the component into the closest module or use the module option to specify a module.',
      );
    }

    dir = dir.parent;
  }

  const errorMsg = foundRoutingModule
    ? 'Could not find a non Routing NgModule.' +
      `\nModules with suffix '${routingModuleExt}' are strictly reserved for routing.` +
      `\nUse the '--skip-import' option to skip importing in NgModule.`
    : `Could not find an NgModule. Use the '--skip-import' option to skip importing in NgModule.`;

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

  const relativePath = relative(
    normalize(fromParts.join('/') || '/'),
    normalize(toParts.join('/') || '/'),
  );
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
