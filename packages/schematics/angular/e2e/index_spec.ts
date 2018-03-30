/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as E2eOptions } from './schema';

// tslint:disable:max-line-length
describe('Application Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );

  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',
  };

  const defaultOptions: E2eOptions = {
    name: 'foo',
    relatedAppName: 'app',
  };

  let workspaceTree: UnitTestTree;
  beforeEach(() => {
    workspaceTree = schematicRunner.runSchematic('workspace', workspaceOptions);
  });

  it('should create all files of an e2e application', () => {
    const tree = schematicRunner.runSchematic('e2e', defaultOptions, workspaceTree);
    const files = tree.files;
    expect(files.indexOf('/projects/foo/protractor.conf.js')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/tsconfig.e2e.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/app.e2e-spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/projects/foo/src/app.po.ts')).toBeGreaterThanOrEqual(0);
  });

  it('should create all files of an e2e application', () => {
    const options = {...defaultOptions, projectRoot: 'e2e'};
    const tree = schematicRunner.runSchematic('e2e', options, workspaceTree);
    const files = tree.files;
    expect(files.indexOf('/projects/foo/protractor.conf.js')).toEqual(-1);
    expect(files.indexOf('/e2e/protractor.conf.js')).toBeGreaterThanOrEqual(0);
  });

  it('should set the rootSelector in the app.po.ts', () => {
    const tree = schematicRunner.runSchematic('e2e', defaultOptions, workspaceTree);
    const content = tree.readContent('/projects/foo/src/app.po.ts');
    expect(content).toMatch(/app\-root/);
  });

  it('should set the rootSelector in the app.po.ts from the option', () => {
    const options = {...defaultOptions, rootSelector: 't-a-c-o'};
    const tree = schematicRunner.runSchematic('e2e', options, workspaceTree);
    const content = tree.readContent('/projects/foo/src/app.po.ts');
    expect(content).toMatch(/t\-a\-c\-o/);
  });

  it('should set the rootSelector in the app.po.ts from the option with emoji', () => {
    const options = {...defaultOptions, rootSelector: '🌮-🌯'};
    const tree = schematicRunner.runSchematic('e2e', options, workspaceTree);
    const content = tree.readContent('/projects/foo/src/app.po.ts');
    expect(content).toMatch(/🌮-🌯/);
  });

  describe('workspace config', () => {
    it('should create the e2e app', () => {
      const tree = schematicRunner.runSchematic('e2e', defaultOptions, workspaceTree);
      const workspace = JSON.parse(tree.readContent('/angular.json'));
      expect(workspace.projects.foo).toBeDefined();
    });

    it('should set 2 targets for the app', () => {
      const tree = schematicRunner.runSchematic('e2e', defaultOptions, workspaceTree);
      const workspace = JSON.parse(tree.readContent('/angular.json'));
      const architect = workspace.projects.foo.architect;
      expect(Object.keys(architect)).toEqual(['e2e', 'lint']);
    });

    it('should set the e2e options', () => {
      const tree = schematicRunner.runSchematic('e2e', defaultOptions, workspaceTree);
      const workspace = JSON.parse(tree.readContent('/angular.json'));
      const e2eOptions = workspace.projects.foo.architect.e2e.options;
      expect(e2eOptions.protractorConfig).toEqual('projects/foo/protractor.conf.js');
      expect(e2eOptions.devServerTarget).toEqual('app:serve');
    });

    it('should set the lint options', () => {
      const tree = schematicRunner.runSchematic('e2e', defaultOptions, workspaceTree);
      const workspace = JSON.parse(tree.readContent('/angular.json'));
      const lintOptions = workspace.projects.foo.architect.lint.options;
      expect(lintOptions.tsConfig).toEqual('projects/foo/tsconfig.e2e.json');
    });
  });
});
