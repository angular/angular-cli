/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  JsonParseMode,
  isJsonObject,
  join,
  normalize,
  parseJson,
} from '@angular-devkit/core';
import { Rule, Tree } from '@angular-devkit/schematics';
import { JSONFile } from '../../utility/json-file';

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
  return (tree: Tree) => {
    // update workspace tsconfig
    updateTsConfig(tree, '/tsconfig.json');

    const angularConfigContent = tree.read('angular.json') || tree.read('.angular.json');

    if (!angularConfigContent) {
      return;
    }

    const angularJson = parseJson(angularConfigContent.toString(), JsonParseMode.Loose);

    if (!isJsonObject(angularJson) || !isJsonObject(angularJson.projects)) {
      // If that field isn't there, no use...
      return;
    }

    // For all projects
    for (const [name, project] of Object.entries(angularJson.projects)) {
      if (!isJsonObject(project)) {
        continue;
      }
      if (typeof project.root != 'string' || project.projectType !== 'application') {
        continue;
      }
      if (name.endsWith('-e2e')) {
        // Skip existing separate E2E projects
        continue;
      }

      // Older projects app and spec ts configs had script and module set in them.
      const architect = project.architect;
      if (!(isJsonObject(architect)
        && isJsonObject(architect.build)
        && architect.build.builder === '@angular-devkit/build-angular:browser')
      ) {
        // Skip projects who's build builder is not build-angular:browser
        continue;
      }

      const buildOptionsConfig = architect.build.options;
      if (isJsonObject(buildOptionsConfig) && typeof buildOptionsConfig.tsConfig === 'string') {
        updateTsConfig(tree, buildOptionsConfig.tsConfig);
      }

      const testConfig = architect.test;
      if (isJsonObject(testConfig)
        && isJsonObject(testConfig.options)
        && typeof testConfig.options.tsConfig === 'string') {
        updateTsConfig(tree, testConfig.options.tsConfig);
      }

      const browserslistPath = join(normalize(project.root), 'browserslist');

      // Move the CLI 7 style browserlist to root if it's there.
      const sourceRoot = project.sourceRoot === 'string'
        ? project.sourceRoot
        : join(normalize(project.root), 'src');
      const srcBrowsersList = join(normalize(sourceRoot), 'browserslist');

      if (tree.exists(srcBrowsersList)) {
        tree.rename(srcBrowsersList, browserslistPath);
      } else if (!tree.exists(browserslistPath)) {
        tree.create(browserslistPath, browserslistContent);
      }
    }

    return tree;
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
