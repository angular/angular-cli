/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { dirname, join, normalize } from '@angular-devkit/core';
import { Rule, Tree } from '@angular-devkit/schematics';
import { findPropertyInAstObject, removePropertyInAstObject } from '../../utility/json-utils';
import { getWorkspace } from '../../utility/workspace';
import { Builders } from '../../utility/workspace-models';
import { readJsonFileAsAstObject } from '../update-9/utils';


interface ModuleAndTargetReplamenent {
  oldModule?: string;
  newModule?: string | false;
  oldTarget?: string;
  newTarget?: string;
}

export default function (): Rule {
  return async host => {
    // Workspace level tsconfig
    updateModuleAndTarget(host, 'tsconfig.json', {
      oldModule: 'esnext',
      newModule: 'es2020',
    });

    const workspace = await getWorkspace(host);
    // Find all tsconfig which are refereces used by builders
    for (const [, project] of workspace.projects) {
      for (const [, target] of project.targets) {
        // E2E builder doesn't reference a tsconfig but it uses one found in the root folder.
        if (target.builder === Builders.Protractor && typeof target.options?.protractorConfig === 'string') {
          const tsConfigPath = join(dirname(normalize(target.options.protractorConfig)), 'tsconfig.json');

          updateModuleAndTarget(host, tsConfigPath, {
            oldTarget: 'es5',
            newTarget: 'es2018',
          });

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
              updateModuleAndTarget(host, p, {
                oldModule: 'commonjs',
                // False will remove the module
                // NB: For server we no longer use commonjs because it is bundled using webpack which has it's own module system.
                // This ensures that lazy-loaded works on the server.
                newModule: false,
              });
            });
            break;
          case Builders.Karma:
          case Builders.Browser:
          case Builders.NgPackagr:
            uniqueTsConfigs.forEach(p => {
              updateModuleAndTarget(host, p, {
                oldModule: 'esnext',
                newModule: 'es2020',
              });
            });
            break;
        }
      }
    }
  };
}

function updateModuleAndTarget(host: Tree, tsConfigPath: string, replacements: ModuleAndTargetReplamenent) {
  const jsonAst = readJsonFileAsAstObject(host, tsConfigPath);
  if (!jsonAst) {
    return;
  }

  const compilerOptionsAst = findPropertyInAstObject(jsonAst, 'compilerOptions');
  if (compilerOptionsAst?.kind !== 'object') {
    return;
  }

  const { oldTarget, newTarget, newModule, oldModule } = replacements;

  const recorder = host.beginUpdate(tsConfigPath);
  if (newTarget) {
    const targetAst = findPropertyInAstObject(compilerOptionsAst, 'target');
    if (targetAst?.kind === 'string' && oldTarget === targetAst.value.toLowerCase()) {
      const offset = targetAst.start.offset + 1;
      recorder.remove(offset, targetAst.value.length);
      recorder.insertLeft(offset, newTarget);
    }
  }

  if (newModule === false) {
    removePropertyInAstObject(recorder, compilerOptionsAst, 'module');
  } else if (newModule) {
    const moduleAst = findPropertyInAstObject(compilerOptionsAst, 'module');
    if (moduleAst?.kind === 'string' && oldModule === moduleAst.value.toLowerCase()) {
      const offset = moduleAst.start.offset + 1;
      recorder.remove(offset, moduleAst.value.length);
      recorder.insertLeft(offset, newModule);
    }
  }

  host.commitUpdate(recorder);
}
