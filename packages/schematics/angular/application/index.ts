/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { JsonObject, join, normalize } from '@angular-devkit/core';
import {
  MergeStrategy,
  Rule,
  SchematicContext,
  Tree,
  apply,
  applyTemplates,
  chain,
  filter,
  mergeWith,
  move,
  noop,
  schematic,
  strings,
  url,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { Schema as ComponentOptions } from '../component/schema';
import { NodeDependencyType, addPackageJsonDependency } from '../utility/dependencies';
import { JSONFile } from '../utility/json-file';
import { latestVersions } from '../utility/latest-versions';
import { relativePathToWorkspaceRoot } from '../utility/paths';
import { getWorkspace, updateWorkspace } from '../utility/workspace';
import { Builders, ProjectType } from '../utility/workspace-models';
import { Schema as ApplicationOptions, Style } from './schema';

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

export default function (options: ApplicationOptions): Rule {
  return async (host: Tree, context: SchematicContext) => {
    const { appDir, appRootSelector, componentOptions, folderName, sourceDir } =
      await getAppOptions(host, options);

    return chain([
      addAppToWorkspaceFile(options, appDir, folderName),
      addTsProjectReference('./' + join(normalize(appDir), 'tsconfig.app.json')),
      options.skipTests
        ? noop()
        : addTsProjectReference('./' + join(normalize(appDir), 'tsconfig.spec.json')),
      options.standalone
        ? noop()
        : schematic('module', {
            name: 'app',
            commonModule: false,
            flat: true,
            routing: options.routing,
            routingScope: 'Root',
            path: sourceDir,
            project: options.name,
          }),
      schematic('component', {
        name: 'app',
        selector: appRootSelector,
        flat: true,
        path: sourceDir,
        skipImport: true,
        project: options.name,
        ...componentOptions,
      }),
      mergeWith(
        apply(url(options.standalone ? './files/standalone-files' : './files/module-files'), [
          options.routing ? noop() : filter((path) => !path.endsWith('app.routes.ts.template')),
          componentOptions.skipTests
            ? filter((path) => !path.endsWith('.spec.ts.template'))
            : noop(),
          applyTemplates({
            utils: strings,
            ...options,
            ...componentOptions,
            selector: appRootSelector,
            relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(appDir),
            appName: options.name,
            folderName,
          }),
          move(appDir),
        ]),
        MergeStrategy.Overwrite,
      ),
      mergeWith(
        apply(url('./files/common-files'), [
          options.minimal
            ? filter((path) => !path.endsWith('tsconfig.spec.json.template'))
            : noop(),
          componentOptions.inlineTemplate
            ? filter((path) => !path.endsWith('app.html.template'))
            : noop(),
          applyTemplates({
            utils: strings,
            ...options,
            selector: appRootSelector,
            relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(appDir),
            appName: options.name,
            folderName,
          }),
          move(appDir),
        ]),
        MergeStrategy.Overwrite,
      ),
      options.ssr
        ? schematic('ssr', {
            project: options.name,
            skipInstall: true,
          })
        : noop(),
      options.skipPackageJson ? noop() : addDependenciesToPackageJson(options),
    ]);
  };
}

function addDependenciesToPackageJson(options: ApplicationOptions) {
  return (host: Tree, context: SchematicContext) => {
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
        name: 'typescript',
        version: latestVersions['typescript'],
      },
    ].forEach((dependency) => addPackageJsonDependency(host, dependency));

    if (!options.skipInstall) {
      context.addTask(new NodePackageInstallTask());
    }

    return host;
  };
}

