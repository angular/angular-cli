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
import {
  WorkspaceProject,
  WorkspaceSchema,
  addProjectToWorkspace,
  getWorkspace,
} from '../utility/config';
import { latestVersions } from '../utility/latest-versions';
import { validateProjectName } from '../utility/validation';
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

function updateTsConfig(packageName: string, distRoot: string) {

  return (host: Tree) => {
    if (!host.exists('tsconfig.json')) { return host; }

    return updateJsonFile(host, 'tsconfig.json', (tsconfig: TsConfigPartialType) => {
      if (!tsconfig.compilerOptions.paths) {
        tsconfig.compilerOptions.paths = {};
      }
      if (!tsconfig.compilerOptions.paths[packageName]) {
        tsconfig.compilerOptions.paths[packageName] = [];
      }
      tsconfig.compilerOptions.paths[packageName].push(distRoot);

      // deep import & secondary entrypoint support
      const deepPackagePath = packageName + '/*';
      if (!tsconfig.compilerOptions.paths[deepPackagePath]) {
        tsconfig.compilerOptions.paths[deepPackagePath] = [];
      }
      tsconfig.compilerOptions.paths[deepPackagePath].push(distRoot + '/*');
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
        'ng-packagr': '^3.0.0',
        'tsickle': '>=0.29.0',
        'tslib': '^1.9.0',
        'typescript': latestVersions.TypeScript,
        // De-structure last keeps existing user dependencies.
        ...json.devDependencies,
      };
    });
  };
}

function addAppToWorkspaceFile(options: LibraryOptions, workspace: WorkspaceSchema,
                               projectRoot: string, packageName: string): Rule {

  const project: WorkspaceProject = {
    root: `${projectRoot}`,
    sourceRoot: `${projectRoot}/src`,
    projectType: 'library',
    prefix: options.prefix || 'lib',
    architect: {
      build: {
        builder: '@angular-devkit/build-ng-packagr:build',
        options: {
          tsConfig: `${projectRoot}/tsconfig.lib.json`,
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
            `${projectRoot}/tsconfig.lib.json`,
            `${projectRoot}/tsconfig.spec.json`,
          ],
          exclude: [
            '**/node_modules/**',
          ],
        },
      },
    },
  };

  return addProjectToWorkspace(workspace, packageName, project);
}

export default function (options: LibraryOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    if (!options.name) {
      throw new SchematicsException(`Invalid options, "name" is required.`);
    }
    const prefix = options.prefix || 'lib';

    validateProjectName(options.name);

    // If scoped project (i.e. "@foo/bar"), convert projectDir to "foo/bar".
    const packageName = options.name;
    let scopeName = null;
    if (/^@.*\/.*/.test(options.name)) {
      const [scope, name] = options.name.split('/');
      scopeName = scope.replace(/^@/, '');
      options.name = name;
    }

    const workspace = getWorkspace(host);
    const newProjectRoot = workspace.newProjectRoot;

    const scopeFolder = scopeName ? strings.dasherize(scopeName) + '/' : '';
    const folderName = `${scopeFolder}${strings.dasherize(options.name)}`;
    const projectRoot = `${newProjectRoot}/${folderName}`;
    const distRoot = `dist/${folderName}`;

    const sourceDir = `${projectRoot}/src/lib`;
    const relativePathToWorkspaceRoot = projectRoot.split('/').map(x => '..').join('/');

    const templateSource = apply(url('./files'), [
      template({
        ...strings,
        ...options,
        packageName,
        projectRoot,
        distRoot,
        relativePathToWorkspaceRoot,
        prefix,
      }),
      // TODO: Moving inside `branchAndMerge` should work but is bugged right now.
      // The __projectRoot__ is being used meanwhile.
      // move(projectRoot),
    ]);

    return chain([
      branchAndMerge(mergeWith(templateSource)),
      addAppToWorkspaceFile(options, workspace, projectRoot, packageName),
      options.skipPackageJson ? noop() : addDependenciesToPackageJson(),
      options.skipTsConfig ? noop() : updateTsConfig(packageName, distRoot),
      schematic('module', {
        name: options.name,
        commonModule: false,
        flat: true,
        path: sourceDir,
        spec: false,
        project: options.name,
      }),
      schematic('component', {
        name: options.name,
        selector: `${prefix}-${options.name}`,
        inlineStyle: true,
        inlineTemplate: true,
        flat: true,
        path: sourceDir,
        export: true,
        project: options.name,
      }),
      schematic('service', {
        name: options.name,
        flat: true,
        path: sourceDir,
        project: options.name,
      }),
      (_tree: Tree, context: SchematicContext) => {
        if (!options.skipPackageJson) {
          context.addTask(new NodePackageInstallTask());
        }
      },
    ]);
  };
}
