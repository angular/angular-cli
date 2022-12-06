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
import { Schema as EnvironmentOptions } from './schema';

describe('Application Schematic', () => {
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
  const messages: string[] = [];
  schematicRunner.logger.subscribe((x) => messages.push(x.message));

  function runEnvironmentsSchematic(): Promise<UnitTestTree> {
    return schematicRunner.runSchematic('environments', defaultOptions, applicationTree);
  }

  beforeEach(async () => {
    messages.length = 0;
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

  it('should update the angular.json file replacements option for server configurations', async () => {
    await schematicRunner.runSchematic(
      'universal',
      { project: 'foo', skipInstall: true },
      applicationTree,
    );

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

    const serverDevelopmentConfiguration =
      workspace.projects.foo.architect.server.configurations.development;
    expect(serverDevelopmentConfiguration).toEqual(
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
});
