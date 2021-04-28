/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { join, normalize } from '@angular-devkit/core';
import { Rule, Tree, chain } from '@angular-devkit/schematics';
import { JSONFile } from '../../utility/json-file';
import { updateWorkspace } from '../../utility/workspace';
import { Builders } from '../../utility/workspace-models';

/**
 * Updates a pre version 9 library to version 9 Ivy library.
 *
 * The main things that this migrations does are:
 * - Creates a production configuration for VE compilations.
 * - Create a prod tsconfig for which disables Ivy and enables VE compilations.
 */
export function updateLibraries(): Rule {
  return updateWorkspace((workspace) => {
    const followupRules: Rule[] = [];

    for (const [, project] of workspace.projects) {
      if (typeof project.root !== 'string') {
        continue;
      }

      for (const [, target] of project.targets) {
        if (target.builder !== Builders.DeprecatedNgPackagr) {
          continue;
        }

        const tsConfig = join(normalize(project.root), 'tsconfig.lib.prod.json');

        if (!target.configurations || !target.configurations.production) {
          // Production configuration does not exist
          target.configurations = { ...target.configurations, production: { tsConfig } };

          followupRules.push((tree) => createTsConfig(tree, tsConfig));
          continue;
        }

        const existingTsconfig = target.configurations.production.tsConfig;
        if (!existingTsconfig || typeof existingTsconfig !== 'string') {
          // Production configuration TS configuration does not exist or malformed
          target.configurations.production.tsConfig = tsConfig;

          followupRules.push((tree) => createTsConfig(tree, tsConfig));
          continue;
        }

        followupRules.push(updateTsConfig(existingTsconfig));
      }
    }

    return chain(followupRules);
  });
}

function createTsConfig(tree: Tree, tsConfigPath: string) {
  const tsConfigContent = {
    extends: './tsconfig.lib.json',
    angularCompilerOptions: {
      enableIvy: false,
    },
  };

  if (!tree.exists(tsConfigPath)) {
    tree.create(tsConfigPath, JSON.stringify(tsConfigContent, undefined, 2));
  }
}

function updateTsConfig(tsConfigPath: string): Rule {
  return (tree, { logger }) => {
    let json;
    try {
      json = new JSONFile(tree, tsConfigPath);
    } catch {
      logger.warn(`Cannot find file: ${tsConfigPath}`);

      return;
    }

    const enableIvyPath = ['angularCompilerOptions', 'enableIvy'];

    if (json.get(enableIvyPath) === false) {
      return;
    }

    json.modify(enableIvyPath, false);
  };
}
