/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as path from 'path';
import { strings } from '@angular-devkit/core';
import {
  VirtualTree,
  Rule,
  Tree,
  SchematicContext,
  SchematicsException,
  apply,
  branchAndMerge,
  chain,
  mergeWith,
  move,
  noop,
  template,
  url,
} from '@angular-devkit/schematics';
import { Schema as GenerateLibraryOptions } from './schema';

function updateJsonFile(host: Tree, path: string, callback: (a: any) => any): Tree {
  const sourceText = host.read(path)!.toString('utf-8');
  const json = JSON.parse(sourceText);
  callback(json);
  host.overwrite(path, JSON.stringify(json, null, 2));
  return host;
}

function updateTsConfig(npmPackageName: string, entryFilePath: string) {

  return (host: Tree) => {
    if (!host.exists('tsconfig.json')) return host;

    return updateJsonFile(host, 'tsconfig.json', (tsconfig) => {
      tsconfig.compilerOptions.baseUrl = '.';
      if (!tsconfig.compilerOptions.paths) {
        tsconfig.compilerOptions.paths = {};
      }
      if (!tsconfig.compilerOptions.paths[npmPackageName]) {
        tsconfig.compilerOptions.paths[npmPackageName] = [];
      }
      tsconfig.compilerOptions.paths[npmPackageName].push(entryFilePath);
    });
  };
}

function addDependenciesAndScriptsToPackageJson(name: string, sourceDir: string) {

  return (host: Tree) => {
    if (!host.exists('package.json')) return host;

    return updateJsonFile(host, 'package.json', (json) => {
      if (!json['devDependencies']) {
        json['devDependencies'] = {};
      }

      json.devDependencies = {
        '@angular/compiler': '^5.0.0',
        '@angular/compiler-cli': '^5.0.0',
        'ng-packagr': '^2.1.0',
        'tsickle': '>=0.25.5',
        'tslib': '^1.7.1',
        'typescript': '>=2.4.2',
        // de-structure last keeps existing user dependencies
        ...json.devDependencies
      };

      // Add package.json script
      if (!json.scripts) {
        json.scripts = {};
      }
      json.scripts[`libs:${name}:build`] = `ng-packagr -p ${sourceDir}/package.json`;
    });
  };
}

export default function (options: GenerateLibraryOptions): Rule {
  if (!options.name) {
    throw new SchematicsException(`name option is required.`);
  }
  options.entryFile = options.entryFile ? options.entryFile : 'public_api';
  if (options.entryFile.endsWith('.ts')) {
    options.entryFile = options.entryFile.substring(0, options.entryFile.length - 3);
  }
  const sourceDir = path.join(options.baseDir, options.name);
  const entryFilePath = path.join(sourceDir, options.entryFile!) + '.ts';

  return (host: Tree, context: SchematicContext) => {
    const templateSource = apply(url('./files'), [
      template({
        ...strings,
        ...options,
      }),
      move(sourceDir)
    ]);

    return chain([
      branchAndMerge(chain([
        mergeWith(templateSource),
      ])),
      options.skipPackageJson ? noop() : addDependenciesAndScriptsToPackageJson(options.name!, sourceDir),
      options.skipTsConfig ? noop() : updateTsConfig(options.name!, entryFilePath)
    ])(host, context);
  };
}
