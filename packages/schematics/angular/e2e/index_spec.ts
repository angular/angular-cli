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

  beforeEach(async () => {
    const workspaceTree = await schematicRunner.runSchematic('workspace', workspaceOptions);

    applicationTree = await schematicRunner.runSchematic(
      'application',
      defaultAppOptions,
      workspaceTree,
    );
  });

  it('should create all files of e2e in an application', async () => {
    const tree = await schematicRunner.runSchematic('e2e', defaultOptions, applicationTree);

    const files = tree.files;
    expect(files).toEqual(
      jasmine.arrayContaining([
        '/projects/foo/e2e/protractor.conf.js',
        '/projects/foo/e2e/tsconfig.json',
        '/projects/foo/e2e/src/app.e2e-spec.ts',
        '/projects/foo/e2e/src/app.po.ts',
      ]),
    );
  });

  describe('workspace config', () => {
    it('should add e2e targets for the app', async () => {
      const tree = await schematicRunner.runSchematic('e2e', defaultOptions, applicationTree);

      const workspace = JSON.parse(tree.readContent('/angular.json'));
      const targets = workspace.projects.foo.architect;
      expect(targets.e2e).toBeDefined();
    });

    it('should set the e2e options', async () => {
      const tree = await schematicRunner.runSchematic('e2e', defaultOptions, applicationTree);

      const workspace = JSON.parse(tree.readContent('/angular.json'));
      const { options, configurations } = workspace.projects.foo.architect.e2e;
      expect(options.protractorConfig).toEqual('projects/foo/e2e/protractor.conf.js');
      expect(configurations.development.devServerTarget).toEqual('foo:serve:development');
    });
  });

  it('should add an e2e script in package.json', async () => {
    const tree = await schematicRunner.runSchematic('e2e', defaultOptions, applicationTree);

    const pkg = JSON.parse(tree.readContent('/package.json'));
    expect(pkg.scripts['e2e']).toBe('ng e2e');
  });
});
