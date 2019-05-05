/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  JsonAstObject,
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

// tslint:disable-next-line:max-line-length
const browserslistContent = `# This file is used by the build system to adjust CSS and JS output to support the specified browsers below.
# For additional information regarding the format and rule options, please see:
# https://github.com/browserslist/browserslist#queries

# You can see what browsers were selected by your queries by running:
#   npx browserslist

# Googlebot uses an older version of Chrome
# For additional information see: https://developers.google.com/search/docs/guides/rendering

> 0.5%
last 2 versions
Firefox ESR
Chrome 41 # Support for Googlebot
not dead
not IE 9-11 # For IE 9-11 support, remove 'not'.`;

export function updateES5Projects(): Rule {
  return (host: Tree) => {
    const tsConfigPath = '/tsconfig.json';
    const compilerOptions = getCompilerOptionsAstObject(host, tsConfigPath);
    if (!compilerOptions) {
      return host;
    }

    const recorder = host.beginUpdate(tsConfigPath);
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

    host.commitUpdate(recorder);

    return updateProjects;
  };
}

function updateProjects(): Rule {
  return (tree) => {
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
      const tsConfigs = [];
      const architect = project.architect;
      if (isJsonObject(architect)
        && isJsonObject(architect.build)
        && isJsonObject(architect.build.options)
        && typeof architect.build.options.tsConfig === 'string') {
        tsConfigs.push(architect.build.options.tsConfig);
      }

      if (isJsonObject(architect)
        && isJsonObject(architect.test)
        && isJsonObject(architect.test.options)
        && typeof architect.test.options.tsConfig === 'string') {
        tsConfigs.push(architect.test.options.tsConfig);
      }

      for (const tsConfig of tsConfigs) {
        const compilerOptions = getCompilerOptionsAstObject(tree, tsConfig);
        if (!compilerOptions) {
          continue;
        }
        const recorder = tree.beginUpdate(tsConfig);
        removePropertyInAstObject(recorder, compilerOptions, 'target');
        removePropertyInAstObject(recorder, compilerOptions, 'module');
        tree.commitUpdate(recorder);
      }

      const browserslistPath = join(normalize(project.root), 'browserslist');
      if (typeof project.sourceRoot === 'string') {
        // Move the CLI 7 style browserlist to root if it's there.
        const srcBrowsersList = join(normalize(project.sourceRoot), 'browserslist');
        if (tree.exists(srcBrowsersList) && !tree.exists(browserslistPath)) {
          // TODO: use rename instead.
          // This is a hacky workaround. We should be able to just rename it.
          // On unit tests the rename works fine but on real projects it fails with
          //     ERROR! browserslist does not exist..
          // This seems to happen because we are both renaming and then commiting an update.
          // But it's fine if we read/create/delete. There's a bug somewhere.
          // tree.rename(srcBrowsersList, browserslistPath);
          const content = tree.read(srcBrowsersList);
          if (content) {
            tree.create(browserslistPath, content);
            tree.delete(srcBrowsersList);
          }
        }
      }

      const source = tree.read(browserslistPath);
      if (!source) {
        tree.create(browserslistPath, browserslistContent);
      } else if (!source.toString().toLowerCase().includes('chrome 41')) {
        const recorder = tree.beginUpdate(browserslistPath);
        recorder.insertRight(source.length, '\nChrome 41 # Googlebot');
        tree.commitUpdate(recorder);
      }
    }

    return tree;
  };
}

function getCompilerOptionsAstObject(host: Tree, tsConfigPath: string): JsonAstObject | undefined {
  const buffer = host.read(tsConfigPath);
  if (!buffer) {
    return;
  }

  const tsCfgAst = parseJsonAst(buffer.toString(), JsonParseMode.Loose);

  if (tsCfgAst.kind !== 'object') {
    return;
  }

  const compilerOptions = findPropertyInAstObject(tsCfgAst, 'compilerOptions');
  if (!compilerOptions || compilerOptions.kind !== 'object') {
    return;
  }

  return compilerOptions;
}
