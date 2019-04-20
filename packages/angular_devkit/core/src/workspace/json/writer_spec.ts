/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function
import { readFileSync } from 'fs';
import { join } from 'path';
import { JsonArray, JsonObject } from '../../json';
import { stripIndent } from '../../utils/literals';
import { ProjectDefinitionCollection, WorkspaceDefinition } from '../definitions';
import { readJsonWorkspace } from './reader';
import { writeJsonWorkspace } from './writer';

const basicFile = stripIndent`
{
  "version": 1,
  // Comment
  "schematics": {
    "@angular/schematics:component": {
      "prefix": "abc"
    }
  },
  "x-baz": 1,
  "x-foo": {
    "is": ["good", "great", "awesome"]
  },
  "x-bar": 5,
}`;

const representativeFile = readFileSync(__dirname + '/test/angular.json', 'utf8');

function createTestCaseHost(inputData = '') {
  const host = {
    async readFile() {
      return inputData;
    },
    async writeFile(path: string, data: string) {
      try {
        const testCase = readFileSync(join(__dirname, 'test', 'cases', path) + '.json', 'utf8');
        expect(data).toEqual(testCase);
      } catch (e) {
        fail(`Unable to load test case '${path}': ${e.message || e}`);
      }
    },
    async isFile() {
      return true;
    },
    async isDirectory() {
      return true;
    },
  };

  return host;
}

