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
  pkgJsonPath: string = PKG_JSON_PATH,
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
  pkgJsonPath: string = PKG_JSON_PATH,
): void {
  const json = new JSONFile(tree, pkgJsonPath);

  for (const depType of ALL_DEPENDENCY_TYPE) {
    json.remove([depType, name]);
  }
}

export function getPackageJsonDependency(
  tree: Tree,
  name: string,
  pkgJsonPath: string = PKG_JSON_PATH,
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

export function addTestRunnerDependencies(
  testRunner: TestRunner | undefined,
  skipInstall: boolean,
): Rule[] {
  const dependencies =
    testRunner === TestRunner.Vitest
      ? ['vitest', 'jsdom']
      : [
          'karma',
          'karma-chrome-launcher',
          'karma-coverage',
          'karma-jasmine',
          'karma-jasmine-html-reporter',
          'jasmine-core',
          '@types/jasmine',
        ];

  return dependencies.map((name) =>
    addDependency(name, latestVersions[name], {
      type: DependencyType.Dev,
      existing: ExistingBehavior.Skip,
      install: skipInstall ? InstallBehavior.None : InstallBehavior.Auto,
    }),
  );
}
