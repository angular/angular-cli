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
import { relativePathToWorkspaceRoot } from '../utility/paths';
import { getWorkspace, updateWorkspace } from '../utility/workspace';
import { Builders } from '../utility/workspace-models';
import { Schema as E2eOptions } from './schema';

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
      options: {
        protractorConfig: `${root}/protractor.conf.js`,
        devServerTarget: `${options.relatedAppName}:serve`,
      },
      configurations: {
        production: {
          devServerTarget: `${options.relatedAppName}:serve:production`,
        },
      },
    });

    const lintTarget = project.targets.get('lint');
    if (lintTarget && lintTarget.options && Array.isArray(lintTarget.options.tsConfig)) {
      lintTarget.options.tsConfig =
        lintTarget.options.tsConfig.concat(`${root}/tsconfig.json`);
    }

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
    ]);
  };
}
