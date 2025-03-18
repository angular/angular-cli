/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { tags } from '@angular-devkit/core';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as ApplicationOptions } from '../application/schema';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as AppShellOptions } from './schema';

describe('App Shell Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );
  const defaultOptions: AppShellOptions = {
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
    routing: true,
    skipTests: false,
    skipPackageJson: false,
  };
  let appTree: UnitTestTree;

  beforeEach(async () => {
    appTree = await schematicRunner.runSchematic('workspace', workspaceOptions);
  });

  describe('non standalone application', () => {
    beforeEach(async () => {
      appTree = await schematicRunner.runSchematic(
        'application',
        { ...appOptions, standalone: false },
        appTree,
      );
    });

    it('should ensure the client app has a router-outlet', async () => {
      appTree = await schematicRunner.runSchematic('workspace', workspaceOptions);
      appTree = await schematicRunner.runSchematic(
        'application',
        { ...appOptions, routing: false },
        appTree,
      );
      await expectAsync(
        schematicRunner.runSchematic('app-shell', defaultOptions, appTree),
      ).toBeRejected();
    });

    it('should add a server app', async () => {
      const tree = await schematicRunner.runSchematic('app-shell', defaultOptions, appTree);
      const filePath = '/projects/bar/src/app/app.module.server.ts';
      expect(tree.exists(filePath)).toEqual(true);
    });

    it('should not fail when AppModule have imported RouterModule already', async () => {
      const updateRecorder = appTree.beginUpdate('/projects/bar/src/app/app.module.ts');
      updateRecorder.insertLeft(0, "import { RouterModule } from '@angular/router';");
      appTree.commitUpdate(updateRecorder);

      const tree = await schematicRunner.runSchematic('app-shell', defaultOptions, appTree);
      const filePath = '/projects/bar/src/app/app.module.ts';
      const content = tree.readContent(filePath);
      expect(content).toMatch(/import { RouterModule } from '@angular\/router';/);
    });

    it('should work if server config was added prior to running the app-shell schematic', async () => {
      let tree = await schematicRunner.runSchematic('server', defaultOptions, appTree);
      tree = await schematicRunner.runSchematic('app-shell', defaultOptions, tree);
      expect(tree.exists('/projects/bar/src/app/app-shell/app-shell.ts')).toBe(true);
    });

    it('should create the shell component', async () => {
      const tree = await schematicRunner.runSchematic('app-shell', defaultOptions, appTree);
      expect(tree.exists('/projects/bar/src/app/app-shell/app-shell.ts')).toBe(true);
      const content = tree.readContent('/projects/bar/src/app/app.module.server.ts');
      expect(content).toMatch(/app-shell/);
    });
  });

  describe('standalone application', () => {
    beforeEach(async () => {
      appTree = await schematicRunner.runSchematic('application', appOptions, appTree);
    });

    it('should ensure the client app has a router-outlet', async () => {
      const appName = 'baz';
      appTree = await schematicRunner.runSchematic(
        'application',
        {
          ...appOptions,
          name: appName,
          routing: false,
        },
        appTree,
      );

      await expectAsync(
        schematicRunner.runSchematic('app-shell', { ...defaultOptions, project: appName }, appTree),
      ).toBeRejected();
    });

    it('should create the shell component', async () => {
      const tree = await schematicRunner.runSchematic('app-shell', defaultOptions, appTree);
      expect(tree.exists('/projects/bar/src/app/app-shell/app-shell.ts')).toBe(true);
      const content = tree.readContent('/projects/bar/src/app/app.config.server.ts');

      expect(content).toMatch(/app-shell/);
    });

    it(`should update the 'provideServerRendering' call to include 'withAppShell'`, async () => {
      const tree = await schematicRunner.runSchematic('app-shell', defaultOptions, appTree);
      const content = tree.readContent('/projects/bar/src/app/app.config.server.ts');
      expect(tags.oneLine`${content}`).toContain(
        tags.oneLine`provideServerRendering(withRoutes(serverRoutes), withAppShell(AppShell))`,
      );
    });

    it(`should add import to 'AppShell'`, async () => {
      const tree = await schematicRunner.runSchematic('app-shell', defaultOptions, appTree);
      const filePath = '/projects/bar/src/app/app.config.server.ts';
      const content = tree.readContent(filePath);
      expect(content).toContain(`import { AppShell } from './app-shell/app-shell';`);
    });
  });
});
