
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { tags } from '@angular-devkit/core';
import { HostTree } from '@angular-devkit/schematics';
import * as ts from '../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { Change, InsertChange } from '../utility/change';
import { getFileContent } from '../utility/test';
import {
  addDeclarationToModule,
  addExportToModule,
  addProviderToModule,
  addRouteDeclarationToModule,
  addSymbolToNgModuleMetadata,
} from './ast-utils';


function getTsSource(path: string, content: string): ts.SourceFile {
  return ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);
}

function applyChanges(path: string, content: string, changes: Change[]): string {
  const tree = new HostTree();
  tree.create(path, content);
  const exportRecorder = tree.beginUpdate(path);
  for (const change of changes) {
    if (change instanceof InsertChange) {
      exportRecorder.insertLeft(change.pos, change.toAdd);
    }
  }
  tree.commitUpdate(exportRecorder);

  return getFileContent(tree, path);
}

// tslint:disable-next-line:no-big-function
describe('ast utils', () => {
  let modulePath: string;
  let moduleContent: string;
  beforeEach(() => {
    modulePath = '/src/app/app.module.ts';
    moduleContent = `
      import { BrowserModule } from '@angular/platform-browser';
      import { NgModule } from '@angular/core';
      import { AppComponent } from './app.component';

      @NgModule({
        declarations: [
          AppComponent
        ],
        imports: [
          BrowserModule
        ],
        providers: [],
        bootstrap: [AppComponent]
      })
      export class AppModule { }
    `;
  });

  it('should add export to module', () => {
    const source = getTsSource(modulePath, moduleContent);
    const changes = addExportToModule(source, modulePath, 'FooComponent', './foo.component');
    const output = applyChanges(modulePath, moduleContent, changes);
    expect(output).toMatch(/import { FooComponent } from '.\/foo.component';/);
    expect(output).toMatch(/exports: \[FooComponent\]/);
  });

  it('should add export to module if not indented', () => {
    moduleContent = tags.stripIndents`${moduleContent}`;
    const source = getTsSource(modulePath, moduleContent);
    const changes = addExportToModule(source, modulePath, 'FooComponent', './foo.component');
    const output = applyChanges(modulePath, moduleContent, changes);
    expect(output).toMatch(/import { FooComponent } from '.\/foo.component';/);
    expect(output).toMatch(/exports: \[FooComponent\]/);
  });

  it('should add declarations to module if not indented', () => {
    moduleContent = tags.stripIndents`${moduleContent}`;
    const source = getTsSource(modulePath, moduleContent);
    const changes = addDeclarationToModule(source, modulePath, 'FooComponent', './foo.component');
    const output = applyChanges(modulePath, moduleContent, changes);
    expect(output).toMatch(/import { FooComponent } from '.\/foo.component';/);
    expect(output).toMatch(/declarations: \[\nAppComponent,\nFooComponent\n\]/);
  });

  it('should add metadata', () => {
    const source = getTsSource(modulePath, moduleContent);
    const changes = addSymbolToNgModuleMetadata(source, modulePath, 'imports', 'HelloWorld');
    expect(changes).not.toBeNull();

    const output = applyChanges(modulePath, moduleContent, changes || []);
    expect(output).toMatch(/imports: [\s\S]+,\n\s+HelloWorld\n\s+\]/m);
  });

  it('should add metadata (comma)', () => {
    const moduleContent = `
      import { BrowserModule } from '@angular/platform-browser';
      import { NgModule } from '@angular/core';

      @NgModule({
        declarations: [
          AppComponent
        ],
        imports: [
          BrowserModule,
        ],
        providers: [],
        bootstrap: [AppComponent]
      })
      export class AppModule { }
    `;
    const source = getTsSource(modulePath, moduleContent);
    const changes = addSymbolToNgModuleMetadata(source, modulePath, 'imports', 'HelloWorld');
    expect(changes).not.toBeNull();

    const output = applyChanges(modulePath, moduleContent, changes || []);
    expect(output).toMatch(/imports: [\s\S]+,\n\s+HelloWorld,\n\s+\]/m);
  });

  it('should add metadata (missing)', () => {
    const moduleContent = `
      import { BrowserModule } from '@angular/platform-browser';
      import { NgModule } from '@angular/core';

      @NgModule({
        declarations: [
          AppComponent
        ],
        providers: [],
        bootstrap: [AppComponent]
      })
      export class AppModule { }
    `;
    const source = getTsSource(modulePath, moduleContent);
    const changes = addSymbolToNgModuleMetadata(source, modulePath, 'imports', 'HelloWorld');
    expect(changes).not.toBeNull();

    const output = applyChanges(modulePath, moduleContent, changes || []);
    expect(output).toMatch(/imports: \[HelloWorld]\r?\n/m);
  });

  it('should add metadata (empty)', () => {
    const moduleContent = `
      import { BrowserModule } from '@angular/platform-browser';
      import { NgModule } from '@angular/core';

      @NgModule({
        declarations: [
          AppComponent
        ],
        providers: [],
        imports: [],
        bootstrap: [AppComponent]
      })
      export class AppModule { }
    `;
    const source = getTsSource(modulePath, moduleContent);
    const changes = addSymbolToNgModuleMetadata(source, modulePath, 'imports', 'HelloWorld');
    expect(changes).not.toBeNull();

    const output = applyChanges(modulePath, moduleContent, changes || []);
    expect(output).toMatch(/imports: \[HelloWorld],\r?\n/m);
  });

  it('should handle NgModule with no newlines', () => {
    const moduleContent = `
      import { BrowserModule } from '@angular/platform-browser';
      import { NgModule } from '@angular/core';

      @NgModule({imports: [BrowserModule], declarations: []})
      export class AppModule { }
    `;
    const source = getTsSource(modulePath, moduleContent);
    const changes = addExportToModule(source, modulePath, 'FooComponent', './foo.component');
    const output = applyChanges(modulePath, moduleContent, changes);
    expect(output).toMatch(/import { FooComponent } from '.\/foo.component';/);
    expect(output).toMatch(/exports: \[FooComponent\]/);
  });

  it('should add into providers metadata in new line ', () => {
    const moduleContent = `
      import { BrowserModule } from '@angular/platform-browser';
      import { NgModule } from '@angular/core';

      @NgModule({
        imports: [BrowserModule],
        declarations: [],
        providers: [
          {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthInterceptor,
            multi: true
          }
        ]
      })
      export class AppModule { }
    `;
    const source = getTsSource(modulePath, moduleContent);
    const changes = addProviderToModule(source, modulePath, 'LogService', './log.service');
    const output = applyChanges(modulePath, moduleContent, changes);
    expect(output).toMatch(/import { LogService } from '.\/log.service';/);
    expect(output).toMatch(/\},\r?\n\s*LogService\r?\n\s*\]/);
  });

  it('should add a route to the routes array', () => {
    const moduleContent = `
      import { BrowserModule } from '@angular/platform-browser';
      import { NgModule } from '@angular/core';
      import { AppComponent } from './app.component';

      const routes = [];

      @NgModule({
        declarations: [
          AppComponent
        ],
        imports: [
          BrowserModule,
          RouterModule.forRoot(routes)
        ],
        bootstrap: [AppComponent]
      })
      export class AppModule { }
    `;

    const source = getTsSource(modulePath, moduleContent);
    const changes = addRouteDeclarationToModule(
      source,
      './src/app', `{ path: 'foo', component: FooComponent }`,
    );
    const output = applyChanges(modulePath, moduleContent, [changes]);

    expect(output).toMatch(/const routes = \[{ path: 'foo', component: FooComponent }\]/);
  });

  it('should add a route to the routes array when there are multiple declarations', () => {
    const moduleContent = `
      import { BrowserModule } from '@angular/platform-browser';
      import { NgModule } from '@angular/core';
      import { AppComponent } from './app.component';

      const routes = [
        { path: 'foo', component: FooComponent }
      ];

      @NgModule({
        declarations: [
          AppComponent
        ],
        imports: [
          BrowserModule,
          RouterModule.forRoot(routes)
        ],
        bootstrap: [AppComponent]
      })
      export class AppModule { }
    `;

    const source = getTsSource(modulePath, moduleContent);
    const changes = addRouteDeclarationToModule(
      source,
      './src/app', `{ path: 'bar', component: BarComponent }`,
    );
    const output = applyChanges(modulePath, moduleContent, [changes]);

    expect(output).toMatch(
      // tslint:disable-next-line:max-line-length
      /const routes = \[\r?\n?\s*{ path: 'foo', component: FooComponent },\r?\n?\s*{ path: 'bar', component: BarComponent }\r?\n?\s*\]/,
    );
  });

  it('should add a route to the routes argument of RouteModule', () => {
    const moduleContent = `
      import { BrowserModule } from '@angular/platform-browser';
      import { NgModule } from '@angular/core';
      import { AppComponent } from './app.component';

      @NgModule({
        declarations: [
          AppComponent
        ],
        imports: [
          BrowserModule,
          RouterModule.forRoot([])
        ],
        bootstrap: [AppComponent]
      })
      export class AppModule { }
    `;

    const source = getTsSource(modulePath, moduleContent);
    const changes = addRouteDeclarationToModule(
      source,
      './src/app', `{ path: 'foo', component: FooComponent }`,
    );
    const output = applyChanges(modulePath, moduleContent, [changes]);

    expect(output).toMatch(/RouterModule\.forRoot\(\[{ path: 'foo', component: FooComponent }\]\)/);
  });

  // tslint:disable-next-line:max-line-length
  it('should add a route to the routes argument of RouterModule when there are multiple declarations', () => {
    const moduleContent = `
      import { BrowserModule } from '@angular/platform-browser';
      import { NgModule } from '@angular/core';
      import { AppComponent } from './app.component';

      @NgModule({
        declarations: [
          AppComponent
        ],
        imports: [
          BrowserModule,
          RouterModule.forRoot([{ path: 'foo', component: FooComponent }])
        ],
        bootstrap: [AppComponent]
      })
      export class AppModule { }
    `;

    const source = getTsSource(modulePath, moduleContent);
    const changes = addRouteDeclarationToModule(
      source,
      './src/app', `{ path: 'bar', component: BarComponent }`,
    );
    const output = applyChanges(modulePath, moduleContent, [changes]);

    expect(output).toMatch(
      // tslint:disable-next-line:max-line-length
      /RouterModule\.forRoot\(\[\r?\n?\s*{ path: 'foo', component: FooComponent },\r?\n?\s*{ path: 'bar', component: BarComponent }\r?\n?\s*\]\)/,
    );
  });
});
