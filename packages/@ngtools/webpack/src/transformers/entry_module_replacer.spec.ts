import { oneLine } from 'common-tags';
import * as ts from 'typescript';
import { createEntryModuleReplacer, EntryModuleReplacerOptions } from './entry_module_replacer';

type TransformerFactoryCreator<T extends ts.Node, TOptions> =
  (typeChecker: () => ts.TypeChecker, options?: TOptions) => ts.TransformerFactory<T>;

function transform<TOptions = {}>(
  content: string,
  creator?: TransformerFactoryCreator<ts.SourceFile, TOptions>,
  options?: TOptions,
  module?: ts.ModuleKind,
): string | undefined {
  let result: string | undefined;
  const source = ts.createSourceFile('temp.ts', content, ts.ScriptTarget.Latest);
  const compilerOptions: ts.CompilerOptions = {
    isolatedModules: true,
    noLib: true,
    noResolve: true,
    target: ts.ScriptTarget.Latest,
    importHelpers: true,
    module,
  };
  const compilerHost: ts.CompilerHost = {
    getSourceFile: (fileName) => {
      if (fileName === source.fileName) {
        return source;
      }
      throw new Error();
    },
    getDefaultLibFileName: () => 'lib.d.ts',
    writeFile: (fileName, data) => {
      if (fileName === 'temp.js') {
        result = data;
      }
    },
    getCurrentDirectory: () => '',
    getDirectories: () => [],
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => false,
    getNewLine: () => '\n',
    fileExists: (fileName) => fileName === source.fileName,
    readFile: (_fileName) => '',
  };

  const program = ts.createProgram([source.fileName], compilerOptions, compilerHost);

  const factory = creator ? creator(program.getTypeChecker, options) : undefined;
  const transformers = factory ? { before: [factory] } : undefined;
  program.emit(undefined, undefined, undefined, undefined, transformers);

  return result;
}

function expectTransformation(
  input: string,
  output: string,
  options?: EntryModuleReplacerOptions,
  module?: ts.ModuleKind,
): void {
  const inputResult = transform(input, createEntryModuleReplacer, options, module);

  expect(oneLine`${inputResult}`).toEqual(oneLine`${output}`);
}

