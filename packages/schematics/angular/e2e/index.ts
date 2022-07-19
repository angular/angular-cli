/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  Rule,
  SchematicsException,
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  strings,
  url,
} from '@angular-devkit/schematics';
import {
  AngularBuilder,
  DependencyType,
  ExistingBehavior,
  addDependency,
  updateWorkspace,
} from '@schematics/angular/utility';
import { posix as path } from 'path';
import { JSONFile } from '../utility/json-file';
import { latestVersions } from '../utility/latest-versions';
import { Schema as E2eOptions } from './schema';

/**
 * The list of development dependencies used by the E2E protractor-based builder.
 * The versions are sourced from the latest versions `../utility/latest-versions/package.json`
 * file which is automatically updated via renovate.
 */
const E2E_DEV_DEPENDENCIES = Object.freeze([
  'protractor',
  'jasmine-spec-reporter',
  'ts-node',
  '@types/node',
]);

function addScriptsToPackageJson(): Rule {
  return (host) => {
    const pkgJson = new JSONFile(host, 'package.json');
    const e2eScriptPath = ['scripts', 'e2e'];

    if (!pkgJson.get(e2eScriptPath)) {
      pkgJson.modify(e2eScriptPath, 'ng e2e', false);
    }
  };
}

export default function (options: E2eOptions): Rule {
  const { relatedAppName } = options;

  return updateWorkspace((workspace) => {
    const project = workspace.projects.get(relatedAppName);

    if (!project) {
      throw new SchematicsException(`Project name "${relatedAppName}" doesn't not exist.`);
    }

    const e2eRootPath = path.join(project.root, 'e2e');

    project.targets.add({
      name: 'e2e',
      builder: AngularBuilder.Protractor,
      defaultConfiguration: 'development',
      options: {
        protractorConfig: path.join(e2eRootPath, 'protractor.conf.js'),
      },
      configurations: {
        production: {
          devServerTarget: `${relatedAppName}:serve:production`,
        },
        development: {
          devServerTarget: `${relatedAppName}:serve:development`,
        },
      },
    });

    return chain([
      mergeWith(
        apply(url('./files'), [
          applyTemplates({
            utils: strings,
            ...options,
            relativePathToWorkspaceRoot: path.relative(path.join('/', e2eRootPath), '/'),
          }),
          move(e2eRootPath),
        ]),
      ),
      ...E2E_DEV_DEPENDENCIES.map((name) =>
        addDependency(name, latestVersions[name], {
          type: DependencyType.Dev,
          existing: ExistingBehavior.Skip,
        }),
      ),
      addScriptsToPackageJson(),
    ]);
  });
}
