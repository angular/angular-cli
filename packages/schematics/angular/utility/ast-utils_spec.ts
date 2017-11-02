
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { tags } from '@angular-devkit/core';
import { VirtualTree } from '@angular-devkit/schematics';
import * as ts from 'typescript';
import { Change, InsertChange } from '../utility/change';
import { getFileContent } from '../utility/test';
import { addExportToModule, addSymbolToNgModuleMetadata } from './ast-utils';


function getTsSource(path: string, content: string): ts.SourceFile {
  return ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);
}

function applyChanges(path: string, content: string, changes: Change[]): string {
  const tree = new VirtualTree();
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
});
