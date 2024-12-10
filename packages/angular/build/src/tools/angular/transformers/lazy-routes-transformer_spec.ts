/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from 'typescript';
import { lazyRoutesTransformer } from './lazy-routes-transformer';

describe('lazyRoutesTransformer', () => {
  let program: ts.Program;
  let compilerHost: ts.CompilerHost;

  beforeEach(() => {
    // Mock a basic TypeScript program and compilerHost
    program = ts.createProgram(['/project/src/dummy.ts'], { basePath: '/project/' });
    compilerHost = {
      getNewLine: () => '\n',
      fileExists: () => true,
      readFile: () => '',
      writeFile: () => undefined,
      getCanonicalFileName: (fileName: string) => fileName,
      getCurrentDirectory: () => '/project',
      getDefaultLibFileName: () => 'lib.d.ts',
      getSourceFile: () => undefined,
      useCaseSensitiveFileNames: () => true,
      resolveModuleNames: (moduleNames, containingFile) =>
        moduleNames.map(
          (name) =>
            ({
              resolvedFileName: `/project/src/${name}.ts`,
            }) as ts.ResolvedModule,
        ),
    };
  });

  const transformSourceFile = (sourceCode: string): ts.SourceFile => {
    const sourceFile = ts.createSourceFile(
      '/project/src/dummy.ts',
      sourceCode,
      ts.ScriptTarget.ESNext,
      true,
      ts.ScriptKind.TS,
    );

    const transformer = lazyRoutesTransformer(program.getCompilerOptions(), compilerHost);
    const result = ts.transform(sourceFile, [transformer]);

    return result.transformed[0];
  };

  it('should return the same object when the routes array contains an empty object', () => {
    const source = `
      const routes = [{}];
    `;

    const transformedSourceFile = transformSourceFile(source);
    const transformedCode = ts.createPrinter().printFile(transformedSourceFile);

    expect(transformedCode).toContain(`const routes = [{}]`);
  });

  it('should add ɵentryName property to object with loadComponent and path (Arrow function)', () => {
    const source = `
      const routes = [
        {
          path: 'home',
          loadComponent: () => import('./home').then(m => m.HomeComponent)
        }
      ];
    `;

    const transformedSourceFile = transformSourceFile(source);
    const transformedCode = ts.createPrinter().printFile(transformedSourceFile);

    expect(transformedCode).toContain(
      `...(typeof ngServerMode !== "undefined" && ngServerMode ? { ɵentryName: "src/home.ts" } : {})`,
    );
  });

  it('should add ɵentryName property to object with loadComponent and path (Arrow function with return)', () => {
    const source = `
      const routes = [
        {
          path: 'home',
          loadComponent: () => {
            return import('./home').then(m => m.HomeComponent);
          }
        }
      ];
    `;

    const transformedSourceFile = transformSourceFile(source);
    const transformedCode = ts.createPrinter().printFile(transformedSourceFile);

    expect(transformedCode).toContain(
      `...(typeof ngServerMode !== "undefined" && ngServerMode ? { ɵentryName: "src/home.ts" } : {})`,
    );
  });

  it('should add ɵentryName property to object with loadComponent and path (Arrow function without .then)', () => {
    const source = `
      const routes = [
        {
          path: 'about',
          loadComponent: () => import('./about')
        }
      ];
    `;

    const transformedSourceFile = transformSourceFile(source);
    const transformedCode = ts.createPrinter().printFile(transformedSourceFile);

    expect(transformedCode).toContain(
      `...(typeof ngServerMode !== "undefined" && ngServerMode ? { ɵentryName: "src/about.ts" } : {})`,
    );
  });

  it('should add ɵentryName property to object with loadComponent using return and .then', () => {
    const source = `
      const routes = [
        {
          path: '',
          loadComponent: () => {
            return import('./home').then((m) => m.HomeComponent);
          }
        }
      ];
    `;

    const transformedSourceFile = transformSourceFile(source);
    const transformedCode = ts.createPrinter().printFile(transformedSourceFile);

    expect(transformedCode).toContain(
      `...(typeof ngServerMode !== "undefined" && ngServerMode ? { ɵentryName: "src/home.ts" } : {})`,
    );
  });

  it('should add ɵentryName property to object with loadComponent and path (Function expression)', () => {
    const source = `
      const routes = [
        {
          path: 'home',
          loadComponent: function () { return import('./home').then(m => m.HomeComponent) }
        }
      ];
    `;

    const transformedSourceFile = transformSourceFile(source);
    const transformedCode = ts.createPrinter().printFile(transformedSourceFile);

    expect(transformedCode).toContain(
      `...(typeof ngServerMode !== "undefined" && ngServerMode ? { ɵentryName: "src/home.ts" } : {})`,
    );
  });

  it('should not modify unrelated object literals', () => {
    const source = `
      const routes = [
        {
          path: 'home',
          component: HomeComponent
        }
      ];
    `;

    const transformedSourceFile = transformSourceFile(source);
    const transformedCode = ts.createPrinter().printFile(transformedSourceFile);

    expect(transformedCode).not.toContain(`ɵentryName`);
  });

  it('should ignore loadComponent without a valid import call', () => {
    const source = `
      const routes = [
        {
          path: 'home',
          loadComponent: () => someFunction()
        }
      ];
    `;

    const transformedSourceFile = transformSourceFile(source);
    const transformedCode = ts.createPrinter().printFile(transformedSourceFile);

    expect(transformedCode).not.toContain(`ɵentryName`);
  });

  it('should resolve paths relative to basePath', () => {
    const source = `
      const routes = [
        {
          path: 'about',
          loadChildren: () => import('./features/about').then(m => m.AboutModule)
        }
      ];
    `;

    const transformedSourceFile = transformSourceFile(source);
    const transformedCode = ts.createPrinter().printFile(transformedSourceFile);

    expect(transformedCode).toContain(
      `...(typeof ngServerMode !== "undefined" && ngServerMode ? { ɵentryName: "src/features/about.ts" } : {})`,
    );
  });
});
