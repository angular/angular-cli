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
  noop,
  strings,
  url,
} from '@angular-devkit/schematics';
import { promises as fs } from 'node:fs';
import { posix as path } from 'node:path';
import { relativePathToWorkspaceRoot } from '../utility/paths';
import { getWorkspace as readWorkspace, updateWorkspace } from '../utility/workspace';
import { Builders as AngularBuilder } from '../utility/workspace-models';
import { Schema as ConfigOptions, Type as ConfigType } from './schema';
import { JSONFile } from '../utility/json-file';
import { addPackageJsonDependency, NodeDependencyType } from '../utility/dependencies';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { latestVersions } from '../utility/latest-versions';

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
  return async (host, context) => {
    const workspace = await readWorkspace(host);
    const project = workspace.projects.get(options.project);
    if (!project) {
      throw new SchematicsException(`Project name "${options.project}" doesn't not exist.`);
    }

    // Read Angular's default vendored `.browserslistrc` file.
    const config = JSON.parse(
      await fs.readFile(path.join(__dirname, 'baseline/package.json'), 'utf8'),
    );
    const widelyAvailableOnDate = config.bl2bl.baselineThreshold as string;

    const pkgJson = new JSONFile(host, 'package.json');
    pkgJson.modify(
      ['browserslist'],
      ['extends browserslist-config-baseline'],
      /* insertInOrder */ false,
    );
    pkgJson.modify(
      ['browserslist-config-baseline'],
      {
        widelyAvailableOnDate,
      },
      /* insertInOrder */ false,
    );

    addPackageJsonDependency(host, {
      type: NodeDependencyType.Dev,
      name: 'browserslist-config-baseline',
      version: latestVersions['browserslist-config-baseline'],
    });

    context.addTask(new NodePackageInstallTask());

    return noop;
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

    if (
      testTarget.builder !== AngularBuilder.Karma &&
      testTarget.builder !== AngularBuilder.BuildKarma
    ) {
      throw new SchematicsException(
        `Cannot add a karma configuration as builder for "test" target in project does not` +
          ` use "${AngularBuilder.Karma}" or "${AngularBuilder.BuildKarma}".`,
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
          needDevkitPlugin: testTarget.builder === AngularBuilder.Karma,
        }),
        move(project.root),
      ]),
    );
  });
}
