/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  Rule,
  SchematicContext,
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
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { join } from 'node:path/posix';
import { NodeDependencyType, addPackageJsonDependency } from '../utility/dependencies';
import { JSONFile } from '../utility/json-file';
import { latestVersions } from '../utility/latest-versions';
import { relativePathToWorkspaceRoot } from '../utility/paths';
import { getWorkspace, updateWorkspace } from '../utility/workspace';
import { Builders, ProjectType } from '../utility/workspace-models';
import { Schema as LibraryOptions } from './schema';

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

function addDependenciesToPackageJson() {
  return (host: Tree) => {
    [
      {
        type: NodeDependencyType.Dev,
        name: '@angular/compiler-cli',
        version: latestVersions.Angular,
      },
      {
        type: NodeDependencyType.Dev,
        name: '@angular/build',
        version: latestVersions.AngularBuild,
      },
      {
        type: NodeDependencyType.Dev,
        name: 'ng-packagr',
        version: latestVersions.NgPackagr,
      },
      {
        type: NodeDependencyType.Default,
        name: 'tslib',
        version: latestVersions['tslib'],
      },
      {
        type: NodeDependencyType.Dev,
        name: 'typescript',
        version: latestVersions['typescript'],
      },
    ].forEach((dependency) => addPackageJsonDependency(host, dependency));

    return host;
  };
}

function addLibToWorkspaceFile(
  options: LibraryOptions,
  projectRoot: string,
  projectName: string,
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
            polyfills: ['zone.js', 'zone.js/testing'],
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

    return chain([
      mergeWith(templateSource),
      addLibToWorkspaceFile(options, libDir, packageName),
      options.skipPackageJson ? noop() : addDependenciesToPackageJson(),
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
      (_tree: Tree, context: SchematicContext) => {
        if (!options.skipPackageJson && !options.skipInstall) {
          context.addTask(new NodePackageInstallTask());
        }
      },
    ]);
  };
}
