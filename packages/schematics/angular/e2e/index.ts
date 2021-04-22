/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { join, normalize, strings } from '@angular-devkit/core';
import {
  Rule,
  SchematicsException,
  Tree,
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  url,
} from '@angular-devkit/schematics';
import { NodeDependencyType, addPackageJsonDependency } from '../utility/dependencies';
import { JSONFile } from '../utility/json-file';
import { relativePathToWorkspaceRoot } from '../utility/paths';
import { getWorkspace, updateWorkspace } from '../utility/workspace';
import { Builders } from '../utility/workspace-models';
import { Schema as E2eOptions } from './schema';

function addScriptsToPackageJson(): Rule {
  return host => {
    const pkgJson = new JSONFile(host, 'package.json');
    const e2eScriptPath = ['scripts', 'e2e'];

    if (!pkgJson.get(e2eScriptPath)) {
      pkgJson.modify(e2eScriptPath, 'ng e2e', false);
    }
  };
}

export default function (options: E2eOptions): Rule {
  return async (host: Tree) => {
    const appProject = options.relatedAppName;
    const workspace = await getWorkspace(host);
    const project = workspace.projects.get(appProject);
    if (!project) {
      throw new SchematicsException(`Project name "${appProject}" doesn't not exist.`);
    }

    const root = join(normalize(project.root), 'e2e');

    project.targets.add({
      name: 'e2e',
      builder: Builders.Protractor,
      defaultConfiguration: 'development',
      options: {
        protractorConfig: `${root}/protractor.conf.js`,
      },
      configurations: {
        production: {
          devServerTarget: `${options.relatedAppName}:serve:production`,
        },
        development: {
          devServerTarget: `${options.relatedAppName}:serve:development`,
        },
      },
    });

    return chain([
      updateWorkspace(workspace),
      mergeWith(
        apply(url('./files'), [
          applyTemplates({
            utils: strings,
            ...options,
            relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(root),
          }),
          move(root),
        ])),
      host => [{
        type: NodeDependencyType.Dev,
        name: 'protractor',
        version: '~7.0.0',
      },       {
        type: NodeDependencyType.Dev,
        name: 'jasmine-spec-reporter',
        version: '~7.0.0',
      },       {
        type: NodeDependencyType.Dev,
        name: 'ts-node',
        version: '~9.1.1',
      }].forEach(dep => addPackageJsonDependency(host, dep)),
      addScriptsToPackageJson(),
    ]);
  };
}
