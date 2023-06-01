/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
  findNodes,
  hasTopLevelIdentifier,
  insertAfterLastOccurrence,
  insertImport,
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
    expect(output).toMatch(/exports: \[\n(\s*) {2}FooComponent\n\1\]/);
  });

  it('should add export to module if not indented', () => {
    moduleContent = tags.stripIndents`${moduleContent}`;
    const source = getTsSource(modulePath, moduleContent);
    const changes = addExportToModule(source, modulePath, 'FooComponent', './foo.component');
    const output = applyChanges(modulePath, moduleContent, changes);
    expect(output).toMatch(/import { FooComponent } from '.\/foo.component';/);
    expect(output).toMatch(/exports: \[\n(\s*) {2}FooComponent\n\1\]/);
  });

  it('should add declarations to module if not indented', () => {
    moduleContent = tags.stripIndents`${moduleContent}`;
    const source = getTsSource(modulePath, moduleContent);
    const changes = addDeclarationToModule(source, modulePath, 'FooComponent', './foo.component');
    const output = applyChanges(modulePath, moduleContent, changes);
    expect(output).toMatch(/import { FooComponent } from '.\/foo.component';/);
    expect(output).toMatch(/declarations: \[\nAppComponent,\nFooComponent\n\]/);
  });

  it('should add declarations to module when PropertyAssignment is StringLiteral', () => {
    moduleContent = tags.stripIndents`
    import { BrowserModule } from '@angular/platform-browser';
    import { NgModule } from '@angular/core';
    import { AppComponent } from './app.component';

    @NgModule({
      "declarations": [
        AppComponent
      ],
      "imports": [
        BrowserModule
      ],
      "providers": [],
      "bootstrap": [AppComponent]
    })`;
    const source = getTsSource(modulePath, moduleContent);
    const changes = addDeclarationToModule(source, modulePath, 'FooComponent', './foo.component');
    const output = applyChanges(modulePath, moduleContent, changes);
    expect(output).toMatch(/import { FooComponent } from '.\/foo.component';/);
    expect(output).toMatch(/"declarations": \[\nAppComponent,\nFooComponent\n\]/);
  });

  it('should add metadata', () => {
    const source = getTsSource(modulePath, moduleContent);
    const changes = addSymbolToNgModuleMetadata(source, modulePath, 'imports', 'HelloWorld');
    expect(changes).not.toBeNull();

    const output = applyChanges(modulePath, moduleContent, changes || []);
    expect(output).toMatch(/imports: \[[^\]]+,\n(\s*) {2}HelloWorld\n\1\]/);
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
    expect(output).toMatch(/imports: \[[^\]]+,\n(\s*) {2}HelloWorld,\n\1\]/);
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
    expect(output).toMatch(/imports: \[\n(\s*) {2}HelloWorld\n\1\]/);
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
    expect(output).toMatch(/imports: \[\n(\s*) {2}HelloWorld\n\1\],\n/);
  });

  it(`should handle NgModule with newline after '@'`, () => {
    const moduleContent = `
      import { BrowserModule } from '@angular/platform-browser';
      import { NgModule } from '@angular/core';

      @
      NgModule({imports: [BrowserModule], declarations: []})
      export class AppModule { }
    `;
    const source = getTsSource(modulePath, moduleContent);
    const changes = addExportToModule(source, modulePath, 'FooComponent', './foo.component');
    const output = applyChanges(modulePath, moduleContent, changes);
    expect(output).toMatch(/import { FooComponent } from '.\/foo.component';/);
    expect(output).toMatch(/exports: \[FooComponent\]/);
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

  describe('insertAfterLastOccurrence', () => {
    const filePath = './src/foo.ts';

    it('should work for the default scenario', () => {
      const fileContent = `const arr = ['foo'];`;
      const source = getTsSource(filePath, fileContent);
      const arrayNode = findNodes(
        source.getChildren().shift() as ts.Node,
        ts.SyntaxKind.ArrayLiteralExpression,
      );
      const elements = (arrayNode.pop() as ts.ArrayLiteralExpression).elements;

      const change = insertAfterLastOccurrence(
        elements as unknown as ts.Node[],
        `, 'bar'`,
        filePath,
        elements.pos,
        ts.SyntaxKind.StringLiteral,
      );
      const output = applyChanges(filePath, fileContent, [change]);

      expect(output).toMatch(/const arr = \['foo', 'bar'\];/);
    });

    it('should work without occurrences', () => {
      const fileContent = `const arr = [];`;
      const source = getTsSource(filePath, fileContent);
      const arrayNode = findNodes(
        source.getChildren().shift() as ts.Node,
        ts.SyntaxKind.ArrayLiteralExpression,
      );
      const elements = (arrayNode.pop() as ts.ArrayLiteralExpression).elements;

      const change = insertAfterLastOccurrence(
        elements as unknown as ts.Node[],
        `'bar'`,
        filePath,
        elements.pos,
        ts.SyntaxKind.StringLiteral,
      );
      const output = applyChanges(filePath, fileContent, [change]);

      expect(output).toMatch(/const arr = \['bar'\];/);
    });
  });

  describe('addRouteDeclarationToModule', () => {
    it('should throw an error when there is no router module', () => {
      const moduleContent = `
        import { BrowserModule } from '@angular/platform-browser';
        import { NgModule } from '@angular/core';
        import { AppComponent } from './app.component';

        @NgModule({
          declarations: [
            AppComponent
          ],
          imports: [BrowserModule],
          bootstrap: [AppComponent]
        })
        export class AppModule { }
      `;

      const source = getTsSource(modulePath, moduleContent);
      const change = () => addRouteDeclarationToModule(source, './src/app', '');
      expect(change).toThrowError(/Couldn't find a route declaration in \.\/src\/app/);
    });

    it(`should throw an error when router module doesn't have arguments`, () => {
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
            RouterModule.forRoot()
          ],
          bootstrap: [AppComponent]
        })
        export class AppModule { }
      `;

      const source = getTsSource(modulePath, moduleContent);
      const change = () => addRouteDeclarationToModule(source, './src/app', '');
      expect(change).toThrowError(
        `The router module method doesn't have arguments at line 11 in ./src/app`,
      );
    });

    it(`should throw an error when the provided var (array) to router module doesn't exist`, () => {
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
            RouterModule.forRoot(routes)
          ],
          bootstrap: [AppComponent]
        })
        export class AppModule { }
      `;

      const source = getTsSource(modulePath, moduleContent);
      const change = () => addRouteDeclarationToModule(source, './src/app', '');
      expect(change).toThrowError(
        `No route declaration array was found that corresponds to router module at line 11 in ./src/app`,
      );
    });

    it(`should throw an error, if the provided first argument of router module is not an identifier`, () => {
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
            RouterModule.forRoot(42)
          ],
          bootstrap: [AppComponent]
        })
        export class AppModule { }
      `;

      const source = getTsSource(modulePath, moduleContent);
      const change = () => addRouteDeclarationToModule(source, './src/app', '');
      expect(change).toThrowError(
        `No route declaration array was found that corresponds to router module at line 11 in ./src/app`,
      );
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
        './src/app',
        `{ path: 'foo', component: FooComponent }`,
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
        './src/app',
        `{ path: 'bar', component: BarComponent }`,
      );
      const output = applyChanges(modulePath, moduleContent, [changes]);

      expect(output).toMatch(
        /const routes = \[\r?\n?\s*{ path: 'foo', component: FooComponent },\r?\n?\s*{ path: 'bar', component: BarComponent }\r?\n?\s*\]/,
      );
    });

    it('should add a route before the last wildcard path', () => {
      const moduleContent = `
        import { BrowserModule } from '@angular/platform-browser';
        import { NgModule } from '@angular/core';
        import { AppComponent } from './app.component';
        const routes = [
          { path: '**', component: FooComponent }
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
        './src/app',
        `{ path: 'bar', component: BarComponent }`,
      );
      const output = applyChanges(modulePath, moduleContent, [changes]);

      expect(output).toMatch(
        /const routes = \[\r?\n?\s*{ path: 'bar', component: BarComponent },\r?\n?\s*{ path: '\*\*', component: FooComponent }\r?\n?\s*\]/,
      );
    });

    it('should add a route to the routes to the correct array when having guards', () => {
      const moduleContent = `
        import { BrowserModule } from '@angular/platform-browser';
        import { NgModule } from '@angular/core';
        import { AppComponent } from './app.component';

        const routes = [
          { path: 'foo', component: FooComponent, canMatch: [Guard] }
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
        './src/app',
        `{ path: 'bar', component: BarComponent }`,
      );
      const output = applyChanges(modulePath, moduleContent, [changes]);
      /* eslint-disable max-len */
      expect(output).toMatch(
        /const routes = \[\r?\n?\s*{ path: 'foo', component: FooComponent, canMatch: \[Guard\] },\r?\n?\s*{ path: 'bar', component: BarComponent }\r?\n?\s*\]/,
      );
      /* eslint-enable max-len */
    });

    it('should add a route to the routes to the correct array when having nested object literal', () => {
      const moduleContent = `
        import { BrowserModule } from '@angular/platform-browser';
        import { NgModule } from '@angular/core';
        import { AppComponent } from './app.component';

        const routes = [
            { path: 'foo', component: FooComponent, data: { path: 'test' }}
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
        './src/app',
        `{ path: 'bar', component: BarComponent }`,
      );
      const output = applyChanges(modulePath, moduleContent, [changes]);
      expect(output).toMatch(
        // eslint-disable-next-line max-len
        /const routes = \[\r?\n?\s*{ path: 'foo', component: FooComponent, data: { path: 'test' }},\r?\n?\s*{ path: 'bar', component: BarComponent }\r?\n?\s*\]/,
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
        './src/app',
        `{ path: 'foo', component: FooComponent }`,
      );
      const output = applyChanges(modulePath, moduleContent, [changes]);

      expect(output).toMatch(
        /RouterModule\.forRoot\(\[{ path: 'foo', component: FooComponent }\]\)/,
      );
    });

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
        './src/app',
        `{ path: 'bar', component: BarComponent }`,
      );
      const output = applyChanges(modulePath, moduleContent, [changes]);

      expect(output).toMatch(
        // eslint-disable-next-line max-len
        /RouterModule\.forRoot\(\[\r?\n?\s*{ path: 'foo', component: FooComponent },\r?\n?\s*{ path: 'bar', component: BarComponent }\r?\n?\s*\]\)/,
      );
    });

    it('should error if sourcefile is empty', () => {
      const change = () =>
        addRouteDeclarationToModule(
          getTsSource(modulePath, ''),
          './src/app',
          `{ path: 'foo', component: FooComponent }`,
        );

      expect(change).toThrowError(/Couldn't find a route declaration in \.\/src\/app/);
    });
  });

  describe('findNodes', () => {
    const filePath = './src/foo.ts';
    const fileContent = `
      const a = {
        nodeAtDepth0: {
          nodeAtDepth1: {
            nodeAtDepth2: { nodeAtDepth3: 'foo' },
          },
        },
      };
    `;

    let recursive: boolean;

    describe('when `recursive` is not set', () => {
      beforeEach(() => {
        recursive = false;
      });

      it('should return node excluding nested nodes', () => {
        const source = getTsSource(filePath, fileContent);
        const paNodes = findNodes(source, ts.SyntaxKind.PropertyAssignment, Infinity, recursive);

        expect(paNodes.length).toEqual(1);
      });
    });

    describe('when `recursive` is set', () => {
      beforeEach(() => {
        recursive = true;
      });

      it('should return node including all nested nodes', () => {
        const source = getTsSource(filePath, fileContent);
        const paNodes = findNodes(source, ts.SyntaxKind.PropertyAssignment, Infinity, recursive);

        expect(paNodes.length).toEqual(4);
      });
    });
  });

  describe('insertImport', () => {
    const filePath = './src/foo.ts';

    it('should insert a new import into a file', () => {
      const fileContent = '';
      const source = getTsSource(filePath, fileContent);
      const change = insertImport(source, filePath, 'Component', '@angular/core');
      const result = applyChanges(filePath, fileContent, [change]).trim();

      expect(result).toBe(`import { Component } from '@angular/core';`);
    });

    it('should insert a new import under an alias into a file', () => {
      const fileContent = '';
      const source = getTsSource(filePath, fileContent);
      const change = insertImport(
        source,
        filePath,
        'Component',
        '@angular/core',
        false,
        'NgComponent',
      );
      const result = applyChanges(filePath, fileContent, [change]).trim();

      expect(result).toBe(`import { Component as NgComponent } from '@angular/core';`);
    });

    it('should reuse imports from the same module without an alias', () => {
      const fileContent = `import { Pipe } from '@angular/core';`;
      const source = getTsSource(filePath, fileContent);
      const change = insertImport(source, filePath, 'Component', '@angular/core');
      const result = applyChanges(filePath, fileContent, [change]).trim();

      expect(result).toBe(`import { Pipe, Component } from '@angular/core';`);
    });

    it('should reuse imports from the same module with an alias', () => {
      const fileContent = `import { Pipe } from '@angular/core';`;
      const source = getTsSource(filePath, fileContent);
      const change = insertImport(
        source,
        filePath,
        'Component',
        '@angular/core',
        false,
        'NgComponent',
      );
      const result = applyChanges(filePath, fileContent, [change]).trim();

      expect(result).toBe(`import { Pipe, Component as NgComponent } from '@angular/core';`);
    });

    it('should reuse imports for the same symbol', () => {
      const fileContent = `import { Component } from '@angular/core';`;
      const source = getTsSource(filePath, fileContent);
      const change = insertImport(source, filePath, 'Component', '@angular/core');
      const result = applyChanges(filePath, fileContent, [change]).trim();

      expect(result).toBe(fileContent);
    });

    it('should not insert a new import if the symbol is imported under an alias', () => {
      const fileContent = `import { Component as NgComponent } from '@angular/core';`;
      const source = getTsSource(filePath, fileContent);
      const change = insertImport(source, filePath, 'Component', '@angular/core');
      const result = applyChanges(filePath, fileContent, [change]).trim();

      expect(result).toBe(fileContent);
    });

    it('should insert a new default import into a file', () => {
      const fileContent = '';
      const source = getTsSource(filePath, fileContent);
      const change = insertImport(source, filePath, 'core', '@angular/core', true);
      const result = applyChanges(filePath, fileContent, [change]).trim();

      expect(result).toBe(`import core from '@angular/core';`);
    });

    it('should not insert an import if there is a namespace import', () => {
      const fileContent = `import * as foo from '@angular/core';`;
      const source = getTsSource(filePath, fileContent);
      const change = insertImport(source, filePath, 'Component', '@angular/core');
      const result = applyChanges(filePath, fileContent, [change]).trim();

      expect(result).toBe(fileContent);
    });
  });

  describe('hasTopLevelIdentifier', () => {
    const filePath = './src/foo.ts';

    it('should find top-level class declaration with a specific name', () => {
      const fileContent = `class FooClass {}`;
      const source = getTsSource(filePath, fileContent);

      expect(hasTopLevelIdentifier(source, 'FooClass')).toBe(true);
      expect(hasTopLevelIdentifier(source, 'Foo')).toBe(false);
    });

    it('should find top-level interface declaration with a specific name', () => {
      const fileContent = `interface FooInterface {}`;
      const source = getTsSource(filePath, fileContent);

      expect(hasTopLevelIdentifier(source, 'FooInterface')).toBe(true);
      expect(hasTopLevelIdentifier(source, 'Foo')).toBe(false);
    });

    it('should find top-level variable declaration with a specific name', () => {
      const fileContent = `
        const singleVar = 1;

        const fooVar = 1, barVar = 2;
      `;
      const source = getTsSource(filePath, fileContent);

      expect(hasTopLevelIdentifier(source, 'singleVar')).toBe(true);
      expect(hasTopLevelIdentifier(source, 'fooVar')).toBe(true);
      expect(hasTopLevelIdentifier(source, 'barVar')).toBe(true);
      expect(hasTopLevelIdentifier(source, 'bar')).toBe(false);
    });

    it('should find top-level imports with a specific name', () => {
      const fileContent = `
        import { FooInterface } from '@foo/interfaces';

        class FooClass implements FooInterface {}
      `;
      const source = getTsSource(filePath, fileContent);

      expect(hasTopLevelIdentifier(source, 'FooInterface')).toBe(true);
      expect(hasTopLevelIdentifier(source, 'Foo')).toBe(false);
    });

    it('should find top-level aliased imports with a specific name', () => {
      const fileContent = `
        import { FooInterface as AliasedFooInterface } from '@foo/interfaces';

        class FooClass implements AliasedFooInterface {}
      `;
      const source = getTsSource(filePath, fileContent);

      expect(hasTopLevelIdentifier(source, 'AliasedFooInterface')).toBe(true);
      expect(hasTopLevelIdentifier(source, 'FooInterface')).toBe(false);
      expect(hasTopLevelIdentifier(source, 'Foo')).toBe(false);
    });

    it('should be able to skip imports from a certain module', () => {
      const fileContent = `
        import { FooInterface } from '@foo/interfaces';

        class FooClass implements FooInterface {}
      `;
      const source = getTsSource(filePath, fileContent);

      expect(hasTopLevelIdentifier(source, 'FooInterface', '@foo/interfaces')).toBe(false);
    });
  });
});
