/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { normalize, strings } from '@angular-devkit/core';
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
import { getWorkspace, updateWorkspace } from '../utility/workspace';
import { Builders } from '../utility/workspace-models';
import { Schema as E2eOptions } from './schema';

function getE2eRoot(projectRoot: string): string {
  const root = normalize(projectRoot);

  return root ? root + '/e2e' : 'e2e';
}

export default function (options: E2eOptions): Rule {
  return async (host: Tree) => {
    const appProject = options.relatedAppName;
    const workspace = await getWorkspace(host);
    const project = workspace.projects.get(appProject);
    if (!project) {
      throw new SchematicsException(`Project name "${appProject}" doesn't not exist.`);
    }

    const root = getE2eRoot(project.root);
    const relativePathToWorkspaceRoot = root.split('/').map(() => '..').join('/');

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
            relativePathToWorkspaceRoot,
          }),
          move(root),
        ])),
    ]);
  };
}
