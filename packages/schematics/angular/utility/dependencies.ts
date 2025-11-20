/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Rule, Tree } from '@angular-devkit/schematics';
import { TestRunner } from '../ng-new/schema';
import { DependencyType, ExistingBehavior, InstallBehavior, addDependency } from './dependency';
import { JSONFile } from './json-file';
import { latestVersions } from './latest-versions';

const PKG_JSON_PATH = '/package.json';
export enum NodeDependencyType {
  Default = 'dependencies',
  Dev = 'devDependencies',
  Peer = 'peerDependencies',
  Optional = 'optionalDependencies',
}

export interface NodeDependency {
  type: NodeDependencyType;
  name: string;
  version: string;
  overwrite?: boolean;
}

const ALL_DEPENDENCY_TYPE = [
  NodeDependencyType.Default,
  NodeDependencyType.Dev,
  NodeDependencyType.Optional,
  NodeDependencyType.Peer,
];

export function addPackageJsonDependency(
  tree: Tree,
  dependency: NodeDependency,
  pkgJsonPath = PKG_JSON_PATH,
): void {
  const json = new JSONFile(tree, pkgJsonPath);

  const { overwrite, type, name, version } = dependency;
  const path = [type, name];
  if (overwrite || !json.get(path)) {
    json.modify(path, version);
  }
}

export function removePackageJsonDependency(
  tree: Tree,
  name: string,
  pkgJsonPath = PKG_JSON_PATH,
): void {
  const json = new JSONFile(tree, pkgJsonPath);

  for (const depType of ALL_DEPENDENCY_TYPE) {
    json.remove([depType, name]);
  }
}

export function getPackageJsonDependency(
  tree: Tree,
  name: string,
  pkgJsonPath = PKG_JSON_PATH,
): NodeDependency | null {
  const json = new JSONFile(tree, pkgJsonPath);

  for (const depType of ALL_DEPENDENCY_TYPE) {
    const version = json.get([depType, name]);

    if (typeof version === 'string') {
      return {
        type: depType,
        name: name,
        version,
      };
    }
  }

  return null;
}

export function getTestRunnerDependencies(
  testRunner: TestRunner | undefined,
  skipInstall: boolean,
): Rule[] {
  if (testRunner === TestRunner.Vitest) {
    return [
      addDependency('vitest', latestVersions['vitest'], {
        type: DependencyType.Dev,
        existing: ExistingBehavior.Skip,
        install: skipInstall ? InstallBehavior.None : InstallBehavior.Auto,
      }),
      addDependency('jsdom', latestVersions['jsdom'], {
        type: DependencyType.Dev,
        existing: ExistingBehavior.Skip,
        install: skipInstall ? InstallBehavior.None : InstallBehavior.Auto,
      }),
    ];
  }

  return [
    addDependency('karma', latestVersions['karma'], {
      type: DependencyType.Dev,
      existing: ExistingBehavior.Skip,
      install: skipInstall ? InstallBehavior.None : InstallBehavior.Auto,
    }),
    addDependency('karma-chrome-launcher', latestVersions['karma-chrome-launcher'], {
      type: DependencyType.Dev,
      existing: ExistingBehavior.Skip,
      install: skipInstall ? InstallBehavior.None : InstallBehavior.Auto,
    }),
    addDependency('karma-coverage', latestVersions['karma-coverage'], {
      type: DependencyType.Dev,
      existing: ExistingBehavior.Skip,
      install: skipInstall ? InstallBehavior.None : InstallBehavior.Auto,
    }),
    addDependency('karma-jasmine', latestVersions['karma-jasmine'], {
      type: DependencyType.Dev,
      existing: ExistingBehavior.Skip,
      install: skipInstall ? InstallBehavior.None : InstallBehavior.Auto,
    }),
    addDependency('karma-jasmine-html-reporter', latestVersions['karma-jasmine-html-reporter'], {
      type: DependencyType.Dev,
      existing: ExistingBehavior.Skip,
      install: skipInstall ? InstallBehavior.None : InstallBehavior.Auto,
    }),
    addDependency('jasmine-core', latestVersions['jasmine-core'], {
      type: DependencyType.Dev,
      existing: ExistingBehavior.Skip,
      install: skipInstall ? InstallBehavior.None : InstallBehavior.Auto,
    }),
    addDependency('@types/jasmine', latestVersions['@types/jasmine'], {
      type: DependencyType.Dev,
      existing: ExistingBehavior.Skip,
      install: skipInstall ? InstallBehavior.None : InstallBehavior.Auto,
    }),
  ];
}
