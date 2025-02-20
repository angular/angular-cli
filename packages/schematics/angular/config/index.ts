/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  Rule,
  SchematicsException,
  apply,
  applyTemplates,
  filter,
  mergeWith,
  move,
  strings,
  url,
} from '@angular-devkit/schematics';
import { posix as path } from 'node:path';
import { relativePathToWorkspaceRoot } from '../utility/paths';
// TODO: Determine if getWorkspace still needs to be imported as readWorkspace.
import { getWorkspace as readWorkspace, updateWorkspace } from '../utility/workspace';
// TODO: Determine if Builders still needs to be imported as AngularBuilder.
import { Builders as AngularBuilder } from '../utility/workspace-models';
import { Schema as ConfigOptions, Type as ConfigType } from './schema';

export default function (options: ConfigOptions): Rule {
  switch (options.type) {
    case ConfigType.Karma:
      return addKarmaConfig(options);
    case ConfigType.Browserslist:
      return addBrowserslistConfig(options);
    default:
      throw new SchematicsException(`"${options.type}" is an unknown configuration file type.`);
  }
}

function addBrowserslistConfig(options: ConfigOptions): Rule {
  return async (host) => {
    const workspace = await readWorkspace(host);
    const project = workspace.projects.get(options.project);
    if (!project) {
      throw new SchematicsException(`Project name "${options.project}" doesn't not exist.`);
    }

    return mergeWith(
      apply(url('./files'), [
        filter((p) => p.endsWith('.browserslistrc.template')),
        applyTemplates({}),
        move(project.root),
      ]),
    );
  };
}

function addKarmaConfig(options: ConfigOptions): Rule {
  return updateWorkspace((workspace) => {
    const project = workspace.projects.get(options.project);
    if (!project) {
      throw new SchematicsException(`Project name "${options.project}" doesn't not exist.`);
    }

    const testTarget = project.targets.get('test');
    if (!testTarget) {
      throw new SchematicsException(
        `No "test" target found for project "${options.project}".` +
          ' A "test" target is required to generate a karma configuration.',
      );
    }

    if (testTarget.builder !== AngularBuilder.Karma) {
      throw new SchematicsException(
        `Cannot add a karma configuration as builder for "test" target in project does not use "${AngularBuilder.Karma}".`,
      );
    }

    testTarget.options ??= {};
    testTarget.options.karmaConfig = path.join(project.root, 'karma.conf.js');

    // If scoped project (i.e. "@foo/bar"), convert dir to "foo/bar".
    let folderName = options.project.startsWith('@') ? options.project.slice(1) : options.project;
    if (/[A-Z]/.test(folderName)) {
      folderName = strings.dasherize(folderName);
    }

    return mergeWith(
      apply(url('./files'), [
        filter((p) => p.endsWith('karma.conf.js.template')),
        applyTemplates({
          relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(project.root),
          folderName,
        }),
        move(project.root),
      ]),
    );
  });
}
