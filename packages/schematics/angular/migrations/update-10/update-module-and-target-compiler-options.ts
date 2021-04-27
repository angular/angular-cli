/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { dirname, join, normalize } from '@angular-devkit/core';
import { Rule, Tree } from '@angular-devkit/schematics';
import { JSONFile } from '../../utility/json-file';
import { getWorkspace } from '../../utility/workspace';
import { Builders } from '../../utility/workspace-models';


interface ModuleAndTargetReplamenent {
  oldModule?: string;
  newModule?: string | false;
  oldTarget?: string;
  newTarget?: string;
}

export default function (): Rule {
  return async (host, { logger }) => {
    // Workspace level tsconfig
    try {
      updateModuleAndTarget(host, 'tsconfig.json', {
        oldModule: 'esnext',
        newModule: 'es2020',
      });
    } catch (error) {
      logger.warn(
        `Unable to update 'tsconfig.json' module option from 'esnext' to 'es2020': ${
          error.message || error
        }`,
      );
    }

    const workspace = await getWorkspace(host);
    // Find all tsconfig which are refereces used by builders
    for (const [, project] of workspace.projects) {
      for (const [, target] of project.targets) {
        // E2E builder doesn't reference a tsconfig but it uses one found in the root folder.
        if (target.builder === Builders.Protractor && typeof target.options?.protractorConfig === 'string') {
          const tsConfigPath = join(dirname(normalize(target.options.protractorConfig)), 'tsconfig.json');

          try {
            updateModuleAndTarget(host, tsConfigPath, {
              oldTarget: 'es5',
              newTarget: 'es2018',
            });
          } catch (error) {
            logger.warn(
              `Unable to update '${tsConfigPath}' target option from 'es5' to 'es2018': ${
                error.message || error
              }`,
            );
          }

          continue;
        }

        // Update all other known CLI builders that use a tsconfig
        const tsConfigs = [
          target.options || {},
          ...Object.values(target.configurations || {}),
        ]
          .filter(opt => typeof opt?.tsConfig === 'string')
          .map(opt => (opt as { tsConfig: string }).tsConfig);

        const uniqueTsConfigs = [...new Set(tsConfigs)];

        if (uniqueTsConfigs.length < 1) {
          continue;
        }

        switch (target.builder as Builders) {
          case Builders.Server:
            uniqueTsConfigs.forEach(p => {
              try {
                updateModuleAndTarget(host, p, {
                  oldModule: 'commonjs',
                  // False will remove the module
                  // NB: For server we no longer use commonjs because it is bundled using webpack which has it's own module system.
                  // This ensures that lazy-loaded works on the server.
                  newModule: false,
                });
              } catch (error) {
                logger.warn(
                  `Unable to remove '${p}' module option (was 'commonjs'): ${
                    error.message || error
                  }`,
                );
              }

              try {
                updateModuleAndTarget(host, p, {
                  newTarget: 'es2016',
                });
              } catch (error) {
                logger.warn(
                  `Unable to update '${p}' target option to 'es2016': ${
                    error.message || error
                  }`,
                );
              }
            });
            break;
          case Builders.Karma:
          case Builders.Browser:
          case Builders.DeprecatedNgPackagr:
            uniqueTsConfigs.forEach(p => {
              try {
                updateModuleAndTarget(host, p, {
                  oldModule: 'esnext',
                  newModule: 'es2020',
                });
              } catch (error) {
                logger.warn(
                  `Unable to update '${p}' module option from 'esnext' to 'es2020': ${
                    error.message || error
                  }`,
                );
              }
            });
            break;
        }
      }
    }
  };
}

function updateModuleAndTarget(host: Tree, tsConfigPath: string, replacements: ModuleAndTargetReplamenent) {
  const json = new JSONFile(host, tsConfigPath);

  const { oldTarget, newTarget, newModule, oldModule } = replacements;
  if (newTarget) {
    const target = json.get(['compilerOptions', 'target']);

    if ((typeof target === 'string' && (!oldTarget || oldTarget === target.toLowerCase())) || !target) {
      json.modify(['compilerOptions', 'target'], newTarget);
    }
  }

  if (newModule === false) {
    json.remove(['compilerOptions', 'module']);
  } else if (newModule) {
    const module = json.get(['compilerOptions', 'module']);
    if (typeof module === 'string' && oldModule === module.toLowerCase()) {
      json.modify(['compilerOptions', 'module'], newModule);
    }
  }
}
