/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { strings } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  url,
} from '@angular-devkit/schematics';
import { getWorkspace, updateWorkspace } from '../utility/config';
import { getProject } from '../utility/project';
import { Builders, WorkspaceSchema } from '../utility/workspace-models';
import { Schema as E2eOptions } from './schema';

function getE2eRoot(projectRoot: string): string {
  const root = projectRoot.split('/').filter(x => x).join('/');

  return root ? root + '/e2e' : 'e2e';
}

function AddBuilderToWorkspace(options: E2eOptions, workspace: WorkspaceSchema): Rule {
  return (host: Tree, context: SchematicContext) => {
    const appProject = options.relatedAppName;
    const project = getProject(workspace, appProject);
    const architect = project.architect;

    const projectRoot = getE2eRoot(project.root);

    if (architect) {
      architect.e2e = {
        builder: Builders.Protractor,
        options: {
          protractorConfig: `${projectRoot}/protractor.conf.js`,
          devServerTarget: `${options.relatedAppName}:serve`,
        },
        configurations: {
          production: {
            devServerTarget: `${options.relatedAppName}:serve:production`,
          },
        },
      };

      const lintConfig = architect.lint;
      if (lintConfig) {
        lintConfig.options.tsConfig =
          lintConfig.options.tsConfig.concat(`${projectRoot}/tsconfig.json`);
      }

      workspace.projects[options.relatedAppName] = project;
    }

    return updateWorkspace(workspace);
  };
}

export default function (options: E2eOptions): Rule {
  return (host: Tree) => {
    const appProject = options.relatedAppName;
    const workspace = getWorkspace(host);
    const project = getProject(workspace, appProject);

    if (!project) {
      throw new SchematicsException(`Project name "${appProject}" doesn't not exist.`);
    }

    const root = getE2eRoot(project.root);
    const relativePathToWorkspaceRoot = root.split('/').map(() => '..').join('/');

    return chain([
      AddBuilderToWorkspace(options, workspace),
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
