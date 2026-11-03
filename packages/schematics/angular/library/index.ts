/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  type Rule,
  type Tree,
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  noop,
  schematic,
  strings,
  url,
} from '@angular-devkit/schematics';
import { join } from 'node:path/posix';
import { addTestRunnerDependencies } from '../utility/dependencies';
import {
  DependencyType,
  ExistingBehavior,
  InstallBehavior,
  addDependency,
  getDependency,
} from '../utility/dependency';
import { JSONFile } from '../utility/json-file';
import { latestVersions } from '../utility/latest-versions';
import { relativePathToWorkspaceRoot } from '../utility/paths';
import { getWorkspace, updateWorkspace } from '../utility/workspace';
import { Builders, ProjectType } from '../utility/workspace-models';
import { type Schema as LibraryOptions, TestRunner } from './schema';

const LIBRARY_DEV_DEPENDENCIES = [
  { name: '@angular/compiler-cli', version: latestVersions.Angular },
  { name: '@angular/build', version: latestVersions.AngularBuild },
  { name: 'typescript', version: latestVersions['typescript'] },
];

function addTsProjectReference(...paths: string[]) {
  return (host: Tree) => {
    if (!host.exists('tsconfig.json')) {
      return host;
    }

    const newReferences = paths.map((path) => ({ path }));

    const file = new JSONFile(host, 'tsconfig.json');
    const jsonPath = ['references'];
    const value = file.get(jsonPath);
    file.modify(jsonPath, Array.isArray(value) ? [...value, ...newReferences] : newReferences);
  };
}

function addDependenciesToPackageJson({ skipInstall, testRunner }: LibraryOptions): Rule {
  return chain([
    ...LIBRARY_DEV_DEPENDENCIES.map((dependency) =>
      addDependency(dependency.name, dependency.version, {
        type: DependencyType.Dev,
        existing: ExistingBehavior.Skip,
        install: skipInstall ? InstallBehavior.None : InstallBehavior.Auto,
      }),
    ),
    ...addTestRunnerDependencies(testRunner, !!skipInstall),
    addDependency('tslib', latestVersions['tslib'], {
      type: DependencyType.Default,
      existing: ExistingBehavior.Skip,
      install: skipInstall ? InstallBehavior.None : InstallBehavior.Auto,
    }),
  ]);
}

function addLibToWorkspaceFile(
  options: LibraryOptions,
  projectRoot: string,
  projectName: string,
  folderName: string,
  distRoot: string,
  hasZoneDependency: boolean,
): Rule {
  return updateWorkspace((workspace) => {
    workspace.projects.add({
      name: projectName,
      root: projectRoot,
      sourceRoot: `${projectRoot}/src`,
      projectType: ProjectType.Library,
      prefix: options.prefix,
      targets: {
        build: {
          builder: Builders.BuildLibrary,
          defaultConfiguration: 'production',
          options: {
            tsConfig: `${projectRoot}/tsconfig.lib.json`,
            ...(folderName !== projectName ? { outputPath: distRoot } : {}),
          },
          configurations: {
            production: {},
            development: {
              compilationMode: 'full',
              declarationMap: true,
            },
          },
        },
        test:
          options.testRunner === TestRunner.Vitest
            ? {
                builder: Builders.BuildUnitTest,
                options: {
                  tsConfig: `${projectRoot}/tsconfig.spec.json`,
                },
              }
            : {
                builder: Builders.BuildKarma,
                options: {
                  tsConfig: `${projectRoot}/tsconfig.spec.json`,
                  polyfills: hasZoneDependency ? ['zone.js', 'zone.js/testing'] : undefined,
                },
              },
      },
    });
  });
}

export default function (options: LibraryOptions): Rule {
  return async (host: Tree) => {
    const prefix = options.prefix;
    const packageName = options.name;

    const workspace = await getWorkspace(host);
    const newProjectRoot = (workspace.extensions.newProjectRoot as string | undefined) || '';

    let folderName = packageName.startsWith('@') ? packageName.slice(1) : packageName;
    if (/[A-Z]/.test(folderName)) {
      folderName = strings.dasherize(folderName);
    }

    const libDir =
      options.projectRoot !== undefined
        ? join(options.projectRoot)
        : join(newProjectRoot, folderName);

    const distRoot = `dist/${folderName}`;

    // If scoped project (i.e. "@foo/bar"), convert name to "bar" for templates.
    const name = /^@.*\/.*/.test(options.name) ? options.name.split('/')[1] : options.name;

    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...strings,
        ...options,
        name,
        packageName,
        relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(libDir),
        angularLatestVersion: latestVersions.Angular.replace(/~|\^/, ''),
        testTypesPackage: options.testRunner === TestRunner.Vitest ? 'vitest/globals' : 'jasmine',
      }),
      move(libDir),
    ]);

    const hasZoneDependency = getDependency(host, 'zone.js') !== null;

    return chain([
      mergeWith(templateSource),
      addLibToWorkspaceFile(options, libDir, packageName, folderName, distRoot, hasZoneDependency),
      options.skipPackageJson ? noop() : addDependenciesToPackageJson(options),
      options.skipTsConfig
        ? noop()
        : addTsProjectReference(
            './' + join(libDir, 'tsconfig.lib.json'),
            './' + join(libDir, 'tsconfig.spec.json'),
          ),
      schematic('entry-point', {
        name: '.',
        project: packageName,
        entryFile: options.entryFile,
        prefix,
        standalone: options.standalone,
        skipTsConfig: options.skipTsConfig,
      }),
    ]);
  };
}