describe('entry module replacer', () => {

  it('replaces bootstrap call from default main.ts', () => {
    const input = `
      import { enableProdMode } from '@angular/core';
      import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

      import { AppModule } from './app/app.module';
      import { environment } from './environments/environment';

      if (environment.production) {
        enableProdMode();
      }

      platformBrowserDynamic().bootstrapModule(AppModule);
    `;
    const output = `
      import { platformBrowser as platformBrowser_1 } from "@angular/platform-browser";
      import { AppModuleNgFactory as AppModuleNgFactory_1 } from "./app/app.module.ngfactory";
      import { enableProdMode } from '@angular/core';

      import { AppModule } from './app/app.module';
      import { environment } from './environments/environment';

      if (environment.production) {
        enableProdMode();
      }

      platformBrowser_1().bootstrapModuleFactory(AppModuleNgFactory_1);
    `;

    expectTransformation(input, output);
  });

  it('replaces bootstrap call directly from platform call', () => {
    const input = `
      import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
      import { AppModule } from './app/app.module';

      platformBrowserDynamic().bootstrapModule(AppModule);
    `;
    const output = `
      import { platformBrowser as platformBrowser_1 } from "@angular/platform-browser";
      import { AppModuleNgFactory as AppModuleNgFactory_1 } from "./app/app.module.ngfactory";
      import { AppModule } from './app/app.module';

      platformBrowser_1().bootstrapModuleFactory(AppModuleNgFactory_1);
    `;

    expectTransformation(input, output);
  });

  it('only removes unused specifiers from relevant imports', () => {
    const input = `
      import { platformBrowserDynamic, VERSION } from '@angular/platform-browser-dynamic';
      import { AppModule } from './app/app.module';

      console.log(VERSION);
      platformBrowserDynamic().bootstrapModule(AppModule);
    `;
    const output = `
      import { platformBrowser as platformBrowser_1 } from "@angular/platform-browser";
      import { AppModuleNgFactory as AppModuleNgFactory_1 } from "./app/app.module.ngfactory";
      import { VERSION } from '@angular/platform-browser-dynamic';
      import { AppModule } from './app/app.module';

      console.log(VERSION);
      platformBrowser_1().bootstrapModuleFactory(AppModuleNgFactory_1);
    `;

    expectTransformation(input, output);
  });

  it('keeps used relevant imports', () => {
    const input = `
      import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
      import { AppModule } from './app/app.module';

      const test = platformBrowserDynamic();
      platformBrowserDynamic().bootstrapModule(AppModule);
    `;
    const output = `
      import { platformBrowser as platformBrowser_1 } from "@angular/platform-browser";
      import { AppModuleNgFactory as AppModuleNgFactory_1 } from "./app/app.module.ngfactory";
      import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
      import { AppModule } from './app/app.module';

      const test = platformBrowserDynamic();
      platformBrowser_1().bootstrapModuleFactory(AppModuleNgFactory_1);
    `;

    expectTransformation(input, output);
  });

  it('replaces bootstrap call with CommonJS output', () => {
    const input = `
      import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
      import { AppModule } from './app/app.module';

      platformBrowserDynamic().bootstrapModule(AppModule);
    `;
    /* tslint:disable:max-line-length */
    const output = `
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      const platformBrowser_1 = require("@angular/platform-browser");
      const AppModuleNgFactory_1 = require("./app/app.module.ngfactory");
      const app_module_1 = require("./app/app.module");
      platformBrowser_1.platformBrowser().bootstrapModuleFactory(AppModuleNgFactory_1.AppModuleNgFactory);
    `;
    /* tslint:enable:max-line-length */

    expectTransformation(input, output, undefined, ts.ModuleKind.CommonJS);
  });

  it('replaces bootstrap call with aliased imports (platform only)', () => {
    const input = `
      import { platformBrowserDynamic as pbd } from '@angular/platform-browser-dynamic';
      import { AppModule } from './app/app.module';

      pbd().bootstrapModule(AppModule);
    `;
    const output = `
      import { platformBrowser as platformBrowser_1 } from "@angular/platform-browser";
      import { AppModuleNgFactory as AppModuleNgFactory_1 } from "./app/app.module.ngfactory";
      import { AppModule } from './app/app.module';

      platformBrowser_1().bootstrapModuleFactory(AppModuleNgFactory_1);
    `;

    expectTransformation(input, output);
  });

  it('replaces bootstrap call with namespace imports', () => {
    const input = `
      import * as PBD from '@angular/platform-browser-dynamic';
      import * as AM from './app/app.module';

      PBD.platformBrowserDynamic().bootstrapModule(AM.AppModule);
    `;
    const output = `
      import { platformBrowser as platformBrowser_1 } from "@angular/platform-browser";
      import { AppModuleNgFactory as AppModuleNgFactory_1 } from "./app/app.module.ngfactory";
      import * as AM from './app/app.module';

      platformBrowser_1().bootstrapModuleFactory(AppModuleNgFactory_1);
    `;

    expectTransformation(input, output);
  });

  it('replaces a path mapped `App` module', () => {
    const input = `
      import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
      import { AppModule } from '@app/app.module';

      platformBrowserDynamic().bootstrapModule(AppModule);
    `;
    const output = `
      import { platformBrowser as platformBrowser_1 } from "@angular/platform-browser";
      import { AppModuleNgFactory as AppModuleNgFactory_1 } from "./app/app.module.ngfactory";
      import { AppModule } from '@app/app.module';

      platformBrowser_1().bootstrapModuleFactory(AppModuleNgFactory_1);
    `;

    const options: EntryModuleReplacerOptions = {
      resolveModule: (moduleText: string, containingFile: string) => {
        expect(moduleText).toBe('@app/app.module');
        expect(containingFile).toBe('temp.ts');

        return './app/app.module';
      }
    };

    expectTransformation(input, output, options);
  });

  it('replaces bootstrap inside anonymous function', () => {
    const input = `
      import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
      import { AppModule } from './app/app.module';

      const bootstrap = () => {
        platformBrowserDynamic().bootstrapModule(AppModule);
      };

      bootstrap();
    `;
    const output = `
      import { platformBrowser as platformBrowser_1 } from "@angular/platform-browser";
      import { AppModuleNgFactory as AppModuleNgFactory_1 } from "./app/app.module.ngfactory";
      import { AppModule } from './app/app.module';

      const bootstrap = () => {
        platformBrowser_1().bootstrapModuleFactory(AppModuleNgFactory_1);
      };

      bootstrap();
    `;

    expectTransformation(input, output);
  });

  xit('replaces bootstrap call from platform variable', () => {
    const input = `
      import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
      import { AppModule } from './app/app.module';

      const platform = platformBrowserDynamic();
      platform.bootstrapModule(AppModule);
    `;
    const output = `
      import { platformBrowser as platformBrowser_1 } from "@angular/platform-browser";
      import { AppModuleNgFactory as AppModuleNgFactory_1 } from "./app/app.module.ngfactory";
      import { AppModule } from './app/app.module';

      const platform = platformBrowser_1();
      platform.bootstrapModuleFactory(AppModuleNgFactory_1);
    `;

    expectTransformation(input, output);
  });

});
