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
import { Schema as ValidatorOptions } from './schema';


describe('Validator Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );
  const defaultOptions: ValidatorOptions = {
    name: 'foo',
    spec: true,
    flat: true,
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
    style: 'css',
    skipTests: false,
    skipPackageJson: false,
  };
  let appTree: UnitTestTree;
  beforeEach(() => {
    appTree = schematicRunner.runSchematic('workspace', workspaceOptions);
    appTree = schematicRunner.runSchematic('application', appOptions, appTree);
  });

  it('should create a validator', () => {
    const tree = schematicRunner.runSchematic('validator', defaultOptions, appTree);
    const files = tree.files;
    expect(files).toContain('/projects/bar/src/app/foo.validator.spec.ts');
    expect(files).toContain('/projects/bar/src/app/foo.validator.ts');
  });

  it('should respect the spec flag', () => {
    const options = { ...defaultOptions, spec: false };

    const tree = schematicRunner.runSchematic('validator', options, appTree);
    const files = tree.files;
    expect(files).not.toContain('/projects/bar/src/app/foo.validator.spec.ts');
    expect(files).toContain('/projects/bar/src/app/foo.validator.ts');
  });

  it('should respect the sourceRoot value', () => {
    const config = JSON.parse(appTree.readContent('/angular.json'));
    config.projects.bar.sourceRoot = 'projects/bar/custom';
    appTree.overwrite('/angular.json', JSON.stringify(config, null, 2));
    appTree = schematicRunner.runSchematic('validator', defaultOptions, appTree);
    expect(appTree.files).toContain('/projects/bar/custom/app/foo.validator.ts');
  });
});