function addAppToWorkspaceFile(
  options: ApplicationOptions,
  appDir: string,
  folderName: string,
): Rule {
  let projectRoot = appDir;
  if (projectRoot) {
    projectRoot += '/';
  }

  const schematics: JsonObject = {};

  if (
    options.inlineTemplate ||
    options.inlineStyle ||
    options.minimal ||
    options.style !== Style.Css
  ) {
    const componentSchematicsOptions: JsonObject = {};
    if (options.inlineTemplate ?? options.minimal) {
      componentSchematicsOptions.inlineTemplate = true;
    }
    if (options.inlineStyle ?? options.minimal) {
      componentSchematicsOptions.inlineStyle = true;
    }
    if (options.style && options.style !== Style.Css) {
      componentSchematicsOptions.style = options.style;
    }

    schematics['@schematics/angular:component'] = componentSchematicsOptions;
  }

  if (options.skipTests || options.minimal) {
    const schematicsWithTests = [
      'class',
      'component',
      'directive',
      'guard',
      'interceptor',
      'pipe',
      'resolver',
      'service',
    ];

    schematicsWithTests.forEach((type) => {
      ((schematics[`@schematics/angular:${type}`] ??= {}) as JsonObject).skipTests = true;
    });
  }

  if (!options.standalone) {
    const schematicsWithStandalone = ['component', 'directive', 'pipe'];
    schematicsWithStandalone.forEach((type) => {
      ((schematics[`@schematics/angular:${type}`] ??= {}) as JsonObject).standalone = false;
    });
  }

  const sourceRoot = join(normalize(projectRoot), 'src');
  let budgets: { type: string; maximumWarning: string; maximumError: string }[] = [];
  if (options.strict) {
    budgets = [
      {
        type: 'initial',
        maximumWarning: '500kB',
        maximumError: '1MB',
      },
      {
        type: 'anyComponentStyle',
        maximumWarning: '4kB',
        maximumError: '8kB',
      },
    ];
  } else {
    budgets = [
      {
        type: 'initial',
        maximumWarning: '2MB',
        maximumError: '5MB',
      },
      {
        type: 'anyComponentStyle',
        maximumWarning: '6kB',
        maximumError: '10kB',
      },
    ];
  }

  const inlineStyleLanguage = options?.style !== Style.Css ? options.style : undefined;

  const project = {
    root: normalize(projectRoot),
    sourceRoot,
    projectType: ProjectType.Application,
    prefix: options.prefix || 'app',
    schematics,
    targets: {
      build: {
        builder: Builders.BuildApplication,
        defaultConfiguration: 'production',
        options: {
          index: `${sourceRoot}/index.html`,
          browser: `${sourceRoot}/main.ts`,
          polyfills: options.experimentalZoneless ? [] : ['zone.js'],
          tsConfig: `${projectRoot}tsconfig.app.json`,
          inlineStyleLanguage,
          assets: [{ 'glob': '**/*', 'input': `${projectRoot}public` }],
          styles: [`${sourceRoot}/styles.${options.style}`],
        },
        configurations: {
          production: {
            budgets,
            outputHashing: 'all',
          },
          development: {
            optimization: false,
            extractLicenses: false,
            sourceMap: true,
          },
        },
      },
      serve: {
        builder: Builders.BuildDevServer,
        defaultConfiguration: 'development',
        options: {},
        configurations: {
          production: {
            buildTarget: `${options.name}:build:production`,
          },
          development: {
            buildTarget: `${options.name}:build:development`,
          },
        },
      },
      'extract-i18n': {
        builder: Builders.BuildExtractI18n,
      },
      test: options.minimal
        ? undefined
        : {
            builder: Builders.BuildKarma,
            options: {
              polyfills: options.experimentalZoneless ? [] : ['zone.js', 'zone.js/testing'],
              tsConfig: `${projectRoot}tsconfig.spec.json`,
              inlineStyleLanguage,
              assets: [{ 'glob': '**/*', 'input': `${projectRoot}public` }],
              styles: [`${sourceRoot}/styles.${options.style}`],
            },
          },
    },
  };

  return updateWorkspace((workspace) => {
    workspace.projects.add({
      name: options.name,
      ...project,
    });
  });
}

async function getAppOptions(
  host: Tree,
  options: ApplicationOptions,
): Promise<{
  appDir: string;
  appRootSelector: string;
  componentOptions: Partial<ComponentOptions>;
  folderName: string;
  sourceDir: string;
}> {
  const appRootSelector = `${options.prefix}-root`;
  const componentOptions = getComponentOptions(options);

  const workspace = await getWorkspace(host);
  const newProjectRoot = (workspace.extensions.newProjectRoot as string | undefined) || '';

  // If scoped project (i.e. "@foo/bar"), convert dir to "foo/bar".
  let folderName = options.name.startsWith('@') ? options.name.slice(1) : options.name;
  if (/[A-Z]/.test(folderName)) {
    folderName = strings.dasherize(folderName);
  }

  const appDir =
    options.projectRoot === undefined
      ? join(normalize(newProjectRoot), folderName)
      : normalize(options.projectRoot);

  const sourceDir = `${appDir}/src/app`;

  return {
    appDir,
    appRootSelector,
    componentOptions,
    folderName,
    sourceDir,
  };
}

function getComponentOptions(options: ApplicationOptions): Partial<ComponentOptions> {
  const componentOptions: Partial<ComponentOptions> = !options.minimal
    ? {
        inlineStyle: options.inlineStyle,
        inlineTemplate: options.inlineTemplate,
        skipTests: options.skipTests,
        style: options.style,
        viewEncapsulation: options.viewEncapsulation,
      }
    : {
        inlineStyle: options.inlineStyle ?? true,
        inlineTemplate: options.inlineTemplate ?? true,
        skipTests: true,
        style: options.style,
        viewEncapsulation: options.viewEncapsulation,
      };

  return componentOptions;
}
