/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  JsonAstObject,
  JsonObject,
  JsonParseMode,
  join,
  normalize,
  parseJsonAst,
  strings,
} from '@angular-devkit/core';
import {
  MergeStrategy,
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  applyTemplates,
  chain,
  filter,
  mergeWith,
  move,
  noop,
  schematic,
  url,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { Schema as ComponentOptions } from '../component/schema';
import { Schema as E2eOptions } from '../e2e/schema';
import { NodeDependencyType, addPackageJsonDependency } from '../utility/dependencies';
import { findPropertyInAstObject, insertPropertyInAstObjectInOrder } from '../utility/json-utils';
import { latestVersions } from '../utility/latest-versions';
import { applyLintFix } from '../utility/lint-fix';
import { relativePathToWorkspaceRoot } from '../utility/paths';
import { validateProjectName } from '../utility/validation';
import { getWorkspace, updateWorkspace } from '../utility/workspace';
import { Builders, ProjectType } from '../utility/workspace-models';
import { Schema as ApplicationOptions, Style } from './schema';

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
        name: '@angular-devkit/build-angular',
        version: latestVersions.DevkitBuildAngular,
      },
      {
        type: NodeDependencyType.Dev,
        name: 'typescript',
        version: latestVersions.TypeScript,
      },
    ].forEach(dependency => addPackageJsonDependency(host, dependency));

    if (!options.skipInstall) {
      context.addTask(new NodePackageInstallTask());
    }

    return host;
  };
}

function readTsLintConfig(host: Tree, path: string): JsonAstObject {
  const buffer = host.read(path);
  if (!buffer) {
    throw new SchematicsException(`Could not read ${path}.`);
  }

  const config = parseJsonAst(buffer.toString(), JsonParseMode.Loose);
  if (config.kind !== 'object') {
    throw new SchematicsException(`Invalid ${path}. Was expecting an object.`);
  }

  return config;
}

/**
 * Merges the application tslint.json with the workspace tslint.json
 * when the application being created is a root application
 *
 * @param {Tree} parentHost The root host of the schematic
 */
function mergeWithRootTsLint(parentHost: Tree) {
  return (host: Tree) => {
    const tsLintPath = '/tslint.json';
    if (!host.exists(tsLintPath)) {
      return;
    }

    const rootTslintConfig = readTsLintConfig(parentHost, tsLintPath);
    const appTslintConfig = readTsLintConfig(host, tsLintPath);

    const recorder = host.beginUpdate(tsLintPath);
    rootTslintConfig.properties.forEach(prop => {
      if (findPropertyInAstObject(appTslintConfig, prop.key.value)) {
        // property already exists. Skip!
        return;
      }

      insertPropertyInAstObjectInOrder(
        recorder,
        appTslintConfig,
        prop.key.value,
        prop.value.value,
        2,
      );
    });

    const rootRules = findPropertyInAstObject(rootTslintConfig, 'rules');
    const appRules = findPropertyInAstObject(appTslintConfig, 'rules');

    if (!appRules || appRules.kind !== 'object' || !rootRules || rootRules.kind !== 'object') {
      // rules are not valid. Skip!
      return;
    }

    rootRules.properties.forEach(prop => {
      insertPropertyInAstObjectInOrder(
        recorder,
        appRules,
        prop.key.value,
        prop.value.value,
        4,
      );
    });

    host.commitUpdate(recorder);

    // this shouldn't be needed but at the moment without this formatting is not correct.
    const content = readTsLintConfig(host, tsLintPath);
    host.overwrite(tsLintPath, JSON.stringify(content.value, undefined, 2));
  };
}

