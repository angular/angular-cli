/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { join, normalize } from '@angular-devkit/core';
import { Rule, Tree } from '@angular-devkit/schematics';
import { JSONFile } from '../../utility/json-file';
import { getWorkspace } from '../../utility/workspace';
import { Builders } from '../../utility/workspace-models';

const browserslistContent = `# This file is used by the build system to adjust CSS and JS output to support the specified browsers below.
# For additional information regarding the format and rule options, please see:
# https://github.com/browserslist/browserslist#queries

# You can see what browsers were selected by your queries by running:
#   npx browserslist

> 0.5%
last 2 versions
Firefox ESR
not dead
not IE 9-11 # For IE 9-11 support, remove 'not'.`;

export function updateES5Projects(): Rule {
  return async (tree) => {
    // update workspace tsconfig
    updateTsConfig(tree, '/tsconfig.json');

    let workspace;
    try {
      workspace = await getWorkspace(tree);
    } catch {
      return;
    }

    for (const [projectName, project] of workspace.projects) {
      if (typeof project.root !== 'string') {
        continue;
      }

      if (projectName.endsWith('-e2e')) {
        // Skip existing separate E2E projects
        continue;
      }

      const buildTarget = project.targets.get('build');
      if (!buildTarget || buildTarget.builder !== Builders.Browser) {
        continue;
      }

      const buildTsConfig = buildTarget?.options?.tsConfig;
      if (buildTsConfig && typeof buildTsConfig === 'string') {
        updateTsConfig(tree, buildTsConfig);
      }

      const testTarget = project.targets.get('test');
      if (!testTarget) {
        continue;
      }

      const testTsConfig = testTarget?.options?.tsConfig;
      if (testTsConfig && typeof testTsConfig === 'string') {
        updateTsConfig(tree, testTsConfig);
      }

      const browserslistPath = join(normalize(project.root), 'browserslist');

      // Move the CLI 7 style browserlist to root if it's there.
      const sourceRoot = typeof project.sourceRoot === 'string'
        ? project.sourceRoot
        : join(normalize(project.root), 'src');
      const srcBrowsersList = join(normalize(sourceRoot), 'browserslist');

      if (tree.exists(srcBrowsersList)) {
        tree.rename(srcBrowsersList, browserslistPath);
      } else if (!tree.exists(browserslistPath)) {
        tree.create(browserslistPath, browserslistContent);
      }
    }
  };
}

function updateTsConfig(tree: Tree, tsConfigPath: string): void {
  let tsConfigJson;
  try {
    tsConfigJson = new JSONFile(tree, tsConfigPath);
  } catch {
    return;
  }

  const compilerOptions = tsConfigJson.get(['compilerOptions']);
  if (!compilerOptions || typeof compilerOptions !== 'object') {
    return;
  }

  const configExtends = tsConfigJson.get(['extends']);
  const isExtended = configExtends && typeof configExtends === 'string';

  if (isExtended) {
    tsConfigJson.remove(['compilerOptions', 'target']);
    tsConfigJson.remove(['compilerOptions', 'module']);
    tsConfigJson.remove(['compilerOptions', 'downlevelIteration']);
  } else {
    tsConfigJson.modify(['compilerOptions', 'target'], 'es2015');
    tsConfigJson.modify(['compilerOptions', 'module'], 'esnext');
    tsConfigJson.modify(['compilerOptions', 'downlevelIteration'], true);
  }
}
