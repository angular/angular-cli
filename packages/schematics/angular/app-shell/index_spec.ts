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
import { Schema as AppShellOptions } from './schema';


describe('App Shell Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );
  const defaultOptions: AppShellOptions = {
    name: 'foo',
    clientProject: 'bar',
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
    appTree = await schematicRunner.runSchematicAsync('workspace', workspaceOptions).toPromise();
    appTree = await schematicRunner.runSchematicAsync('application', appOptions, appTree)
      .toPromise();
  });

  it('should ensure the client app has a router-outlet', async () => {
    appTree = await schematicRunner.runSchematicAsync('workspace', workspaceOptions).toPromise();
    appTree = await schematicRunner.runSchematicAsync(
      'application',
      {...appOptions, routing: false},
      appTree,
    ).toPromise();
    await expectAsync(
      schematicRunner.runSchematicAsync('appShell', defaultOptions, appTree).toPromise(),
    ).toBeRejected();
  });

  it('should add a universal app', async () => {
    const tree = await schematicRunner.runSchematicAsync('appShell', defaultOptions, appTree)
      .toPromise();
    const filePath = '/projects/bar/src/app/app.server.module.ts';
    expect(tree.exists(filePath)).toEqual(true);
  });

  it('should add app shell configuration', async () => {
    const tree = await schematicRunner.runSchematicAsync('appShell', defaultOptions, appTree)
      .toPromise();
    const filePath = '/angular.json';
    const content = tree.readContent(filePath);
    const workspace = JSON.parse(content);
    const target = workspace.projects.bar.architect['app-shell'];
    expect(target.options.browserTarget).toEqual('bar:build');
    expect(target.options.serverTarget).toEqual('bar:server');
    expect(target.options.route).toEqual('shell');
    expect(target.configurations.production.browserTarget).toEqual('bar:build:production');
    expect(target.configurations.production.serverTarget).toEqual('bar:server:production');
  });

  it('should add router module to client app module', async () => {
    const tree = await schematicRunner.runSchematicAsync('appShell', defaultOptions, appTree)
      .toPromise();
    const filePath = '/projects/bar/src/app/app.module.ts';
    const content = tree.readContent(filePath);
    expect(content).toMatch(/import { RouterModule } from \'@angular\/router\';/);
  });

  it('should not fail when AppModule have imported RouterModule already', async () => {
    const updateRecorder = appTree.beginUpdate('/projects/bar/src/app/app.module.ts');
    updateRecorder.insertLeft(0, 'import { RouterModule } from \'@angular/router\';');
    appTree.commitUpdate(updateRecorder);

    const tree = await schematicRunner.runSchematicAsync('appShell', defaultOptions, appTree)
      .toPromise();
    const filePath = '/projects/bar/src/app/app.module.ts';
    const content = tree.readContent(filePath);
    expect(content).toMatch(/import { RouterModule } from \'@angular\/router\';/);
  });

  describe('Add router-outlet', () => {
    function makeInlineTemplate(tree: UnitTestTree, template?: string): void {
      template = template || `
      <p>
        App works!
      </p>`;
      const newText = `
        import { Component, OnInit } from '@angular/core';

        @Component({
          selector: ''
          template: \`
            ${template}
          \`,
          styleUrls: ['./app.component.css']
        })
        export class AppComponent implements OnInit {

          constructor() { }

          ngOnInit() {
          }

        }

      `;
      tree.overwrite('/projects/bar/src/app/app.component.ts', newText);
      tree.delete('/projects/bar/src/app/app.component.html');
    }

    it('should not re-add the router outlet (external template)', async () => {
      const htmlPath = '/projects/bar/src/app/app.component.html';
      appTree.overwrite(htmlPath, '<router-outlet></router-outlet>');
      const tree = await schematicRunner.runSchematicAsync('appShell', defaultOptions, appTree)
        .toPromise();

      const content = tree.readContent(htmlPath);
      const matches = content.match(/<router\-outlet><\/router\-outlet>/g);
      const numMatches = matches ? matches.length : 0;
      expect(numMatches).toEqual(1);
    });

    it('should not re-add the router outlet (inline template)', async () => {
      makeInlineTemplate(appTree, '<router-outlet></router-outlet>');
      const tree = await schematicRunner.runSchematicAsync('appShell', defaultOptions, appTree)
        .toPromise();
      const content = tree.readContent('/projects/bar/src/app/app.component.ts');
      const matches = content.match(/<router\-outlet><\/router\-outlet>/g);
      const numMatches = matches ? matches.length : 0;
      expect(numMatches).toEqual(1);
    });
  });

  it('should add router imports to server module', async () => {
    const tree = await schematicRunner.runSchematicAsync('appShell', defaultOptions, appTree)
      .toPromise();
    const filePath = '/projects/bar/src/app/app.server.module.ts';
    const content = tree.readContent(filePath);
    expect(content).toMatch(/import { Routes, RouterModule } from \'@angular\/router\';/);
  });

  it('should define a server route', async () => {
    const tree = await schematicRunner.runSchematicAsync('appShell', defaultOptions, appTree)
      .toPromise();
    const filePath = '/projects/bar/src/app/app.server.module.ts';
    const content = tree.readContent(filePath);
    expect(content).toMatch(/const routes: Routes = \[/);
  });

  it('should import RouterModule with forRoot', async () => {
    const tree = await schematicRunner.runSchematicAsync('appShell', defaultOptions, appTree)
      .toPromise();
    const filePath = '/projects/bar/src/app/app.server.module.ts';
    const content = tree.readContent(filePath);
    expect(content)
      .toMatch(/const routes: Routes = \[ { path: 'shell', component: AppShellComponent }\];/);
    expect(content)
      .toMatch(/ServerModule,\r?\n\s*RouterModule\.forRoot\(routes\),/);
  });

  it('should create the shell component', async () => {
    const tree = await schematicRunner.runSchematicAsync('appShell', defaultOptions, appTree)
      .toPromise();
    expect(tree.exists('/projects/bar/src/app/app-shell/app-shell.component.ts')).toBe(true);
    const content = tree.readContent('/projects/bar/src/app/app.server.module.ts');
    expect(content).toMatch(/app\-shell\.component/);
  });
});
