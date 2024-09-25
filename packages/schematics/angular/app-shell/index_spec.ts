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
import { Builders } from '../utility/workspace-models';
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

    it('should add app shell configuration', async () => {
      const tree = await schematicRunner.runSchematic('app-shell', defaultOptions, appTree);
      const filePath = '/angular.json';
      const content = tree.readContent(filePath);
      const workspace = JSON.parse(content);
      const target = workspace.projects.bar.architect['build'];
      expect(target.configurations.production.appShell).toBeTrue();
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

    it('should add router module to client app module', async () => {
      const tree = await schematicRunner.runSchematic('app-shell', defaultOptions, appTree);
      const filePath = '/projects/bar/src/app/app.module.ts';
      const content = tree.readContent(filePath);
      expect(content).toMatch(/import { RouterModule } from '@angular\/router';/);
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

    describe('Add router-outlet', () => {
      function makeInlineTemplate(tree: UnitTestTree, template?: string): void {
        template =
          template ||
          `
      <p>
        App works!
      </p>`;
        const newText = `
        import { Component } from '@angular/core';

        @Component({
          selector: ''
          template: \`
            ${template}
          \`,
          styleUrls: ['./app.component.css']
        })
        export class AppComponent { }

      `;
        tree.overwrite('/projects/bar/src/app/app.component.ts', newText);
        tree.delete('/projects/bar/src/app/app.component.html');
      }

      it('should not re-add the router outlet (external template)', async () => {
        const htmlPath = '/projects/bar/src/app/app.component.html';
        appTree.overwrite(htmlPath, '<router-outlet></router-outlet>');
        const tree = await schematicRunner.runSchematic('app-shell', defaultOptions, appTree);
        const content = tree.readContent(htmlPath);
        const matches = content.match(/<router-outlet><\/router-outlet>/g);
        const numMatches = matches ? matches.length : 0;
        expect(numMatches).toEqual(1);
      });

      it('should not re-add the router outlet (inline template)', async () => {
        makeInlineTemplate(appTree, '<router-outlet></router-outlet>');
        const tree = await schematicRunner.runSchematic('app-shell', defaultOptions, appTree);
        const content = tree.readContent('/projects/bar/src/app/app.component.ts');
        const matches = content.match(/<router-outlet><\/router-outlet>/g);
        const numMatches = matches ? matches.length : 0;
        expect(numMatches).toEqual(1);
      });
    });

    it('should add router imports to server module', async () => {
      const tree = await schematicRunner.runSchematic('app-shell', defaultOptions, appTree);
      const filePath = '/projects/bar/src/app/app.module.server.ts';
      const content = tree.readContent(filePath);
      expect(content).toMatch(/import { Routes, RouterModule } from '@angular\/router';/);
    });

    it('should work if server config was added prior to running the app-shell schematic', async () => {
      let tree = await schematicRunner.runSchematic('server', defaultOptions, appTree);
      tree = await schematicRunner.runSchematic('app-shell', defaultOptions, tree);
      expect(tree.exists('/projects/bar/src/app/app-shell/app-shell.component.ts')).toBe(true);
    });

    it('should define a server route', async () => {
      const tree = await schematicRunner.runSchematic('app-shell', defaultOptions, appTree);
      const filePath = '/projects/bar/src/app/app.module.server.ts';
      const content = tree.readContent(filePath);
      expect(content).toMatch(/const routes: Routes = \[/);
    });

    it('should import RouterModule with forRoot', async () => {
      const tree = await schematicRunner.runSchematic('app-shell', defaultOptions, appTree);
      const filePath = '/projects/bar/src/app/app.module.server.ts';
      const content = tree.readContent(filePath);
      expect(content).toMatch(
        /const routes: Routes = \[ { path: 'shell', component: AppShellComponent }\];/,
      );
      expect(content).toMatch(/ServerModule,\r?\n\s*RouterModule\.forRoot\(routes\),/);
    });

    it('should create the shell component', async () => {
      const tree = await schematicRunner.runSchematic('app-shell', defaultOptions, appTree);
      expect(tree.exists('/projects/bar/src/app/app-shell/app-shell.component.ts')).toBe(true);
      const content = tree.readContent('/projects/bar/src/app/app.module.server.ts');
      expect(content).toMatch(/app-shell\.component/);
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
      expect(tree.exists('/projects/bar/src/app/app-shell/app-shell.component.ts')).toBe(true);
      const content = tree.readContent('/projects/bar/src/app/app.config.server.ts');
      expect(content).toMatch(/app-shell\.component/);
    });

    it('should define a server route', async () => {
      const tree = await schematicRunner.runSchematic('app-shell', defaultOptions, appTree);
      const filePath = '/projects/bar/src/app/app.config.server.ts';
      const content = tree.readContent(filePath);
      expect(tags.oneLine`${content}`).toContain(tags.oneLine`{
        provide: ROUTES,
        multi: true,
        useValue: [
          {
            path: 'shell',
            component: AppShellComponent
          }
        ]
      }`);
    });

    it(`should add import to 'ROUTES' token from '@angular/router'`, async () => {
      const tree = await schematicRunner.runSchematic('app-shell', defaultOptions, appTree);
      const filePath = '/projects/bar/src/app/app.config.server.ts';
      const content = tree.readContent(filePath);
      expect(content).toContain(`import { ROUTES } from '@angular/router';`);
    });

    it(`should add import to 'AppShellComponent'`, async () => {
      const tree = await schematicRunner.runSchematic('app-shell', defaultOptions, appTree);
      const filePath = '/projects/bar/src/app/app.config.server.ts';
      const content = tree.readContent(filePath);
      expect(content).toContain(
        `import { AppShellComponent } from './app-shell/app-shell.component';`,
      );
    });
  });
});