describe('writeJsonWorkpaceFile', () => {
  it('does not modify a file without changes', async () => {
    const host = {
      async readFile(path: string) {
        return representativeFile;
      },
      async writeFile() {
        fail();
      },
      async isFile() {
        return true;
      },
      async isDirectory() {
        return true;
      },
    };

    const workspace = await readJsonWorkspace('angular.json', host);
    await writeJsonWorkspace(workspace, host);
  });

  it('writes an empty workspace', async () => {
    const workspace: WorkspaceDefinition = {
      extensions: {},
      projects: new ProjectDefinitionCollection(),
    };
    await writeJsonWorkspace(workspace, createTestCaseHost(), 'Empty');
  });

  it('writes new workspace with extensions', async () => {
    const workspace: WorkspaceDefinition = {
      extensions: {
        newProjectRoot: 'projects',
      },
      projects: new ProjectDefinitionCollection(),
    };
    await writeJsonWorkspace(workspace, createTestCaseHost(), 'Extensions1');

    workspace.extensions['schematics'] = {
      '@schematics/angular:component': { prefix: 'app' },
    };
    await writeJsonWorkspace(workspace, createTestCaseHost(), 'Extensions2');
  });

  it('writes new workspace with an empty project', async () => {
    const workspace: WorkspaceDefinition = {
      extensions: {},
      projects: new ProjectDefinitionCollection(),
    };

    workspace.projects.add({
      name: 'my-app',
      root: 'projects/my-app',
    });

    await writeJsonWorkspace(workspace, createTestCaseHost(), 'ProjectEmpty');
  });

  it('writes new workspace with a full project', async () => {
    const workspace: WorkspaceDefinition = {
      extensions: {},
      projects: new ProjectDefinitionCollection(),
    };

    workspace.projects.add({
      name: 'my-app',
      root: 'projects/my-app',
      targets: {
        build: {
          builder: '@angular-devkit/build-angular:browser',
          options: {
            outputPath: `dist/my-app`,
            index: `projects/my-app/src/index.html`,
            main: `projects/my-app/src/main.ts`,
            polyfills: `projects/my-app/src/polyfills.ts`,
            tsConfig: `projects/my-app/tsconfig.app.json`,
            assets: ['projects/my-app/src/favicon.ico', 'projects/my-app/src/assets'],
            styles: [`projects/my-app/src/styles.scss`],
            scripts: [],
            es5BrowserSupport: true,
          },
          configurations: {
            production: {
              fileReplacements: [
                {
                  replace: `projects/my-app/src/environments/environment.ts`,
                  with: `projects/my-app/src/environments/environment.prod.ts`,
                },
              ],
              optimization: true,
              outputHashing: 'all',
              sourceMap: false,
              extractCss: true,
              namedChunks: false,
              aot: true,
              extractLicenses: true,
              vendorChunk: false,
              buildOptimizer: true,
              budgets: [
                {
                  type: 'initial',
                  maximumWarning: '2mb',
                  maximumError: '5mb',
                },
              ],
            },
          },
        },
        serve: {
          builder: '@angular-devkit/build-angular:dev-server',
          options: {
            browserTarget: `my-app:build`,
          },
          configurations: {
            production: {
              browserTarget: `my-app:build:production`,
            },
          },
        },
      },
    });

    await writeJsonWorkspace(workspace, createTestCaseHost(), 'ProjectFull');
  });

  it('retains comments and formatting when modifying the workspace', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    workspace.extensions['x-baz'] = 10;

    await writeJsonWorkspace(workspace, host, 'Retain');
  });

  it('adds a project to workspace without any projects', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    workspace.projects.add({
      name: 'new',
      root: 'src7',
    });

    await writeJsonWorkspace(workspace, host, 'AddProject1');
  });

  it('adds a project to workspace with existing projects', async () => {
    const host = createTestCaseHost(representativeFile);

    const workspace = await readJsonWorkspace('', host);

    workspace.projects.add({
      name: 'new',
      root: 'src',
    });

    await writeJsonWorkspace(workspace, host, 'AddProject2');
  });

  it('adds a project with targets', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    workspace.projects.add({
      name: 'new',
      root: 'src',
      targets: {
        build: {
          builder: 'build-builder',
          options: { one: 1, two: false },
          configurations: {
            staging: {
              two: true,
            },
          },
        },
      },
    });

    await writeJsonWorkspace(workspace, host, 'AddProjectWithTargets');
  });

  it('adds a project with targets using reference to workspace', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    workspace.projects.add({
      name: 'new',
      root: 'src',
    });

    const project = workspace.projects.get('new');
    if (!project) {
      fail('project is missing');

      return;
    }

    project.targets.add({
      name: 'build',
      builder: 'build-builder',
      options: { one: 1, two: false },
      configurations: {
        staging: {
          two: true,
        },
      },
    });

    // This should be the same as adding them in the project add call
    await writeJsonWorkspace(workspace, host, 'AddProjectWithTargets');
  });

  it('modifies a project\'s properties', async () => {
    const host = createTestCaseHost(representativeFile);

    const workspace = await readJsonWorkspace('', host);

    const project = workspace.projects.get('my-app');
    if (!project) {
      fail('project is missing');

      return;
    }

    project.root = 'src';

    await writeJsonWorkspace(workspace, host, 'ProjectModifyProperties');
  });

  it('sets a project\'s properties', async () => {
    const host = createTestCaseHost(representativeFile);

    const workspace = await readJsonWorkspace('', host);

    const project = workspace.projects.get('my-app');
    if (!project) {
      fail('project is missing');

      return;
    }

    project.sourceRoot = 'src';

    await writeJsonWorkspace(workspace, host, 'ProjectSetProperties');
  });

  it('adds a target to an existing project', async () => {
    const host = createTestCaseHost(representativeFile);

    const workspace = await readJsonWorkspace('', host);

    const project = workspace.projects.get('my-app');
    if (!project) {
      fail('project is missing');

      return;
    }

    project.targets.add({
      name: 'new',
      builder: 'new-builder',
    });

    await writeJsonWorkspace(workspace, host, 'ProjectAddTarget');
  });

  it('deletes a target from an existing project', async () => {
    const host = createTestCaseHost(representativeFile);

    const workspace = await readJsonWorkspace('', host);

    const project = workspace.projects.get('my-app');
    if (!project) {
      fail('project is missing');

      return;
    }

    project.targets.delete('extract-i18n');

    await writeJsonWorkspace(workspace, host, 'ProjectDeleteTarget');
  });

  it('supports adding an empty array', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    workspace.extensions['x-array'] = [];

    await writeJsonWorkspace(workspace, host, 'AddArrayEmpty');
  });

  it('supports adding an array with values', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    workspace.extensions['x-array'] = [5, 'a', false, null, true, 9.9];

    await writeJsonWorkspace(workspace, host, 'ArrayValues');
  });

  it('supports adding an empty array then pushing as an extension', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    workspace.extensions['x-array'] = [];
    (workspace.extensions['x-array'] as string[]).push('value');

    await writeJsonWorkspace(workspace, host, 'AddArrayPush');
  });

  it('supports pushing to an existing array', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    const array = (workspace.extensions['x-foo'] as JsonObject)['is'] as JsonArray;
    array.push('value');

    await writeJsonWorkspace(workspace, host, 'ArrayPush');
  });

  it('supports unshifting to an existing array', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    const array = (workspace.extensions['x-foo'] as JsonObject)['is'] as JsonArray;
    array.unshift('value');

    await writeJsonWorkspace(workspace, host, 'ArrayUnshift');
  });

  it('supports shifting from an existing array', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    const array = (workspace.extensions['x-foo'] as JsonObject)['is'] as JsonArray;
    array.shift();

    await writeJsonWorkspace(workspace, host, 'ArrayShift');
  });

  it('supports splicing an existing array without new values', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    const array = (workspace.extensions['x-foo'] as JsonObject)['is'] as JsonArray;
    array.splice(2, 1);

    await writeJsonWorkspace(workspace, host, 'ArraySplice1');
  });

  it('supports splicing an existing array with new values', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    const array = (workspace.extensions['x-foo'] as JsonObject)['is'] as JsonArray;
    array.splice(2, 0, 'value1', 'value2');

    await writeJsonWorkspace(workspace, host, 'ArraySplice2');
  });

  it('supports popping from an existing array', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    const array = (workspace.extensions['x-foo'] as JsonObject)['is'] as JsonArray;
    array.pop();

    await writeJsonWorkspace(workspace, host, 'ArrayPop');
  });

  it('supports sorting from an existing array', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    const array = (workspace.extensions['x-foo'] as JsonObject)['is'] as JsonArray;
    array.sort();

    await writeJsonWorkspace(workspace, host, 'ArraySort');
  });

  it('replaces a value at zero index from an existing array', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    const array = (workspace.extensions['x-foo'] as JsonObject)['is'] as JsonArray;
    array[0] = 'value';

    await writeJsonWorkspace(workspace, host, 'ArrayIndexZero');
  });

  it('replaces a value at inner index from an existing array', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    const array = (workspace.extensions['x-foo'] as JsonObject)['is'] as JsonArray;
    array[1] = 'value';

    await writeJsonWorkspace(workspace, host, 'ArrayIndexInner');
  });

  it('replaces a value at last index from an existing array', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    const array = (workspace.extensions['x-foo'] as JsonObject)['is'] as JsonArray;
    array[array.length - 1] = 'value';

    await writeJsonWorkspace(workspace, host, 'ArrayIndexLast');
  });

  it('deletes a value at zero index from an existing array', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    const array = (workspace.extensions['x-foo'] as JsonObject)['is'] as JsonArray;
    array.splice(0, 1);

    await writeJsonWorkspace(workspace, host, 'ArrayDeleteZero');
  });

  it('deletes a value at inner index from an existing array', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    const array = (workspace.extensions['x-foo'] as JsonObject)['is'] as JsonArray;
    array.splice(1, 1);

    await writeJsonWorkspace(workspace, host, 'ArrayDeleteInner');
  });

  it('deletes and then adds a value at inner index from an existing array', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    const array = (workspace.extensions['x-foo'] as JsonObject)['is'] as JsonArray;
    array.splice(1, 1);
    array.splice(1, 0, 'new');

    await writeJsonWorkspace(workspace, host, 'ArrayDeleteInnerAdd');
  });

  it('deletes a value at last index from an existing array', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    const array = (workspace.extensions['x-foo'] as JsonObject)['is'] as JsonArray;
    array.splice(array.length - 1, 1);

    await writeJsonWorkspace(workspace, host, 'ArrayDeleteLast');
  });

  it('deletes and then adds a value at last index from an existing array', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    const array = (workspace.extensions['x-foo'] as JsonObject)['is'] as JsonArray;
    array.splice(array.length - 1, 1);
    array.push('new');

    await writeJsonWorkspace(workspace, host, 'ArrayDeleteLastAdd');
  });

  it('replaces an existing array', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    (workspace.extensions['x-foo'] as JsonObject)['is'] = ['value'];

    await writeJsonWorkspace(workspace, host, 'ArrayReplace1');
  });

  it('replaces an existing array with an empty array', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    (workspace.extensions['x-foo'] as JsonObject)['is'] = [];

    await writeJsonWorkspace(workspace, host, 'ArrayReplace2');
  });

  it('replaces an existing object with a new object', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    workspace.extensions['x-foo'] = { replacement: true };

    await writeJsonWorkspace(workspace, host, 'ObjectReplace1');
  });

  it('replaces an existing object with an empty object', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    workspace.extensions['x-foo'] = { };

    await writeJsonWorkspace(workspace, host, 'ObjectReplace2');
  });

  it('replaces an existing object with a different value type', async () => {
    const host = createTestCaseHost(basicFile);

    const workspace = await readJsonWorkspace('', host);

    workspace.extensions['x-foo'] = null;

    await writeJsonWorkspace(workspace, host, 'ObjectReplace3');
  });
});
