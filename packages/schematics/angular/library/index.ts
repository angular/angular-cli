/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  Rule,
  Tree,
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
import { Schema as LibraryOptions } from './schema';

const LIBRARY_DEV_DEPENDENCIES = [
  { name: '@angular/compiler-cli', version: latestVersions.Angular },
  { name: '@angular/build', version: latestVersions.AngularBuild },
  { name: 'ng-packagr', version: latestVersions.NgPackagr },
  { name: 'typescript', version: latestVersions['typescript'] },
];

function updateTsConfig(packageName: string, ...paths: string[]) {
  return (host: Tree) => {
    if (!host.exists('tsconfig.json')) {
      return host;
    }

    const file = new JSONFile(host, 'tsconfig.json');
    const jsonPath = ['compilerOptions', 'paths', packageName];
    const value = file.get(jsonPath);
    file.modify(jsonPath, Array.isArray(value) ? [...value, ...paths] : paths);
  };
}

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

function addDependenciesToPackageJson(skipInstall: boolean): Rule {
  return chain([
    ...LIBRARY_DEV_DEPENDENCIES.map((dependency) =>
      addDependency(dependency.name, dependency.version, {
        type: DependencyType.Dev,
        existing: ExistingBehavior.Skip,
        install: skipInstall ? InstallBehavior.None : InstallBehavior.Auto,
      }),
    ),
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
          builder: Builders.BuildNgPackagr,
          defaultConfiguration: 'production',
          configurations: {
            production: {
              tsConfig: `${projectRoot}/tsconfig.lib.prod.json`,
            },
            development: {
              tsConfig: `${projectRoot}/tsconfig.lib.json`,
            },
          },
        },
        test: {
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

    // If scoped project (i.e. "@foo/bar"), convert projectDir to "foo/bar".
    const packageName = options.name;
    if (/^@.*\/.*/.test(options.name)) {
      const [, name] = options.name.split('/');
      options.name = name;
    }

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
    const sourceDir = `${libDir}/src/lib`;

    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...strings,
        ...options,
        packageName,
        libDir,
        distRoot,
        relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(libDir),
        prefix,
        angularLatestVersion: latestVersions.Angular.replace(/~|\^/, ''),
        tsLibLatestVersion: latestVersions['tslib'].replace(/~|\^/, ''),
        folderName,
      }),
      move(libDir),
    ]);

    const hasZoneDependency = getDependency(host, 'zone.js') !== null;

    return chain([
      mergeWith(templateSource),
      addLibToWorkspaceFile(options, libDir, packageName, hasZoneDependency),
      options.skipPackageJson ? noop() : addDependenciesToPackageJson(!!options.skipInstall),
      options.skipTsConfig ? noop() : updateTsConfig(packageName, './' + distRoot),
      options.skipTsConfig
        ? noop()
        : addTsProjectReference(
            './' + join(libDir, 'tsconfig.lib.json'),
            './' + join(libDir, 'tsconfig.spec.json'),
          ),
      options.standalone
        ? noop()
        : schematic('module', {
            name: options.name,
            commonModule: false,
            flat: true,
            path: sourceDir,
            project: packageName,
            // Explicitly set the `typeSeparator` this also ensures that the generated files are valid even if the `module` schematic
            // inherits its `typeSeparator` from the workspace.
            typeSeparator: '-',
          }),
      schematic('component', {
        name: options.name,
        selector: `${prefix}-${options.name}`,
        inlineStyle: true,
        inlineTemplate: true,
        flat: true,
        path: sourceDir,
        export: true,
        standalone: options.standalone,
        project: packageName,
        // Explicitly set an empty `type` since it doesn't necessarily make sense in a library.
        // This also ensures that the generated files are valid even if the `component` schematic
        // inherits its `type` from the workspace.
        type: '',
      }),
    ]);
  };
}
