/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join, tags } from '@angular-devkit/core';
import { DirEntry, Rule } from '@angular-devkit/schematics';
import { JSONFile } from '../../utility/json-file';
import { allTargetOptions, getWorkspace } from '../../utility/workspace';

function* visit(directory: DirEntry): IterableIterator<string> {
  for (const path of directory.subfiles) {
    if (path === 'package.json') {
      const entry = directory.file(path);
      if (entry?.content.toString().includes('ngPackage') !== true) {
        continue;
      }
    } else if (path !== 'ng-package.json') {
      continue;
    }

    yield join(directory.path, path);
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
    ['ngPackage', 'lib', 'umdModuleIds'],
    ['ngPackage', 'lib', 'amdId'],
    ['ngPackage', 'lib', 'umdId'],
  ];

  return async (tree, context) => {
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
            if (options.project.endsWith('.json')) {
              ngPackagrConfig.add(options.project);
            } else {
              context.logger
                .warn(tags.stripIndent`Expected a JSON configuration file but found "${options.project}".
                  You may need to adjust the configuration file to remove invalid options.
                  For more information, see the breaking changes section within the release notes: https://github.com/ng-packagr/ng-packagr/releases/tag/v13.0.0/.`);
            }
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
