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
import { Schema as E2eOptions } from './schema';

describe('Application Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );

  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',
  };

  const defaultOptions: E2eOptions = {
    relatedAppName: 'foo',
  };

  const defaultAppOptions: ApplicationOptions = {
    name: 'foo',
    inlineStyle: true,
    inlineTemplate: true,
    routing: false,
    skipPackageJson: false,
    minimal: true,
  };

  let applicationTree: UnitTestTree;

  beforeEach(() => {
    const workspaceTree = schematicRunner.runSchematic('workspace', workspaceOptions);
    applicationTree = schematicRunner.runSchematic('application', defaultAppOptions, workspaceTree);
  });

  it('should create all files of e2e in an application', () => {
    const tree = schematicRunner.runSchematic('e2e', defaultOptions, applicationTree);
    const files = tree.files;
    expect(files).toEqual(jasmine.arrayContaining([
      '/projects/foo/e2e/protractor.conf.js',
      '/projects/foo/e2e/tsconfig.json',
      '/projects/foo/e2e/src/app.e2e-spec.ts',
      '/projects/foo/e2e/src/app.po.ts',
    ]));
  });

  it('should set the rootSelector in the app.po.ts', () => {
    const tree = schematicRunner.runSchematic('e2e', defaultOptions, applicationTree);
    const content = tree.readContent('/projects/foo/e2e/src/app.po.ts');
    expect(content).toMatch(/app\-root/);
  });

  it('should set the rootSelector in the app.po.ts from the option', () => {
    const options = {...defaultOptions, rootSelector: 't-a-c-o'};
    const tree = schematicRunner.runSchematic('e2e', options, applicationTree);
    const content = tree.readContent('/projects/foo/e2e/src/app.po.ts');
    expect(content).toMatch(/t\-a\-c\-o/);
  });

  it('should set the rootSelector in the app.po.ts from the option with emoji', () => {
    const options = {...defaultOptions, rootSelector: '🌮-🌯'};
    const tree = schematicRunner.runSchematic('e2e', options, applicationTree);
    const content = tree.readContent('/projects/foo/e2e/src/app.po.ts');
    expect(content).toMatch(/🌮-🌯/);
  });

  describe('workspace config', () => {
    it('should add e2e targets for the app', () => {
      const tree = schematicRunner.runSchematic('e2e', defaultOptions, applicationTree);
      const workspace = JSON.parse(tree.readContent('/angular.json'));
      const targets = workspace.projects.foo.architect;
      expect(targets.e2e).toBeDefined();
    });

    it('should set the e2e options', () => {
      const tree = schematicRunner.runSchematic('e2e', defaultOptions, applicationTree);
      const workspace = JSON.parse(tree.readContent('/angular.json'));
      const e2eOptions = workspace.projects.foo.architect.e2e.options;
      expect(e2eOptions.protractorConfig).toEqual('projects/foo/e2e/protractor.conf.js');
      expect(e2eOptions.devServerTarget).toEqual('foo:serve');
    });

    it('should set the lint options', () => {
      const tree = schematicRunner.runSchematic('e2e', defaultOptions, applicationTree);
      const workspace = JSON.parse(tree.readContent('/angular.json'));
      const lintOptions = workspace.projects.foo.architect.lint.options;
      expect(lintOptions.tsConfig).toEqual([
        'projects/foo/tsconfig.app.json',
        'projects/foo/tsconfig.spec.json',
        'projects/foo/e2e/tsconfig.json',
      ]);
    });
  });
});
