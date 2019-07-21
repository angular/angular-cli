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
  parseJsonAst,
} from '@angular-devkit/core';
import { Rule, Tree } from '@angular-devkit/schematics';
import {
  findPropertyInAstObject,
  insertPropertyInAstObjectInOrder,
  removePropertyInAstObject,
} from '../../utility/json-utils';

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
  const buffer = tree.read(tsConfigPath);
  if (!buffer) {
    return;
  }

  const tsCfgAst = parseJsonAst(buffer.toString(), JsonParseMode.Loose);

  if (tsCfgAst.kind !== 'object') {
    return;
  }

  const configExtends = findPropertyInAstObject(tsCfgAst, 'extends');
  const isExtendedConfig = configExtends && configExtends.kind === 'string';

  const compilerOptions = findPropertyInAstObject(tsCfgAst, 'compilerOptions');
  if (!compilerOptions || compilerOptions.kind !== 'object') {
    return;
  }

  const recorder = tree.beginUpdate(tsConfigPath);

  if (isExtendedConfig) {
    removePropertyInAstObject(recorder, compilerOptions, 'target');
    removePropertyInAstObject(recorder, compilerOptions, 'module');
    removePropertyInAstObject(recorder, compilerOptions, 'downlevelIteration');
  } else {
    const downlevelIteration = findPropertyInAstObject(compilerOptions, 'downlevelIteration');
    if (!downlevelIteration) {
      insertPropertyInAstObjectInOrder(recorder, compilerOptions, 'downlevelIteration', true, 4);
    } else if (!downlevelIteration.value) {
      const { start, end } = downlevelIteration;
      recorder.remove(start.offset, end.offset - start.offset);
      recorder.insertLeft(start.offset, 'true');
    }
    const scriptTarget = findPropertyInAstObject(compilerOptions, 'target');
    if (!scriptTarget) {
      insertPropertyInAstObjectInOrder(recorder, compilerOptions, 'target', 'es2015', 4);
    } else if (scriptTarget.value !== 'es2015') {
      const { start, end } = scriptTarget;
      recorder.remove(start.offset, end.offset - start.offset);
      recorder.insertLeft(start.offset, '"es2015"');
    }
    const scriptModule = findPropertyInAstObject(compilerOptions, 'module');
    if (!scriptModule) {
      insertPropertyInAstObjectInOrder(recorder, compilerOptions, 'module', 'esnext', 4);
    } else if (scriptModule.value !== 'esnext') {
      const { start, end } = scriptModule;
      recorder.remove(start.offset, end.offset - start.offset);
      recorder.insertLeft(start.offset, '"esnext"');
    }
  }

  tree.commitUpdate(recorder);
}
