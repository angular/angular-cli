/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject, join, normalize, relative, strings } from '@angular-devkit/core';
import {
  MergeStrategy,
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  chain,
  filter,
  mergeWith,
  move,
  noop,
  schematic,
  template,
  url,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { Schema as ComponentOptions } from '../component/schema';
import { Schema as E2eOptions } from '../e2e/schema';
import {
  addProjectToWorkspace,
  getWorkspace,
} from '../utility/config';
import { NodeDependencyType, addPackageJsonDependency } from '../utility/dependencies';
import { latestVersions } from '../utility/latest-versions';
import { validateProjectName } from '../utility/validation';
import {
  Builders,
  ProjectType,
  WorkspaceProject,
  WorkspaceSchema,
} from '../utility/workspace-models';
import { Schema as ApplicationOptions } from './schema';


// TODO: use JsonAST
// function appendPropertyInAstObject(
//   recorder: UpdateRecorder,
//   node: JsonAstObject,
//   propertyName: string,
//   value: JsonValue,
//   indent = 4,
// ) {
//   const indentStr = '\n' + new Array(indent + 1).join(' ');

//   if (node.properties.length > 0) {
//     // Insert comma.
//     const last = node.properties[node.properties.length - 1];
//     recorder.insertRight(last.start.offset + last.text.replace(/\s+$/, '').length, ',');
//   }

//   recorder.insertLeft(
//     node.end.offset - 1,
//     '  '
//     + `"${propertyName}": ${JSON.stringify(value, null, 2).replace(/\n/g, indentStr)}`
//     + indentStr.slice(0, -2),
//   );
// }

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

function addAppToWorkspaceFile(options: ApplicationOptions, workspace: WorkspaceSchema): Rule {
  // TODO: use JsonAST
  // const workspacePath = '/angular.json';
  // const workspaceBuffer = host.read(workspacePath);
  // if (workspaceBuffer === null) {
  //   throw new SchematicsException(`Configuration file (${workspacePath}) not found.`);
  // }
  // const workspaceJson = parseJson(workspaceBuffer.toString());
  // if (workspaceJson.value === null) {
  //   throw new SchematicsException(`Unable to parse configuration file (${workspacePath}).`);
  // }
  let projectRoot = options.projectRoot !== undefined
    ? options.projectRoot
    : `${workspace.newProjectRoot}/${options.name}`;
  if (projectRoot !== '' && !projectRoot.endsWith('/')) {
    projectRoot += '/';
  }
  const rootFilesRoot = options.projectRoot === undefined
    ? projectRoot
    : projectRoot + 'src/';

  const schematics: JsonObject = {};

  if (options.inlineTemplate === true
    || options.inlineStyle === true
    || options.style !== 'css') {
    schematics['@schematics/angular:component'] = {};
    if (options.inlineTemplate === true) {
      (schematics['@schematics/angular:component'] as JsonObject).inlineTemplate = true;
    }
    if (options.inlineStyle === true) {
      (schematics['@schematics/angular:component'] as JsonObject).inlineStyle = true;
    }
    if (options.style && options.style !== 'css') {
      (schematics['@schematics/angular:component'] as JsonObject).styleext = options.style;
    }
  }

  if (options.skipTests === true) {
    ['class', 'component', 'directive', 'guard', 'module', 'pipe', 'service'].forEach((type) => {
      if (!(`@schematics/angular:${type}` in schematics)) {
        schematics[`@schematics/angular:${type}`] = {};
      }
      (schematics[`@schematics/angular:${type}`] as JsonObject).spec = false;
    });
  }

  const project: WorkspaceProject = {
    root: projectRoot,
    sourceRoot: join(normalize(projectRoot), 'src'),
    projectType: ProjectType.Application,
    prefix: options.prefix || 'app',
    schematics,
    architect: {
      build: {
        builder: Builders.Browser,
        options: {
          outputPath: `dist/${options.name}`,
          index: `${projectRoot}src/index.html`,
          main: `${projectRoot}src/main.ts`,
          polyfills: `${projectRoot}src/polyfills.ts`,
          tsConfig: `${rootFilesRoot}tsconfig.app.json`,
          assets: [
            join(normalize(projectRoot), 'src', 'favicon.ico'),
            join(normalize(projectRoot), 'src', 'assets'),
          ],
          styles: [
            `${projectRoot}src/styles.${options.style}`,
          ],
          scripts: [],
        },
        configurations: {
          production: {
            fileReplacements: [{
              replace: `${projectRoot}src/environments/environment.ts`,
              with: `${projectRoot}src/environments/environment.prod.ts`,
            }],
            optimization: true,
            outputHashing: 'all',
            sourceMap: false,
            extractCss: true,
            namedChunks: false,
            aot: true,
            extractLicenses: true,
            vendorChunk: false,
            buildOptimizer: true,
            budgets: [{
              type: 'initial',
              maximumWarning: '2mb',
              maximumError: '5mb',
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
      test: {
        builder: Builders.Karma,
        options: {
          main: `${projectRoot}src/test.ts`,
          polyfills: `${projectRoot}src/polyfills.ts`,
          tsConfig: `${rootFilesRoot}tsconfig.spec.json`,
          karmaConfig: `${rootFilesRoot}karma.conf.js`,
          styles: [
            `${projectRoot}src/styles.${options.style}`,
          ],
          scripts: [],
          assets: [
            join(normalize(projectRoot), 'src', 'favicon.ico'),
            join(normalize(projectRoot), 'src', 'assets'),
          ],
        },
      },
      lint: {
        builder: Builders.TsLint,
        options: {
          tsConfig: [
            `${rootFilesRoot}tsconfig.app.json`,
            `${rootFilesRoot}tsconfig.spec.json`,
          ],
          exclude: [
            '**/node_modules/**',
          ],
        },
      },
    },
  };
  // tslint:disable-next-line:no-any
  // const projects: JsonObject = (<any> workspaceAst.value).projects || {};
  // tslint:disable-next-line:no-any
  // if (!(<any> workspaceAst.value).projects) {
  //   // tslint:disable-next-line:no-any
  //   (<any> workspaceAst.value).projects = projects;
  // }

  return addProjectToWorkspace(workspace, options.name, project);
}

function minimalPathFilter(path: string): boolean {
  const toRemoveList = /(test.ts|tsconfig.spec.json|karma.conf.js)$/;

  return !toRemoveList.test(path);
}

export default function (options: ApplicationOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    if (!options.name) {
      throw new SchematicsException(`Invalid options, "name" is required.`);
    }
    validateProjectName(options.name);
    const prefix = options.prefix || 'app';
    const appRootSelector = `${prefix}-root`;
    const componentOptions: Partial<ComponentOptions> = !options.minimal ?
      {
        inlineStyle: options.inlineStyle,
        inlineTemplate: options.inlineTemplate,
        spec: !options.skipTests,
        styleext: options.style,
        viewEncapsulation: options.viewEncapsulation,
      } :
      {
        inlineStyle: true,
        inlineTemplate: true,
        spec: false,
        styleext: options.style,
      };

    const workspace = getWorkspace(host);
    let newProjectRoot = workspace.newProjectRoot;
    let appDir = `${newProjectRoot}/${options.name}`;
    let sourceRoot = `${appDir}/src`;
    let sourceDir = `${sourceRoot}/app`;
    let relativePathToWorkspaceRoot = appDir.split('/').map(x => '..').join('/');
    const rootInSrc = options.projectRoot !== undefined;
    if (options.projectRoot !== undefined) {
      newProjectRoot = options.projectRoot;
      appDir = `${newProjectRoot}/src`;
      sourceRoot = appDir;
      sourceDir = `${sourceRoot}/app`;
      relativePathToWorkspaceRoot = relative(normalize('/' + sourceRoot), normalize('/'));
      if (relativePathToWorkspaceRoot === '') {
        relativePathToWorkspaceRoot = '.';
      }
    }
    const tsLintRoot = appDir;

    const e2eOptions: E2eOptions = {
      name: `${options.name}-e2e`,
      relatedAppName: options.name,
      rootSelector: appRootSelector,
      projectRoot: newProjectRoot ? `${newProjectRoot}/${options.name}-e2e` : 'e2e',
    };

    return chain([
      addAppToWorkspaceFile(options, workspace),
      mergeWith(
        apply(url('./files/src'), [
          options.minimal ? filter(minimalPathFilter) : noop(),
          template({
            utils: strings,
            ...options,
            'dot': '.',
            relativePathToWorkspaceRoot,
          }),
          move(sourceRoot),
        ])),
      mergeWith(
        apply(url('./files/root'), [
          options.minimal ? filter(minimalPathFilter) : noop(),
          template({
            utils: strings,
            ...options,
            'dot': '.',
            relativePathToWorkspaceRoot,
            rootInSrc,
          }),
          move(appDir),
        ])),
      options.minimal ? noop() : mergeWith(
        apply(url('./files/lint'), [
          template({
            utils: strings,
            ...options,
            tsLintRoot,
            relativePathToWorkspaceRoot,
            prefix,
          }),
          // TODO: Moving should work but is bugged right now.
          // The __tsLintRoot__ is being used meanwhile.
          // Otherwise the tslint.json file could be inside of the root folder and
          // this block and the lint folder could be removed.
        ])),
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
          componentOptions.inlineTemplate ? filter(path => !path.endsWith('.html')) : noop(),
          !componentOptions.spec ? filter(path => !path.endsWith('.spec.ts')) : noop(),
          template({
            utils: strings,
            ...options as any,  // tslint:disable-line:no-any
            selector: appRootSelector,
            ...componentOptions,
          }),
          move(sourceDir),
        ]), MergeStrategy.Overwrite),
      options.minimal ? noop() : schematic('e2e', e2eOptions),
      options.skipPackageJson ? noop() : addDependenciesToPackageJson(options),
    ]);
  };
}
