/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { strings, tags } from '@angular-devkit/core';
import { experimental } from '@angular-devkit/core';
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
import { Schema as E2eOptions } from '../e2e/schema';
import { getWorkspace, getWorkspacePath } from '../utility/config';
import { latestVersions } from '../utility/latest-versions';
import { Schema as ApplicationOptions } from './schema';

type WorkspaceSchema = experimental.workspace.WorkspaceSchema;

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

function addDependenciesToPackageJson() {
  return (host: Tree) => {
    const packageJsonPath = 'package.json';

    if (!host.exists('package.json')) { return host; }

    const source = host.read('package.json');
    if (!source) { return host; }

    const sourceText = source.toString('utf-8');
    const json = JSON.parse(sourceText);

    if (!json['devDependencies']) {
      json['devDependencies'] = {};
    }

    json.devDependencies = {
      '@angular/compiler-cli': latestVersions.Angular,
      '@angular-devkit/build-angular': latestVersions.DevkitBuildWebpack,
      'typescript': latestVersions.TypeScript,
      // De-structure last keeps existing user dependencies.
      ...json.devDependencies,
    };

    host.overwrite(packageJsonPath, JSON.stringify(json, null, 2));

    return host;
  };
}

function addAppToWorkspaceFile(options: ApplicationOptions, workspace: WorkspaceSchema): Rule {
  return (host: Tree, context: SchematicContext) => {
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
    const projectRoot = `${workspace.newProjectRoot}/${options.name}`;
    // tslint:disable-next-line:no-any
    const project: any = {
      root: projectRoot,
      projectType: 'application',
      architect: {
        build: {
          builder: '@angular-devkit/build-angular:browser',
          options: {
            outputPath: `dist/${options.name}`,
            index: `${projectRoot}/src/index.html`,
            main: `${projectRoot}/src/main.ts`,
            polyfills: `${projectRoot}/src/polyfills.ts`,
            tsConfig: `${projectRoot}/tsconfig.app.json`,
            assets: [
              {
                glob: 'favicon.ico',
                input: `${projectRoot}/src`,
                output: '/',
              },
              {
                glob: '**/*',
                input: `${projectRoot}/src/assets`,
                output: '/assets',
              },
            ],
            styles: [
              {
                input: `${projectRoot}/src/styles.${options.style}`,
              },
            ],
            scripts: [],
          },
          configurations: {
            production: {
              fileReplacements: [{
                src: `${projectRoot}/src/environments/environment.ts`,
                replaceWith: `${projectRoot}/src/environments/environment.prod.ts`,
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
            },
          },
        },
        serve: {
          builder: '@angular-devkit/build-angular:dev-server',
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
          builder: '@angular-devkit/build-angular:extract-i18n',
          options: {
            browserTarget: `${options.name}:build`,
          },
        },
        test: {
          builder: '@angular-devkit/build-angular:karma',
          options: {
            main: `${projectRoot}/src/test.ts`,
            polyfills: `${projectRoot}/src/polyfills.ts`,
            tsConfig: `${projectRoot}/tsconfig.spec.json`,
            karmaConfig: `${projectRoot}/karma.conf.js`,
            styles: [
              {
                input: `${projectRoot}/styles.${options.style}`,
              },
            ],
            scripts: [],
            assets: [
              {
                glob: 'favicon.ico',
                input: `${projectRoot}/src/`,
                output: '/',
              },
              {
                glob: '**/*',
                input: `${projectRoot}/src/assets`,
                output: '/assets',
              },
            ],
          },
        },
        lint: {
          builder: '@angular-devkit/build-angular:tslint',
          options: {
            tsConfig: [
              `${projectRoot}/tsconfig.app.json`,
              `${projectRoot}/tsconfig.spec.json`,
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

    workspace.projects[options.name] = project;
    host.overwrite(getWorkspacePath(host), JSON.stringify(workspace, null, 2));
  };
}
const projectNameRegexp = /^[a-zA-Z][.0-9a-zA-Z]*(-[.0-9a-zA-Z]*)*$/;
const unsupportedProjectNames = ['test', 'ember', 'ember-cli', 'vendor', 'app'];

function getRegExpFailPosition(str: string): number | null {
  const parts = str.indexOf('-') >= 0 ? str.split('-') : [str];
  const matched: string[] = [];

  parts.forEach(part => {
    if (part.match(projectNameRegexp)) {
      matched.push(part);
    }
  });

  const compare = matched.join('-');

  return (str !== compare) ? compare.length : null;
}

function validateProjectName(projectName: string) {
  const errorIndex = getRegExpFailPosition(projectName);
  if (errorIndex !== null) {
    const firstMessage = tags.oneLine`
      Project name "${projectName}" is not valid. New project names must
      start with a letter, and must contain only alphanumeric characters or dashes.
      When adding a dash the segment after the dash must also start with a letter.
    `;
    const msg = tags.stripIndent`
      ${firstMessage}
      ${projectName}
      ${Array(errorIndex + 1).join(' ') + '^'}
    `;
    throw new SchematicsException(msg);
  } else if (unsupportedProjectNames.indexOf(projectName) !== -1) {
    throw new SchematicsException(`Project name "${projectName}" is not a supported name.`);
  }

}

export default function (options: ApplicationOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    if (!options.name) {
      throw new SchematicsException(`Invalid options, "name" is required.`);
    }
    validateProjectName(options.name);
    const appRootSelector = `${options.prefix || 'app'}-root`;
    const componentOptions = {
      inlineStyle: options.inlineStyle,
      inlineTemplate: options.inlineTemplate,
      spec: !options.skipTests,
      styleext: options.style,
    };

    const workspace = getWorkspace(host);
    const newProjectRoot = workspace.newProjectRoot;
    const appDir = `${newProjectRoot}/${options.name}`;
    const sourceDir = `${appDir}/src/app`;

    const e2eOptions: E2eOptions = {
      name: `${options.name}-e2e`,
      relatedAppName: options.name,
      rootSelector: appRootSelector,
    };

    return chain([
      addAppToWorkspaceFile(options, workspace),
      options.skipPackageJson ? noop() : addDependenciesToPackageJson(),
      mergeWith(
        apply(url('./files'), [
          template({
            utils: strings,
            ...options,
            'dot': '.',
            appDir,
          }),
          move(appDir),
        ])),
      schematic('module', {
        name: 'app',
        commonModule: false,
        flat: true,
        routing: options.routing,
        routingScope: 'Root',
        path: sourceDir,
        spec: false,
      }),
      schematic('component', {
        name: 'app',
        selector: appRootSelector,
        flat: true,
        path: sourceDir,
        skipImport: true,
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
      schematic('e2e', e2eOptions),
    ])(host, context);
  };
}
