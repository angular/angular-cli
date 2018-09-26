/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { strings, tags } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  chain,
  mergeWith,
  move,
  template,
  url,
} from '@angular-devkit/schematics';
import { getWorkspace, updateWorkspace } from '../utility/config';
import { getProject } from '../utility/project';
import {
  Builders,
   ProjectType,
  WorkspaceProject,
  WorkspaceSchema,
} from '../utility/workspace-models';
import { Schema as E2eOptions } from './schema';

function addAppToWorkspaceFile(options: E2eOptions, workspace: WorkspaceSchema): Rule {
  return (host: Tree, context: SchematicContext) => {
    let projectRoot = options.projectRoot !== undefined
      ? options.projectRoot
      : `${workspace.newProjectRoot}/${options.name}`;

    if (projectRoot !== '' && !projectRoot.endsWith('/')) {
      projectRoot += '/';
    }

    if (getProject(workspace, options.name)) {
      throw new SchematicsException(`Project name "${options.name}" already exists.`);
    }

    const project: WorkspaceProject = {
      root: projectRoot,
      projectType: ProjectType.Application,
      prefix: '',
      architect: {
        e2e: {
          builder: Builders.Protractor,
          options: {
            protractorConfig: `${projectRoot}protractor.conf.js`,
            devServerTarget: `${options.relatedAppName}:serve`,
          },
          configurations: {
            production: {
              devServerTarget: `${options.relatedAppName}:serve:production`,
            },
          },
        },
        lint: {
          builder: Builders.TsLint,
          options: {
            tsConfig: `${projectRoot}tsconfig.e2e.json`,
            exclude: [
              '**/node_modules/**',
            ],
          },
        },
      },
    };

    workspace.projects[options.name] = project;

    return updateWorkspace(workspace);
  };
}
const projectNameRegexp = /^[a-zA-Z][.0-9a-zA-Z]*(-[.0-9a-zA-Z]*)*$/;
const unsupportedProjectNames = ['test', 'ember', 'ember-cli', 'vendor', 'app'];

function getRegExpFailPosition(str: string): number | null {
  const parts = str.indexOf('-') >= 0 ? str.split('-') : [str];
  const matched: string[] = [];

  parts.forEach(part => {
    if (part.match(projectNameRegexp)) {
      matched.push(part);
    }
  });

  const compare = matched.join('-');

  return (str !== compare) ? compare.length : null;
}

function validateProjectName(projectName: string) {
  const errorIndex = getRegExpFailPosition(projectName);
  if (errorIndex !== null) {
    const firstMessage = tags.oneLine`
      Project name "${projectName}" is not valid. New project names must
      start with a letter, and must contain only alphanumeric characters or dashes.
      When adding a dash the segment after the dash must also start with a letter.
    `;
    const msg = tags.stripIndent`
      ${firstMessage}
      ${projectName}
      ${Array(errorIndex + 1).join(' ') + '^'}
    `;
    throw new SchematicsException(msg);
  } else if (unsupportedProjectNames.indexOf(projectName) !== -1) {
    throw new SchematicsException(`Project name "${projectName}" is not a supported name.`);
  }

}

export default function (options: E2eOptions): Rule {
  return (host: Tree) => {
    validateProjectName(options.name);

    const workspace = getWorkspace(host);
    const appDir = options.projectRoot !== undefined
      ? options.projectRoot
      : `${workspace.newProjectRoot}/${options.name}`;

    return chain([
      addAppToWorkspaceFile(options, workspace),
      mergeWith(
        apply(url('./files'), [
          template({
            utils: strings,
            ...options,
            'dot': '.',
            appDir,
          }),
          move(appDir),
        ])),
    ]);
  };
}
