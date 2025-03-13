/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { parse as parseJson } from 'jsonc-parser';
import { Schema as ApplicationOptions } from '../application/schema';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as WebWorkerOptions } from './schema';

describe('Web Worker Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );
  const defaultOptions: WebWorkerOptions = {
    project: 'bar',
    name: 'app',
    snippet: true,
  };

  let appTree: UnitTestTree;

  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '8.0.0',
  };

  const appOptions: ApplicationOptions = {
    name: 'bar',
    inlineStyle: false,
    inlineTemplate: false,
    routing: true,
    skipTests: false,
    skipPackageJson: false,
  };

  beforeEach(async () => {
    appTree = await schematicRunner.runSchematic('workspace', workspaceOptions);
    appTree = await schematicRunner.runSchematic('application', appOptions, appTree);
  });

  it('should put the worker file in the project root', async () => {
    const tree = await schematicRunner.runSchematic('web-worker', defaultOptions, appTree);
    const path = '/projects/bar/src/app/app.worker.ts';
    expect(tree.exists(path)).toEqual(true);
  });

  it('should put the tsconfig.worker.json file in the project root', async () => {
    const tree = await schematicRunner.runSchematic('web-worker', defaultOptions, appTree);
    const path = '/projects/bar/tsconfig.worker.json';
    expect(tree.exists(path)).toEqual(true);

    const { compilerOptions } = parseJson(tree.readContent(path).toString());
    expect(compilerOptions.outDir).toBe('../../out-tsc/worker');
  });

  it('should add the webWorkerTsConfig option to workspace', async () => {
    const tree = await schematicRunner.runSchematic('web-worker', defaultOptions, appTree);
    const { projects } = JSON.parse(tree.readContent('/angular.json'));
    expect(projects.bar.architect.build.options.webWorkerTsConfig).toBe(
      'projects/bar/tsconfig.worker.json',
    );
  });

  it('should add snippet to sibling file', async () => {
    const tree = await schematicRunner.runSchematic('web-worker', defaultOptions, appTree);
    const appComponent = tree.readContent('/projects/bar/src/app/app.ts');
    expect(appComponent).toContain(`new Worker(new URL('./${defaultOptions.name}.worker`);
    expect(appComponent).toContain('console.log(`page got message: ${data}`)');
  });

  it(`should add 'tsconfig.worker.json' outside of 'src' directory in root app`, async () => {
    const rootAppOptions = { ...appOptions, projectRoot: '', name: 'foo' };
    const workerOptions = { ...defaultOptions, project: 'foo' };

    appTree = await schematicRunner.runSchematic('application', rootAppOptions, appTree);
    const tree = await schematicRunner.runSchematic('web-worker', workerOptions, appTree);
    const path = '/tsconfig.worker.json';
    expect(tree.exists(path)).toEqual(true);

    const { compilerOptions } = parseJson(tree.readContent(path).toString());
    expect(compilerOptions.outDir).toBe('./out-tsc/worker');
  });
});
