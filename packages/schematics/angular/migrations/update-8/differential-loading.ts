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
} from '../../utility/json-utils';

// tslint:disable-next-line:max-line-length
const browserslistContent = `# This file is used by the build system to adjust CSS and JS output to support the specified browsers below.
# For additional information regarding the format and rule options, please see:
# https://github.com/browserslist/browserslist#queries

# Googlebot uses an older version of Chrome
# For additional information see: https://developers.google.com/search/docs/guides/rendering

> 0.5%
last 2 versions
Firefox ESR
not dead
not IE 9-11 # For IE 9-11 support, remove 'not'.
not Chrome 41 # For Googlebot support, remove 'not'.`;

export function updateES5Projects(): Rule {
  return (host: Tree) => {
    const tsConfigPath = '/tsconfig.json';
    const buffer = host.read(tsConfigPath);
    if (!buffer) {
      return host;
    }

    const tsCfgAst = parseJsonAst(buffer.toString(), JsonParseMode.Loose);

    if (tsCfgAst.kind !== 'object') {
      return host;
    }

    const compilerOptions = findPropertyInAstObject(tsCfgAst, 'compilerOptions');
    if (!compilerOptions || compilerOptions.kind !== 'object') {
      return host;
    }

    const scriptTarget = findPropertyInAstObject(compilerOptions, 'target');
    if (scriptTarget && scriptTarget.value === 'es2015') {
      return host;
    }

    const recorder = host.beginUpdate(tsConfigPath);
    if (scriptTarget) {
      const { start, end } = scriptTarget;
      recorder.remove(start.offset, end.offset - start.offset);
      recorder.insertLeft(start.offset, '"es2015"');
    } else {
      insertPropertyInAstObjectInOrder(recorder, compilerOptions, 'target', 'es2015', 4);
    }
    host.commitUpdate(recorder);

    return updateBrowserlist;
  };
}

function updateBrowserlist(): Rule {
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
    for (const projectName of Object.keys(angularJson.projects)) {
      const project = angularJson.projects[projectName];
      if (!isJsonObject(project)) {
        continue;
      }
      if (typeof project.root != 'string' || project.projectType !== 'application') {
        continue;
      }

      const browserslistPath = join(normalize(project.root), '/browserslist');
      const source = tree.read(browserslistPath);
      if (!source) {
        tree.create(browserslistPath, browserslistContent);
      } else {
        const recorder = tree.beginUpdate(browserslistPath);
        recorder.insertRight(source.length, '\nChrome 41 # Googlebot');
        tree.commitUpdate(recorder);
      }
    }

    return tree;
  };
}
