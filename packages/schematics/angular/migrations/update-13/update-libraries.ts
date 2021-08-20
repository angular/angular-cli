/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join } from '@angular-devkit/core';
import { DirEntry, Rule } from '@angular-devkit/schematics';
import { JSONFile } from '../../utility/json-file';
import { allTargetOptions, getWorkspace } from '../../utility/workspace';

function* visit(directory: DirEntry): IterableIterator<string> {
  for (const path of directory.subfiles) {
    if (path === 'ng-package.json') {
      yield join(directory.path, path);
    }
  }

  for (const path of directory.subdirs) {
    if (path === 'node_modules' || path.startsWith('.')) {
      continue;
    }

    yield* visit(directory.dir(path));
  }
}

export default function (): Rule {
  const ENABLE_IVY_JSON_PATH = ['angularCompilerOptions', 'enableIvy'];
  const COMPILATION_MODE_JSON_PATH = ['angularCompilerOptions', 'compilationMode'];
  const NG_PACKAGR_DEPRECATED_OPTIONS_PATHS = [
    ['lib', 'umdModuleIds'],
    ['lib', 'amdId'],
    ['lib', 'umdId'],
  ];

  return async (tree) => {
    const workspace = await getWorkspace(tree);
    const librariesTsConfig = new Set<string>();
    const ngPackagrConfig = new Set<string>();

    for (const [, project] of workspace.projects) {
      for (const [_, target] of project.targets) {
        if (target.builder !== '@angular-devkit/build-angular:ng-packagr') {
          continue;
        }

        for (const [, options] of allTargetOptions(target)) {
          if (typeof options.tsConfig === 'string') {
            librariesTsConfig.add(options.tsConfig);
          }

          if (typeof options.project === 'string') {
            ngPackagrConfig.add(options.project);
          }
        }
      }
    }

    // Gather configurations which are not referecned in angular.json
    // (This happens when users have secondary entry-points)
    for (const p of visit(tree.root)) {
      ngPackagrConfig.add(p);
    }

    // Update ng-packagr configuration
    for (const config of ngPackagrConfig) {
      const json = new JSONFile(tree, config);
      for (const optionPath of NG_PACKAGR_DEPRECATED_OPTIONS_PATHS) {
        json.remove(optionPath);
      }
    }

    // Update tsconfig files
    for (const tsConfig of librariesTsConfig) {
      const json = new JSONFile(tree, tsConfig);
      if (json.get(ENABLE_IVY_JSON_PATH) === false) {
        json.remove(ENABLE_IVY_JSON_PATH);
        json.modify(COMPILATION_MODE_JSON_PATH, 'partial');
      }
    }
  };
}
