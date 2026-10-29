/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from 'typescript';
import { replaceBootstrap } from './transformation';

describe('replaceBootstrap', () => {
  function transformCode(
    files: Record<string, string>,
    entryFile = '/project/src/main.ts',
  ): string {
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      noLib: true,
    };

    const host: ts.CompilerHost = {
      getSourceFile: (fileName, languageVersion) =>
        files[fileName] !== undefined
          ? ts.createSourceFile(fileName, files[fileName], languageVersion, true)
          : undefined,
      getDefaultLibFileName: () => '/lib.d.ts',
      writeFile: () => undefined,
      getCurrentDirectory: () => '/project',
      getCanonicalFileName: (fileName) => fileName,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      fileExists: (fileName) => files[fileName] !== undefined,
      readFile: (fileName) => files[fileName],
    };

    const program = ts.createProgram([entryFile], compilerOptions, host);
    let output = '';
    const sourceFile = program.getSourceFile(entryFile);
    expect(sourceFile).toBeDefined();

    program.emit(
      sourceFile,
      (_fileName, text) => {
        output = text;
      },
      undefined,
      false,
      { before: [replaceBootstrap(() => program.getTypeChecker())] },
    );

    return output;
  }

  const platformBrowserDynamicStub = `
    export declare function platformBrowserDynamic(extraProviders?: unknown[]): {
      bootstrapModule(moduleType: unknown): Promise<unknown>;
    };
    export const VERSION = '0.0.0';
    export interface PlatformHelper {}
  `;

  it('replaces platformBrowserDynamic and removes its import when no other specifiers remain', () => {
    const output = transformCode({
      '/project/node_modules/@angular/platform-browser-dynamic/index.d.ts':
        platformBrowserDynamicStub,
      '/project/src/app.module.ts': 'export class AppModule {}',
      '/project/src/main.ts': `
        import { platformBrowserDynamic, PlatformHelper } from '@angular/platform-browser-dynamic';
        import { AppModule } from './app.module';

        export { PlatformHelper };
        platformBrowserDynamic().bootstrapModule(AppModule);
      `,
    });

    expect(output).toContain(`import * as __NgCli_bootstrap_1 from "@angular/platform-browser";`);
    expect(output).toContain(`__NgCli_bootstrap_1.platformBrowser().bootstrapModule(AppModule);`);
    expect(output).not.toContain('@angular/platform-browser-dynamic');
  });

  it('removes only platformBrowserDynamic specifier when another runtime export from the same module is used', () => {
    const output = transformCode({
      '/project/node_modules/@angular/platform-browser-dynamic/index.d.ts':
        platformBrowserDynamicStub,
      '/project/src/app.module.ts': 'export class AppModule {}',
      '/project/src/main.ts': `
        import { platformBrowserDynamic, VERSION, PlatformHelper } from '@angular/platform-browser-dynamic';
        import { AppModule } from './app.module';

        export type { PlatformHelper };
        export const version = VERSION;
        platformBrowserDynamic().bootstrapModule(AppModule);
      `,
    });

    expect(output).toContain(`import { VERSION } from '@angular/platform-browser-dynamic';`);
    expect(output).not.toContain('PlatformHelper');
    expect(output).toContain(`__NgCli_bootstrap_1.platformBrowser().bootstrapModule(AppModule);`);
  });
});
