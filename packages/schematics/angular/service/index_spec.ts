/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as ApplicationOptions } from '../application/schema';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as ServiceOptions } from './schema';

describe('Service Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );
  const defaultOptions: ServiceOptions = {
    name: 'foo',
    flat: false,
    project: 'bar',
  };

  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',
  };

  const appOptions: ApplicationOptions = {
    name: 'bar',
    inlineStyle: false,
    inlineTemplate: false,
    routing: false,
    skipPackageJson: false,
  };
  let appTree: UnitTestTree;
  beforeEach(async () => {
    appTree = await schematicRunner.runSchematic('workspace', workspaceOptions);
    appTree = await schematicRunner.runSchematic('application', appOptions, appTree);
  });

  it('should create a service', async () => {
    const options = { ...defaultOptions };

    const tree = await schematicRunner.runSchematic('service', options, appTree);
    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/foo/foo.service.spec.ts');
    expect(files).toContain('/projects/bar/src/app/foo/foo.service.ts');
  });

  it('service should be tree-shakeable', async () => {
    const options = { ...defaultOptions };

    const tree = await schematicRunner.runSchematic('service', options, appTree);
    const content = tree.readContent('/projects/bar/src/app/foo/foo.service.ts');
    expect(content).toMatch(/providedIn: 'root'/);
  });

  it('should respect the skipTests flag', async () => {
    const options = { ...defaultOptions, skipTests: true };

    const tree = await schematicRunner.runSchematic('service', options, appTree);
    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/foo/foo.service.ts');
    expect(files).not.toContain('/projects/bar/src/app/foo/foo.service.spec.ts');
  });

  it('should respect the sourceRoot value', async () => {
    const config = JSON.parse(appTree.readContent('/angular.json'));
    config.projects.bar.sourceRoot = 'projects/bar/custom';
    appTree.overwrite('/angular.json', JSON.stringify(config, null, 2));
    appTree = await schematicRunner.runSchematic('service', defaultOptions, appTree);
    expect(appTree.files).toContain('/projects/bar/custom/app/foo/foo.service.ts');
  });
});
