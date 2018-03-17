/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { Schema as NgNewOptions } from '../ng-new/schema';
import { Schema as AppShellOptions } from './schema';


// TODO: fix these tests once workspace is implemented
xdescribe('App Shell Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: AppShellOptions = {
    name: 'foo',
    universalApp: 'universal',
  };

  let appTree: Tree;
  const appOptions: NgNewOptions = {
    directory: '',
    name: 'appshell-app',
    inlineStyle: false,
    inlineTemplate: false,
    viewEncapsulation: 'None',
    version: '1.2.3',
    routing: true,
    style: 'css',
    skipTests: false,
  };

  beforeEach(() => {
    appTree = schematicRunner.runSchematic('ng-new', appOptions);
  });

  it('should ensure the client app has a router-outlet', () => {
    appTree = schematicRunner.runSchematic('ng-new', {...appOptions, routing: false});
    expect(() => {
      schematicRunner.runSchematic('appShell', defaultOptions, appTree);
    }).toThrowError();
  });

  it('should add a universal app', () => {
    const tree = schematicRunner.runSchematic('appShell', defaultOptions, appTree);
    const filePath = '/src/app/app.server.module.ts';
    const file = tree.files.filter(f => f === filePath)[0];
    expect(file).toBeDefined();
  });

  it('should use an existing universal app', () => {
    const universalOptions = {
      name: defaultOptions.universalApp,
    };

    let tree = schematicRunner.runSchematic('universal', universalOptions, appTree);
    const filePath = '/.angular-cli.json';
    let content = tree.readContent(filePath);
    let config = JSON.parse(content);
    const appCount = config.apps.length;

    tree = schematicRunner.runSchematic('appShell', defaultOptions, tree);
    content = tree.readContent(filePath);
    config = JSON.parse(content);
    expect(config.apps.length).toBe(appCount);
  });

  it('should add app shell configuration', () => {
    const tree = schematicRunner.runSchematic('appShell', defaultOptions, appTree);
    const filePath = '/.angular-cli.json';
    const content = tree.readContent(filePath);
    const config = JSON.parse(content);
    const app = config.apps[0];
    expect(app.appShell).toBeDefined();
    expect(app.appShell.app).toEqual('universal');
    expect(app.appShell.route).toEqual('shell');
  });

  it('should add router module to client app module', () => {
    const tree = schematicRunner.runSchematic('appShell', defaultOptions, appTree);
    const filePath = '/src/app/app.module.ts';
    const content = tree.readContent(filePath);
    expect(content).toMatch(/import { RouterModule } from \'@angular\/router\';/);
  });

  describe('Add router-outlet', () => {
    function makeInlineTemplate(tree: Tree, template?: string): void {
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
      tree.overwrite('/src/app/app.component.ts', newText);
      tree.delete('/src/app/app.component.html');
    }

    it('should not re-add the router outlet (external template)', () => {
      const htmlPath = '/src/app/app.component.html';
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
      const content = tree.readContent('/src/app/app.component.ts');
      const matches = content.match(/<router\-outlet><\/router\-outlet>/g);
      const numMatches = matches ? matches.length : 0;
      expect(numMatches).toEqual(1);
    });
  });

  it('should add router imports to server module', () => {
    const tree = schematicRunner.runSchematic('appShell', defaultOptions, appTree);
    const filePath = '/src/app/app.server.module.ts';
    const content = tree.readContent(filePath);
    // tslint:disable-next-line:max-line-length
    expect(content).toMatch(/import { Routes, RouterModule } from \'@angular\/router\';/);
  });

  it('should define a server route', () => {
    const tree = schematicRunner.runSchematic('appShell', defaultOptions, appTree);
    const filePath = '/src/app/app.server.module.ts';
    const content = tree.readContent(filePath);
    expect(content).toMatch(/const routes: Routes = \[/);
  });

  it('should import RouterModule with forRoot', () => {
    const tree = schematicRunner.runSchematic('appShell', defaultOptions, appTree);
    const filePath = '/src/app/app.server.module.ts';
    const content = tree.readContent(filePath);
    expect(content)
      .toMatch(/const routes: Routes = \[ { path: 'shell', component: AppShellComponent }\];/);
    expect(content)
      .toMatch(/ServerModule,\r?\n\s*RouterModule\.forRoot\(routes\),/);
  });

  it('should create the shell component', () => {
    const tree = schematicRunner.runSchematic('appShell', defaultOptions, appTree);
    expect(tree.exists('/src/app/app-shell/app-shell.component.ts'));
    const content = tree.readContent('/src/app/app.server.module.ts');
    expect(content).toMatch(/app\-shell\.component/);
  });
});
