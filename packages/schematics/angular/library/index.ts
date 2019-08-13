/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonParseMode, join, normalize, parseJson, strings } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  noop,
  schematic,
  url,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { NodeDependencyType, addPackageJsonDependency } from '../utility/dependencies';
import { latestVersions } from '../utility/latest-versions';
import { applyLintFix } from '../utility/lint-fix';
import { relativePathToWorkspaceRoot } from '../utility/paths';
import { validateProjectName } from '../utility/validation';
import { getWorkspace, updateWorkspace } from '../utility/workspace';
import { Builders, ProjectType } from '../utility/workspace-models';
import { Schema as LibraryOptions } from './schema';

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
    const json = parseJson(sourceText, JsonParseMode.Loose);
    callback(json as {} as T);
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
    [
      {
        type: NodeDependencyType.Dev,
        name: '@angular/compiler-cli',
        version: latestVersions.Angular,
      },
      {
        type: NodeDependencyType.Dev,
        name: '@angular-devkit/build-ng-packagr',
        version: latestVersions.DevkitBuildNgPackagr,
      },
      {
        type: NodeDependencyType.Dev,
        name: '@angular-devkit/build-angular',
        version: latestVersions.DevkitBuildAngular,
      },
      {
        type: NodeDependencyType.Dev,
        name: 'ng-packagr',
        version: latestVersions.ngPackagr,
      },
      {
        type: NodeDependencyType.Dev,
        name: 'tsickle',
        version: latestVersions.tsickle,
      },
      {
        type: NodeDependencyType.Default,
        name: 'tslib',
        version: latestVersions.TsLib,
      },
      {
        type: NodeDependencyType.Dev,
        name: 'typescript',
        version: latestVersions.TypeScript,
      },
    ].forEach(dependency => addPackageJsonDependency(host, dependency));

    return host;
  };
}

function addLibToWorkspaceFile(
  options: LibraryOptions,
  projectRoot: string,
  projectName: string,
): Rule {
  return updateWorkspace(workspace => {
    if (workspace.projects.size === 0) {
      workspace.extensions.defaultProject = projectName;
    }

    workspace.projects.add({
      name: projectName,
      root: projectRoot,
      sourceRoot: `${projectRoot}/src`,
      projectType: ProjectType.Library,
      prefix: options.prefix,
      targets: {
        build: {
          builder: Builders.NgPackagr,
          options: {
            tsConfig: `${projectRoot}/tsconfig.lib.json`,
            project: `${projectRoot}/ng-package.json`,
          },
          configurations: {
            production: {
              tsConfig: `${projectRoot}/tsconfig.lib.prod.json`,
            },
          },
        },
        test: {
          builder: Builders.Karma,
          options: {
            main: `${projectRoot}/src/test.ts`,
            tsConfig: `${projectRoot}/tsconfig.spec.json`,
            karmaConfig: `${projectRoot}/karma.conf.js`,
          },
        },
        lint: {
          builder: Builders.TsLint,
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
    });
  });
}

export default function (options: LibraryOptions): Rule {
  return async (host: Tree) => {
    if (!options.name) {
      throw new SchematicsException(`Invalid options, "name" is required.`);
    }
    const prefix = options.prefix;

    validateProjectName(options.name);

    // If scoped project (i.e. "@foo/bar"), convert projectDir to "foo/bar".
    const projectName = options.name;
    const packageName = strings.dasherize(projectName);
    let scopeName = null;
    if (/^@.*\/.*/.test(options.name)) {
      const [scope, name] = options.name.split('/');
      scopeName = scope.replace(/^@/, '');
      options.name = name;
    }

    const workspace = await getWorkspace(host);
    const newProjectRoot = workspace.extensions.newProjectRoot as (string | undefined) || '';

    const scopeFolder = scopeName ? strings.dasherize(scopeName) + '/' : '';
    const folderName = `${scopeFolder}${strings.dasherize(options.name)}`;
    const projectRoot = join(normalize(newProjectRoot), folderName);
    const distRoot = `dist/${folderName}`;
    const sourceDir = `${projectRoot}/src/lib`;

    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...strings,
        ...options,
        packageName,
        projectRoot,
        distRoot,
        relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(projectRoot),
        prefix,
        angularLatestVersion: latestVersions.Angular.replace('~', '').replace('^', ''),
        folderName,
      }),
      move(projectRoot),
    ]);

    return chain([
      mergeWith(templateSource),
      addLibToWorkspaceFile(options, projectRoot, projectName),
      options.skipPackageJson ? noop() : addDependenciesToPackageJson(),
      options.skipTsConfig ? noop() : updateTsConfig(packageName, distRoot),
      schematic('module', {
        name: options.name,
        commonModule: false,
        flat: true,
        path: sourceDir,
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
      options.lintFix ? applyLintFix(sourceDir) : noop(),
      (_tree: Tree, context: SchematicContext) => {
        if (!options.skipPackageJson && !options.skipInstall) {
          context.addTask(new NodePackageInstallTask());
        }
      },
    ]);
  };
}
