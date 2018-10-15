/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonParseMode, parseJsonAst } from '@angular-devkit/core';
import { Rule, Tree, chain } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import {
  NodeDependencyType,
  addPackageJsonDependency,
  getPackageJsonDependency,
} from '../../utility/dependencies';
import {
  findPropertyInAstObject,
  insertPropertyInAstObjectInOrder,
} from '../../utility/json-utils';
import { latestVersions } from '../../utility/latest-versions';

export function typeScriptHelpersRule(): Rule {
  return chain([
    _updateTsConfig(),
    (tree, context) => {
      const existing = getPackageJsonDependency(tree, 'tslib');
      const type = existing ? existing.type : NodeDependencyType.Default;

      addPackageJsonDependency(
        tree,
        {
          type,
          name: 'tslib',
          version: latestVersions.TsLib,
          overwrite: true,
        },
      );

      context.addTask(new NodePackageInstallTask());
    },
  ]);
}

function _updateTsConfig(): Rule {
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

    const importHelpers = findPropertyInAstObject(compilerOptions, 'importHelpers');
    if (importHelpers && importHelpers.value === true) {
      return host;
    }

    const recorder = host.beginUpdate(tsConfigPath);
    if (importHelpers) {
      const { start, end } = importHelpers;
      recorder.remove(start.offset, end.offset - start.offset);
      recorder.insertLeft(start.offset, 'true');
    } else {
      insertPropertyInAstObjectInOrder(recorder, compilerOptions, 'importHelpers', true, 4);
    }
    host.commitUpdate(recorder);

    return host;
  };
}
