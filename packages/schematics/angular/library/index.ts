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
  Tree,
  apply,
  branchAndMerge,
  chain,
  mergeWith,
  noop,
  schematic,
  template,
  url,
} from '@angular-devkit/schematics';
import { WorkspaceSchema, getWorkspace, getWorkspacePath } from '../utility/config';
import { latestVersions } from '../utility/latest-versions';
import { Schema as LibraryOptions } from './schema';


type PackageJsonPartialType = {
  scripts: {
    [key: string]: string;
  },
  dependencies: {
    [key: string]: string;
  },
  devDependencies: {
    [key: string]: string;
  },
};

interface UpdateJsonFn<T> {
  (obj: T): T | void;
}

function updateJsonFile<T>(host: Tree, path: string, callback: UpdateJsonFn<T>): Tree {
  const source = host.read(path);
  if (source) {
    const sourceText = source.toString('utf-8');
    const json = JSON.parse(sourceText);
    callback(json);
    host.overwrite(path, JSON.stringify(json, null, 2));
  }

  return host;
}

function addDependenciesAndScriptsToPackageJson() {

  return (host: Tree) => {
    if (!host.exists('package.json')) { return host; }

    return updateJsonFile(host, 'package.json', (json: PackageJsonPartialType) => {


      if (!json['dependencies']) {
        json['dependencies'] = {};
      }

      json.dependencies = {
        '@angular/common': latestVersions.Angular,
        '@angular/core': latestVersions.Angular,
        '@angular/compiler': latestVersions.Angular,
        // De-structure last keeps existing user dependencies.
        ...json.dependencies,
      };

      if (!json['devDependencies']) {
        json['devDependencies'] = {};
      }

      json.devDependencies = {
        '@angular/compiler-cli': latestVersions.Angular,
        'ng-packagr': '^2.2.0',
        'tsickle': '>=0.25.5',
        'tslib': '^1.7.1',
        'typescript': latestVersions.TypeScript,
        // De-structure last keeps existing user dependencies.
        ...json.devDependencies,
      };
    });
  };
}

function addAppToWorkspaceFile(options: LibraryOptions, workspace: WorkspaceSchema): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.info(`Updating workspace file`);

    const projectRoot = `${workspace.newProjectRoot}/${options.name}`;
    // tslint:disable-next-line:no-any
    const project: any = {
      root: `${projectRoot}`,
      projectType: 'library',
      architect: {
        build: {
          builder: '@angular-devkit/build-ng-packagr:build',
          options: {
            project: `${projectRoot}/ng-package.json`,
          },
        },
        test: {
          builder: '@angular-devkit/build-webpack:karma',
          options: {
            main: `${projectRoot}/src/test.ts`,
            tsConfig: `${projectRoot}/tsconfig.spec.json`,
            karmaConfig: `${projectRoot}/karma.conf.js`,
          },
        },
        lint: {
          builder: '@angular-devkit/build-webpack:lint',
          options: {
            tsConfig: [
              'projects/lib/tsconfig.lint.json',
              'projects/lib/tsconfig.spec.json',
            ],
            exclude: [
              '**/node_modules/**',
            ],
          },
        },
      },
    };

    workspace.projects[options.name] = project;
    host.overwrite(getWorkspacePath(host), JSON.stringify(workspace, null, 2));
  };
}

export default function (options: LibraryOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    const name = options.name;

    const workspace = getWorkspace(host);
    const newProjectRoot = workspace.newProjectRoot;
    const projectRoot = `${newProjectRoot}/${options.name}`;
    const sourceDir = `${projectRoot}/src/lib`;

    const templateSource = apply(url('./files'), [
      template({
        ...strings,
        ...options,
        projectRoot,
      }),
      // TODO: Moving inside `branchAndMerge` should work but is bugged right now.
      // The __projectRoot__ is being used meanwhile.
      // move(projectRoot),
    ]);

    return chain([
      branchAndMerge(mergeWith(templateSource)),
      addAppToWorkspaceFile(options, workspace),
      options.skipPackageJson ? noop() : addDependenciesAndScriptsToPackageJson(),
      schematic('module', {
        name: name,
        commonModule: false,
        flat: true,
        path: sourceDir,
        spec: false,
      }),
      schematic('component', {
        name: name,
        inlineStyle: true,
        inlineTemplate: true,
        flat: true,
        path: sourceDir,
        export: true,
      }),
      schematic('service', {
        name: name,
        flat: true,
        path: sourceDir,
        module: `${name}.module.ts`,
      }),
    ])(host, context);
  };
}