function addAppToWorkspaceFile(options: ApplicationOptions, appDir: string): Rule {
  let projectRoot = appDir;
  if (projectRoot) {
    projectRoot += '/';
  }

  const schematics: JsonObject = {};

  if (options.inlineTemplate === true
    || options.inlineStyle === true
    || options.style !== Style.Css) {
    const componentSchematicsOptions: JsonObject = {};
    if (options.inlineTemplate === true) {
      componentSchematicsOptions.inlineTemplate = true;
    }
    if (options.inlineStyle === true) {
      componentSchematicsOptions.inlineStyle = true;
    }
    if (options.style && options.style !== Style.Css) {
      componentSchematicsOptions.style = options.style;
    }

    schematics['@schematics/angular:component'] = componentSchematicsOptions;
  }

  if (options.skipTests || options.minimal) {
    ['class', 'component', 'directive', 'guard', 'module', 'pipe', 'service'].forEach((type) => {
      if (!(`@schematics/angular:${type}` in schematics)) {
        schematics[`@schematics/angular:${type}`] = {};
      }
      (schematics[`@schematics/angular:${type}`] as JsonObject).skipTests = true;
    });
  }

  const sourceRoot = join(normalize(projectRoot), 'src');

  const project = {
    root: normalize(projectRoot),
    sourceRoot,
    projectType: ProjectType.Application,
    prefix: options.prefix || 'app',
    schematics,
    targets: {
      build: {
        builder: Builders.Browser,
        options: {
          outputPath: `dist/${options.name}`,
          index: `${sourceRoot}/index.html`,
          main: `${sourceRoot}/main.ts`,
          polyfills: `${sourceRoot}/polyfills.ts`,
          tsConfig: `${projectRoot}tsconfig.app.json`,
          aot: true,
          assets: [
            `${sourceRoot}/favicon.ico`,
            `${sourceRoot}/assets`,
          ],
          styles: [
            `${sourceRoot}/styles.${options.style}`,
          ],
          scripts: [],
        },
        configurations: {
          production: {
            fileReplacements: [{
              replace: `${sourceRoot}/environments/environment.ts`,
              with: `${sourceRoot}/environments/environment.prod.ts`,
            }],
            optimization: true,
            outputHashing: 'all',
            sourceMap: false,
            extractCss: true,
            namedChunks: false,
            extractLicenses: true,
            vendorChunk: false,
            buildOptimizer: true,
            budgets: [
            {
              type: 'initial',
              maximumWarning: '2mb',
              maximumError: '5mb',
            },
            {
              type: 'anyComponentStyle',
              maximumWarning: '6kb',
              maximumError: '10kb',
            }],
          },
        },
      },
      serve: {
        builder: Builders.DevServer,
        options: {
          browserTarget: `${options.name}:build`,
        },
        configurations: {
          production: {
            browserTarget: `${options.name}:build:production`,
          },
        },
      },
      'extract-i18n': {
        builder: Builders.ExtractI18n,
        options: {
          browserTarget: `${options.name}:build`,
        },
      },
      test: options.minimal ? undefined : {
        builder: Builders.Karma,
        options: {
          main: `${sourceRoot}/test.ts`,
          polyfills: `${sourceRoot}/polyfills.ts`,
          tsConfig: `${projectRoot}tsconfig.spec.json`,
          karmaConfig: `${projectRoot}karma.conf.js`,
          assets: [
            `${sourceRoot}/favicon.ico`,
            `${sourceRoot}/assets`,
          ],
          styles: [
            `${sourceRoot}/styles.${options.style}`,
          ],
          scripts: [],
        },
      },
      lint: options.minimal ? undefined : {
        builder: Builders.TsLint,
        options: {
          tsConfig: [
            `${projectRoot}tsconfig.app.json`,
            `${projectRoot}tsconfig.spec.json`,
          ],
          exclude: [
            '**/node_modules/**',
          ],
        },
      },
    },
  };

  return updateWorkspace(workspace => {
    if (workspace.projects.size === 0) {
      workspace.extensions.defaultProject = options.name;
    }

    workspace.projects.add({
      name: options.name,
      ...project,
    });
  });
}

function minimalPathFilter(path: string): boolean {
  const toRemoveList = /(test.ts|tsconfig.spec.json|karma.conf.js|tslint.json).template$/;

  return !toRemoveList.test(path);
}

export default function (options: ApplicationOptions): Rule {
  return async (host: Tree, context: SchematicContext) => {
    if (!options.name) {
      throw new SchematicsException(`Invalid options, "name" is required.`);
    }
    validateProjectName(options.name);
    const appRootSelector = `${options.prefix}-root`;
    const componentOptions: Partial<ComponentOptions> = !options.minimal ?
      {
        inlineStyle: options.inlineStyle,
        inlineTemplate: options.inlineTemplate,
        skipTests: options.skipTests,
        style: options.style,
        viewEncapsulation: options.viewEncapsulation,
      } :
      {
        inlineStyle: true,
        inlineTemplate: true,
        skipTests: true,
        style: options.style,
      };

    const workspace = await getWorkspace(host);
    const newProjectRoot = workspace.extensions.newProjectRoot as (string | undefined) || '';
    const isRootApp = options.projectRoot !== undefined;
    const appDir = isRootApp
      ? options.projectRoot as string
      : join(normalize(newProjectRoot), options.name);
    const sourceDir = `${appDir}/src/app`;

    const e2eOptions: E2eOptions = {
      relatedAppName: options.name,
      rootSelector: appRootSelector,
    };

    return chain([
      addAppToWorkspaceFile(options, appDir),
      mergeWith(
        apply(url('./files'), [
          options.minimal ? filter(minimalPathFilter) : noop(),
          applyTemplates({
            utils: strings,
            ...options,
            relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(appDir),
            appName: options.name,
            isRootApp,
          }),
          isRootApp ? mergeWithRootTsLint(host) : noop(),
          move(appDir),
        ]), MergeStrategy.Overwrite),
      schematic('module', {
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
        apply(url('./other-files'), [
          componentOptions.inlineTemplate
            ? filter(path => !path.endsWith('.html.template'))
            : noop(),
          componentOptions.skipTests
            ? filter(path => !path.endsWith('.spec.ts.template'))
            : noop(),
          applyTemplates({
            utils: strings,
            ...options,
            selector: appRootSelector,
            ...componentOptions,
          }),
          move(sourceDir),
        ]), MergeStrategy.Overwrite),
      options.minimal ? noop() : schematic('e2e', e2eOptions),
      options.skipPackageJson ? noop() : addDependenciesToPackageJson(options),
      options.lintFix ? applyLintFix(appDir) : noop(),
    ]);
  };
}
