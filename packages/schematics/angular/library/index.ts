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
  SchematicsException,
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
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
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

type TsConfigPartialType = {
  compilerOptions: {
    baseUrl: string,
    paths: {
      [key: string]: string[];
    },
  },
};

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

function updateTsConfig(npmPackageName: string) {

  return (host: Tree) => {
    if (!host.exists('tsconfig.json')) { return host; }

    return updateJsonFile(host, 'tsconfig.json', (tsconfig: TsConfigPartialType) => {
      if (!tsconfig.compilerOptions.paths) {
        tsconfig.compilerOptions.paths = {};
      }
      if (!tsconfig.compilerOptions.paths[npmPackageName]) {
        tsconfig.compilerOptions.paths[npmPackageName] = [];
      }
      tsconfig.compilerOptions.paths[npmPackageName].push(`dist/${npmPackageName}`);
    });
  };
}

function addDependenciesToPackageJson() {

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
        '@angular-devkit/build-ng-packagr': latestVersions.DevkitBuildNgPackagr,
        '@angular-devkit/build-angular': latestVersions.DevkitBuildNgPackagr,
        'ng-packagr': '^2.4.1',
        'tsickle': '>=0.25.5',
        'tslib': '^1.7.1',
        'typescript': latestVersions.TypeScript,
        // De-structure last keeps existing user dependencies.
        ...json.devDependencies,
      };
    });
  };
}

function addAppToWorkspaceFile(options: LibraryOptions, workspace: WorkspaceSchema,
                               projectRoot: string): Rule {
  return (host: Tree, context: SchematicContext) => {

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
          configurations: {
            production: {
              project: `${projectRoot}/ng-package.prod.json`,
            },
          },
        },
        test: {
          builder: '@angular-devkit/build-angular:karma',
          options: {
            main: `${projectRoot}/src/test.ts`,
            tsConfig: `${projectRoot}/tsconfig.spec.json`,
            karmaConfig: `${projectRoot}/karma.conf.js`,
          },
        },
        lint: {
          builder: '@angular-devkit/build-angular:tslint',
          options: {
            tsConfig: [
              `${projectRoot}/tsconfig.lint.json`,
              `${projectRoot}/tsconfig.spec.json`,
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
    if (!options.name) {
      throw new SchematicsException(`Invalid options, "name" is required.`);
    }
    const name = options.name;
    const prefix = options.prefix || 'lib';

    const workspace = getWorkspace(host);
    const newProjectRoot = workspace.newProjectRoot;
    const projectRoot = `${newProjectRoot}/${strings.dasherize(options.name)}`;
    const sourceDir = `${projectRoot}/src/lib`;
    const relativeTsLintPath = projectRoot.split('/').map(x => '..').join('/');

    const templateSource = apply(url('./files'), [
      template({
        ...strings,
        ...options,
        projectRoot,
        relativeTsLintPath,
        prefix,
      }),
      // TODO: Moving inside `branchAndMerge` should work but is bugged right now.
      // The __projectRoot__ is being used meanwhile.
      // move(projectRoot),
    ]);

    return chain([
      branchAndMerge(mergeWith(templateSource)),
      addAppToWorkspaceFile(options, workspace, projectRoot),
      options.skipPackageJson ? noop() : addDependenciesToPackageJson(),
      options.skipTsConfig ? noop() : updateTsConfig(name),
      schematic('module', {
        name: name,
        commonModule: false,
        flat: true,
        path: sourceDir,
        spec: false,
      }),
      schematic('component', {
        name: name,
        selector: `${prefix}-${name}`,
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
      }),
      (_tree: Tree, context: SchematicContext) => {
        context.addTask(new NodePackageInstallTask());
      },
    ])(host, context);
  };
}
