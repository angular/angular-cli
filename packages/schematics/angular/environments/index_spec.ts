/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as ApplicationOptions } from '../application/schema';
import { Builders } from '../utility/workspace-models';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as EnvironmentOptions } from './schema';

describe('Environments Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );

  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '15.0.0',
  };

  const defaultOptions: EnvironmentOptions = {
    project: 'foo',
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

  function runEnvironmentsSchematic(): Promise<UnitTestTree> {
    return schematicRunner.runSchematic('environments', defaultOptions, applicationTree);
  }

  function convertBuilderToLegacyBrowser(): void {
    const config = JSON.parse(applicationTree.readContent('/angular.json'));
    const build = config.projects.foo.architect.build;

    build.builder = Builders.Browser;
    build.options = {
      ...build.options,
      main: build.options.browser,
      browser: undefined,
    };

    build.configurations.development = {
      ...build.configurations.development,
      vendorChunk: true,
      namedChunks: true,
      buildOptimizer: false,
    };

    applicationTree.overwrite('/angular.json', JSON.stringify(config, undefined, 2));
  }

  beforeEach(async () => {
    const workspaceTree = await schematicRunner.runSchematic('workspace', workspaceOptions);
    applicationTree = await schematicRunner.runSchematic(
      'application',
      defaultAppOptions,
      workspaceTree,
    );
  });

  it('should create a default environment typescript file', async () => {
    const tree = await runEnvironmentsSchematic();
    expect(tree.readText('projects/foo/src/environments/environment.ts')).toEqual(
      'export const environment = {};\n',
    );
  });

  it('should create a development configuration environment typescript file', async () => {
    const tree = await runEnvironmentsSchematic();
    expect(tree.readText('projects/foo/src/environments/environment.development.ts')).toEqual(
      'export const environment = {};\n',
    );
  });

  it('should create environment typescript files for additional configurations', async () => {
    const initialWorkspace = JSON.parse(applicationTree.readContent('/angular.json'));
    initialWorkspace.projects.foo.architect.build.configurations.staging = {};
    applicationTree.overwrite('/angular.json', JSON.stringify(initialWorkspace));

    const tree = await runEnvironmentsSchematic();
    expect(tree.readText('projects/foo/src/environments/environment.development.ts')).toEqual(
      'export const environment = {};\n',
    );

    expect(tree.readText('projects/foo/src/environments/environment.staging.ts')).toEqual(
      'export const environment = {};\n',
    );
  });

  it('should update the angular.json file replacements option for the development configuration', async () => {
    const tree = await runEnvironmentsSchematic();
    const workspace = JSON.parse(tree.readContent('/angular.json'));

    const developmentConfiguration =
      workspace.projects.foo.architect.build.configurations.development;
    expect(developmentConfiguration).toEqual(
      jasmine.objectContaining({
        fileReplacements: [
          {
            replace: 'projects/foo/src/environments/environment.ts',
            with: 'projects/foo/src/environments/environment.development.ts',
          },
        ],
      }),
    );
  });

  it('should update the angular.json file replacements option for additional configurations', async () => {
    const initialWorkspace = JSON.parse(applicationTree.readContent('/angular.json'));
    initialWorkspace.projects.foo.architect.build.configurations.staging = {};
    applicationTree.overwrite('/angular.json', JSON.stringify(initialWorkspace));

    const tree = await runEnvironmentsSchematic();
    const workspace = JSON.parse(tree.readContent('/angular.json'));

    const developmentConfiguration =
      workspace.projects.foo.architect.build.configurations.development;
    expect(developmentConfiguration).toEqual(
      jasmine.objectContaining({
        fileReplacements: [
          {
            replace: 'projects/foo/src/environments/environment.ts',
            with: 'projects/foo/src/environments/environment.development.ts',
          },
        ],
      }),
    );

    const stagingConfiguration = workspace.projects.foo.architect.build.configurations.staging;
    expect(stagingConfiguration).toEqual(
      jasmine.objectContaining({
        fileReplacements: [
          {
            replace: 'projects/foo/src/environments/environment.ts',
            with: 'projects/foo/src/environments/environment.staging.ts',
          },
        ],
      }),
    );
  });
});
