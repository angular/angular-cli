/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
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
    target: 'build',
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
    appTree = await schematicRunner.runSchematicAsync('workspace', workspaceOptions).toPromise();
    appTree = await schematicRunner.runSchematicAsync('application', appOptions, appTree)
      .toPromise();
  });

  it('should put the worker file in the project root', async () => {
    const tree = await schematicRunner.runSchematicAsync('web-worker', defaultOptions, appTree)
      .toPromise();
    const path = '/projects/bar/src/app/app.worker.ts';
    expect(tree.exists(path)).toEqual(true);
  });

  it('should put the tsconfig.worker.json file in the project root', async () => {
    const tree = await schematicRunner.runSchematicAsync('web-worker', defaultOptions, appTree)
      .toPromise();
    const path = '/projects/bar/tsconfig.worker.json';
    expect(tree.exists(path)).toEqual(true);

    const { compilerOptions } = JSON.parse(tree.readContent(path));
    expect(compilerOptions.outDir).toBe('../../out-tsc/worker');
  });

  it('should add the webWorkerTsConfig option to workspace', async () => {
    const tree = await schematicRunner.runSchematicAsync('web-worker', defaultOptions, appTree)
      .toPromise();
    const { projects } = JSON.parse(tree.readContent('/angular.json'));
    expect(projects.bar.architect.build.options.webWorkerTsConfig)
      .toBe('projects/bar/tsconfig.worker.json');
  });

  it('should add exclusions to tsconfig.app.json', async () => {
    const oldTsConfig = {
      extends: '../../tsconfig.json',
      include: [
        'src/**/*.ts',
      ],
      exclude: [
        'src/test.ts',
        'src/**/*.spec.ts',
      ],
    };
    appTree.overwrite('projects/bar/tsconfig.app.json', JSON.stringify(oldTsConfig, undefined, 2));

    const tree = await schematicRunner.runSchematicAsync('web-worker', defaultOptions, appTree)
      .toPromise();
    const { exclude } = JSON.parse(tree.readContent('/projects/bar/tsconfig.app.json'));
    expect(exclude).toContain('src/**/*.worker.ts');
  });

  it('should add snippet to sibling file', async () => {
    const tree = await schematicRunner.runSchematicAsync('web-worker', defaultOptions, appTree)
      .toPromise();
    const appComponent = tree.readContent('/projects/bar/src/app/app.component.ts');
    expect(appComponent).toContain(`new Worker('./${defaultOptions.name}.worker`);
    expect(appComponent).toContain('console.log(`page got message: ${data}`)');
  });

  it('should add worker tsconfig to lint options', async () => {
    const tree = await schematicRunner.runSchematicAsync('web-worker', defaultOptions, appTree)
      .toPromise();
    const workspace = JSON.parse(tree.readContent('/angular.json'));
    const lintOptions = workspace.projects.bar.architect.lint.options;
    expect(lintOptions.tsConfig).toEqual([
      'projects/bar/tsconfig.app.json',
      'projects/bar/tsconfig.spec.json',
      'projects/bar/e2e/tsconfig.json',
      'projects/bar/tsconfig.worker.json',
    ]);
  });

  it(`should add 'tsconfig.worker.json' outside of 'src' directory in root app`, async () => {
    const rootAppOptions = { ...appOptions, projectRoot: '', name: 'foo' };
    const workerOptions = { ...defaultOptions, project: 'foo' };

    appTree = await schematicRunner.runSchematicAsync('application', rootAppOptions, appTree)
      .toPromise();
    const tree = await schematicRunner.runSchematicAsync('web-worker', workerOptions, appTree)
      .toPromise();

    const path = '/tsconfig.worker.json';
    expect(tree.exists(path)).toEqual(true);

    const { compilerOptions } = JSON.parse(tree.readContent(path));
    expect(compilerOptions.outDir).toBe('./out-tsc/worker');
  });

  it('supports pre version 8 structure', async () => {
    const workspace = JSON.parse(appTree.readContent('/angular.json'));
    const tsConfigPath = '/projects/bar/src/tsconfig.app.json';
    workspace.projects.bar.architect.build.options.tsConfig = tsConfigPath;
    appTree.overwrite('/angular.json', JSON.stringify(workspace));

    const oldTsConfig = {
      extends: '../../../tsconfig.json',
      include: [
        '**/*.ts',
      ],
      exclude: [
        'test.ts',
        '**/*.spec.ts',
      ],
    };
    appTree.create('projects/bar/src/tsconfig.app.json', JSON.stringify(oldTsConfig, undefined, 2));

    const tree = await schematicRunner.runSchematicAsync('web-worker', defaultOptions, appTree)
      .toPromise();
    const { exclude } = JSON.parse(tree.readContent(tsConfigPath));
    expect(exclude).toContain('**/*.worker.ts');
  });
});
