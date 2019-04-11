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


describe('Service Worker Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );
  const defaultOptions: WebWorkerOptions = {
    project: 'bar',
    target: 'build',
    name: 'app',
    // path: 'src/app',
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
    routing: false,
    skipTests: false,
    skipPackageJson: false,
  };

  beforeEach(() => {
    appTree = schematicRunner.runSchematic('workspace', workspaceOptions);
    appTree = schematicRunner.runSchematic('application', appOptions, appTree);
  });

  it('should put the worker file in the project root', () => {
    const tree = schematicRunner.runSchematic('web-worker', defaultOptions, appTree);
    const path = '/projects/bar/src/app/app.worker.ts';
    expect(tree.exists(path)).toEqual(true);
  });

  it('should put a new tsconfig.json file in the project root', () => {
    const tree = schematicRunner.runSchematic('web-worker', defaultOptions, appTree);
    const path = '/projects/bar/tsconfig.json';
    expect(tree.exists(path)).toEqual(true);
  });

  it('should put the tsconfig.worker.json file in the project root', () => {
    const tree = schematicRunner.runSchematic('web-worker', defaultOptions, appTree);
    const path = '/projects/bar/tsconfig.worker.json';
    expect(tree.exists(path)).toEqual(true);
  });

  it('should add the webWorkerTsConfig option to workspace', () => {
    const tree = schematicRunner.runSchematic('web-worker', defaultOptions, appTree);
    const { projects } = JSON.parse(tree.readContent('/angular.json'));
    expect(projects.bar.architect.build.options.webWorkerTsConfig)
      .toBe('projects/bar/tsconfig.worker.json');
  });

  it('should add exclusions to tsconfig.app.json', () => {
    const tree = schematicRunner.runSchematic('web-worker', defaultOptions, appTree);
    const { exclude } = JSON.parse(tree.readContent('/projects/bar/tsconfig.app.json'));
    expect(exclude).toContain('**/*.worker.ts');
  });

  it('should add snippet to sibling file', () => {
    const tree = schematicRunner.runSchematic('web-worker', defaultOptions, appTree);
    const appComponent = tree.readContent('/projects/bar/src/app/app.component.ts');
    expect(appComponent).toContain(`new Worker('./${defaultOptions.name}.worker`);
    expect(appComponent).toContain('console.log(`page got message: ${data}`)');
  });
});
