/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { Schema as ApplicationOptions } from '../application/schema';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as AppShellOptions } from './schema';


describe('App Shell Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: AppShellOptions = {
    name: 'foo',
    clientProject: 'bar',
    universalProject: 'universal',
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
    style: 'css',
    skipTests: false,
    skipPackageJson: false,
  };
  let appTree: UnitTestTree;

  beforeEach(() => {
    appTree = schematicRunner.runSchematic('workspace', workspaceOptions);
    appTree = schematicRunner.runSchematic('application', appOptions, appTree);
  });


  it('should ensure the client app has a router-outlet', () => {
    appTree = schematicRunner.runSchematic('workspace', workspaceOptions);
    appTree = schematicRunner.runSchematic('application', {...appOptions, routing: false}, appTree);
    expect(() => {
      schematicRunner.runSchematic('appShell', defaultOptions, appTree);
    }).toThrowError();
  });

  it('should add a universal app', () => {
    const tree = schematicRunner.runSchematic('appShell', defaultOptions, appTree);
    const filePath = '/projects/bar/src/app/app.server.module.ts';
    expect(tree.exists(filePath)).toEqual(true);
  });

  it('should add app shell configuration', () => {
    const tree = schematicRunner.runSchematic('appShell', defaultOptions, appTree);
    const filePath = '/angular.json';
    const content = tree.readContent(filePath);
    const workspace = JSON.parse(content);
    const target = workspace.projects.bar.architect['app-shell'];
    expect(target.options.browserTarget).toEqual('bar:build');
    expect(target.options.serverTarget).toEqual('bar:server');
    expect(target.options.route).toEqual('shell');
  });

  it('should add router module to client app module', () => {
    const tree = schematicRunner.runSchematic('appShell', defaultOptions, appTree);
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

    it('should not re-add the router outlet (external template)', () => {
      const htmlPath = '/projects/bar/src/app/app.component.html';
      appTree.overwrite(htmlPath, '<router-outlet></router-outlet>');
      const tree = schematicRunner.runSchematic('appShell', defaultOptions, appTree);

      const content = tree.readContent(htmlPath);
      const matches = content.match(/<router\-outlet><\/router\-outlet>/g);
      const numMatches = matches ? matches.length : 0;
      expect(numMatches).toEqual(1);
    });

    it('should not re-add the router outlet (inline template)', () => {
      makeInlineTemplate(appTree, '<router-outlet></router-outlet>');
      const tree = schematicRunner.runSchematic('appShell', defaultOptions, appTree);
      const content = tree.readContent('/projects/bar/src/app/app.component.ts');
      const matches = content.match(/<router\-outlet><\/router\-outlet>/g);
      const numMatches = matches ? matches.length : 0;
      expect(numMatches).toEqual(1);
    });
  });

  it('should add router imports to server module', () => {
    const tree = schematicRunner.runSchematic('appShell', defaultOptions, appTree);
    const filePath = '/projects/bar/src/app/app.server.module.ts';
    const content = tree.readContent(filePath);
    expect(content).toMatch(/import { Routes, RouterModule } from \'@angular\/router\';/);
  });

  it('should define a server route', () => {
    const tree = schematicRunner.runSchematic('appShell', defaultOptions, appTree);
    const filePath = '/projects/bar/src/app/app.server.module.ts';
    const content = tree.readContent(filePath);
    expect(content).toMatch(/const routes: Routes = \[/);
  });

  it('should import RouterModule with forRoot', () => {
    const tree = schematicRunner.runSchematic('appShell', defaultOptions, appTree);
    const filePath = '/projects/bar/src/app/app.server.module.ts';
    const content = tree.readContent(filePath);
    expect(content)
      .toMatch(/const routes: Routes = \[ { path: 'shell', component: AppShellComponent }\];/);
    expect(content)
      .toMatch(/ServerModule,\r?\n\s*RouterModule\.forRoot\(routes\),/);
  });

  it('should create the shell component', () => {
    const tree = schematicRunner.runSchematic('appShell', defaultOptions, appTree);
    expect(tree.exists('/projects/bar/src/app/app-shell/app-shell.component.ts'));
    const content = tree.readContent('/projects/bar/src/app/app.server.module.ts');
    expect(content).toMatch(/app\-shell\.component/);
  });
});
